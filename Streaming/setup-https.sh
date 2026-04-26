#!/bin/bash

# 🌐 Скрипт настройки HTTPS для footballteams.ru
# Использование: ./setup-https.sh [домен]
# По умолчанию: footballteams.ru

DOMAIN=${1:-footballteams.ru}

echo "🚀 Настройка HTTPS для домена: $DOMAIN"

# Остановить API контейнер
cd /opt/streaming
docker-compose stop api

# Установить Nginx и Certbot
echo "📦 Установка Nginx и Certbot..."
apt update
apt install nginx certbot python3-certbot-nginx -y

# Получить SSL сертификат для основного домена и www
echo "🔐 Получение SSL сертификата для $DOMAIN и www.$DOMAIN..."
certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN

# Создать конфигурацию Nginx
echo "⚙️ Создание конфигурации Nginx..."
cat > /etc/nginx/sites-available/streaming << EOF
# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL optimization
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Main application proxy
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;

        # WebSocket support for SignalR
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # RTMP playback endpoint
    location /live/ {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;

        # CORS headers for video streaming
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
        add_header Access-Control-Expose-Headers 'Content-Length,Content-Range' always;

        # Cache settings for video
        location ~* \.(m3u8|ts)$ {
            add_header Cache-Control no-cache;
        }
    }

    # Static files optimization
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Активировать конфигурацию
ln -sf /etc/nginx/sites-available/streaming /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверить и запустить Nginx
echo "🔍 Проверка конфигурации Nginx..."
nginx -t
systemctl enable nginx
systemctl restart nginx

# Обновить файрвол
echo "🔥 Настройка файрвола..."
ufw allow 443/tcp
ufw allow 80/tcp
ufw reload

# Обновить контейнер с новой конфигурацией
echo "🐳 Обновление Docker контейнера..."
docker-compose pull api
docker-compose start api

# Настроить автообновление сертификата
echo "⏰ Настройка автообновления SSL сертификата..."
echo "0 12 * * * /usr/bin/certbot renew --quiet && /usr/sbin/nginx -s reload" | crontab -

echo ""
echo "✅ HTTPS настроен успешно для $DOMAIN!"
echo ""
echo "🌐 Ваши сайты:"
echo "   • Основной сайт:    https://$DOMAIN"
echo "   • С www:           https://www.$DOMAIN" 
echo "   • API тест:        https://$DOMAIN/api/streaming/test"
echo "   • Тестовая страница: https://$DOMAIN/test"
echo ""
echo "📺 RTMP стриминг:"
echo "   • Стрим URL:       rtmp://$DOMAIN:1935/live/YOUR_STREAM_KEY"
echo "   • Плейбек:        https://$DOMAIN/live/YOUR_STREAM_KEY.m3u8"
echo ""

# Проверить статус через 10 секунд
echo "🔍 Проверка доступности через 10 секунд..."
sleep 10

echo "📊 Проверка HTTP -> HTTPS редиректа:"
curl -I http://$DOMAIN 2>/dev/null | head -3

echo ""
echo "📊 Проверка HTTPS доступности:"
curl -I https://$DOMAIN 2>/dev/null | head -3 || echo "⚠️ HTTPS еще недоступен - подождите 2-5 минут для пропагации DNS"

echo ""
echo "🎯 Следующие шаги:"
echo "   1. Подождите 2-5 минут для пропагации DNS"
echo "   2. Откройте https://$DOMAIN в браузере"
echo "   3. Проверьте что SSL сертификат валидный (зеленый замок)"