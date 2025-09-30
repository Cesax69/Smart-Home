# Script para Instalar Dependencias - Smart Home Microservices
# Instala las dependencias de todos los microservicios

Write-Host "PACKAGES - Instalando dependencias para Smart Home Microservices..." -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan

# Directorio base
$baseDir = Get-Location

# Lista de servicios
$services = @("backend/api-gateway", "backend/users-service", "backend/tasks-service", "backend/file-upload-service", "backend/notifications-service")

# Instalar dependencias para cada servicio
foreach ($service in $services) {
    $servicePath = Join-Path $baseDir $service
    
    if (Test-Path $servicePath) {
        Write-Host ""
        Write-Host "INSTALLING - Instalando dependencias para $service..." -ForegroundColor Blue
        Set-Location $servicePath
        
        # Verificar si package.json existe
        if (Test-Path "package.json") {
            npm install
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "OK - Dependencias instaladas correctamente para $service" -ForegroundColor Green
            } else {
                Write-Host "ERROR - Error instalando dependencias para $service" -ForegroundColor Red
            }
        } else {
            Write-Host "WARNING - No se encontró package.json en $service" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ERROR - No se encontró el directorio: $service" -ForegroundColor Red
    }
}

# Volver al directorio base
Set-Location $baseDir

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "SUCCESS - Instalación de dependencias completada!" -ForegroundColor Green
Write-Host ""
Write-Host "STEPS - Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Asegúrate de que PostgreSQL esté ejecutándose" -ForegroundColor White
Write-Host "   2. Ejecuta: .\start-all-services.ps1" -ForegroundColor White
Write-Host "=========================================================" -ForegroundColor Cyan