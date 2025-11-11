using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Requests;
using Streaming.Models;

namespace Streaming.Services
{
    public class TelegramService
    {
        private readonly ITelegramBotClient _botClient;
        private readonly string? _requiredGroupId;

        public TelegramService(IConfiguration configuration)
        {
            var botToken = configuration["Telegram:BotToken"];
            _requiredGroupId = configuration["Telegram:RequiredGroupId"];

            if (string.IsNullOrEmpty(botToken))
            {
                throw new InvalidOperationException("Telegram BotToken is not configured");
            }

            _botClient = new TelegramBotClient(botToken);
        }

        /// <summary>
        /// Проверяет подписку пользователя на требуемую группу
        /// </summary>
        public async Task<ChatMemberStatus?> IsUserSubscribedToGroup(long userId)
        {
            if (string.IsNullOrEmpty(_requiredGroupId))
            {
                return null; // Если группа не указана, пропускаем проверку
            }

            try
            {
                var chatMember = await _botClient.GetChatMember(_requiredGroupId, userId);

                return chatMember.Status;

            }
            catch (Exception)
            {
                // Если не можем проверить (бот не админ, пользователь не в группе и т.д.)
                return null;
            }
        }

        /// <summary>
        /// Валидирует данные авторизации от Telegram
        /// </summary>
        public bool ValidateTelegramAuth(TelegramAuthData data, string botToken)
        {
            // Проверяем, что auth_date не старше 24 часов
            var authDate = DateTimeOffset.FromUnixTimeSeconds(data.AuthDate);
            if (DateTimeOffset.UtcNow - authDate > TimeSpan.FromHours(24))
            {
                return false;
            }

            // Создаем строку для проверки
            var dataCheckString = $"auth_date={data.AuthDate}\n" +
                                 $"first_name={data.FirstName}\n" +
                                 $"id={data.Id}\n" +
                                 $"last_name={data.LastName}\n" +
                                 $"photo_url={data.PhotoUrl}\n" +
                                 $"username={data.Username}";

            // Вычисляем HMAC-SHA256
            using var hmac = new System.Security.Cryptography.HMACSHA256(
                System.Text.Encoding.UTF8.GetBytes(botToken));
            var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(dataCheckString));
            var computedHash = BitConverter.ToString(hash).Replace("-", "").ToLower();

            return computedHash == data.Hash;
        }
    }
}