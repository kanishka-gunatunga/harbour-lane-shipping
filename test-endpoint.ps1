# PowerShell script to test carrier rates endpoint
# Usage: .\test-endpoint.ps1 -Url "https://your-tunnel-url"

param(
    [Parameter(Mandatory=$true)]
    [string]$Url
)

# Remove trailing slash if present
$Url = $Url.TrimEnd('/')

# Test payload
$body = @{
    rate = @{
        destination = @{
            postal_code = "2000"
            country = "AU"
        }
    }
} | ConvertTo-Json -Depth 10

Write-Host "Testing carrier rates endpoint..." -ForegroundColor Cyan
Write-Host "URL: $Url/carrier/rates" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$Url/carrier/rates" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

