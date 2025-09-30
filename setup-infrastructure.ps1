# Script para configurar la infraestructura del Smart Home
Write-Host "SMART HOME - Configurando infraestructura Smart Home..." -ForegroundColor Green

# Función para verificar si un comando existe
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Función para verificar si un puerto está en uso
function Test-Port($port) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $connection
}

Write-Host "📋 Verificando prerequisitos..." -ForegroundColor Yellow

# Verificar Docker
if (Test-Command docker) {
    Write-Host "OK - Docker encontrado" -ForegroundColor Green
    $useDocker = Read-Host "¿Deseas usar Docker para PostgreSQL y Redis? (y/n)"
} else {
    Write-Host "ERROR - Docker no encontrado. Configuración manual requerida." -ForegroundColor Red
    $useDocker = "n"
}

if ($useDocker -eq "y" -or $useDocker -eq "Y") {
    Write-Host "🐳 Iniciando servicios con Docker..." -ForegroundColor Blue
    
    # Verificar si docker-compose existe
    if (Test-Command docker-compose) {
        docker-compose up -d postgres redis
    } elseif (Test-Command "docker compose") {
        docker compose up -d postgres redis
    } else {
        Write-Host "ERROR - Docker Compose no encontrado" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "⏳ Esperando que los servicios estén listos..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
} else {
    Write-Host "⚙️ Configuración manual requerida:" -ForegroundColor Yellow
    Write-Host "1. Instalar PostgreSQL (puerto 5432)" -ForegroundColor White
    Write-Host "   - Usuario: postgres" -ForegroundColor White
    Write-Host "   - Contraseña: linux" -ForegroundColor White
    Write-Host "   - Base de datos: smart_home_db" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Instalar Redis (puerto 6379)" -ForegroundColor White
    Write-Host ""
    
    $continue = Read-Host "¿PostgreSQL y Redis están configurados? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "ERROR - Configuración cancelada" -ForegroundColor Red
        exit 1
    }
}

# Crear estructura de directorios para archivos
Write-Host "FILES - Creando estructura de directorios..." -ForegroundColor Blue

$directories = @(
    "file-storage",
    "file-storage/uploads",
    "file-storage/uploads/images",
    "file-storage/uploads/documents",
    "file-storage/uploads/videos",
    "file-storage/uploads/others",
    "file-storage/temp",
    "file-storage/quarantine"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "OK - Creado: $dir" -ForegroundColor Green
    } else {
        Write-Host "FILES - Ya existe: $dir" -ForegroundColor Yellow
    }
}

# Crear archivo .gitkeep para mantener directorios vacíos
$gitkeepDirs = @(
    "file-storage/uploads/images",
    "file-storage/uploads/documents", 
    "file-storage/uploads/videos",
    "file-storage/uploads/others",
    "file-storage/temp",
    "file-storage/quarantine"
)

foreach ($dir in $gitkeepDirs) {
    $gitkeepPath = Join-Path $dir ".gitkeep"
    if (!(Test-Path $gitkeepPath)) {
        New-Item -ItemType File -Path $gitkeepPath -Force | Out-Null
    }
}

# Verificar conexiones
Write-Host "🔍 Verificando conexiones..." -ForegroundColor Blue

# Verificar PostgreSQL
if (Test-Port 5432) {
    Write-Host "OK - PostgreSQL disponible en puerto 5432" -ForegroundColor Green
} else {
    Write-Host "ERROR - PostgreSQL no disponible en puerto 5432" -ForegroundColor Red
}

# Verificar Redis
if (Test-Port 6379) {
    Write-Host "OK - Redis disponible en puerto 6379" -ForegroundColor Green
} else {
    Write-Host "ERROR - Redis no disponible en puerto 6379" -ForegroundColor Red
}

Write-Host ""
Write-Host "SUCCESS - Configuración de infraestructura completada!" -ForegroundColor Green
Write-Host ""
Write-Host "STEPS - Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Ejecutar: .\install-dependencies.ps1" -ForegroundColor White
Write-Host "2. Configurar base de datos: psql -U postgres -d smart_home_db -f setup-database.sql" -ForegroundColor White
Write-Host "3. Ejecutar servicios: .\start-all-services.ps1" -ForegroundColor White