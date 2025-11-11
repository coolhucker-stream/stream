namespace Streaming.Models
{
    public class TelegramAuthData
    {
        public long Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string PhotoUrl { get; set; } = string.Empty;
        public long AuthDate { get; set; }
        public string Hash { get; set; } = string.Empty;
    }
}