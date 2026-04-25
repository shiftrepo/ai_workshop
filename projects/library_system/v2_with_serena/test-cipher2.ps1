$env:AWS_ACCESS_KEY_ID = [System.Environment]::GetEnvironmentVariable("AWS_ACCESS_KEY_ID", "User")
$env:AWS_SECRET_ACCESS_KEY = [System.Environment]::GetEnvironmentVariable("AWS_SECRET_ACCESS_KEY", "User")
$env:AWS_REGION = [System.Environment]::GetEnvironmentVariable("AWS_REGION", "User")

Write-Host "Testing cipher command directly..."
& "C:\Users\kappappa\AppData\Roaming\npm\cipher.cmd" --mode mcp
