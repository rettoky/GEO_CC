#!/usr/bin/env pwsh
# Sentiment Backfill Script
# 감성 분석 백필 마이그레이션 스크립트

$baseUrl = "https://fnwgevhulijlgxdtrobu.supabase.co/functions/v1/backfill-sentiment"
$authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2dldmh1bGlqbGd4ZHRyb2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NDg0NTQsImV4cCI6MjA4MDEyNDQ1NH0.xPsU82dI4xWhDrf6cPnpd_L-A5_l8uCjoGa44sCESeQ"

$headers = @{
    "Authorization" = "Bearer $authToken"
    "Content-Type" = "application/json"
}

$batchSize = 10
$totalProcessed = 0
$errors = @()

Write-Host "=== Sentiment Backfill Migration ===" -ForegroundColor Cyan
Write-Host ""

while ($true) {
    # Check remaining targets
    Write-Host "Checking remaining targets..." -ForegroundColor Yellow
    $dryRunBody = '{"dryRun": true}'

    try {
        $dryRunResponse = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $dryRunBody -TimeoutSec 30
    } catch {
        Write-Host "Error checking targets: $_" -ForegroundColor Red
        break
    }

    $remaining = $dryRunResponse.targetCount
    Write-Host "Remaining targets: $remaining" -ForegroundColor White

    if ($remaining -eq 0) {
        Write-Host ""
        Write-Host "=== Migration Complete ===" -ForegroundColor Green
        Write-Host "Total processed: $totalProcessed" -ForegroundColor Green
        break
    }

    # Get batch of IDs
    $batchIds = $dryRunResponse.targets | Select-Object -First $batchSize | ForEach-Object { $_.id }
    $batchIdsJson = $batchIds | ConvertTo-Json -Compress

    Write-Host "Processing batch of $($batchIds.Count) analyses..." -ForegroundColor Yellow

    $body = @{
        analysisIds = $batchIds
    } | ConvertTo-Json -Compress

    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $body -TimeoutSec 120

        if ($response.success) {
            $batchProcessed = $response.processedCount
            $totalProcessed += $batchProcessed

            Write-Host "  Batch completed: $batchProcessed processed" -ForegroundColor Green

            foreach ($result in $response.results) {
                if ($result.error) {
                    $errors += $result
                    Write-Host "    Error in $($result.analysisId): $($result.error)" -ForegroundColor Red
                } else {
                    Write-Host "    $($result.analysisId): myBrand=$($result.myBrandSentimentCount), competitors=$($result.competitorSentimentCount)" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "  Batch failed: $($response.error)" -ForegroundColor Red
            $errors += @{ batch = $batchIds; error = $response.error }
        }
    } catch {
        Write-Host "  Request error: $_" -ForegroundColor Red
        $errors += @{ batch = $batchIds; error = $_.ToString() }
    }

    # Small delay between batches
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Total processed: $totalProcessed" -ForegroundColor White
Write-Host "Errors: $($errors.Count)" -ForegroundColor $(if ($errors.Count -gt 0) { "Red" } else { "Green" })

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
}
