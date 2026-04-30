using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Streaming.Models;
using Streaming.Services;
using Telegram.Bot.Types.Enums;

namespace Streaming.Controllers
{
    [Route("Auth")]
    public class AuthController : Controller
    {
        private readonly TelegramService _telegramService;
        private readonly IConfiguration _configuration;
        private readonly IHubContext<StreamHub> _hubContext;

        public AuthController(TelegramService telegramService, IConfiguration configuration, IHubContext<StreamHub> hubContext)
        {
            _telegramService = telegramService;
            _configuration = configuration;
            _hubContext = hubContext;
        }

        [HttpGet]
        [HttpPost]
        [IgnoreAntiforgeryToken]
        [Route("Telegram")]
        public async Task<IActionResult> Telegram()
        {
            // Read values from query first, then form as fallback
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

            var botToken = _configuration["Telegram:BotToken"];

            if (string.IsNullOrEmpty(botToken))
            {
                return BadRequest("Telegram bot is not configured");
            }

            if (!_telegramService.ValidateTelegramAuth(authData, botToken))
            {
                return BadRequest("Invalid Telegram authentication data");
            }

            var status = await _telegramService.IsUserSubscribedToGroup(authData.Id);

            if (status != ChatMemberStatus.Member &&
                status != ChatMemberStatus.Administrator &&
                status != ChatMemberStatus.Creator)
            {
                return Redirect($"/Error?message=You must subscribe to our Telegram group to access this site");
            }

            HttpContext.Session.SetString("TelegramUserId", authData.Id.ToString());
            HttpContext.Session.SetString("TelegramUsername", authData.Username);
            HttpContext.Session.SetString("TelegramFirstName", authData.FirstName);
            HttpContext.Session.SetString("TelegramStatus", ((int)status).ToString());

            //Notify all clients about login
            await _hubContext.Clients.All.SendAsync("UserLoggedIn", new
            {
                userId = authData.Id.ToString(),
                username = authData.Username,
                firstName = authData.FirstName
            });

            return Redirect("/");
        }

        [HttpPost]
        [Route("Logout")]
        public async Task<IActionResult> Logout()
        {
            HttpContext.Session.Clear();

            // Notify all clients about logout
            await _hubContext.Clients.All.SendAsync("UserLoggedOut");

            return Redirect("/");
        }

        [HttpGet]
        [Route("TestLogin")]
        public async Task<IActionResult> TestLogin()
        {
            // Simulate login with test data for development
            var userId = Guid.NewGuid().ToString();
            var username = "Alexandr";
            var firstName = $"Platonov {DateTime.Now.Second}";

            HttpContext.Session.SetString("TelegramUserId", userId);
            HttpContext.Session.SetString("TelegramUsername", username);
            HttpContext.Session.SetString("TelegramFirstName", firstName);
            HttpContext.Session.SetString("TelegramStatus", ((int)ChatMemberStatus.Administrator).ToString());

            // Notify all clients about login
            await _hubContext.Clients.All.SendAsync("UserLoggedIn", new
            {
                userId = userId,
                username = username,
                firstName = firstName
            });

            return Redirect("/");
        }
    }
}