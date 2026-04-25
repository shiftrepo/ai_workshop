#!/bin/bash

# Docker Entrypoint Script for Log Collector Tool - Issue #15
# Unified entry point that handles environment dependencies and SSH key generation

set -euo pipefail

echo "🚀 Starting Log Collector Tool Container (Mount Mode Ready)..."

# Function to setup mounted files and install dependencies
setup_mounted_files() {
    echo "📦 Setting up mounted files and dependencies..."

    # Set correct permissions for mounted scripts
    if [ -d "/app/scripts" ]; then
        echo "🔧 Setting script permissions..."
        find /app/scripts -name "*.js" -type f -exec chmod +x {} \; 2>/dev/null || true
        find /app/scripts -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true
        find /app/dev-scripts -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true
    fi

    # Install Node.js dependencies if mounted
    if [ -f "/app/scripts/package.json" ]; then
        echo "📝 Installing Node.js dependencies from mounted volume..."
        cd /app/scripts

        # Check if node_modules exists and is populated
        if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
            echo "🔄 Installing npm dependencies..."
            npm install --production --no-audit --no-fund

            if [ $? -eq 0 ]; then
                echo "✅ Dependencies installed successfully"
            else
                echo "⚠️  Dependencies installation failed, continuing without"
            fi
        else
            echo "✅ Dependencies already installed"
        fi

        cd /app
    else
        echo "⚠️  No package.json found in mounted scripts directory"
    fi
}

# Function to generate SSH key pair if not exists
generate_ssh_keys() {
    echo "🔑 Setting up SSH authentication..."

    # Create SSH directories
    mkdir -p /app/.ssh
    mkdir -p /home/logcollector/.ssh

    # Generate SSH key pair for container use (not dependent on external keys)
    if [ ! -f "/app/.ssh/container_key" ]; then
        echo "📝 Generating container SSH key pair..."
        ssh-keygen -t rsa -b 2048 -f /app/.ssh/container_key -N "" -C "container-generated-key"

        # Copy public key to logcollector's authorized_keys
        cp /app/.ssh/container_key.pub /home/logcollector/.ssh/authorized_keys

        # Set proper permissions
        chmod 600 /home/logcollector/.ssh/authorized_keys
        chmod 700 /home/logcollector/.ssh
        chmod 600 /app/.ssh/container_key
        chmod 644 /app/.ssh/container_key.pub

        # Set ownership
        chown -R logcollector:logcollector /home/logcollector/.ssh

        echo "✅ SSH key pair generated and configured"
    else
        echo "✅ SSH keys already exist"
    fi
}

# Function to setup SSH daemon
setup_sshd() {
    echo "🔧 Configuring SSH daemon..."

    # Generate host keys if they don't exist
    if [ ! -f /etc/ssh/ssh_host_rsa_key ]; then
        echo "📝 Generating SSH host keys..."
        ssh-keygen -A
    fi

    # Create SSH directories
    mkdir -p /var/log/sshd /run/sshd

    # Create SSH configuration (compatible with Alpine OpenSSH)
    cat > /etc/ssh/sshd_config << 'EOF'
# SSH daemon configuration for Log Collector Tool
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
PubkeyAcceptedAlgorithms +ssh-rsa,rsa-sha2-256,rsa-sha2-512
AuthorizedKeysFile %h/.ssh/authorized_keys
X11Forwarding no
PrintMotd no
UsePAM no
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

    # Unlock logcollector account (required for OpenSSH 9.x)
    passwd -u logcollector 2>/dev/null || true

    echo "✅ SSH daemon configured"
}

