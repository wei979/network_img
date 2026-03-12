# Network IMG - One-click startup with stale process cleanup
# Usage: .\start.ps1

Write-Host "Cleaning up stale processes..." -ForegroundColor Yellow
$ports = @(8001, 5173, 5174)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $pid = $conn.OwningProcess
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "Killed process on port $port (PID: $pid)" -ForegroundColor Red
    }
}

Write-Host "Starting backend on port 8001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$($PSScriptRoot -replace \"'\", \"''\")'; python -m uvicorn analysis_server:app --host 0.0.0.0 --port 8001 --reload" -WindowStyle Normal

# Wait for backend to initialize
Start-Sleep -Seconds 1

Write-Host "Starting frontend on port 5173..." -ForegroundColor Green
npm run dev
