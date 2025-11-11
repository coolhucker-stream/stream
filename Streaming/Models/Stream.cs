namespace Streaming.Models
{
    public class VideoStream
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string StreamerName { get; set; } = string.Empty;
        public string ThumbnailUrl { get; set; } = string.Empty;
        public string StreamUrl { get; set; } = string.Empty;
        public int ViewerCount { get; set; }
        public string Category { get; set; } = string.Empty;
        public bool IsLive { get; set; }
        public DateTime StartedAt { get; set; }
    }
}
