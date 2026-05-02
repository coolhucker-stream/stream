using Microsoft.AspNetCore.SignalR;

namespace Streaming.Hubs
{
    public class StreamHub : Hub
    {
        private static int _viewerCount = 0;

        public override async Task OnConnectedAsync()
        {
            _viewerCount++;
            await Clients.All.SendAsync("ViewerCountChanged", _viewerCount);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            _viewerCount = Math.Max(0, _viewerCount - 1);
            await Clients.All.SendAsync("ViewerCountChanged", _viewerCount);
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendMessage(string message)
        {
            var httpContext = Context.GetHttpContext();
            var userName = httpContext?.Session.GetString("Username");
            
            await Clients.All.SendAsync("ReceiveMessage", userName, message);
        }
    }
}