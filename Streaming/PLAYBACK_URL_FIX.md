# 🚨 ИСПРАВЛЕНИЕ ПРОБЛЕМЫ URL ПЛЕЙБЕКА

## 📋 Проблема
Streaming API возвращает неправильный URL для плейбека:
```
❌ "streamUrl":"http://localhost:8000/live/disco-bayern.flv"
✅ Должно быть: "http://62.109.28.207:8081/live/disco-bayern.m3u8"
```

## 🛠️ Быстрое исправление на сервере

### 1. Подключиться к серверу FirstVDS:
```sh
ssh root@62.109.28.207
```

### 2. Выполнить автоматическое обновление:
```sh
cd /opt/streaming
curl -sSL https://raw.githubusercontent.com/coolhucker-stream/stream/main/update-streaming-fix.sh | bash
```

### 3. Или ручное обновление:
```sh
cd /opt/streaming

# Остановить сервисы
docker-compose down

# Получить обновления
git pull origin master

# Пересобрать образы (важно!)
docker-compose build --no-cache

# Запустить
docker-compose up -d

# Проверить через 15 секунд
sleep 15
curl http://localhost:8080/api/streaming/status
```

## ✅ Проверка исправления

После обновления, API должен возвращать:
```json
{
  "streamer": {
    "id": 1,
    "isLive": true,
    "streamKey": "disco-bayern",
    "streamUrl": "http://62.109.28.207:8081/live/disco-bayern.m3u8"
  }
}
```

## 🎥 Правильные URL после исправления:

### Для OBS:
```
RTMP URL: rtmp://62.109.28.207:1935/live
Stream Key: disco-bayern
```

### Для просмотра:
```
HLS плейбек: http://62.109.28.207:8081/live/disco-bayern.m3u8
Web интерфейс: http://62.109.28.207:8080
API статус: http://62.109.28.207:8080/api/streaming/status
```

## 🔧 Что было исправлено:

1. **StreamService.cs** - добавлена поддержка конфигурационных URL
2. **appsettings.json** - добавлены правильные базовые URL
3. **appsettings.Production.json** - настроены продакшн URL
4. **Формат плейбека** - изменен с .flv на .m3u8 (HLS)
5. **Порт** - исправлен с 8000 на 8081

## 🚀 После обновления всё будет работать!

Плейбек станет доступен по адресу:
**http://62.109.28.207:8081/live/disco-bayern.m3u8**