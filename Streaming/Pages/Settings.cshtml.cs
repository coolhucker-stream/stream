using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Streaming.Filters;
using Streaming.Models;
using Streaming.Services;
using Telegram.Bot.Types.Enums;

namespace Streaming.Pages
{
    [RequireTelegramSession(ChatMemberStatus.Administrator)]
    public class SettingsModel(StreamService streamService, IConfiguration configuration) : PageModel
    {
        [BindProperty]
        public StreamSettings Settings { get; set; }

        public IConfiguration Configuration { get; private set; } = configuration;

        public async Task OnGetAsync()
        {
            Settings = await streamService.GetSettings();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors);
                    var errorMessage = string.Join(", ", errors.Select(e => e.ErrorMessage));
                    TempData["ErrorMessage"] = $"Validation error: {errorMessage}";
                    return Page();
                }

                // Validate before updating
                if (string.IsNullOrWhiteSpace(Settings.StreamTitle))
                {
                    TempData["ErrorMessage"] = "Stream title is required";
                    return Page();
                }

                if (string.IsNullOrWhiteSpace(Settings.StreamDescription))
                {
                    TempData["ErrorMessage"] = "Stream description is required";
                    return Page();
                }

                if (string.IsNullOrWhiteSpace(Settings.StreamKey))
                {
                    TempData["ErrorMessage"] = "Stream key is required";
                    return Page();
                }

                await streamService.UpdateSettingsAsync(Settings);
                TempData["SuccessMessage"] = "Settings saved successfully!";
                return RedirectToPage();
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = $"Error saving settings: {ex.Message}";
                Settings = await streamService.GetSettings();
                return Page();
            }
        }
    }
}