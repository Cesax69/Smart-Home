# Script para iniciar todos los servicios del Smart Home
Write-Host "SMART HOME - Iniciando Smart Home - Todos los Servicios" -ForegroundColor Green

# Función para verificar si un comando existe
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Función para verificar si un puerto está en uso
function Test-Port($port) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $connection
}

# Función para verificar dependencias de un servicio
function Test-ServiceDependencies {
    param([string]$ServicePath, [string]$ServiceName)
    
    $packageJsonPath = Join-Path $ServicePath "package.json"
    $nodeModulesPath = Join-Path $ServicePath "node_modules"
    
    if (!(Test-Path $packageJsonPath)) {
        Write-Host "ERROR - $ServiceName - package.json no encontrado" -ForegroundColor Red
        return $false
    }
    
    if (!(Test-Path $nodeModulesPath)) {
        Write-Host "WARNING - $ServiceName - Dependencias no instaladas. Instalando..." -ForegroundColor Yellow
        Push-Location $ServicePath
        npm install
        Pop-Location
        
        if (!(Test-Path $nodeModulesPath)) {
            Write-Host "ERROR - $ServiceName - Error instalando dependencias" -ForegroundColor Red
            return $false
        }
    }
    
    Write-Host "OK - $ServiceName - Dependencias verificadas" -ForegroundColor Green
    return $true
}

# Función para iniciar un servicio
function Start-Service {
    param([string]$ServicePath, [string]$ServiceName, [int]$Port)
    
    Write-Host "STARTING - Iniciando $ServiceName en puerto $Port..." -ForegroundColor Blue
    
    # Verificar si el puerto está ocupado
    if (Test-Port $Port) {
        Write-Host "WARNING - Puerto $Port ya está en uso. $ServiceName podría no iniciarse correctamente." -ForegroundColor Yellow
    }
    
    # Cambiar al directorio del servicio e iniciar
    Push-Location $ServicePath
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
    Pop-Location
    
    Write-Host "OK - $ServiceName iniciado" -ForegroundColor Green
}

Write-Host "CHECKING - Verificando prerequisitos..." -ForegroundColor Yellow

# Verificar Node.js
if (!(Test-Command node)) {
    Write-Host "ERROR - Node.js no está instalado. Por favor instala Node.js primero." -ForegroundColor Red
    exit 1
}

Write-Host "OK - Node.js encontrado: $(node --version)" -ForegroundColor Green

# Verificar PostgreSQL
if (Test-Port 5432) {
    Write-Host "OK - PostgreSQL disponible en puerto 5432" -ForegroundColor Green
} else {
    Write-Host "ERROR - PostgreSQL no disponible en puerto 5432" -ForegroundColor Red
    Write-Host "TIP - Ejecuta: .\setup-infrastructure.ps1 para configurar la infraestructura" -ForegroundColor Yellow
}

# Verificar Redis
if (Test-Port 6379) {
    Write-Host "OK - Redis disponible en puerto 6379" -ForegroundColor Green
} else {
    Write-Host "ERROR - Redis no disponible en puerto 6379" -ForegroundColor Red
    Write-Host "TIP - Ejecuta: .\setup-infrastructure.ps1 para configurar la infraestructura" -ForegroundColor Yellow
}

# Definir servicios y sus configuraciones
$services = @(
    @{ Name = "API Gateway"; Path = "backend/api-gateway"; Port = 3000 },
    @{ Name = "Users Service"; Path = "backend/users-service"; Port = 3001 },
    @{ Name = "Tasks Service"; Path = "backend/tasks-service"; Port = 3002 },
    @{ Name = "File Upload Service"; Path = "backend/file-upload-service"; Port = 3003 },
    @{ Name = "Notifications Service"; Path = "backend/notifications-service"; Port = 3004 }
)

Write-Host ""
Write-Host "VERIFYING - Verificando servicios..." -ForegroundColor Yellow

# Verificar dependencias de todos los servicios
$allDependenciesOk = $true
foreach ($service in $services) {
    if (!(Test-ServiceDependencies -ServicePath $service.Path -ServiceName $service.Name)) {
        $allDependenciesOk = $false
    }
}

if (!$allDependenciesOk) {
    Write-Host ""
    Write-Host "ERROR - Algunos servicios tienen problemas con las dependencias." -ForegroundColor Red
    Write-Host "TIP - Ejecuta: .\install-dependencies.ps1 para instalar todas las dependencias" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "STARTING - Iniciando todos los servicios..." -ForegroundColor Green

# Crear estructura de directorios para archivos si no existe
$fileStorageDirs = @(
    "file-storage",
    "file-storage/uploads",
    "file-storage/uploads/images",
    "file-storage/uploads/documents",
    "file-storage/uploads/videos",
    "file-storage/uploads/others",
    "file-storage/temp",
    "file-storage/quarantine"
)

foreach ($dir in $fileStorageDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Iniciar servicios en orden
foreach ($service in $services) {
    Start-Service -ServicePath $service.Path -ServiceName $service.Name -Port $service.Port
    Start-Sleep -Seconds 2  # Esperar un poco entre servicios
}

Write-Host ""
Write-Host "SUCCESS - Todos los servicios han sido iniciados!" -ForegroundColor Green
Write-Host ""
Write-Host "SERVICES - URLs de los servicios:" -ForegroundColor Yellow
Write-Host "• API Gateway:          http://localhost:3000" -ForegroundColor White
Write-Host "• Users Service:        http://localhost:3001" -ForegroundColor White
Write-Host "• Tasks Service:        http://localhost:3002" -ForegroundColor White
Write-Host "• File Upload Service:  http://localhost:3003" -ForegroundColor White
Write-Host "• Notifications Service: http://localhost:3004" -ForegroundColor White
Write-Host ""
Write-Host "DATABASE - Infraestructura:" -ForegroundColor Yellow
Write-Host "• PostgreSQL:           localhost:5432 (smart_home_db)" -ForegroundColor White
Write-Host "• Redis:                localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "FILES - Almacenamiento de archivos:" -ForegroundColor Yellow
Write-Host "• Directorio base:      ./file-storage/" -ForegroundColor White
Write-Host "• Uploads organizados:  ./file-storage/uploads/" -ForegroundColor White
Write-Host "• Archivos temporales:  ./file-storage/temp/" -ForegroundColor White
Write-Host ""
Write-Host "STOP - Para detener todos los servicios, cierra todas las ventanas de PowerShell abiertas" -ForegroundColor Cyan
Write-Host "RESTART - Para reiniciar un servicio específico, ve a su directorio y ejecuta 'npm run dev'" -ForegroundColor Cyan

# Mantener el script ejecutándose
try {
    Write-Host "RUNNING - Servicios ejecutándose... Presiona Ctrl+C para detener todos los servicios." -ForegroundColor Green
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Verificar si los procesos siguen activos
        $activeProcesses = 0
        foreach ($proc in $processes) {
            if (!$proc.Process.HasExited) {
                $activeProcesses++
            }
        }
        
        if ($activeProcesses -eq 0) {
            Write-Host "WARNING - Todos los procesos han terminado." -ForegroundColor Yellow
            break
        }
    }
} catch {
    Write-Host ""
    Write-Host "STOP - Deteniendo todos los servicios..." -ForegroundColor Red
    
    # Terminar todos los procesos
    foreach ($proc in $processes) {
        if (!$proc.Process.HasExited) {
            Write-Host "   Deteniendo $($proc.Name)..." -ForegroundColor Yellow
            $proc.Process.Kill()
        }
    }
    
    Write-Host "OK - Todos los servicios han sido detenidos." -ForegroundColor Green
}