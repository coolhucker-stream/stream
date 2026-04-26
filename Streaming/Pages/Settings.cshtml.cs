using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Streaming.Models;
using Streaming.Services;

namespace Streaming.Pages
{
    public class SettingsModel : PageModel
    {
        private readonly StreamService _streamService;

        public SettingsModel(StreamService streamService)
        {
            _streamService = streamService;
        }

        [BindProperty]
        public StreamSettings Settings { get; set; }

        public IActionResult OnGet()
        {
            if (Request.Query["format"].ToString() == "json")
            {
                var settings = _streamService.GetSettings();
                return new JsonResult(new
                {
                    streamTitle = settings.StreamTitle,
                    streamDescription = settings.StreamDescription,
                    streamKey = settings.StreamKey
                });
            }

            Settings = _streamService.GetSettings();
            return Page();
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