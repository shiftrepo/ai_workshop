#!/bin/bash

# Startup script for Issue #15 Log Collection containers
# Generates initial logs and optionally starts continuous generation

echo "🚀 Starting Issue #15 Log Collection Container..."

# Generate initial diverse logs (as logcollector user)
echo "📊 Generating diverse log data for server $(hostname)..."
su logcollector -c "/app/dev-environment/scripts/generate-diverse-logs.sh"

# Check if continuous log generation is requested
if [ "$CONTINUOUS_LOGS" = "true" ]; then
    echo "🔄 Starting continuous diverse log generation..."
    su logcollector -c "/app/dev-environment/scripts/generate-logs.sh continuous" &
    CONTINUOUS_PID=$!
    echo "✅ Continuous log generation started (PID: $CONTINUOUS_PID)"
fi

# Setup SSH server
echo "🔑 Setting up SSH server..."

# Generate host keys if they don't exist
if [ ! -f /etc/ssh/ssh_host_rsa_key ]; then
    echo "📝 Generating SSH host keys..."
    ssh-keygen -A
fi

# Create SSH directories
mkdir -p ~/.ssh /var/log/sshd /run/sshd

# Setup SSH configuration for key-based authentication
cat > /etc/ssh/sshd_config << 'EOF'
Port 22
Protocol 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key
UsePrivilegeSeparation no
KeyRegenerationInterval 3600
ServerKeyBits 1024
SyslogFacility AUTH
LogLevel INFO
LoginGraceTime 120
PermitRootLogin no
StrictModes yes
RSAAuthentication yes
PubkeyAuthentication yes
AuthorizedKeysFile %h/.ssh/authorized_keys
IgnoreRhosts yes
RhostsRSAAuthentication no
HostbasedAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
PasswordAuthentication no
X11Forwarding no
X11DisplayOffset 10
PrintMotd no
PrintLastLog yes
TCPKeepAlive yes
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
UsePAM no
EOF

# Unlock logcollector account (required for OpenSSH 9.9: locked account "!" rejects pubkey auth)
echo "🔓 Unlocking logcollector account for pubkey auth..."
passwd -u logcollector 2>/dev/null || usermod -p '*' logcollector 2>/dev/null || \
  sed -i 's/^logcollector:!:/logcollector:*:/' /etc/shadow 2>/dev/null || true

# Set up authorized_keys for logcollector user
echo "🔑 Setting up SSH keys for logcollector user..."
LOGCOLLECTOR_HOME=$(getent passwd logcollector | cut -d: -f6)
mkdir -p "$LOGCOLLECTOR_HOME/.ssh"

if [ -f "/app/dev-environment/sample-data/log_collector_key.pub" ]; then
    cp /app/dev-environment/sample-data/log_collector_key.pub "$LOGCOLLECTOR_HOME/.ssh/authorized_keys"
    chmod 600 "$LOGCOLLECTOR_HOME/.ssh/authorized_keys"
    chmod 700 "$LOGCOLLECTOR_HOME/.ssh"
    chown -R logcollector:logcollector "$LOGCOLLECTOR_HOME/.ssh"
    echo "✅ SSH public key configured for logcollector user"
else
    echo "⚠️  No SSH key found - generating emergency access"
fi

# Start SSH daemon as root (using exec to run as root temporarily)
echo "🚀 Starting SSH daemon..."
# Check if running as root to start sshd, otherwise skip
if [ "$(id -u)" = "0" ]; then
    /usr/sbin/sshd -D &
    SSH_PID=$!
    echo "✅ SSH daemon started (PID: $SSH_PID)"
else
    echo "⚠️  Not running as root, cannot start SSH daemon directly"
    echo "🔧 Starting SSH daemon via container init..."
    # Alternative: try to run SSH daemon in background without privileged access
    /usr/sbin/sshd -f /etc/ssh/sshd_config -E /tmp/sshd.log -D &
    SSH_PID=$!
    if [ $? -eq 0 ]; then
        echo "✅ SSH daemon started (PID: $SSH_PID)"
    else
        echo "❌ Failed to start SSH daemon, check /tmp/sshd.log"
    fi
fi

# Display container information
echo ""
echo "📋 Container Status:"
echo "   - Container ID: $(hostname)"
echo "   - Log directories created: /var/log/app, /tmp/logs"
echo "   - Initial logs generated: $(find /var/log/app /tmp/logs -name '*.log' | wc -l) files"
echo "   - Total log entries: $(find /var/log/app /tmp/logs -name '*.log' -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')"

# Show log file sizes
echo ""
echo "📂 Log Files:"
find /var/log/app /tmp/logs -name '*.log' -exec ls -lh {} \; 2>/dev/null | while read -r line; do
    echo "   $line"
done

# Display sample log entries
echo ""
echo "📝 Sample Log Entries:"
if [ -f "/var/log/app/application.log" ]; then
    echo "   From application.log:"
    head -3 /var/log/app/application.log | sed 's/^/     /'
fi

echo ""
echo "✅ Container ready for Issue #15 log collection testing"
echo "🔍 Available for SSH connections on port 22"
echo "📊 Log files ready at: /var/log/app/*.log, /tmp/logs/*.log"

# Keep container running
if [ "$CONTINUOUS_LOGS" = "true" ]; then
    echo "🔄 Container running with continuous log generation..."
    wait $CONTINUOUS_PID
else
    echo "💤 Container running in daemon mode..."
    tail -f /dev/null
fi