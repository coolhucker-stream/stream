using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Streaming.Models;
using Streaming.Services;
using Streaming.Filters;

namespace Streaming.Pages;

 [RequireTelegramSession]
public class WatchModel(StreamService streamService) : PageModel
{
    public VideoStream? Stream { get; set; }

    public IActionResult OnGet()
    {
        Stream = streamService.GetStream();
        return Page();
    }
}
