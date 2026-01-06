# Test GPT text-based fallback
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$baseUrl = 'https://fnwgevhulijlgxdtrobu.supabase.co/functions/v1/analyze-query'
$authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2dldmh1bGlqbGd4ZHRyb2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NDg0NTQsImV4cCI6MjA4MDEyNDQ1NH0.xPsU82dI4xWhDrf6cPnpd_L-A5_l8uCjoGa44sCESeQ'

$headers = @{
    'Authorization' = "Bearer $authToken"
    'Content-Type' = 'application/json; charset=utf-8'
}

$bodyObj = @{
    query = [char]0xBA54 + [char]0xB9AC + [char]0xCE20 + [char]0xD654 + [char]0xC7AC + ' ' + [char]0xC790 + [char]0xB3D9 + [char]0xCC28 + [char]0xBCF4 + [char]0xD5D8 + ' ' + [char]0xAC00 + [char]0xACA9 + ' ' + [char]0xBE44 + [char]0xAD50
    brand = [char]0xBA54 + [char]0xB9AC + [char]0xCE20 + [char]0xD654 + [char]0xC7AC
    domain = 'meritz.com'
    skipSave = $true
}

$body = $bodyObj | ConvertTo-Json -Compress
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Write-Host 'Testing GPT text-based fallback...' -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $bodyBytes -TimeoutSec 120

    Write-Host ''
    Write-Host '=== GPT Debug Info ===' -ForegroundColor Green
    $response.data.results.chatgpt._debug | Format-List

    Write-Host ''
    Write-Host '=== GPT Citations Count ===' -ForegroundColor Green
    Write-Host "Citations: $($response.data.results.chatgpt.citations.Count)"

    if ($response.data.results.chatgpt.citations.Count -gt 0) {
        Write-Host ''
        Write-Host '=== GPT Citations ===' -ForegroundColor Green
        $response.data.results.chatgpt.citations | ForEach-Object {
            Write-Host "  - $($_.domain): $($_.title)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
