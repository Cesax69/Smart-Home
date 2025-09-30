# Script simplificado para instalar dependencias
Write-Host "Instalando dependencias para Smart Home Microservices..." -ForegroundColor Green

# Directorio base
$baseDir = Get-Location

# Lista de servicios
$services = @("api-gateway", "users-service", "tasks-service", "file-upload-service", "notifications-service")

# Instalar dependencias para cada servicio
foreach ($service in $services) {
    $servicePath = Join-Path $baseDir $service
    
    if (Test-Path $servicePath) {
        Write-Host ""
        Write-Host "Instalando dependencias para $service..." -ForegroundColor Blue
        Set-Location $servicePath
        
        # Verificar si package.json existe
        if (Test-Path "package.json") {
            npm install
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Dependencias instaladas correctamente para $service" -ForegroundColor Green
            } else {
                Write-Host "Error instalando dependencias para $service" -ForegroundColor Red
            }
        } else {
            Write-Host "No se encontro package.json en $service" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No se encontro el directorio: $service" -ForegroundColor Red
    }
}

# Volver al directorio base
Set-Location $baseDir

Write-Host ""
Write-Host "Instalacion de dependencias completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "1. Asegurate de que PostgreSQL este ejecutandose" -ForegroundColor White
Write-Host "2. Ejecuta: .\start-all-services.ps1" -ForegroundColor White