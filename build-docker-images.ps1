<#
Script para construir todas las imágenes Docker de los microservicios Smart Home
Ejecutar desde el directorio raíz del proyecto
#>

Write-Host "Construyendo imágenes Docker para Smart Home..." -ForegroundColor Green

# Verificar que Docker esté ejecutándose
Write-Host "Verificando que Docker esté en ejecución..." -ForegroundColor Cyan
try {
    docker version | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker no está ejecutándose. Inicia Docker Desktop." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Docker no está disponible. Instala o inicia Docker Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "Docker está ejecutándose correctamente" -ForegroundColor Green

# Detectar comando de Docker Compose (plugin moderno o legacy)
$composeCmd = $null
try {
    docker compose version | Out-Null
    if ($LASTEXITCODE -eq 0) { $composeCmd = "docker compose" }
} catch {}

if (-not $composeCmd) {
    try {
        docker-compose --version | Out-Null
        if ($LASTEXITCODE -eq 0) { $composeCmd = "docker-compose" }
    } catch {}
}

if (-not $composeCmd) {
    Write-Host "No se encontró Docker Compose. Verifica tu instalación." -ForegroundColor Red
    exit 1
}

Write-Host "Usando: $composeCmd" -ForegroundColor Yellow

# Construir todas las imágenes definidas en docker-compose.yml
Write-Host "Iniciando build con Docker Compose..." -ForegroundColor Cyan
$buildCmd = "$composeCmd build"
Invoke-Expression $buildCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al construir imágenes con Docker Compose." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Build completado correctamente." -ForegroundColor Green

# Mostrar imágenes relacionadas con el proyecto
Write-Host "Listado de imágenes Docker del proyecto:" -ForegroundColor Cyan
docker images | Select-String "smart-home-"