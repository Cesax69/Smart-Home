# Script para construir todas las imagenes Docker de los microservicios Smart Home
# Ejecutar desde el directorio raiz del proyecto

Write-Host "🏠 Construyendo imagenes Docker para Smart Home..." -ForegroundColor Green

# Funcion para construir una imagen Docker
function Build-DockerImage {
    param(
        [string]$ServiceName,
        [string]$Context
    )
    
    Write-Host "📦 Construyendo imagen para $ServiceName..." -ForegroundColor Yellow
    
    try {
        docker build -t "smart-home-$ServiceName" $Context
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Imagen $ServiceName construida exitosamente" -ForegroundColor Green
        } else {
            Write-Host "❌ Error construyendo imagen $ServiceName" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Error construyendo imagen $ServiceName : $_" -ForegroundColor Red
        return $false
    }
    
    return $true
}

# Verificar que Docker este ejecutandose
Write-Host "🔍 Verificando que Docker este ejecutandose..." -ForegroundColor Cyan
try {
    docker version | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker no esta ejecutandose. Por favor, inicia Docker Desktop." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker no esta disponible. Por favor, instala Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker esta ejecutandose correctamente" -ForegroundColor Green

# Lista de servicios a construir
$services = @(
    @{Name="api-gateway"; Context="./backend/api-gateway"},
    @{Name="users-service"; Context="./backend/users-service"},
    @{Name="tasks-service"; Context="./backend/tasks-service"},
    @{Name="notifications-service"; Context="./backend/notifications-service"},
    @{Name="file-upload-service"; Context="./backend/file-upload-service"}
)

$successCount = 0
$totalServices = $services.Count

# Construir cada servicio
foreach ($service in $services) {
    $result = Build-DockerImage -ServiceName $service.Name -Context $service.Context
    if ($result) {
        $successCount++
    }
}

# Resumen final
Write-Host "`n📊 Resumen de construccion:" -ForegroundColor Cyan
Write-Host "✅ Imagenes construidas exitosamente: $successCount/$totalServices" -ForegroundColor Green

if ($successCount -eq $totalServices) {
    Write-Host "`n🎉 ¡Todas las imagenes se construyeron exitosamente!" -ForegroundColor Green
    Write-Host "Ahora puedes ejecutar: docker-compose up -d" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  Algunas imagenes fallaron. Revisa los errores anteriores." -ForegroundColor Red
    exit 1
}

# Mostrar imagenes creadas
Write-Host "`n📋 Imagenes Docker creadas:" -ForegroundColor Cyan
docker images | Select-String "smart-home-"