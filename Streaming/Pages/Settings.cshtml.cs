using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Streaming.Filters;
using Streaming.Models;
using Streaming.Services;
using Telegram.Bot.Types.Enums;

namespace Streaming.Pages
{
    [RequireTelegramSession(ChatMemberStatus.Administrator)]
    public class SettingsModel : PageModel
    {
        private readonly StreamService _streamService;

        public SettingsModel(StreamService streamService)
        {
            _streamService = streamService;
        }

        [BindProperty]
        public StreamSettings Settings { get; set; }

        public async Task<IActionResult> OnGet()
        {
            var settings = await _streamService.GetSettings();
            return new JsonResult(new
            {
                streamTitle = settings.StreamTitle,
                streamDescription = settings.StreamDescription,
                streamKey = settings.StreamKey
            });
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return new JsonResult(new { success = false, message = "Invalid data" });
            }

            await _streamService.UpdateSettingsAsync(Settings);
            return new JsonResult(new { success = true });
        }
    }
}