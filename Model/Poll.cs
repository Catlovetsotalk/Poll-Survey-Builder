using Backend.Model;

namespace Backend.Model;

public enum PollStatus
{
    Open = 0,
    Closed = 1
}

public class Poll
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string CreatorToken { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public PollStatus Status { get; set; } = PollStatus.Open;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }

    public List<PollOption> Options { get; set; } = new();
    public List<Vote> Votes { get; set; } = new();

    public bool IsExpired => ExpiresAt.HasValue && ExpiresAt.Value <= DateTime.UtcNow;
    public bool IsAcceptingVotes => Status == PollStatus.Open && !IsExpired;
}