using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Telegram.Bot.Types.Enums;

namespace Streaming.Pages
{
    public class PendingModel : PageModel
    {
        public ChatMemberStatus? UserStatus { get; set; }

        public void OnGet()
        {
            var userStatusStr = HttpContext.Session.GetString("UserStatus");
            
            if (!string.IsNullOrEmpty(userStatusStr) && int.TryParse(userStatusStr, out int status))
            {
                UserStatus = (ChatMemberStatus)status;
            }
        }

        /// <summary>
        /// API endpoint для проверки статуса пользователя
        /// Возвращает текущий статус из сессии
        /// </summary>
        public IActionResult OnGetCheckStatus()
        {
            var userStatusStr = HttpContext.Session.GetString("UserStatus");

            if (string.IsNullOrEmpty(userStatusStr) || !int.TryParse(userStatusStr, out int status))
            {
                return new JsonResult(new { success = false, status = 0 });
            }

            return new JsonResult(new 
            { 
                success = true, 
                status = status,
                approved = status > 0,
                statusName = ((ChatMemberStatus)status).ToString()
            });
        }
    }
}
