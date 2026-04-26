using Microsoft.Extensions.Options;
using Streaming.Models;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace Streaming.Services
{
    public class StreamService
    {
        private StreamSettings _settings;
        private readonly StreamSettingsStore _settingsStore;
        private readonly IConfiguration _configuration;
        private static VideoStream _stream;
        private DateTime? _streamStartTime;

        public StreamService(StreamSettingsStore settingsStore, IConfiguration configuration)
        {
            _settingsStore = settingsStore;
            _configuration = configuration;

            // Load settings from file-backed store (synchronously for constructor simplicity)
            _settings = _settingsStore.GetAsync().GetAwaiter().GetResult();

            if (_settings == null)
            {
                _settings = new StreamSettings
                {
                    StreamDescription = "Welcome to the stream!",
                    StreamKey = "disco-bayern",
                    StreamTitle = "Live Stream"
                };
                _settingsStore.UpdateAsync(_settings).GetAwaiter().GetResult();
            }

            if (_stream == null)
            {
                var playbackBaseUrl = _configuration["Streaming:PlaybackBaseUrl"] ?? "http://localhost:8081/live";

                _stream = new VideoStream
                {
                    Id = 1,
                    Title = _settings.StreamTitle,
                    Description = _settings.StreamDescription,
                    StreamerName = "Streamer",
                    ThumbnailUrl = $"https://i.pravatar.cc/400?img",
                    StreamUrl = $"{playbackBaseUrl}/{_settings.StreamKey}.m3u8",
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

        public async Task UpdateSettingsAsync(StreamSettings settings)
        {
            _settings.StreamDescription = settings.StreamDescription;
            _settings.StreamKey = settings.StreamKey;
            _settings.StreamTitle = settings.StreamTitle;

            // Update stream properties to reflect new settings
            var playbackBaseUrl = _configuration["Streaming:PlaybackBaseUrl"] ?? "http://localhost:8081/live";

            _stream.Title = settings.StreamTitle;
            _stream.Description = settings.StreamDescription;
            _stream.StreamUrl = $"{playbackBaseUrl}/{settings.StreamKey}.m3u8";

            // Persist settings to file store
            _settingsStore.UpdateAsync(_settings).GetAwaiter().GetResult();

            // Also keep EF DB in sync if there is an existing record
            var existing = await _settingsStore.GetAsync();

            if (existing != null)
            {
                existing.StreamTitle = _settings.StreamTitle;
                existing.StreamDescription = _settings.StreamDescription;
                existing.StreamKey = _settings.StreamKey;
                await _settingsStore.UpdateAsync(existing);
            }
        }
    }
}
