# JanSetu AI — Vercel Deploy Helper
# Finishes the deployment once a Postgres DATABASE_URL is available.
#
# Usage:
#   .\deploy-vercel.ps1  (reads DATABASE_URL from your environment)
#   $env:DATABASE_URL = "postgresql://..."; .\deploy-vercel.ps1
#
# Requirements:
#   - You are logged in to Vercel (npx vercel login) OR set $env:VERCEL_TOKEN
#   - A project named "jansetu-ai" exists (already linked, deploy root = jansetu-ai/)
$ErrorActionPreference = "Stop"

$projectId = "prj_fec1VP0Hzlvif7Crvra3h4SaL6k2"
$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path   # .../jansetu-ai

if (-not $env:VERCEL_TOKEN) {
    Write-Host "VERCEL_TOKEN not set. Run: npx vercel login  (or set VERCEL_TOKEN)" -ForegroundColor Yellow
}

if (-not $env:DATABASE_URL) {
    Write-Host "DATABASE_URL is not set. Create a free Postgres (Neon/Supabase) and:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL = "postgresql://..." ; ./deploy-vercel.ps1' -ForegroundColor Yellow
    exit 1
}

Write-Host "Setting DATABASE_URL on Vercel project $projectId ..."
& vercel env add DATABASE_URL production --token $env:VERCEL_TOKEN <<< $env:DATABASE_URL
if ($LASTEXITCODE -ne 0) {
    # fallback to REST API
    $h = @{ Authorization = "Bearer $env:VERCEL_TOKEN"; "Content-Type" = "application/json" }
    $body = @{ key = "DATABASE_URL"; value = $env:DATABASE_URL; type = "encrypted"; target = @("production") } | ConvertTo-Json
    Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$projectId/env" -Method Post -Headers $h -Body $body | Out-Null
    Write-Host "DATABASE_URL set via API."
}

Write-Host "Deploying production build from $deployDir ..."
Push-Location $deployDir
& vercel deploy --prod --token $env:VERCEL_TOKEN --yes
$code = $LASTEXITCODE
Pop-Location

if ($code -eq 0) {
    Write-Host "Deploy started. Verify: https://jansetu-ai-three.vercel.app/api/dashboard/stats" -ForegroundColor Green
} else {
    Write-Host "Deploy command failed (exit $code). Retry the network-flaky CLI call." -ForegroundColor Red
}
