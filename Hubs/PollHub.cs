using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

public class PollHub : Hub
{
    public async Task JoinPollGroup(string pollCode) =>
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(pollCode));

    public async Task LeavePollGroup(string pollCode) =>
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(pollCode));

    public static string GroupName(string pollCode) => $"poll-{pollCode}";
}