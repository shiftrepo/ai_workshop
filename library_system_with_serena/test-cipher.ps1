$env:AWS_ACCESS_KEY_ID = [System.Environment]::GetEnvironmentVariable("AWS_ACCESS_KEY_ID", "User")
$env:AWS_SECRET_ACCESS_KEY = [System.Environment]::GetEnvironmentVariable("AWS_SECRET_ACCESS_KEY", "User")
$env:AWS_REGION = [System.Environment]::GetEnvironmentVariable("AWS_REGION", "User")

Write-Host "Testing cipher with system environment variables..."
Write-Host "AWS_ACCESS_KEY_ID: $($env:AWS_ACCESS_KEY_ID.Substring(0,10))..."
Write-Host "AWS_REGION: $env:AWS_REGION"

npx @byterover/cipher --mode mcp
