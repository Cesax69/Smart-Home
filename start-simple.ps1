# Script simplificado para iniciar todos los servicios
Write-Host "Iniciando Smart Home - Todos los Servicios" -ForegroundColor Green

# Funcion para verificar si un puerto esta en uso
function Test-Port($port) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $connection
}

# Funcion para verificar e instalar dependencias
function Test-Dependencies($ServicePath, $ServiceName) {
    $packageJsonPath = Join-Path $ServicePath "package.json"
    $nodeModulesPath = Join-Path $ServicePath "node_modules"
    
    if (!(Test-Path $packageJsonPath)) {
        Write-Host "Error: $ServiceName - package.json no encontrado" -ForegroundColor Red
        return $false
    }
    
    if (!(Test-Path $nodeModulesPath)) {
        Write-Host "Advertencia: $ServiceName - Dependencias no instaladas. Instalando..." -ForegroundColor Yellow
        Set-Location $ServicePath
        npm install
        Set-Location $PSScriptRoot
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: $ServiceName - Error instalando dependencias" -ForegroundColor Red
            return $false
        }
    }
    
    Write-Host "OK: $ServiceName - Dependencias verificadas" -ForegroundColor Green
    return $true
}

# Funcion para iniciar un servicio
function Start-Service($ServicePath, $ServiceName, $Port) {
    Write-Host "Iniciando $ServiceName en puerto $Port..." -ForegroundColor Blue
    Set-Location $ServicePath
    
    if (Test-Port $Port) {
        Write-Host "Advertencia: Puerto $Port ya esta en uso. $ServiceName podria no iniciarse correctamente." -ForegroundColor Yellow
    }
    
    # Iniciar el servicio en una nueva ventana de PowerShell
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
    Set-Location $PSScriptRoot
    
    Write-Host "OK: $ServiceName iniciado" -ForegroundColor Green
}

# Verificar prerequisitos
Write-Host "Verificando prerequisitos..." -ForegroundColor Yellow

# Verificar Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js no esta instalado. Por favor instala Node.js primero." -ForegroundColor Red
    exit 1
} else {
    Write-Host "OK: Node.js encontrado: $(node --version)" -ForegroundColor Green
}

# Verificar PostgreSQL
if (Test-Port 5432) {
    Write-Host "✅ PostgreSQL está disponible en puerto 5432" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL no está disponible en puerto 5432" -ForegroundColor Red
    Write-Host "Sugerencia: Instala PostgreSQL manualmente o verifica que esté ejecutándose" -ForegroundColor Yellow
}

# Lista de servicios
$services = @(
    @{ Name = "API Gateway"; Path = "api-gateway"; Port = 3000 },
    @{ Name = "Users Service"; Path = "users-service"; Port = 3001 },
    @{ Name = "Tasks Service"; Path = "tasks-service"; Port = 3002 },
    @{ Name = "File Upload Service"; Path = "file-upload-service"; Port = 3003 },
    @{ Name = "Notifications Service"; Path = "notifications-service"; Port = 3004 }
)

Write-Host ""
Write-Host "Verificando servicios..." -ForegroundColor Yellow

$allDependenciesOk = $true
foreach ($service in $services) {
    $servicePath = Join-Path $PSScriptRoot $service.Path
    if (!(Test-Dependencies $servicePath $service.Name)) {
        $allDependenciesOk = $false
    }
}

if (!$allDependenciesOk) {
    Write-Host ""
    Write-Host "Error: Algunos servicios tienen problemas con las dependencias." -ForegroundColor Red
    Write-Host "Sugerencia: Ejecuta .\install-simple.ps1 para instalar todas las dependencias" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Iniciando todos los servicios..." -ForegroundColor Green

# Crear directorios de almacenamiento si no existen
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
    }
}

# Iniciar cada servicio
foreach ($service in $services) {
    $servicePath = Join-Path $PSScriptRoot $service.Path
    Start-Service $servicePath $service.Name $service.Port
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Todos los servicios han sido iniciados!" -ForegroundColor Green
Write-Host ""
Write-Host "URLs de los servicios:" -ForegroundColor Yellow
Write-Host "• API Gateway:          http://localhost:3000" -ForegroundColor White
Write-Host "• Users Service:        http://localhost:3001" -ForegroundColor White
Write-Host "• Tasks Service:        http://localhost:3002" -ForegroundColor White
Write-Host "• File Upload Service:  http://localhost:3003" -ForegroundColor White
Write-Host "• Notifications Service: http://localhost:3004" -ForegroundColor White
Write-Host ""
Write-Host "Infraestructura:" -ForegroundColor Yellow
Write-Host "• PostgreSQL:           localhost:5432 (smart_home_db)" -ForegroundColor White
Write-Host "• Redis:                localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Almacenamiento de archivos:" -ForegroundColor Yellow
Write-Host "• Directorio base:      ./file-storage/" -ForegroundColor White
Write-Host "• Uploads organizados:  ./file-storage/uploads/" -ForegroundColor White
Write-Host "• Archivos temporales:  ./file-storage/temp/" -ForegroundColor White
Write-Host ""
Write-Host "Para detener todos los servicios, cierra todas las ventanas de PowerShell abiertas" -ForegroundColor Cyan
Write-Host "Para reiniciar un servicio especifico, ve a su directorio y ejecuta 'npm run dev'" -ForegroundColor Cyan

# Mantener el script ejecutandose
Write-Host ""
Write-Host "Servicios ejecutandose... Presiona Ctrl+C para detener todos los servicios." -ForegroundColor Green

try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Verificar si alguno de los procesos de Node.js sigue ejecutandose
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if (!$nodeProcesses) {
            Write-Host "Advertencia: Todos los procesos han terminado." -ForegroundColor Yellow
            break
        }
    }
} catch {
    # Manejar Ctrl+C
    Write-Host ""
    Write-Host "Deteniendo todos los servicios..." -ForegroundColor Red
    
    # Detener todos los procesos de Node.js
    Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "   Deteniendo $($_.Name)..." -ForegroundColor Yellow
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "Todos los servicios han sido detenidos." -ForegroundColor Green
}