using Microsoft.Extensions.Caching.Distributed;
using Streaming.Models;
using System.Text.Json;

namespace Streaming.Services
{
    public class StreamSettingsStore(IDistributedCache cache)
    {
        private const string CacheKey = "stream_settings";

        public async Task<StreamSettings?> GetAsync()
        {
            var cached = await cache.GetStringAsync(CacheKey);
            if (!string.IsNullOrEmpty(cached))
            {
                return JsonSerializer.Deserialize<StreamSettings>(cached)
                    ?? throw new InvalidOperationException("Failed to deserialize cached settings.");
            }

            return null;
        }

        public async Task UpdateAsync(StreamSettings settings)
        {
            await cache.SetStringAsync(
                CacheKey,
                JsonSerializer.Serialize(settings),
                new DistributedCacheEntryOptions());
        }
    }
}