# Function to generate sample logs
generate_sample_logs() {
    echo "📊 Generating sample log data..."

    # Create log directories
    mkdir -p /var/log/app /tmp/logs
    chown logcollector:logcollector /var/log/app /tmp/logs

    # Generate application logs with TrackIDs
    cat > /var/log/app/application.log << EOF
$(date --iso-8601=seconds) INFO [AUTH101] User authentication successful TrackID: SAMPLE001
$(date --iso-8601=seconds) ERROR [DB503] Database connection timeout TrackID: SAMPLE002
$(date --iso-8601=seconds) WARN [API201] Rate limit exceeded TrackID: SAMPLE003
$(date --iso-8601=seconds) INFO [SYS100] System startup complete TrackID: SAMPLE004
$(date --iso-8601=seconds) ERROR [NET404] Network unreachable TrackID: SAMPLE005
EOF

    # Generate error logs
    cat > /tmp/logs/error.log << EOF
$(date --iso-8601=seconds) CRITICAL [SEC999] Security violation detected TrackID: MULTI001
$(date --iso-8601=seconds) ERROR [AUTH102] Failed login attempt TrackID: MULTI002
$(date --iso-8601=seconds) FATAL [DB504] Data corruption detected [ID: CRITICAL001]
$(date --iso-8601=seconds) ERROR [API202] Invalid request format #ERROR001
$(date --iso-8601=seconds) WARN [SYS101] Memory usage high (識別: WARN001)
EOF

    # Set ownership
    chown -R logcollector:logcollector /var/log/app /tmp/logs

    echo "✅ Sample logs generated: $(find /var/log/app /tmp/logs -name '*.log' | wc -l) files"
}

# Function to start continuous log generation (if enabled)
start_continuous_logs() {
    if [ "${CONTINUOUS_LOGS:-false}" = "true" ]; then
        echo "🔄 Starting continuous log generation..."

        # Background script for continuous log generation
        cat > /app/continuous-logs.sh << 'EOF'
#!/bin/bash
while true; do
    TIMESTAMP=$(date --iso-8601=seconds)
    TRACKID=$(printf "AUTO%03d" $((RANDOM % 999 + 1)))
    SERVERID="${LOG_SERVER_ID:-server1}"

    echo "$TIMESTAMP INFO [$SERVERID] Heartbeat TrackID: $TRACKID" >> /var/log/app/application.log
    echo "$TIMESTAMP DEBUG [$SERVERID] System status check TrackID: $TRACKID" >> /tmp/logs/debug.log

    sleep ${LOG_INTERVAL:-30}
done
EOF

        chmod +x /app/continuous-logs.sh
        chown logcollector:logcollector /app/continuous-logs.sh

        # Start as background process
        su logcollector -c "/app/continuous-logs.sh" &
        CONTINUOUS_PID=$!
        echo "✅ Continuous log generation started (PID: $CONTINUOUS_PID)"
    fi
}

# Function to start SSH daemon
start_sshd() {
    echo "🚀 Starting SSH daemon..."

    # Start SSH daemon
    /usr/sbin/sshd -D &
    SSH_PID=$!

    if [ $? -eq 0 ]; then
        echo "✅ SSH daemon started (PID: $SSH_PID)"
    else
        echo "❌ Failed to start SSH daemon"
        exit 1
    fi
}

# Function to display container information
show_container_info() {
    echo ""
    echo "📋 Container Information:"
    echo "   - Container ID: $(hostname)"
    echo "   - Server ID: ${LOG_SERVER_ID:-server1}"
    echo "   - SSH Port: 22"
    echo "   - SSH User: logcollector"
    echo "   - Continuous Logs: ${CONTINUOUS_LOGS:-false}"
    echo ""

    # Show log statistics
    if [ -d "/var/log/app" ] || [ -d "/tmp/logs" ]; then
        echo "📂 Log Files:"
        find /var/log/app /tmp/logs -name '*.log' -exec ls -lh {} \; 2>/dev/null | while read -r line; do
            echo "   $line"
        done
        echo ""

        echo "📝 Sample Log Entries:"
        if [ -f "/var/log/app/application.log" ]; then
            echo "   From application.log:"
            head -2 /var/log/app/application.log | sed 's/^/     /'
        fi
    fi

    echo ""
    echo "✅ Log Collector Tool container ready for SSH connections"
    echo "🔍 Available log paths: /var/log/app/*.log, /tmp/logs/*.log"
}

# Main execution flow
main() {
    echo "🐳 Mount Mode Compatible Log Collector Tool Starting..."

    # Setup components
    setup_mounted_files     # Setup mounted files and install npm dependencies
    generate_ssh_keys
    setup_sshd
    generate_sample_logs
    start_continuous_logs
    start_sshd

    # Display information
    show_container_info

    # Keep container running
    echo "💤 Container running in daemon mode..."
    wait
}

# Execute main function
main "$@"