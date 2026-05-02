using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc;
using Telegram.Bot.Types.Enums;

namespace Streaming.Pages.Auth;

public class LoginModel : PageModel
{
    public void OnGet()
    {
    }

    public IActionResult OnGetTestLogin()
    {
        HttpContext.Session.SetString("UserId", Guid.NewGuid().ToString());
        HttpContext.Session.SetString("Username", "John Rambo");
        HttpContext.Session.SetString("UserStatus", ((int)ChatMemberStatus.Administrator).ToString());

        return Redirect("/");
    }
}
