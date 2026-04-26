#!/bin/bash

# 🚀 Скрипт быстрого обновления Streaming Platform на FirstVDS
# Исправляет проблему с неправильными URL плейбека

set -e

echo "🔧 Обновление Streaming Platform..."

# Перейти в папку проекта
cd /opt/streaming

# Остановить сервисы
echo "⏹️ Остановка сервисов..."
docker-compose down

# Получить последние изменения из репозитория
echo "📥 Получение обновлений..."
git pull origin master

# Обновить Docker образы
echo "🐳 Обновление Docker образов..."
docker-compose pull

# Запустить обновленные сервисы
echo "🚀 Запуск сервисов..."
docker-compose up -d

# Ожидание запуска
echo "⏳ Ожидание запуска сервисов..."
sleep 15

# Проверка статуса
echo "✅ Проверка статуса..."
docker-compose ps

echo ""
echo "🎯 Проверка URL плейбека..."
echo "API: http://$(curl -s ifconfig.me):8080/api/streaming/test"
echo "Плейбек: http://$(curl -s ifconfig.me):8081/live/disco-bayern.m3u8"

# Проверить активные стримы
echo ""
echo "📊 Активные стримы:"
curl -s http://localhost:8080/api/streaming/status | python3 -m json.tool || curl -s http://localhost:8080/api/streaming/status

echo ""
echo "✅ Обновление завершено!"
echo "🎥 Теперь плейбек должен работать правильно: http://$(curl -s ifconfig.me):8081/live/disco-bayern.m3u8"