using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Streaming.Models;
using Streaming.Services;
using Streaming.Filters;
using Telegram.Bot.Types.Enums;

namespace Streaming.Pages;

[RequireSession(ChatMemberStatus.Creator, ChatMemberStatus.Administrator, ChatMemberStatus.Member)]
public class WatchModel(StreamService streamService) : PageModel
{
    public VideoStream? Stream { get; set; }

    public async Task<IActionResult> OnGet()
    {
        Stream = await streamService.GetStream();
        return Page();
    }
}
