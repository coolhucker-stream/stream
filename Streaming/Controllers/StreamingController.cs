using Microsoft.AspNetCore.Mvc;
using Streaming.Services;
using Microsoft.AspNetCore.SignalR;
using Streaming.Hubs;

namespace Streaming.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StreamingController : ControllerBase
    {
        private readonly StreamService _streamService;
        private readonly IHubContext<StreamHub> _hubContext;
        private readonly ILogger<StreamingController> _logger;

        public StreamingController(
            StreamService streamService,
            IHubContext<StreamHub> hubContext,
            ILogger<StreamingController> logger)
        {
            _streamService = streamService;
            _hubContext = hubContext;
            _logger = logger;
        }

        /// <summary>
        /// Stream Key validation when connecting to RTMP server
        /// Called by SRS RTMP server
        /// </summary>
        [HttpPost("validate")]
        [HttpGet("validate")]
        public async Task<IActionResult> ValidateStreamKey([FromQuery] string? stream, [FromQuery] string? key, [FromQuery] string? name)
        {
            _logger.LogInformation("=== Validate Stream Key Called ===");
            _logger.LogInformation($"Query 'stream': {stream}");
            _logger.LogInformation($"Query 'key': {key}");
            _logger.LogInformation($"Query 'name': {name}");
            _logger.LogInformation($"Request Method: {Request.Method}");
            _logger.LogInformation($"Content-Type: {Request.ContentType}");

            // Extract stream key (приоритет отдаем параметру stream)
            var streamKey = stream ?? key ?? name;

            // If SRS didn't substitute [stream] in the URL, it sends details in the JSON body.
            if (string.IsNullOrEmpty(streamKey) || streamKey == "[stream]" || streamKey == "${stream}")
            {
                try
                {
                    // Rewind body if necessary
                    Request.EnableBuffering();
                    using var reader = new StreamReader(Request.Body, leaveOpen: true);
                    var body = await reader.ReadToEndAsync();
                    Request.Body.Position = 0;
                    _logger.LogInformation($"Request body content: {body}");

                    if (!string.IsNullOrWhiteSpace(body))
                    {
                        try
                        {
                            using var doc = System.Text.Json.JsonDocument.Parse(body);
                            if (doc.RootElement.TryGetProperty("stream", out var streamElem))
                            {
                                var fromBody = streamElem.GetString();
                                _logger.LogInformation($"Parsed stream from body: {fromBody}");
                                if (!string.IsNullOrEmpty(fromBody)) streamKey = fromBody;
                            }
                            else if (doc.RootElement.TryGetProperty("param", out var paramElem))
                            {
                                var param = paramElem.GetString();
                                _logger.LogInformation($"Parsed param from body: {param}");
                                if (!string.IsNullOrEmpty(param)) streamKey = param;
                            }
                        }
                        catch (System.Text.Json.JsonException jex)
                        {
                            _logger.LogWarning($"Failed to parse JSON body: {jex.Message}");
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Could not read request body: {ex.Message}");
                }
            }

            _logger.LogInformation($"Extracted streamKey: {streamKey}");

            // Check key format
            if (string.IsNullOrEmpty(streamKey))
            {
                _logger.LogWarning("Stream key is empty or null");
                // Return both fields: `code` for SRS and `valid` for NodeMediaServer
                return new JsonResult(new { code = 1, valid = false }); // reject (non-zero)
            }

            // Get settings from service
            var settings = await _streamService.GetSettings();
            _logger.LogInformation($"Expected stream key: {settings?.StreamKey}");

            if (settings == null || settings.StreamKey != streamKey)
            {
                _logger.LogWarning($"Stream key validation failed. Expected: {settings?.StreamKey}, Got: {streamKey}");
                return new JsonResult(new { code = 1, valid = false }); // reject
            }

            _logger.LogInformation("Stream key validated successfully!");
            // Return both `code` and `valid` so both SRS and NodeMediaServer accept it
            return new JsonResult(new { code = 0, valid = true }); // success
        }

        /// <summary>
        /// Stream start notification
        /// Called by SRS when client connects
        /// </summary>
        [HttpPost("start")]
        [HttpGet("start")]
        public async Task<IActionResult> OnStreamStart([FromQuery] string? client_id, [FromQuery] string? ip, [FromQuery] string? vhost, [FromQuery] string? app, [FromQuery] string? stream)
        {
            _logger.LogInformation("=== Stream Connect/Start Notification ===");
            _logger.LogInformation($"Client ID: {client_id}");
            _logger.LogInformation($"IP: {ip}");
            _logger.LogInformation($"Vhost: {vhost}");
            _logger.LogInformation($"App: {app}");
            _logger.LogInformation($"Stream: {stream}");

            try
            {
                // Get current settings
                var settings = _streamService.GetSettings();
                if (settings == null)
                {
                    _logger.LogError("Stream settings not found");
                    return StatusCode(500, new { code = 1, message = "Stream settings not found" });
                }

                // Set stream as live

                // Get stream URL from VideoStream object (already properly configured)
                var streamInfo = await _streamService.GetStream();
                var streamUrl = streamInfo.StreamUrl;

                // Add timestamp to prevent caching of previous stream
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                streamUrl = $"{streamUrl}?t={timestamp}";

                _logger.LogInformation($"Stream URL: {streamUrl}");

                // Notify all clients
                await _hubContext.Clients.All.SendAsync("StreamStarted", streamUrl);
                _logger.LogInformation("StreamStarted notification sent to clients");
                
                return Ok(new { code = 0, url = streamUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing stream start notification");
                return StatusCode(500, new { code = 1, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Stream end notification
        /// Called after streamer disconnects
        /// </summary>
        [HttpPost("end")]
        [HttpGet("end")]
        public async Task<IActionResult> OnStreamEnd([FromQuery] string stream)
        {
            _logger.LogInformation($"Stream end notification received for stream: {stream}");
            await _hubContext.Clients.All.SendAsync("StreamEnded");
            return Ok(new { code = 0 });
        }
    }
}
