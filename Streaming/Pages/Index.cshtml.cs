using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Streaming.Models;
using Streaming.Services;
using Streaming.Filters;

namespace Streaming.Pages;

[RequireSession]
public class WatchModel(StreamService streamService) : PageModel
{
    public VideoStream? Stream { get; set; }

    public async Task<IActionResult> OnGet()
    {
        Stream = await streamService.GetStream();
        return Page();
    }
}
