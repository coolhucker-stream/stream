using Streaming.Models;

namespace Streaming.Services
{
    public class StreamService(StreamSettingsStore settingsStore, IConfiguration configuration)
    {
        public async Task<VideoStream> GetStream()
        {
            var settings = await GetSettings();

            var playbackBaseUrl = configuration["Streaming:PlaybackBaseUrl"]!;
            var playbackFileName = configuration["Streaming:PlaybackFileName"]!;
            var streamKey = settings.StreamKey;

            return new VideoStream
            {
                Title = settings.StreamTitle,
                Description = settings.StreamDescription,
                StreamUrl = $"{playbackBaseUrl}/{streamKey}/{playbackFileName}",
            };
        }
       
        public async Task<StreamSettings> GetSettings()
        {
            var settings = await settingsStore.GetAsync();
            if (settings == null)
            {
                settings = new StreamSettings
                {
                    StreamTitle = "My Live Stream",
                    StreamDescription = "This is a live stream.",
                    StreamKey = Guid.NewGuid().ToString("N").Substring(0, 8)
                };

                await settingsStore.UpdateAsync(settings);
            }

            return settings;
        }

        public async Task UpdateSettingsAsync(StreamSettings settings)
        {
            if (string.IsNullOrWhiteSpace(settings.StreamTitle))
            {
                throw new ArgumentException("Stream title cannot be empty.");
            }

            if (string.IsNullOrWhiteSpace(settings.StreamDescription))
            {
                throw new ArgumentException("Stream description cannot be empty.");
            }

            if (string.IsNullOrWhiteSpace(settings.StreamKey))
            {
                throw new ArgumentException("Stream key cannot be empty.");
            }

            await settingsStore.UpdateAsync(settings);
        }
    }
}
