using Streaming.Models;

namespace Streaming.Services
{
    public class StreamService
    {
        private StreamSettings _settings;
        private readonly StreamSettingsStore _settingsStore;
        private readonly IConfiguration _configuration;
        private static VideoStream _stream;
        private readonly string _playbackBaseUrl;

        public StreamService(StreamSettingsStore settingsStore, IConfiguration configuration)
        {
            _settingsStore = settingsStore;
            _configuration = configuration;

            // Get playback URL from configuration
            _playbackBaseUrl = _configuration["Streaming:PlaybackBaseUrl"]!;

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
                _stream = new VideoStream
                {
                    Title = _settings.StreamTitle,
                    Description = _settings.StreamDescription,
                    StreamUrl = $"{_playbackBaseUrl}/{_settings.StreamKey}/index.m3u8",
                };
            }
            else
            {
                // Update StreamUrl with current configuration on every service instantiation
                _stream.StreamUrl = $"{_playbackBaseUrl}/{_settings.StreamKey}/index.m3u8";
            }
        }

        public VideoStream GetStream()
        {
            return _stream;
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
            _stream.Title = settings.StreamTitle;
            _stream.Description = settings.StreamDescription;
            _stream.StreamUrl = $"{_playbackBaseUrl}/{settings.StreamKey}/index.m3u8";

            // Persist settings to file store
            await _settingsStore.UpdateAsync(_settings);

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
