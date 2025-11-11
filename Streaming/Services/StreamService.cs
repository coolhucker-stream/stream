using Microsoft.Extensions.Options;
using Streaming.Models;
using System.IO;
using Streaming.Data;

namespace Streaming.Services
{
    public class StreamService
    {
        private readonly StreamingDbContext _context;
        private readonly StreamSettings _settings;
        private static VideoStream _stream;
        private DateTime? _streamStartTime;

        public StreamService(StreamingDbContext context)
        {
            _context = context;
            // Get or create default settings
            _settings = _context.StreamSettings.FirstOrDefault();
            if (_settings == null)
            {
                _settings = new StreamSettings
                {
                    StreamDescription = "Welcome to the stream!",
                    StreamKey = "disco-bayern",
                    StreamTitle = "Live Stream"
                };
                _context.StreamSettings.Add(_settings);
                _context.SaveChanges();
            }

            if (_stream == null)
            {
                _stream = new VideoStream
                {
                    Id = 1,
                    Title = _settings.StreamTitle,
                    Description = _settings.StreamDescription,
                    StreamerName = "Streamer",
                    ThumbnailUrl = $"https://i.pravatar.cc/400?img",
                    StreamUrl = $"http://localhost:8000/live/{_settings.StreamKey}.flv",
                    ViewerCount = 0,
                    Category = "Gaming",
                    IsLive = false,
                    StartedAt = _streamStartTime ?? DateTime.Now
                };
            }
        }

        public VideoStream GetStream()
        {
            return _stream;
        }

        /// <summary>
        /// Get current stream status for diagnostics
        /// </summary>
        public DateTime? GetStreamStatus()
        {
            return _stream.IsLive ? _streamStartTime : null;
        }

        /// <summary>
        /// Set stream status (live/offline)
        /// </summary>
        public void SetStreamStatus(bool isLive)
        {
            _stream.IsLive = isLive;
            if (isLive && !_streamStartTime.HasValue)
            {
                _streamStartTime = DateTime.Now;
                _stream.StartedAt = DateTime.Now;
            }
            else if (!isLive)
            {
                _streamStartTime = null;
                _stream.ViewerCount = 0; // Reset viewer count when stream ends
            }
        }

        /// <summary>
        /// Update viewer count
        /// </summary>
        public void UpdateViewerCount(int delta)
        {
            _stream.ViewerCount = Math.Max(0, _stream.ViewerCount + delta);
        }

        public StreamSettings GetSettings()
        {
            return _settings;
        }

        public void UpdateSettings(StreamSettings settings)
        {
            _settings.StreamDescription = settings.StreamDescription;
            _settings.StreamKey = settings.StreamKey;
            _settings.StreamTitle = settings.StreamTitle;
            
            // Update stream properties to reflect new settings
            _stream.Title = settings.StreamTitle;
            _stream.Description = settings.StreamDescription;
            _stream.StreamUrl = $"http://localhost:8000/live/{settings.StreamKey}.flv";
            
            _context.StreamSettings.Update(_settings);
            _context.SaveChanges();
        }
    }
}
