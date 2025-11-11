namespace Streaming.Models
{
    public class ChatMessage
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string AvatarColor { get; set; } = "#6441a5";
    }
}
