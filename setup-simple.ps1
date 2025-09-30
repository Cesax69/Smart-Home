# Script simplificado para configurar la infraestructura del Smart Home
Write-Host "Configurando infraestructura Smart Home..." -ForegroundColor Green

# Crear estructura de directorios para archivos
Write-Host "Creando estructura de directorios..." -ForegroundColor Blue

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
        Write-Host "Creado: $dir" -ForegroundColor Green
    } else {
        Write-Host "Ya existe: $dir" -ForegroundColor Yellow
    }
}

# Crear archivo .gitkeep para mantener directorios vacios
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

Write-Host ""
Write-Host "Configuracion de infraestructura completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "1. Ejecutar: .\install-dependencies.ps1" -ForegroundColor White
Write-Host "2. Configurar base de datos: psql -U postgres -d smart_home_db -f setup-database.sql" -ForegroundColor White
Write-Host "3. Ejecutar servicios: .\start-all-services.ps1" -ForegroundColor White