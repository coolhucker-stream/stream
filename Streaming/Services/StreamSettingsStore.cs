using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Streaming.Models;
using System.IO;

namespace Streaming.Services
{
    public class StreamSettingsStore
    {
        private readonly string _path;
        private readonly SemaphoreSlim _lock = new(1, 1);

        public StreamSettingsStore(IHostEnvironment env)
        {
            var dir = Path.Combine(env.ContentRootPath, "data");
            Directory.CreateDirectory(dir);
            _path = Path.Combine(dir, "streamsettings.json");
        }

        public async Task<StreamSettings> GetAsync()
        {
            await _lock.WaitAsync();
            try
            {
                if (!File.Exists(_path))
                {
                    var @default = new StreamSettings
                    {
                        StreamTitle = "Live Stream",
                        StreamDescription = "Welcome to the stream!",
                        StreamKey = "disco-bayern"
                    };
                    await WriteInternalAsync(@default);
                    return @default;
                }

                var json = await File.ReadAllTextAsync(_path);
                var settings = JsonSerializer.Deserialize<StreamSettings>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                return settings ?? throw new InvalidOperationException("Failed to deserialize stream settings.");
            }
            finally
            {
                _lock.Release();
            }
        }

        public async Task UpdateAsync(StreamSettings settings)
        {
            await _lock.WaitAsync();
            try
            {
                await WriteInternalAsync(settings);
            }
            finally
            {
                _lock.Release();
            }
        }

        private async Task WriteInternalAsync(StreamSettings settings)
        {
            var temp = _path + ".tmp";
            var json = JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(temp, json);

            if (File.Exists(_path))
                File.Replace(temp, _path, null);
            else
                File.Move(temp, _path);
        }
    }
}
