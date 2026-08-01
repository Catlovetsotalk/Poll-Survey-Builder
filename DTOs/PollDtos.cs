using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class CreatePollRequest
{
    [Required, MaxLength(500)]
    public string Question { get; set; } = string.Empty;

    [Required, MinLength(2), MaxLength(6)]
    public List<string> Options { get; set; } = new();

    public DateTime? ExpiresAt { get; set; }
}

public class CreatePollResponse
{
    public string Code { get; set; } = string.Empty;
}

public class PollDetailsResponse
{
    public string Code { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
    public List<PollOptionDto> Options { get; set; } = new();
    public bool HasVoted { get; set; }
}

public class PollOptionDto
{
    public int OptionIndex { get; set; }
    public string Text { get; set; } = string.Empty;
}

public class VoteRequest
{
    [Required]
    public int OptionIndex { get; set; }
}

public class PollResultsResponse
{
    public string Code { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int TotalVotes { get; set; }
    public List<PollOptionResultDto> Options { get; set; } = new();
}

public class PollOptionResultDto
{
    public int OptionIndex { get; set; }
    public string Text { get; set; } = string.Empty;
    public int VoteCount { get; set; }
}