# 🚀 FirstVDS.ru Deployment Script с обновленными портами
param(
    [string]$ServerIP = "",
    [string]$Domain = "",
    [switch]$SetupSSL = $false,
    [switch]$CreateDeployPackage = $true
)

Write-Host "🚀 ========================================" -ForegroundColor Cyan
Write-Host "   FirstVDS.ru Deployment Script" -ForegroundColor Yellow  
Write-Host "🚀 ========================================" -ForegroundColor Cyan
Write-Host ""

if ($CreateDeployPackage) {
    Write-Host "📦 Creating deployment package for FirstVDS..." -ForegroundColor Blue
    
    # Создание папки для развертывания
    $deployDir = "firstvds-deploy"
    if (Test-Path $deployDir) {
        Remove-Item -Recurse -Force $deployDir
    }
    New-Item -ItemType Directory -Path $deployDir | Out-Null
    
    # Список файлов для копирования
    $filesToCopy = @(
        "docker-compose.prod.yml",
        "Dockerfile",
        "Dockerfile.rtmp",
        "appsettings.Production.json",
        "deploy.sh"
    )
    
    # Копирование файлов
    foreach ($file in $filesToCopy) {
        if (Test-Path $file) {
            Copy-Item $file $deployDir/
            Write-Host "✅ Copied: $file" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Missing: $file" -ForegroundColor Yellow
        }
    }
    
    # Копирование проекта
    if (Test-Path "*.csproj") {
        Write-Host "📁 Copying .NET project files..." -ForegroundColor Blue
        
        $projectFiles = Get-ChildItem -Recurse -Include "*.cs", "*.cshtml", "*.csproj", "*.json", "*.js" | 
            Where-Object { $_.FullName -notmatch "\\bin\\|\\obj\\|\\node_modules\\|\\firstvds-deploy\\" }
        
        foreach ($file in $projectFiles) {
            $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1)
            $targetPath = Join-Path $deployDir $relativePath
            $targetDir = Split-Path $targetPath -Parent
            
            if (!(Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            
            Copy-Item $file.FullName $targetPath -Force
        }
        Write-Host "✅ Project files copied" -ForegroundColor Green
    }
    
    # Переименование docker-compose файла
    if (Test-Path "$deployDir/docker-compose.prod.yml") {
        Rename-Item "$deployDir/docker-compose.prod.yml" "docker-compose.yml"
        Write-Host "✅ Docker compose configured for production" -ForegroundColor Green
    }
    
    # Создание скрипта установки для FirstVDS
    $installScript = @"
#!/bin/bash
echo "🚀 Installing Streaming Platform on FirstVDS..."
echo "================================================"

# Цвета для вывода  
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Функция проверки ошибок
check_error() {
    if [ `$? -ne 0 ]; then
        echo -e "`${RED}❌ Error: `$1`${NC}"
        exit 1
    else
        echo -e "`${GREEN}✅ `$1`${NC}"
    fi
}

# Получение IP адреса
get_ip() {
    curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP"
}

echo -e "`${CYAN}🌐 FirstVDS Streaming Platform Installation`${NC}"
echo -e "`${BLUE}=========================================`${NC}"

# Обновление системы
echo -e "`${BLUE}📦 Updating system packages...`${NC}"
apt update && apt upgrade -y
check_error "System updated"

# Установка необходимых пакетов
echo -e "`${BLUE}📋 Installing required packages...`${NC}"
apt install curl wget git htop nano ufw unzip -y
check_error "Required packages installed"

# Настройка часового пояса
echo -e "`${BLUE}🕐 Setting timezone...`${NC}"
timedatectl set-timezone Europe/Moscow
check_error "Timezone set to Moscow"

# Установка Docker
echo -e "`${BLUE}🐳 Installing Docker...`${NC}"
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh
check_error "Docker installed"

# Установка Docker Compose
echo -e "`${BLUE}🔧 Installing Docker Compose...`${NC}"
apt install docker-compose -y
check_error "Docker Compose installed"

# Проверка Docker
echo -e "`${BLUE}🔍 Testing Docker installation...`${NC}"
docker --version
docker-compose --version
docker run --rm hello-world > /dev/null 2>&1
check_error "Docker is working"

# Создание директорий
echo -e "`${BLUE}📁 Creating project directories...`${NC}"
mkdir -p data media logs certs nginx/ssl
check_error "Project directories created"

# Настройка файрвола
echo -e "`${BLUE}🔥 Configuring firewall...`${NC}"
ufw --force reset
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 1935/tcp    # RTMP
ufw allow 8000/tcp    # RTMP HTTP
ufw --force enable
check_error "Firewall configured"

# Оптимизация системы для стриминга
echo -e "`${BLUE}⚡ Optimizing system for streaming...`${NC}"
cat >> /etc/sysctl.conf << 'SYSCTL_EOF'
# Network optimization for streaming
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.ip_local_port_range = 1024 65000
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
fs.file-max = 2097152
SYSCTL_EOF

sysctl -p > /dev/null 2>&1
check_error "System optimized for streaming"

# Docker оптимизация
echo -e "`${BLUE}🐳 Optimizing Docker...`${NC}"
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'DOCKER_EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m", 
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
DOCKER_EOF

systemctl restart docker
sleep 5
check_error "Docker optimized"

# Запуск сервисов
echo -e "`${BLUE}🚀 Starting streaming services...`${NC}"
docker-compose pull
docker-compose up -d
check_error "Services started"

# Ожидание запуска сервисов
echo -e "`${YELLOW}⏳ Waiting for services to initialize...`${NC}"
sleep 30

# Проверка статуса сервисов
echo -e "`${BLUE}📊 Checking service status...`${NC}"
docker-compose ps

# Создание скриптов управления
echo -e "`${BLUE}📝 Creating management scripts...`${NC}"

# Скрипт мониторинга
cat > /opt/monitor.sh << 'MONITOR_EOF'
#!/bin/bash
LOG_FILE="/var/log/streaming-monitor.log"
echo "=== `$(date) ===" >> `$LOG_FILE
echo "CPU: `$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - `$1"%"}')" >> `$LOG_FILE
echo "RAM: `$(free | grep Mem | awk '{printf("%.1f%%", `$3/`$2 * 100.0)}')" >> `$LOG_FILE
echo "Docker: `$(cd /opt/streaming && docker-compose ps --format=table 2>/dev/null | tail -n +2 | wc -l) containers" >> `$LOG_FILE
echo "---" >> `$LOG_FILE
tail -n 50 `$LOG_FILE > `${LOG_FILE}.tmp && mv `${LOG_FILE}.tmp `$LOG_FILE
MONITOR_EOF

chmod +x /opt/monitor.sh

# Добавить в cron
echo "*/5 * * * * /opt/monitor.sh" | crontab -

# Получение внешнего IP
EXTERNAL_IP=`$(get_ip)

echo ""
echo -e "`${GREEN}🎉 ====================================`${NC}"
echo -e "`${GREEN}   FirstVDS Deployment Complete!`${NC}"
echo -e "`${GREEN}🎉 ====================================`${NC}"
echo ""
echo -e "`${CYAN}📱 Your Streaming Platform:`${NC}"
echo -e "   🌐 Web Interface: http://`$EXTERNAL_IP/"
echo -e "   📡 RTMP Server: rtmp://`$EXTERNAL_IP/live"
echo -e "   📊 API Endpoint: http://`$EXTERNAL_IP/api/streaming/test"
echo -e "   🎮 Dashboard: http://`$EXTERNAL_IP/dashboard"
echo ""
echo -e "`${CYAN}🛠️  Management Commands:`${NC}"
echo -e "   📊 Status: cd /opt/streaming && docker-compose ps"
echo -e "   📋 Logs: cd /opt/streaming && docker-compose logs -f"
echo -e "   🔄 Restart: cd /opt/streaming && docker-compose restart"
echo -e "   🛑 Stop: cd /opt/streaming && docker-compose down"
echo -e "   📈 Monitor: tail -f /var/log/streaming-monitor.log"
echo ""
echo -e "`${YELLOW}🌐 Next Steps:`${NC}"
echo -e "   1. 🌍 Configure domain DNS: A record @ -> `$EXTERNAL_IP"
echo -e "   2. 🔒 Setup SSL: apt install certbot nginx && certbot --nginx"
echo -e "   3. 🎥 Test streaming with OBS Studio"
echo -e "   4. 📊 Setup monitoring and backups"
echo ""
echo -e "`${GREEN}🎬 Ready to stream on FirstVDS! 🚀`${NC}"

# Показать системную информацию
echo ""
echo -e "`${BLUE}💻 System Information:`${NC}"
echo -e "   CPU: `$(nproc) cores"
echo -e "   RAM: `$(free -h | grep Mem | awk '{print `$2}')"
echo -e "   Disk: `$(df -h / | tail -1 | awk '{print `$2}')"
echo -e "   OS: `$(lsb_release -d | cut -f2)"
"@

    $installScript | Out-File -FilePath "$deployDir/install.sh" -Encoding ASCII
    
    # Создание архива
    Write-Host "📦 Creating deployment archive..." -ForegroundColor Blue
    Compress-Archive -Path "$deployDir\*" -DestinationPath "firstvds-streaming-deploy.zip" -Force
    Write-Host "✅ Archive created: firstvds-streaming-deploy.zip" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 FirstVDS.ru Deployment Instructions:" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrEmpty($ServerIP)) {
    Write-Host "🎯 Step 1: Order VPS on FirstVDS" -ForegroundColor Yellow
    Write-Host "   • Go to https://firstvds.ru" -ForegroundColor Gray
    Write-Host "   • Choose 'VPS Servers'" -ForegroundColor Gray  
    Write-Host "   • Order VPS-4 (2 CPU, 4GB RAM) = 399₽/month" -ForegroundColor Gray
    Write-Host "   • Select Ubuntu 22.04 LTS" -ForegroundColor Gray
    Write-Host "   • Data Center: Moscow (recommended)" -ForegroundColor Gray
    Write-Host "   • Payment: Card, Yandex.Money, QIWI" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "🚀 Step 2: Deploy Streaming Platform" -ForegroundColor Yellow
    Write-Host "   • Get server IP and password from FirstVDS email" -ForegroundColor Gray
    Write-Host "   • Upload: scp firstvds-streaming-deploy.zip root@YOUR_IP:/opt/" -ForegroundColor Gray
    Write-Host "   • Connect: ssh root@YOUR_IP" -ForegroundColor Gray
    Write-Host "   • Deploy: cd /opt && unzip firstvds-streaming-deploy.zip && chmod +x install.sh && ./install.sh" -ForegroundColor Gray
} else {
    Write-Host "🚀 Deploying to FirstVDS server: $ServerIP" -ForegroundColor Green
    Write-Host ""
    Write-Host "Manual deployment steps:" -ForegroundColor Yellow
    Write-Host "1. Upload deployment package:" -ForegroundColor Gray
    Write-Host "   scp firstvds-streaming-deploy.zip root@${ServerIP}:/opt/" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "2. Connect and install:" -ForegroundColor Gray
    Write-Host "   ssh root@$ServerIP" -ForegroundColor DarkGray
    Write-Host "   cd /opt" -ForegroundColor DarkGray
    Write-Host "   unzip firstvds-streaming-deploy.zip" -ForegroundColor DarkGray
    Write-Host "   chmod +x install.sh" -ForegroundColor DarkGray
    Write-Host "   ./install.sh" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "💰 FirstVDS Pricing (Best Value!):" -ForegroundColor Green
Write-Host "   • VPS-1 (1CPU/1GB): 99₽/month - Testing" -ForegroundColor Gray
Write-Host "   • VPS-2 (1CPU/2GB): 199₽/month - Small load" -ForegroundColor Gray
Write-Host "   • VPS-4 (2CPU/4GB): 399₽/month - Recommended ⭐" -ForegroundColor Yellow
Write-Host "   • VPS-6 (3CPU/6GB): 599₽/month - High load" -ForegroundColor Gray
Write-Host ""

Write-Host "🏆 Why FirstVDS is the BEST choice:" -ForegroundColor Cyan
Write-Host "   ✅ Lowest prices on the market (399₽ vs 550₽+ competitors)" -ForegroundColor Green
Write-Host "   ✅ High performance SSD drives" -ForegroundColor Green
Write-Host "   ✅ Excellent network quality for streaming" -ForegroundColor Green
Write-Host "   ✅ 24/7 Russian support" -ForegroundColor Green
Write-Host "   ✅ 15+ years of reliable service" -ForegroundColor Green
Write-Host ""

Write-Host "💡 Domain and SSL Setup:" -ForegroundColor Cyan
if (![string]::IsNullOrEmpty($Domain)) {
    Write-Host "   • Domain: $Domain" -ForegroundColor Gray
    Write-Host "   • DNS: A record @ -> $ServerIP" -ForegroundColor Gray
    if ($SetupSSL) {
        Write-Host "   • SSL: certbot --nginx -d $Domain" -ForegroundColor Gray
    }
} else {
    Write-Host "   • Buy domain anywhere (FirstVDS also sells domains)" -ForegroundColor Gray
    Write-Host "   • Setup DNS: A record @ -> YOUR_SERVER_IP" -ForegroundColor Gray
    Write-Host "   • Install SSL: apt install certbot nginx && certbot --nginx" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📞 FirstVDS Support:" -ForegroundColor Cyan  
Write-Host "   • Panel: https://cp.firstvds.ru" -ForegroundColor Gray
Write-Host "   • Support: support@firstvds.ru" -ForegroundColor Gray
Write-Host "   • Phone: +7 (495) 663-31-63" -ForegroundColor Gray
Write-Host "   • 24/7 availability" -ForegroundColor Gray
Write-Host ""

Write-Host "🎯 After deployment test:" -ForegroundColor Green
Write-Host "   • Web: http://YOUR_SERVER_IP/dashboard" -ForegroundColor Gray
Write-Host "   • API: curl http://YOUR_SERVER_IP/api/streaming/test" -ForegroundColor Gray
Write-Host "   • RTMP: rtmp://YOUR_SERVER_IP/live (OBS Server URL)" -ForegroundColor Gray
Write-Host ""

Write-Host "🎉 FirstVDS - Best price/performance for streaming! 🚀" -ForegroundColor Green
Write-Host ""

# Показать содержимое архива  
if (Test-Path "firstvds-streaming-deploy.zip") {
    Write-Host "📦 Deployment package contents:" -ForegroundColor Blue
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path "firstvds-streaming-deploy.zip").Path)
        foreach ($entry in $archive.Entries) {
            Write-Host "   📄 $($entry.FullName)" -ForegroundColor DarkGray
        }
        $archive.Dispose()
        Write-Host ""
        Write-Host "📏 Archive size: $((Get-Item 'firstvds-streaming-deploy.zip').Length / 1MB | ForEach-Object { '{0:N2}' -f $_ }) MB" -ForegroundColor Gray
    } catch {
        Write-Host "   📦 Archive created successfully" -ForegroundColor Gray
    }
}