namespace Backend.Model;

public class PollOption
{
    public int Id { get; set; }
    public int PollId { get; set; }
    public Poll Poll { get; set; } = null!;
    public int OptionIndex { get; set; }
    public string Text { get; set; } = string.Empty;
}