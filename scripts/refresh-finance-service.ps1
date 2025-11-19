param(
  [ValidateSet("docker","local")] [string]$Mode = "docker",
  [int]$Port = 3007
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

if ($Mode -eq "docker") {
  Write-Host "[Docker] Recompilando imagen de finance-service..." -ForegroundColor Cyan
  docker compose build finance-service
  if ($LASTEXITCODE -ne 0) { Write-Error "Docker build falló" }

  Write-Host "[Docker] Levantando finance-service..." -ForegroundColor Cyan
  docker compose up -d finance-service
  if ($LASTEXITCODE -ne 0) { Write-Error "Docker up falló" }

  Write-Host "[Docker] finance-service reconstruido y reiniciado" -ForegroundColor Green
} else {
  $svcDir = Join-Path $root "backend\finance-service"
  Push-Location $svcDir

  Write-Host "[Local] Compilando TypeScript (tsc)..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Build falló" }

  Write-Host "[Local] Buscando proceso escuchando en puerto $Port..." -ForegroundColor Yellow
  $pid = $null
  try {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    if ($conn) { $pid = $conn.OwningProcess }
  } catch {
    $line = netstat -ano | Select-String ":$Port" | Select-Object -First 1
    if ($line) {
      $parts = $line.ToString().Split(" ",[System.StringSplitOptions]::RemoveEmptyEntries)
      $pidText = $parts[-1]
      if ($pidText -match '^[0-9]+$') { $pid = [int]$pidText }
    }
  }

  if ($pid) {
    Write-Host "[Local] Deteniendo proceso (PID=$pid)..." -ForegroundColor Yellow
    try { Stop-Process -Id $pid -Force } catch { Write-Warning "No se pudo detener PID=$pid: $_" }
    Start-Sleep -Seconds 1
  } else {
    Write-Host "[Local] No se encontró proceso en $Port, continuando..." -ForegroundColor Yellow
  }

  Write-Host "[Local] Iniciando finance-service en puerto $Port..." -ForegroundColor Cyan
  $env:PORT = $Port
  $env:DB_HOST = "localhost"
  Start-Process -FilePath "npm" -ArgumentList "run start" -WorkingDirectory $svcDir

  Pop-Location
  Write-Host "[Local] finance-service iniciado" -ForegroundColor Green
}