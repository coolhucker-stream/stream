using Microsoft.AspNetCore.SignalR;

namespace Streaming
{
    public class StreamHub : Hub
    {
        public async Task SendMessage(string userName, string message)
        {
            await Clients.All.SendAsync("ReceiveMessage", userName, message);
        }
    }
}