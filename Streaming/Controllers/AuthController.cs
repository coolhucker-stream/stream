using Microsoft.AspNetCore.Mvc;
using Streaming.Models;
using Streaming.Services;
using Telegram.Bot.Types.Enums;

namespace Streaming.Controllers
{
    [Route("Auth")]
    public class AuthController(TelegramService telegramService, IConfiguration configuration)
        : Controller
    {
        [HttpGet]
        [HttpPost]
        [IgnoreAntiforgeryToken]
        [Route("Telegram")]
        public async Task<IActionResult> Telegram()
        {
            string GetValue(string key)
            {
                if (Request.Query.ContainsKey(key)) return Request.Query[key].ToString();
                if (Request.HasFormContentType && Request.Form.ContainsKey(key)) return Request.Form[key].ToString();
                return string.Empty;
            }

            if (!long.TryParse(GetValue("id"), out var id))
            {
                return BadRequest("Missing or invalid Telegram id");
            }

            var authDateStr = GetValue("auth_date");
            var authDate = long.TryParse(authDateStr, out var adVal) ? adVal : 0L;

            var authData = new TelegramAuthData
            {
                Id = id,
                FirstName = GetValue("first_name"),
                LastName = GetValue("last_name"),
                Username = GetValue("username"),
                PhotoUrl = GetValue("photo_url"),
                AuthDate = authDate,
                Hash = GetValue("hash")
            };

            var botToken = configuration["Telegram:BotToken"];

            if (string.IsNullOrEmpty(botToken))
            {
                return BadRequest("Telegram bot is not configured");
            }

            if (!telegramService.ValidateTelegramAuth(authData, botToken))
            {
                return BadRequest("Invalid Telegram authentication data");
            }

            HttpContext.Session.SetString("UserId", authData.Id.ToString());
            HttpContext.Session.SetString("Username", authData.Username);
            HttpContext.Session.SetString("UserStatus", "-1");

            return Redirect("/");
        }

        [HttpPost]
        [Route("Logout")]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return Redirect("/Auth/Login");
        }

        [HttpGet]
        [Route("TestLogin")]
        public IActionResult TestLogin()
        {
            HttpContext.Session.SetString("UserId", Guid.NewGuid().ToString());
            HttpContext.Session.SetString("Username", "John Rambo");
            HttpContext.Session.SetString("UserStatus", "-1");

            return Redirect("/");
        }
    }
}