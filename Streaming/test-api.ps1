# Test script to verify API connectivity from RTMP container

Write-Host "Testing API connectivity..." -ForegroundColor Cyan

# Test 1: Direct localhost test
Write-Host "`n1. Testing localhost:5082..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5082/api/streaming/test" -UseBasicParsing
    Write-Host "? Localhost test successful" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "? Localhost test failed: $_" -ForegroundColor Red
}

# Test 2: Docker network test
Write-Host "`n2. Testing Docker network (streaming-api:80)..." -ForegroundColor Yellow
try {
    docker exec streaming-streaming-api-1 curl -s http://localhost:80/api/streaming/test
    Write-Host "? Docker internal test successful" -ForegroundColor Green
} catch {
    Write-Host "? Docker internal test failed: $_" -ForegroundColor Red
}

# Test 3: Cross-container test
Write-Host "`n3. Testing from RTMP container to API..." -ForegroundColor Yellow
try {
    docker exec streaming-rtmp-server-1 wget -qO- http://streaming-api:80/api/streaming/test
    Write-Host "? Cross-container test successful" -ForegroundColor Green
} catch {
    Write-Host "? Cross-container test failed: $_" -ForegroundColor Red
}

# Test 4: Validate endpoint test
Write-Host "`n4. Testing validate endpoint with stream key..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5082/api/streaming/validate?name=disco-bayern" -Method POST -UseBasicParsing
    Write-Host "? Validate test successful" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "? Validate test failed: $_" -ForegroundColor Red
}

# Test API endpoints

$baseUrl = "http://localhost:5082/api"
$streamKey = "disco-bayern"

Write-Host "Testing Streaming API..." -ForegroundColor Cyan

# Test validate endpoint with stream key
Write-Host "`nTesting validate endpoint..." -ForegroundColor Yellow
$validateResponse = Invoke-RestMethod -Uri "$baseUrl/streaming/validate?stream=$streamKey" -Method Get
Write-Host "Validate Response:" -ForegroundColor Green
$validateResponse | ConvertTo-Json

# Test start endpoint
Write-Host "`nTesting start endpoint..." -ForegroundColor Yellow
try {
    $startResponse = Invoke-RestMethod -Uri "$baseUrl/streaming/start?stream=$streamKey" -Method Post
    Write-Host "Start Response:" -ForegroundColor Green
    $startResponse | ConvertTo-Json
} catch {
    Write-Host "Start endpoint error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Test status endpoint
Write-Host "`nTesting status endpoint..." -ForegroundColor Yellow
$statusResponse = Invoke-RestMethod -Uri "$baseUrl/streaming/status" -Method Get
Write-Host "Status Response:" -ForegroundColor Green
$statusResponse | ConvertTo-Json

# Test update endpoint with viewer count
Write-Host "`nTesting update endpoint..." -ForegroundColor Yellow
try {
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/streaming/update?stream=$streamKey&viewers=10&name=Test" -Method Post
    Write-Host "Update Response:" -ForegroundColor Green
    $updateResponse | ConvertTo-Json
} catch {
    Write-Host "Update endpoint error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host "`nTests completed!" -ForegroundColor Cyan