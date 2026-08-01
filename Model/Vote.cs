namespace Backend.Model;

public class Vote
{
    public int Id { get; set; }
    public int PollId { get; set; }
    public Poll Poll { get; set; } = null!;
    public int OptionIndex { get; set; }
    public string VoterToken { get; set; } = string.Empty;
    public DateTime VotedAt { get; set; } = DateTime.UtcNow;
}