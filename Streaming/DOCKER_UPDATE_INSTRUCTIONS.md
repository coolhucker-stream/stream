# 🐳 Инструкции по обновлению Docker образов

## 📋 Обзор
Данные инструкции описывают процесс обновления опубликованных Docker образов в Docker Hub для проекта Streaming.

### 🏷️ Ваши Docker Hub образы:
- `aplatonovnet/streaming-api:latest` - .NET 8 Razor Pages API
- `aplatonovnet/streaming-rtmp:latest` - Node.js RTMP сервер

---

## 🚀 Процедура обновления образов

### 1. Предварительная проверка
```powershell
# Проверить статус Git (убедиться что все изменения зафиксированы)
git status

# Посмотреть текущие локальные образы
docker images | Select-String "aplatonovnet"

# Проверить что Docker запущен
docker version
```

### 2. Остановка текущих контейнеров (если запущены)
```powershell
# Остановить все сервисы
docker-compose down

# Удалить контейнеры (опционально)
docker-compose down --remove-orphans
```

### 3. Сборка обновленных образов
```powershell
# Собрать все образы заново
docker-compose build

# Собрать конкретный образ (при необходимости)
docker-compose build api
docker-compose build rtmp-server

# Принудительная пересборка без кэша
docker-compose build --no-cache
```

### 4. Тестирование локально
```powershell
# Запустить обновленные контейнеры
docker-compose up -d

# Проверить логи API
docker-compose logs api

# Проверить логи RTMP сервера
docker-compose logs rtmp-server

# Проверить статус контейнеров
docker-compose ps

# Тестовые запросы
curl http://localhost:5082/api/streaming/test
curl http://localhost:8000
```

### 5. Авторизация в Docker Hub
```powershell
# Войти в Docker Hub (выполнить один раз)
docker login

# Ввести ваши учетные данные:
# Username: aplatonovnet
# Password: [ваш пароль или access token]
```

### 6. Публикация образов
```powershell
# Опубликовать API образ
docker push aplatonovnet/streaming-api:latest

# Опубликовать RTMP образ  
docker push aplatonovnet/streaming-rtmp:latest

# Опубликовать все образы разом
docker-compose push
```

---

## 🏷️ Работа с версиями (рекомендуется)

### Создание версионных тегов:
```powershell
# Тегировать текущую версию (пример v1.0.0)
docker tag aplatonovnet/streaming-api:latest aplatonovnet/streaming-api:v1.0.0
docker tag aplatonovnet/streaming-rtmp:latest aplatonovnet/streaming-rtmp:v1.0.0

# Опубликовать версионные теги
docker push aplatonovnet/streaming-api:v1.0.0
docker push aplatonovnet/streaming-rtmp:v1.0.0
```

### Обновление docker-compose.yml для версий:
```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    image: aplatonovnet/streaming-api:v1.0.0  # Конкретная версия
    
  rtmp-server:
    build:
      context: .
      dockerfile: Dockerfile.rtmp  
    image: aplatonovnet/streaming-rtmp:v1.0.0  # Конкретная версия
```

---

## 🛠️ Полезные команды для обслуживания

### Очистка локальных образов:
```powershell
# Удалить старые версии образов
docker image prune

# Удалить конкретные образы
docker rmi aplatonovnet/streaming-api:old-version
docker rmi aplatonovnet/streaming-rtmp:old-version

# Посмотреть размер образов
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

### Проверка статуса Docker Hub:
```powershell
# Просмотреть информацию об образе
docker manifest inspect aplatonovnet/streaming-api:latest

# Скачать образ для проверки
docker pull aplatonovnet/streaming-api:latest
```

### Откат к предыдущей версии:
```powershell
# Использовать конкретную версию в docker-compose.yml
# Изменить latest на нужную версию, например v1.0.0

# Перезапустить с предыдущей версией
docker-compose down
docker-compose up -d
```

---

## ⚠️ Важные замечания

### Безопасность:
- ❗ Никогда не включайте пароли в скрипты
- ❗ Используйте Docker Hub Access Tokens вместо паролей
- ❗ Проверяйте образы локально перед публикацией

### Рекомендации по workflow:
1. **Всегда тестируйте локально** перед публикацией
2. **Используйте семантическое версионирование** (v1.0.0, v1.1.0, v2.0.0)
3. **Ведите changelog** изменений в каждой версии
4. **Делайте git tag** для каждой опубликованной версии

### Автоматизация (будущее):
- Рассмотрите настройку GitHub Actions для автоматической публикации
- Используйте Docker Hub Webhooks для уведомлений
- Настройте мониторинг образов на предмет уязвимостей

---

## 📞 Troubleshooting

### Проблема: "unauthorized: authentication required"
```powershell
# Решение: повторно авторизоваться
docker logout
docker login
```

### Проблема: "no space left on device" 
```powershell
# Решение: очистить Docker
docker system prune -a
```

### Проблема: Образ не обновляется
```powershell
# Решение: принудительная пересборка
docker-compose build --no-cache --pull
```

---

## 📝 Пример полного workflow обновления

```powershell
# 1. Подготовка
git add .
git commit -m "Update streaming features"
git push

# 2. Сборка и тестирование
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 3. Проверка работоспособности
curl http://localhost:5082/api/streaming/test
curl http://localhost:8000

# 4. Публикация
docker login
docker push aplatonovnet/streaming-api:latest
docker push aplatonovnet/streaming-rtmp:latest

# 5. Создание версионного тега (опционально)
docker tag aplatonovnet/streaming-api:latest aplatonovnet/streaming-api:v1.1.0
docker tag aplatonovnet/streaming-rtmp:latest aplatonovnet/streaming-rtmp:v1.1.0
docker push aplatonovnet/streaming-api:v1.1.0  
docker push aplatonovnet/streaming-rtmp:v1.1.0
```

---

*Последнее обновление: $(Get-Date)*
*Проект: Streaming Platform*
*Docker Hub: aplatonovnet/*