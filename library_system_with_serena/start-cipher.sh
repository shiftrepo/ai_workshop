#!/bin/bash
# AWS credentials should be set in environment variables before running this script
# Example:
# export AWS_ACCESS_KEY_ID="your_access_key"
# export AWS_SECRET_ACCESS_KEY="your_secret_key"
# export AWS_REGION="us-east-1"

if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "Error: AWS_ACCESS_KEY_ID environment variable is not set" >&2
    exit 1
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Error: AWS_SECRET_ACCESS_KEY environment variable is not set" >&2
    exit 1
fi

if [ -z "$AWS_REGION" ]; then
    export AWS_REGION="us-east-1"
fi

node "/c/Users/kappappa/AppData/Roaming/npm/node_modules/@byterover/cipher/dist/src/app/index.cjs" --mode mcp
