#!/bin/bash
set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 FirstVDS Streaming Platform Auto-Deploy Script${NC}"
echo "=================================================="

# Проверка прав root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ Этот скрипт должен запускаться от root пользователя${NC}"
   exit 1
fi

# Шаг 1: Обновление системы
echo -e "${YELLOW}📦 Шаг 1/8: Обновление системы...${NC}"
apt update && apt upgrade -y
apt install curl wget git htop nano ufw -y

# Настройка часового пояса
timedatectl set-timezone Europe/Moscow

# Шаг 2: Установка Docker
echo -e "${YELLOW}🐳 Шаг 2/8: Установка Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    apt install docker-compose -y
else
    echo -e "${GREEN}✅ Docker уже установлен${NC}"
fi

# Проверка установки Docker
docker --version
docker-compose --version

# Шаг 3: Настройка файрвола
echo -e "${YELLOW}🛡️ Шаг 3/8: Настройка файрвола...${NC}"
ufw --force reset
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 1935/tcp    # RTMP для стриминга
ufw allow 8000/tcp    # RTMP HTTP интерфейс
ufw --force enable

# Шаг 4: Создание папки проекта
echo -e "${YELLOW}📁 Шаг 4/8: Создание папки проекта...${NC}"
mkdir -p /opt/streaming
cd /opt/streaming

# Шаг 5: Клонирование репозитория
echo -e "${YELLOW}📥 Шаг 5/8: Клонирование проекта...${NC}"
if [ -d ".git" ]; then
    git pull origin master
    echo -e "${GREEN}✅ Проект обновлен${NC}"
else
    git clone https://github.com/coolhucker-stream/stream.git .
    echo -e "${GREEN}✅ Проект клонирован${NC}"
fi

# Шаг 6: Создание директорий и конфигурации
echo -e "${YELLOW}⚙️ Шаг 6/8: Настройка конфигурации...${NC}"
mkdir -p data media logs certs nginx/ssl

# Проверить и создать конфигурацию Docker Compose
if [ -f "docker-compose.prod.yml" ]; then
    cp docker-compose.prod.yml docker-compose.yml
    echo -e "${GREEN}✅ Production конфигурация скопирована${NC}"
else
    echo -e "${YELLOW}⚠️ Файл docker-compose.prod.yml не найден, создаем базовую конфигурацию...${NC}"
    cat > docker-compose.yml << 'DOCKER_EOF'
version: "3.8"

services:
  api:
    image: aplatonovnet/streaming-api:latest
    container_name: streaming_api_prod
    ports:
      - "80:80"
      - "443:443"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ASPNETCORE_URLS=http://+:80
      - ASPNETCORE_FORWARDEDHEADERS_ENABLED=true
    volumes:
      - ./data:/app/data
      - ./certs:/app/certs
    networks:
      - streaming-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:80/api/streaming/test || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  rtmp-server:
    image: aplatonovnet/streaming-rtmp:latest
    container_name: rtmp_server_prod
    ports:
      - "1935:1935"
      - "8080:8000"
    environment:
      - DEV_MODE=false
      - API_URL=http://api:80
    volumes:
      - ./media:/usr/src/app/media
    depends_on:
      api:
        condition: service_healthy
    networks:
      - streaming-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8000 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  streaming-network:
    driver: bridge
DOCKER_EOF
    echo -e "${GREEN}✅ Базовая конфигурация создана${NC}"
fi

# Шаг 7: Загрузка и запуск контейнеров
echo -e "${YELLOW}🚀 Шаг 7/8: Загрузка и запуск сервисов...${NC}"
docker-compose pull
docker-compose up -d

# Шаг 8: Проверка работоспособности
echo -e "${YELLOW}🔍 Шаг 8/8: Проверка работоспособности...${NC}"
sleep 30

# Проверка контейнеров
echo -e "${BLUE}📋 Статус контейнеров:${NC}"
docker-compose ps

echo -e "${BLUE}📊 Использование ресурсов:${NC}"
docker stats --no-stream

# Получить IP адрес сервера
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "unknown")

echo ""
echo "=================================================="
echo -e "${GREEN}🎉 РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО УСПЕШНО! 🎉${NC}"
echo "=================================================="
echo ""
echo -e "${BLUE}🌐 Адреса для доступа:${NC}"
echo -e "   • Web интерфейс: http://${SERVER_IP}"
echo -e "   • API тест: http://${SERVER_IP}/api/streaming/test"
echo -e "   • RTMP сервер: rtmp://${SERVER_IP}:1935"
echo -e "   • RTMP плейбек: http://${SERVER_IP}:8080"
echo ""
echo -e "${BLUE}📁 Папки проекта:${NC}"
echo -e "   • Проект: /opt/streaming"
echo -e "   • Данные: /opt/streaming/data"
echo -e "   • Медиа: /opt/streaming/media"
echo ""
echo -e "${BLUE}🔧 Управление:${NC}"
echo -e "   • Статус: docker-compose ps"
echo -e "   • Логи: docker-compose logs"
echo -e "   • Рестарт: docker-compose restart"
echo -e "   • Остановить: docker-compose down"
echo ""
echo -e "${YELLOW}📝 Следующие шаги:${NC}"
echo -e "   1. Настроить домен и DNS записи"
echo -e "   2. Получить SSL сертификат (certbot)"
echo -e "   3. Настроить мониторинг"
echo ""
echo -e "${GREEN}✅ FirstVDS Streaming Platform готова к использованию!${NC}"