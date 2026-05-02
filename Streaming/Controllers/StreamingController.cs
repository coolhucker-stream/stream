using Microsoft.AspNetCore.Mvc;
using Streaming.Services;
using Microsoft.AspNetCore.SignalR;
using Streaming.Hubs;

namespace Streaming.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StreamingController(
        StreamService streamService,
        IHubContext<StreamHub> hubContext,
        ILogger<StreamingController> logger)
        : ControllerBase
    {
        /// <summary>
        /// Stream Key validation when connecting to RTMP server
        /// Called by SRS RTMP server
        /// </summary>
        [HttpPost("validate")]
        [HttpGet("validate")]
        public async Task<IActionResult> ValidateStreamKey([FromQuery] string streamKey)
        {
            var settings = await streamService.GetSettings();

            if (settings.StreamKey != streamKey)
            {
                return new JsonResult(new { code = 1, valid = false });
            }

            return new JsonResult(new { code = 0, valid = true });
        }

        /// <summary>
        /// Stream start notification
        /// Called by SRS when client connects
        /// </summary>
        [HttpPost("start")]
        [HttpGet("start")]
        public async Task<IActionResult> OnStreamStart([FromQuery] string? streamKey)
        {
            var streamInfo = await streamService.GetStream();
            var streamUrl = streamInfo.StreamUrl;
            await hubContext.Clients.All.SendAsync("StreamStarted", streamUrl);

            return Ok(new { code = 0, url = streamUrl });
        }

        /// <summary>
        /// Stream end notification
        /// Called after streamer disconnects
        /// </summary>
        [HttpPost("end")]
        [HttpGet("end")]
        public async Task<IActionResult> OnStreamEnd([FromQuery] string streamKey)
        {
            await hubContext.Clients.All.SendAsync("StreamEnded");
            return Ok(new { code = 0 });
        }
    }
}
