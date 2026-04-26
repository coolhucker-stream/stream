## 🚀 Пошаговое развертывание на FirstVDS

### Шаг 1: Заказ VPS на FirstVDS

1. **Перейти на [firstvds.ru](https://firstvds.ru)**
2. **Выбрать "VPS серверы"**
3. **Заказать VPS-4** (2 vCPU, 4 ГБ RAM, 40 ГБ SSD) - **399₽/мес**
4. **Операционная система:** Ubuntu 22.04 LTS
5. **Дата-центр:** Москва (рекомендуется)
6. **Способ оплаты:** карта, Яндекс.Деньги, QIWI

### Шаг 2: Получение данных доступа

После оплаты вы получите на email:
- **IP адрес сервера**
- **Логин:** root
- **Пароль:** для SSH доступа
- **Ссылку на панель управления**

### Шаг 3: Подключение к серверу

```powershell
# Подключение через SSH (Windows PowerShell)
ssh root@YOUR_SERVER_IP

# Введите пароль из письма FirstVDS
# Рекомендуется сразу сменить пароль: passwd
```

### Шаг 4: Начальная настройка сервера

```bash
# Обновить систему
apt update && apt upgrade -y

# Установить необходимые пакеты
apt install curl wget git htop nano ufw -y

# Настроить часовой пояс
timedatectl set-timezone Europe/Moscow

# Проверить ресурсы
free -h
df -h
```

### Шаг 5: Установка Docker

```bash
# Установить Docker (официальный способ)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Установить Docker Compose
apt install docker-compose -y

# Добавить пользователя в группу docker (опционально)
# usermod -aG docker $USER

# Проверить установку
docker --version
docker-compose --version

# Тест Docker
docker run hello-world
```

### Шаг 6: Развертывание Streaming Platform

```bash
# Создать папку проекта
mkdir -p /opt/streaming && cd /opt/streaming

# Клонировать проект с GitHub
git clone https://github.com/coolhucker-stream/stream.git .

# Создать необходимые директории
mkdir -p data media logs certs nginx/ssl

# Скопировать production конфигурацию
cp docker-compose.prod.yml docker-compose.yml

# Проверить конфигурацию
cat docker-compose.yml

# Загрузить образы Docker
docker-compose pull

# Запустить сервисы в фоновом режиме
docker-compose up -d
```

### Шаг 7: Настройка файрвола

```bash
# Сбросить UFW к defaults
ufw --force reset

# Разрешить необходимые порты
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 1935/tcp    # RTMP для стриминга
ufw allow 8000/tcp    # RTMP HTTP интерфейс

# Включить файрвол
ufw --force enable

# Проверить статус
ufw status verbose
```

### Шаг 8: Проверка работоспособности

```bash
# Проверить запущенные контейнеры
docker-compose ps

# Проверить логи
docker-compose logs --tail=50

# Проверить API
curl http://localhost/api/streaming/test

# Проверить внешний доступ
curl http://$(curl -s ifconfig.me)/api/streaming/test

# Посмотреть использование ресурсов
docker stats --no-stream
```

---

## 🌍 Настройка домена и SSL

### Вариант 1: Покупка домена на FirstVDS

FirstVDS также продает домены:
- **.ru домены:** от 199₽/год
- **.рф домены:** от 99₽/год  
- **Международные домены:** от 499₽/год

### Вариант 2: Использование внешнего регистратора

Можете купить домен на любом регистраторе (REG.RU, Timeweb и т.д.)

### DNS настройка:

```bash
# В панели управления доменом добавить записи:
A    @           YOUR_SERVER_IP
A    www         YOUR_SERVER_IP
A    rtmp        YOUR_SERVER_IP
A    api         YOUR_SERVER_IP
```

### SSL сертификат (Let's Encrypt):

```bash
# Установить Certbot
apt install certbot nginx -y

# Остановить контейнер API для получения сертификата
docker-compose stop api

# Получить SSL сертификат
certbot certonly --standalone -d yourdomain.ru -d www.yourdomain.ru

# Создать Nginx конфигурацию для HTTPS
cat > /etc/nginx/sites-available/streaming << 'EOF'
server {
    listen 80;
    server_name yourdomain.ru www.yourdomain.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.ru www.yourdomain.ru;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.ru/privkey.pem;
    
    # SSL оптимизация
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Проксирование к API
    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket поддержка (если нужно)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # RTMP плейбек
    location /live/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        
        # CORS для видео
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
        add_header Access-Control-Expose-Headers 'Content-Length,Content-Range';
    }
}
EOF

# Активировать конфигурацию
ln -s /etc/nginx/sites-available/streaming /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Удалить default site
nginx -t && systemctl reload nginx

# Настроить автообновление SSL
echo "0 12 * * * /usr/bin/certbot renew --quiet && /usr/sbin/nginx -s reload" | crontab -

# Запустить API контейнер обратно
docker-compose start api
```

---

## ⚡ Оптимизация для FirstVDS

### Настройки системы для стриминга:

```bash
# Оптимизация сети для стриминга
cat >> /etc/sysctl.conf << 'EOF'
# Network optimization for streaming
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.ip_local_port_range = 1024 65000

# TCP optimization
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728

# File limits
fs.file-max = 2097152
EOF

# Применить настройки
sysctl -p

# Увеличить лимиты файлов
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535
EOF
```

### Docker оптимизация:

```bash
# Создать конфигурацию Docker для производительности
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ]
}
EOF

# Перезапустить Docker
systemctl restart docker
```

---

## 📊 Мониторинг и управление

### Установка мониторинга:

```bash
# Установить инструменты мониторинга
apt install htop iotop nethogs ncdu -y

# Создать скрипт мониторинга
cat > /opt/monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/streaming-monitor.log"
echo "=== $(date) ===" >> $LOG_FILE

# CPU и память
echo "=== SYSTEM RESOURCES ===" >> $LOG_FILE
echo "CPU Usage:" >> $LOG_FILE
top -bn1 | grep "Cpu(s)" >> $LOG_FILE
echo "Memory Usage:" >> $LOG_FILE
free -h >> $LOG_FILE
echo "Disk Usage:" >> $LOG_FILE
df -h / >> $LOG_FILE

# Docker контейнеры
echo "=== DOCKER CONTAINERS ===" >> $LOG_FILE
cd /opt/streaming
docker-compose ps >> $LOG_FILE
echo "Docker Stats:" >> $LOG_FILE
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" >> $LOG_FILE

# Сетевая активность
echo "=== NETWORK ===" >> $LOG_FILE
ss -tuln | grep -E ':(80|443|1935|8000)' >> $LOG_FILE

echo "===========================================" >> $LOG_FILE
echo "" >> $LOG_FILE

# Ротация логов (оставляем только последние 100 записей)
tail -n 100 $LOG_FILE > ${LOG_FILE}.tmp && mv ${LOG_FILE}.tmp $LOG_FILE
EOF

chmod +x /opt/monitor.sh

# Добавить в cron (каждые 5 минут)
echo "*/5 * * * * /opt/monitor.sh" | crontab -
```

### Управляющие скрипты:

```bash
# Скрипт перезапуска сервисов
cat > /opt/restart-streaming.sh << 'EOF'
#!/bin/bash
cd /opt/streaming
echo "Restarting streaming services..."
docker-compose restart
echo "Services restarted. Status:"
docker-compose ps
EOF

# Скрипт обновления
cat > /opt/update-streaming.sh << 'EOF'
#!/bin/bash
cd /opt/streaming
echo "Updating streaming platform..."

# Остановить сервисы
docker-compose down

# Обновить код
git pull origin master

# Обновить образы
docker-compose pull

# Запустить обновленные сервисы
docker-compose up -d

echo "Update complete. Status:"
docker-compose ps
EOF

chmod +x /opt/restart-streaming.sh /opt/update-streaming.sh
```

---

## 📋 Бекапы и восстановление

### Автоматические бекапы:

```bash
# Создать скрипт бекапа
cat > /opt/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups"
PROJECT_DIR="/opt/streaming"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="streaming_backup_$DATE"

# Создать папку бекапов
mkdir -p $BACKUP_DIR

# Остановить сервисы для консистентности данных
cd $PROJECT_DIR
docker-compose stop

# Создать бекап
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
    -C $PROJECT_DIR \
    data media docker-compose.yml \
    --exclude='*.log'

# Запустить сервисы обратно
docker-compose start

# Удалить старые бекапы (оставить последние 7)
find $BACKUP_DIR -name "streaming_backup_*.tar.gz" -mtime +7 -delete

echo "Backup created: $BACKUP_NAME.tar.gz"
ls -lh "$BACKUP_DIR/$BACKUP_NAME.tar.gz"
EOF

chmod +x /opt/backup.sh

# Настроить ежедневные бекапы в 3:00
echo "0 3 * * * /opt/backup.sh" | crontab -l | crontab -

# Создать папку для бекапов
mkdir -p /opt/backups
```

---

## 💰 Стоимость на FirstVDS

### 🎯 **Рекомендуемая конфигурация:**
- **VPS-4:** 2 vCPU, 4GB RAM, 40GB SSD = **399₽/месяц**
- **Домен .ru:** ~199₽/год
- **SSL:** Бесплатно (Let's Encrypt)
- **Трафик:** 4000 ГБ/месяц (более чем достаточно)

### **Общая стоимость: ~415₽/месяц**

### 💸 **Сравнение с конкурентами:**

| Провайдер | VPS (2CPU/4GB) | Особенности | Итого/мес |
|-----------|----------------|-------------|-----------|
| **FirstVDS** 🏆 | **399₽** | Лучшая цена, SSD, качество | **415₽** |
| **REG.RU** | 550₽ | Домены дешевле | 570₽ |
| **Timeweb** | 599₽ | Больше автоматизации | 600₽ |
| **Beget** | 525₽ | Средняя цена | 545₽ |

### 🏆 **FirstVDS - ЛУЧШЕЕ соотношение цена/качество!**

---

## 🎯 Преимущества FirstVDS для streaming

### ✅ **Плюсы:**
- **🏆 Лучшая цена** - 399₽ за VPS-4 (vs 550₽+ у конкурентов)
- **⚡ Высокая производительность** - SSD диски, быстрая сеть
- **🛡️ Надежность** - работает с 2007 года, отличная репутация
- **🇷🇺 Российская юрисдикция** - стабильность и законность
- **📞 Отличная поддержка** - быстрые ответы, компетентные специалисты
- **🚀 Стриминг-френдли** - никаких ограничений на медиа-контент
- **📊 Гибкое масштабирование** - легко увеличить ресурсы

### ⚠️ **Минусы:**
- **Ручная настройка** - нужно самостоятельно настраивать (как и везде на VPS)
- **Нет managed сервисов** - базовый VPS без дополнительных услуг

---

## 🚀 Быстрый старт с FirstVDS

### 1️⃣ **Заказать VPS:**
- Зайти на [firstvds.ru](https://firstvds.ru)
- Выбрать VPS-4 (399₽/мес)
- Ubuntu 22.04, ДЦ Москва

### 2️⃣ **Развернуть за 10 минут:**
```bash
# Подключиться к серверу
ssh root@YOUR_IP

# Запустить автоустановку
curl -sSL https://raw.githubusercontent.com/coolhucker-stream/stream/main/deploy-firstvds.sh | bash
```

### 3️⃣ **Настроить домен:**
- Купить домен где удобно
- Добавить A-запись → IP сервера
- Настроить SSL через certbot

---

## 📞 Поддержка FirstVDS

### Как получить помощь:
- **Тикет-система:** в личном кабинете
- **Email:** support@firstvds.ru
- **Телефон:** +7 (495) 663-31-63
- **Время работы:** 24/7

### Полезные ссылки:
- **Панель управления:** [cp.firstvds.ru](https://cp.firstvds.ru)
- **База знаний:** [wiki.firstvds.ru](https://wiki.firstvds.ru)
- **Статус сервисов:** [status.firstvds.ru](https://status.firstvds.ru)

---

## 🎯 Вывод

**FirstVDS - отличный выбор для streaming платформы:**

- 🏆 **Лучшая цена на рынке** - VPS-4 за 399₽/мес
- ⚡ **Высокое качество сервиса** - SSD, быстрая сеть
- 🛡️ **Надежность и стабильность** - 15+ лет на рынке
- 🇷🇺 **Российская юрисдикция** - никаких рисков
- 📞 **Отличная поддержка** - помогут решить любые вопросы

**Рекомендуется для всех типов проектов - от стартапов до бизнеса! 🚀**