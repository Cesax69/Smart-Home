# Script para probar la subida de archivos
$filePath = "C:\SmartHome\Smart-Home\test-file.txt"
$uri = "http://localhost:3005/upload"

# Crear el contenido multipart/form-data manualmente
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"test-file.txt`"",
    "Content-Type: text/plain$LF",
    (Get-Content $filePath -Raw),
    "--$boundary--$LF"
) -join $LF

$headers = @{
    'Content-Type' = "multipart/form-data; boundary=$boundary"
}

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $bodyLines -Headers $headers
    Write-Host "Respuesta exitosa:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error en la subida:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Respuesta del servidor: $responseBody"
    }
}