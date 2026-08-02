using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs;
using Backend.Hubs;
using Backend.Model;
using Backend.Services;

namespace Backend.Controllers;

[ApiController]
[Route("api/polls")]
public class PollsController : ControllerBase
{
    private const string VoterCookieName = "voter_token";

    private readonly AppDbContext _db;
    private readonly ICodeGenerator _codeGenerator;
    private readonly IHubContext<PollHub> _hub;

    public PollsController(AppDbContext db, ICodeGenerator codeGenerator, IHubContext<PollHub> hub)
    {
        _db = db;
        _codeGenerator = codeGenerator;
        _hub = hub;
    }

    [HttpPost]
    public async Task<ActionResult<CreatePollResponse>> CreatePoll(CreatePollRequest request)
    {
        if (request.Options is null || request.Options.Count < 2 || request.Options.Count > 6)
            return BadRequest("A poll needs between 2 and 6 options.");
        if (request.Options.Any(o => string.IsNullOrWhiteSpace(o)))
            return BadRequest("Options cannot be empty.");

        string code;
        var attempts = 0;
        do
        {
            code = _codeGenerator.Generate();
            attempts++;
        } while (await _db.Polls.AnyAsync(p => p.Code == code) && attempts < 5);

        var creatorToken = Guid.NewGuid().ToString("N");

        var poll = new Poll
        {
            Code = code,
            Question = request.Question.Trim(),
            ExpiresAt = request.ExpiresAt,
            Status = PollStatus.Open,
            CreatorToken = creatorToken,
            Options = request.Options
                .Select((text, index) => new PollOption { OptionIndex = index, Text = text.Trim() })
                .ToList()
        };

        _db.Polls.Add(poll);
        await _db.SaveChangesAsync();

        Response.Cookies.Append($"creator_token_{poll.Code}", creatorToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = DateTimeOffset.UtcNow.AddYears(1)
        });

        return CreatedAtAction(nameof(GetPoll), new { code = poll.Code }, new CreatePollResponse { Code = poll.Code });
    }

    [HttpGet("{code}")]
    public async Task<ActionResult<PollDetailsResponse>> GetPoll(string code)
    {
        var poll = await _db.Polls.Include(p => p.Options).FirstOrDefaultAsync(p => p.Code == code);
        if (poll is null) return NotFound();

        var voterToken = GetOrCreateVoterToken();
        var hasVoted = await _db.Votes.AnyAsync(v => v.PollId == poll.Id && v.VoterToken == voterToken);

        return new PollDetailsResponse
        {
            Code = poll.Code,
            Question = poll.Question,
            Status = poll.IsAcceptingVotes ? "open" : "closed",
            ExpiresAt = poll.ExpiresAt,
            HasVoted = hasVoted,
            Options = poll.Options.OrderBy(o => o.OptionIndex)
                .Select(o => new PollOptionDto { OptionIndex = o.OptionIndex, Text = o.Text }).ToList()
        };
    }

    [HttpPost("{code}/vote")]
    public async Task<IActionResult> Vote(string code, VoteRequest request)
    {
        var poll = await _db.Polls.Include(p => p.Options).FirstOrDefaultAsync(p => p.Code == code);
        if (poll is null) return NotFound();
        if (!poll.IsAcceptingVotes) return Conflict("This poll is closed and no longer accepting votes.");

        var validOption = poll.Options.Any(o => o.OptionIndex == request.OptionIndex);
        if (!validOption) return BadRequest("Invalid option index.");

        var voterToken = GetOrCreateVoterToken();
        var alreadyVoted = await _db.Votes.AnyAsync(v => v.PollId == poll.Id && v.VoterToken == voterToken);
        if (alreadyVoted) return Conflict("You have already voted on this poll.");

        _db.Votes.Add(new Vote { PollId = poll.Id, OptionIndex = request.OptionIndex, VoterToken = voterToken });
        await _db.SaveChangesAsync();

        var results = await BuildResults(poll.Id);
        await _hub.Clients.Group(PollHub.GroupName(code)).SendAsync("resultsUpdated", results);

        return NoContent();
    }

    [HttpGet("{code}/results")]
    public async Task<ActionResult<PollResultsResponse>> GetResults(string code)
    {
        var poll = await _db.Polls.Include(p => p.Options).FirstOrDefaultAsync(p => p.Code == code);
        if (poll is null) return NotFound();
        return await BuildResults(poll.Id);
    }

    [HttpPost("{code}/close")]
    public async Task<IActionResult> ClosePoll(string code)
    {
        var poll = await _db.Polls.FirstOrDefaultAsync(p => p.Code == code);
        if (poll is null) return NotFound();

        var cookieName = $"creator_token_{code}";
        if (!Request.Cookies.TryGetValue(cookieName, out var providedToken) ||
            providedToken != poll.CreatorToken)
        {
            return StatusCode(StatusCodes.Status403Forbidden, "You are not the creator of this poll.");
        }

        poll.Status = PollStatus.Closed;
        await _db.SaveChangesAsync();

        var results = await BuildResults(poll.Id);
        await _hub.Clients.Group(PollHub.GroupName(code)).SendAsync("resultsUpdated", results);

        return NoContent();
    }

    private async Task<PollResultsResponse> BuildResults(int pollId)
    {
        var poll = await _db.Polls.Include(p => p.Options).FirstAsync(p => p.Id == pollId);
        var voteCounts = await _db.Votes.Where(v => v.PollId == pollId)
            .GroupBy(v => v.OptionIndex)
            .Select(g => new { OptionIndex = g.Key, Count = g.Count() })
            .ToListAsync();
        var countLookup = voteCounts.ToDictionary(v => v.OptionIndex, v => v.Count);

        return new PollResultsResponse
        {
            Code = poll.Code,
            Question = poll.Question,
            Status = poll.IsAcceptingVotes ? "open" : "closed",
            TotalVotes = voteCounts.Sum(v => v.Count),
            Options = poll.Options.OrderBy(o => o.OptionIndex)
                .Select(o => new PollOptionResultDto
                {
                    OptionIndex = o.OptionIndex,
                    Text = o.Text,
                    VoteCount = countLookup.GetValueOrDefault(o.OptionIndex, 0)
                }).ToList()
        };
    }

    private string GetOrCreateVoterToken()
    {
        if (Request.Cookies.TryGetValue(VoterCookieName, out var existing) && !string.IsNullOrEmpty(existing))
            return existing;

        var token = Guid.NewGuid().ToString("N");
        Response.Cookies.Append(VoterCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = DateTimeOffset.UtcNow.AddYears(1)
        });
        return token;
    }
}