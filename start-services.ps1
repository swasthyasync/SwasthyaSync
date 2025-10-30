$ErrorActionPreference = "Stop"

# Function to start a service
function Start-Service {
    param (
        [string]$Name,
        [string]$Command,
        [string]$WorkingDir
    )
    
    Write-Host "Starting $Name..."
    try {
        Push-Location $WorkingDir
        $process = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "`"$Command`"" -PassThru
        Pop-Location
        Write-Host "✅ ${Name} started successfully (PID: $($process.Id))"
    }
    catch {
        Write-Host "❌ Failed to start ${Name}: $($_.Exception.Message)"
        return $false
    }
    return $true
}

# Start ML Service
$mlServiceStarted = Start-Service -Name "ML Service" -Command "./.venv/Scripts/python.exe run_server.py" -WorkingDir "D:/Downloads/swasthyasync/models"

# Start API Service
$apiServiceStarted = Start-Service -Name "API Service" -Command "npm run dev" -WorkingDir "D:/Downloads/swasthyasync/packages/api"

if (-not ($mlServiceStarted -and $apiServiceStarted)) {
    Write-Host "❌ Failed to start one or more services"
    exit 1
}

Write-Host "✅ All services started successfully"
Write-Host "ML Service: http://localhost:8000"
Write-Host "API Service: http://localhost:4000"
Write-Host "Press Ctrl+C to stop all services"

while ($true) {
    Start-Sleep -Seconds 1
}