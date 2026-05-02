using Microsoft.AspNetCore.Mvc;

namespace Streaming.Pages.Auth
{
    public class LogoutModel : Microsoft.AspNetCore.Mvc.RazorPages.PageModel
    {
        public IActionResult OnGet()
        {
            HttpContext.Session.Clear();
            return RedirectToPage("/Auth/Login");
        }
    }
}
