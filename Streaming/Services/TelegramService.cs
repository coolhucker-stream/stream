using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Requests;
using Streaming.Models;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Collections.Generic;
using System.Threading;
using Telegram.Bot.Exceptions;
using System.Diagnostics;

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
            return ChatMemberStatus.Creator;
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
        /// Валидирует данные авторизации от Telegram по спецификации
        /// secret_key = SHA256(bot_token)
        /// data_check_string = sorted key=value lines (only present fields, exclude hash)
        /// HMAC-SHA256(data_check_string, secret_key) == hash
        /// </summary>
        public bool ValidateTelegramAuth(TelegramAuthData data, string botToken)
        {
            // Проверяем, что auth_date не старше 24 часов
            var authDate = DateTimeOffset.FromUnixTimeSeconds(data.AuthDate);
            if (DateTimeOffset.UtcNow - authDate > TimeSpan.FromHours(24))
            {
                return false;
            }

            // Собираем только присутствующие поля (исключая hash) в словарь
            var fields = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["auth_date"] = data.AuthDate.ToString(),
                ["id"] = data.Id.ToString()
            };

            if (!string.IsNullOrEmpty(data.FirstName)) fields["first_name"] = data.FirstName;
            if (!string.IsNullOrEmpty(data.LastName)) fields["last_name"] = data.LastName;
            if (!string.IsNullOrEmpty(data.Username)) fields["username"] = data.Username;
            if (!string.IsNullOrEmpty(data.PhotoUrl)) fields["photo_url"] = data.PhotoUrl;

            // Формируем data_check_string: ключи в лексикографическом порядке, разделитель '\n'
            var dataCheckString = string.Join('\n', fields.OrderBy(kv => kv.Key).Select(kv => $"{kv.Key}={kv.Value}"));

            // secret_key = SHA256(bot_token)
            byte[] secretKey;
            using (var sha256 = SHA256.Create())
            {
                secretKey = sha256.ComputeHash(Encoding.UTF8.GetBytes(botToken));
            }

            // Вычисляем HMAC-SHA256
            byte[] computedHashBytes;
            using (var hmac = new HMACSHA256(secretKey))
            {
                computedHashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(dataCheckString));
            }

            // Преобразуем предоставленный hex hash в байты
            if (string.IsNullOrEmpty(data.Hash)) return false;
            try
            {
                // Convert.FromHexString available in .NET 5+; fallback to manual parsing if needed
                byte[] providedHashBytes;
                try
                {
                    providedHashBytes = Convert.FromHexString(data.Hash);
                }
                catch
                {
                    providedHashBytes = Enumerable.Range(0, data.Hash.Length / 2)
                        .Select(i => Convert.ToByte(data.Hash.Substring(i * 2, 2), 16))
                        .ToArray();
                }

                // Timing-safe comparison
                return CryptographicOperations.FixedTimeEquals(computedHashBytes, providedHashBytes);
            }
            catch
            {
                return false;
            }
        }
    }
}