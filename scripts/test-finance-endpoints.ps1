param(
  [int]$Port = 3007,
  [string]$FamilyId = "test-family",
  [switch]$ViaGateway
)

$ErrorActionPreference = "Stop"

if ($ViaGateway) {
  $base = "http://localhost:3000/api/finance"
  Write-Host "[Gateway] Probando contra API Gateway en $base" -ForegroundColor Cyan
} else {
  $base = "http://localhost:$Port/api/finance"
  Write-Host "[Direct] Probando directo al servicio en $base" -ForegroundColor Cyan
}

try {
  $healthUrl = $ViaGateway ? "http://localhost:3000$((New-Object Uri("$base")).AbsolutePath)/health" : "http://localhost:$Port/health"
  Write-Host "Health -> $healthUrl" -ForegroundColor Yellow
  Invoke-WebRequest -Uri $healthUrl -UseBasicParsing | Select-Object StatusCode, Content

  Write-Host "Summary -> $base/summary?familyId=$FamilyId" -ForegroundColor Yellow
  Invoke-WebRequest -Uri "$base/summary?familyId=$FamilyId" -UseBasicParsing | Select-Object StatusCode, Content

  Write-Host "Crear Expense -> $base/expenses" -ForegroundColor Yellow
  $expense = @{ familyId=$FamilyId; category="food"; amount=10.5; currency="USD"; occurredAt="2025-11-01T00:00:00Z" } | ConvertTo-Json
  Invoke-WebRequest -Uri "$base/expenses" -Method POST -Body $expense -ContentType "application/json" -UseBasicParsing | Select-Object StatusCode, Content

  Write-Host "Reporte (solo gastos) -> $base/reports" -ForegroundColor Yellow
  $report = @{ familyId=$FamilyId; includeExpenses=$true; includeIncome=$false; period="month" } | ConvertTo-Json
  Invoke-WebRequest -Uri "$base/reports" -Method POST -Body $report -ContentType "application/json" -UseBasicParsing | Select-Object StatusCode, Content
} catch {
  Write-Error "Fallo en pruebas: $($_.Exception.Message)"
}