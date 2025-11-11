using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Streaming.Models;
using Streaming.Services;

namespace Streaming.Pages;

public class WatchModel : PageModel
{
    private readonly StreamService _streamService;

    public VideoStream? Stream { get; set; }

    public WatchModel(StreamService streamService)
    {
        _streamService = streamService;
    }

    public IActionResult OnGet()
    {
        // Check if user is authenticated
        if (HttpContext.Session.GetString("TelegramUserId") == null)
        {
            return RedirectToPage("/Error", new { message = "You must log in via Telegram to access the stream." });
        }

        Stream = _streamService.GetStream();
        return Page();
    }

    public string GetTimeAgo()
    {
        if (Stream == null) return "";

        var timeSpan = DateTime.Now - Stream.StartedAt;
        
        if (timeSpan.TotalMinutes < 1)
            return "just now";
        if (timeSpan.TotalMinutes < 60)
            return $"{(int)timeSpan.TotalMinutes} minutes ago";
        if (timeSpan.TotalHours < 24)
            return $"{(int)timeSpan.TotalHours} hours ago";
        
        return $"{(int)timeSpan.TotalDays} days ago";
    }
}
