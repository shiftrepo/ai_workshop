#!/bin/bash

# Setup script for Issue #15 Log Collection Container Environment
# Creates and configures Docker containers with SSH access and log generation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Setting up Issue #15 Log Collection Container Environment"
echo "============================================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check requirements
echo "🔍 Checking requirements..."

if command_exists docker; then
    echo "  ✅ Docker found: $(docker --version | head -1)"
else
    echo "  ❌ Docker not found. Please install Docker first."
    exit 1
fi

if command_exists docker-compose; then
    echo "  ✅ Docker Compose found: $(docker-compose --version | head -1)"
elif docker compose version >/dev/null 2>&1; then
    echo "  ✅ Docker Compose (plugin) found: $(docker compose version | head -1)"
    COMPOSE_CMD="docker compose"
else
    echo "  ❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

COMPOSE_CMD=${COMPOSE_CMD:-"docker-compose"}

# Clean up existing containers if requested
if [ "$1" = "clean" ] || [ "$1" = "rebuild" ]; then
    echo ""
    echo "🧹 Cleaning up existing containers..."

    $COMPOSE_CMD down --volumes --remove-orphans 2>/dev/null || true

    echo "  🗑️ Removing existing containers..."
    docker rm -f log-server1-issue15 log-server2-issue15 log-server3-issue15 log-client-issue15 2>/dev/null || true

    echo "  🗑️ Removing existing images..."
    docker rmi log-collector-tool:issue15-latest 2>/dev/null || true

    echo "  🗑️ Removing existing volumes..."
    docker volume rm $(docker volume ls -q | grep -E 'log-collector-tool.*') 2>/dev/null || true

    echo "  ✅ Cleanup completed"
fi

# Create SSH key if it doesn't exist
echo ""
echo "🔑 Setting up SSH keys..."

SSH_KEY_DIR="client/examples"
SSH_KEY_PATH="$SSH_KEY_DIR/mock_ssh_key.pem"

mkdir -p "$SSH_KEY_DIR"

if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "  📝 Generating SSH key pair..."
    ssh-keygen -t rsa -b 2048 -f "$SSH_KEY_PATH" -N "" -C "issue15-log-collection"
    chmod 600 "$SSH_KEY_PATH"
    echo "  ✅ SSH key generated: $SSH_KEY_PATH"
else
    echo "  ✅ SSH key already exists: $SSH_KEY_PATH"
fi

# Ensure log pattern file exists
if [ ! -f "client/examples/log-patterns.json" ]; then
    echo "  ⚠️  Log patterns file missing - should have been created already"
else
    echo "  ✅ Log patterns file exists: client/examples/log-patterns.json"
fi

# Build Docker image
echo ""
echo "🏗️ Building Docker image..."

docker build -t log-collector-tool:issue15-latest . --no-cache
echo "  ✅ Docker image built successfully"

# Start containers with Docker Compose
echo ""
echo "🚀 Starting container environment..."

$COMPOSE_CMD up -d --build

echo "  ✅ Containers started successfully"

# Wait for containers to be ready
echo ""
echo "⏳ Waiting for containers to initialize..."

sleep 10

# Check container status
echo ""
echo "📊 Container Status:"

for container in log-server1-issue15 log-server2-issue15 log-server3-issue15 log-client-issue15; do
    if docker ps --filter "name=$container" --format "table {{.Names}}\t{{.Status}}" | grep -q "$container"; then
        status=$(docker ps --filter "name=$container" --format "{{.Status}}")
        echo "  ✅ $container: $status"
    else
        echo "  ❌ $container: Not running"
    fi
done

# Show network configuration
echo ""
echo "🌐 Network Configuration:"
echo "  📡 SSH Access Ports:"
echo "    - Server 1: localhost:5001 → log-server1:22"
echo "    - Server 2: localhost:5002 → log-server2:22"
echo "    - Server 3: localhost:5003 → log-server3:22"

# Show log file status
echo ""
echo "📂 Generated Log Files:"

for server in log-server1-issue15 log-server2-issue15 log-server3-issue15; do
    echo "  📊 $server:"
    docker exec "$server" find /var/log/app /tmp/logs -name '*.log' -exec wc -l {} \; 2>/dev/null | \
        while read count file; do
            echo "    - $(basename "$file"): $count lines"
        done
done

# Create example task management file
echo ""
echo "📋 Creating example task management file..."

EXAMPLE_FILE="client/examples/task_management_sample.xlsx"
if [ ! -f "$EXAMPLE_FILE" ]; then
    # Copy from parent directory if it exists there
    if [ -f "../task_management_sample.csv" ]; then
        echo "  📄 Found CSV sample, converting to Excel format..."
        # Note: This would require a conversion tool, for now just note the file
        echo "  ⚠️  CSV sample found at ../task_management_sample.csv"
        echo "  ℹ️  Please convert to Excel format manually if needed"
    else
        echo "  ⚠️  No sample task file found"
        echo "  ℹ️  Create Excel file with structure: インシデントID, タイムスタンプ, インシデント概要, 担当者, ステータス, 調査状況"
    fi
else
    echo "  ✅ Example task file exists: $EXAMPLE_FILE"
fi

# Show usage instructions
echo ""
echo "📚 Usage Instructions:"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "🔧 Testing the Log Collection Skill:"
echo "  1. Enter client container:"
echo "     docker exec -it log-client-issue15 bash"
echo ""
echo "  2. Run log collection:"
echo "     cd /app/client"
echo "     node log-collection-skill.js"
echo ""
echo "🔍 Direct SSH Testing:"
echo "  # Test SSH connectivity to servers"
echo "  ssh -i client/examples/mock_ssh_key.pem -p 5001 logcollector@localhost"
echo "  ssh -i client/examples/mock_ssh_key.pem -p 5002 logcollector@localhost"
echo "  ssh -i client/examples/mock_ssh_key.pem -p 5003 logcollector@localhost"
echo ""
echo "🧪 Manual Log Generation:"
echo "  # Generate additional logs in a server"
echo "  docker exec log-server1-issue15 /app/client/generate-logs.sh test"
echo ""
echo "📊 Monitor Logs:"
echo "  # View real-time logs from a server"
echo "  docker exec log-server1-issue15 tail -f /var/log/app/application.log"
echo ""
echo "🛑 Stop Environment:"
echo "  $COMPOSE_CMD down"
echo ""
echo "🧹 Clean Environment:"
echo "  $0 clean"
echo ""
echo "✅ Issue #15 Container Environment Setup Complete!"
echo "🎯 Ready for log collection testing with realistic multi-server environment"