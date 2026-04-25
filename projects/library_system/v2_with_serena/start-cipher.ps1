# AWS credentials should be set in environment variables before running this script
# Example:
# $env:AWS_ACCESS_KEY_ID = "your_access_key"
# $env:AWS_SECRET_ACCESS_KEY = "your_secret_key"
# $env:AWS_REGION = "us-east-1"

if (-not $env:AWS_ACCESS_KEY_ID) {
    Write-Error "AWS_ACCESS_KEY_ID environment variable is not set"
    exit 1
}

if (-not $env:AWS_SECRET_ACCESS_KEY) {
    Write-Error "AWS_SECRET_ACCESS_KEY environment variable is not set"
    exit 1
}

if (-not $env:AWS_REGION) {
    $env:AWS_REGION = "us-east-1"
}

npx @byterover/cipher --mode mcp
