# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Log Collector Tool is a Node.js application that automates log collection from multiple servers via SSH. It reads Excel task management files (Japanese format), extracts TrackIDs and timestamps, connects to servers via SSH, searches for matching logs, and generates Excel/CSV reports.

**Key Architecture**: Two-environment design separating production client code from development/testing infrastructure.

## Architecture

**Production Architecture (Windows/Linux):**
- **Client**: Pure Node.js application (no Docker required)
- **Dependencies**: Only Node.js libraries (ssh2, exceljs, chalk)
- **Configuration**: Environment variables only
- **Deployment**: `client/` directory is self-contained production code

**Development Architecture (Docker-based testing):**
- **Servers**: 3 Alpine Linux containers with OpenSSH
- **Testing**: Simulates production SSH environment locally
- **Location**: `dev-environment/` (NOT needed for production)
- **Pattern Engine**: Configurable JSON-based log pattern matching
- **Output Engine**: Excel (ExcelJS) and CSV report generation

## Essential Commands

### Production Execution (Windows/Linux)

```bash
# Navigate to client directory
cd client

# Install dependencies (first time only)
npm install

# Set environment variables (Windows example)
set SSH_KEY_PATH=C:\path\to\private_key
set SSH_HOST_1=192.168.1.100
set SSH_PORT_1=22
set SSH_USER=logcollector

# Run log collection
npm run log-collect           # Excel + CSV output
npm run log-collect-csv       # CSV output only

# Direct execution (for debugging)
node log-collection-skill.js
node log-collection-csv.js
```

### Development Environment (Docker)

```bash
# Navigate to docker directory
cd dev-environment/docker

# Container management
./setup-containers.sh rebuild    # Clean rebuild all containers
./setup-containers.sh start      # Start existing containers
./setup-containers.sh stop       # Stop all containers
./setup-containers.sh status     # Check container health
./setup-containers.sh clean      # Complete cleanup

# Test SSH connectivity
cd ../scripts
node test-real-ssh.js

# Test with dev environment from client
cd ../../client
env SSH_KEY_PATH=../dev-environment/sample-data/log_collector_key \
    SSH_HOST_1=localhost SSH_PORT_1=5001 \
    SSH_HOST_2=localhost SSH_PORT_2=5002 \
    SSH_HOST_3=localhost SSH_PORT_3=5003 \
    SSH_USER=logcollector \
    node log-collection-skill.js
```

## Core Workflow

1. **Excel Input**: Read task management files from INPUT_FOLDER
   - Expected columns (Japanese): インシデントID, タイムスタンプ, インシデント概要, 担当者, ステータス, 調査状況
   - Filter tasks by status: "情報収集中" (Information Collecting)

2. **Pattern Extraction**: Use configurable regex from `log-patterns.json`
   - Extract multiple TrackIDs per task (supports: `TrackID:`, `trackId=`, `[ID:]`, `#`, `(識別:)`)
   - Extract Program IDs (e.g., AUTH101, DB503)
   - Extract timestamps and calculate search time ranges (default: ±30 minutes)

3. **SSH Collection**: Parallel connection to configured servers
   - SSH2 library with key-based authentication
   - Simultaneous grep execution across all servers
   - Timeout management (30s connection, 60s search)
   - Graceful error handling per server

4. **Report Generation**: Create Excel and CSV reports
   - Excel: Summary sheet + detailed log entries with formatting
   - CSV: Single file with all log entries
   - Output to OUTPUT_FOLDER with timestamp in filename

## Critical Configuration Files

### `client/log-collection-skill.js` - Main Implementation

**Key Configuration** (lines 14-30):
```javascript
this.config = {
    inputFolder: process.env.INPUT_FOLDER || './examples',
    outputFolder: process.env.OUTPUT_FOLDER || './output',
    sshKeyPath: process.env.SSH_KEY_PATH,  // Required - no default
    servers: [
        { id: 'server1', host: process.env.SSH_HOST_1, port: process.env.SSH_PORT_1, user: process.env.SSH_USER },
        { id: 'server2', host: process.env.SSH_HOST_2, port: process.env.SSH_PORT_2, user: process.env.SSH_USER },
        { id: 'server3', host: process.env.SSH_HOST_3, port: process.env.SSH_PORT_3, user: process.env.SSH_USER }
    ].filter(s => s.host && s.port && s.user),  // Only include fully configured servers
    logPaths: [
        '/var/log/application.log',
        '/var/log/app/*.log',
        '/tmp/logs/*.log'
    ]
};
```

**Critical Methods**:
- `extractIdentifiers()` (lines 218-283): Multi-pattern TrackID extraction
- `connectToServer()` (lines 368-413): SSH2 connection with RSA key support
- `searchServerLogs()` (lines 467-507): Grep-based log search
- `parseLogOutput()` (lines 555-587): Raw log line parsing

### `client/examples/log-patterns.json`

Defines regex patterns for log parsing:

```json
{
  "patterns": {
    "trackId": {
      "pattern": "(?:TrackID|trackId)[:\\s\"]*([A-Z0-9]{3,10})",
      "flags": "gi"
    },
    "programId": {
      "pattern": "\\b([A-Z]{2,6}\\d{2,4})\\b",
      "flags": "g"
    },
    "timestamp": {
      "pattern": "(\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2})",
      "flags": "g"
    }
  },
  "timeRanges": {
    "searchBefore": 1800,   // 30 minutes before
    "searchAfter": 1800     // 30 minutes after
  }
}
```

**Important**: Multiple TrackID patterns are hardcoded in `log-collection-skill.js` lines 232-239 for maximum compatibility.

### `dev-environment/scripts/startup.sh`

Container initialization script with critical SSH configuration:

**Line 66-67**: Unlocks logcollector user account (required for OpenSSH 9.9)
```bash
passwd -u logcollector 2>/dev/null
```

**Lines 33-54**: Simplified sshd_config for modern OpenSSH compatibility
```bash
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
PubkeyAcceptedAlgorithms +ssh-rsa,rsa-sha2-256,rsa-sha2-512
```

## Environment Variables

### Required (Production)

| Variable | Purpose | Example |
|----------|---------|---------|
| `SSH_KEY_PATH` | SSH private key path | `/path/to/key` or `C:\keys\id_rsa` |
| `SSH_HOST_1` | First server hostname/IP | `192.168.1.100` or `localhost` |
| `SSH_PORT_1` | First server SSH port | `22` or `5001` |
| `SSH_USER` | SSH username | `logcollector` |

### Optional (Production)

| Variable | Purpose | Default |
|----------|---------|---------|
| `SSH_HOST_2`, `SSH_HOST_3` | Additional servers | not set |
| `SSH_PORT_2`, `SSH_PORT_3` | Additional server ports | not set |
| `INPUT_FOLDER` | Task Excel file location | `./examples` |
| `OUTPUT_FOLDER` | Report output directory | `./output` |
| `LOG_PATTERN_FILE` | Pattern config file | `./examples/log-patterns.json` |

### Development Environment

| Variable | Purpose | Default |
|----------|---------|---------|
| `CONTINUOUS_LOGS` | Enable continuous log generation | `false` |
| `LOG_SERVER_ID` | Server identifier for logs | `server1` |

## Excel Task Management File Format

Expected Excel structure (Japanese headers):

| Column | Japanese | Purpose |
|--------|----------|---------|
| A | インシデントID | Task identifier (e.g., INC001) |
| B | タイムスタンプ | Incident timestamp |
| C | インシデント概要 | Description containing TrackIDs |
| D | 担当者 | Assignee |
| E | ステータス | Status (must be "情報収集中" for collection) |
| F | 調査状況 | Investigation notes |

**Sample Description with TrackIDs**:
```
Sample test entry 1 TrackID: SAMPLE001
Multi-TrackID entry TrackID: MULTI001 TrackID: MULTI002
```

## Common Development Workflows

### Initial Setup

```bash
# 1. Clone repository
git clone <repository>
cd log-collector-tool

# 2. Setup production client
cd client
npm install

# 3. Setup development environment (optional for testing)
cd ../dev-environment/docker
./setup-containers.sh rebuild

# 4. Verify container health
./setup-containers.sh status
```

### Testing Changes

```bash
# 1. Start dev environment
cd dev-environment/docker
./setup-containers.sh start

# 2. Test SSH connectivity
cd ../scripts
node test-real-ssh.js

# 3. Run log collection against dev servers
cd ../../client
env SSH_KEY_PATH=../dev-environment/sample-data/log_collector_key \
    SSH_HOST_1=localhost SSH_PORT_1=5001 \
    SSH_HOST_2=localhost SSH_PORT_2=5002 \
    SSH_HOST_3=localhost SSH_PORT_3=5003 \
    SSH_USER=logcollector \
    node log-collection-skill.js

# 4. Verify output
ls -la output/
```

### Debugging SSH Issues

```bash
# Check container SSH daemon
docker exec log-server1-issue15 ps aux | grep ssh

# View SSH daemon logs
docker logs log-server1-issue15

# Test manual SSH connection
ssh -v -i dev-environment/sample-data/log_collector_key -p 5001 logcollector@localhost

# Restart SSH daemon with debug mode
docker exec log-server1-issue15 /usr/sbin/sshd -ddd
```

## Troubleshooting Guide

### SSH Connection Failures

**Symptom**: "Connection reset by peer", "ECONNRESET", "All configured authentication methods failed"

**Causes**:
- SSH daemon not running in container
- SSH key permissions incorrect (must be 600)
- logcollector account locked (OpenSSH 9.9 issue)
- RSA key algorithm not accepted

**Solutions**:
```bash
# Fix container SSH daemon
docker exec log-server1-issue15 /usr/sbin/sshd

# Fix SSH key permissions
chmod 600 /path/to/ssh/key

# Unlock logcollector account (in container startup.sh line 66)
passwd -u logcollector

# Add RSA algorithm support (in sshd_config line 38)
PubkeyAcceptedAlgorithms +ssh-rsa,rsa-sha2-256,rsa-sha2-512
```

### No Tasks Found

**Symptom**: "No tasks found with '情報収集中' status"

**Causes**:
- Excel file not in INPUT_FOLDER
- Status column not exactly "情報収集中" (character-perfect match required)
- Excel file corrupted or wrong format

**Solutions**:
```bash
# Verify INPUT_FOLDER contains .xlsx files
ls -la client/examples/*.xlsx

# Check Excel file manually for exact status text
# Use client/examples/task_management_sample.xlsx as reference
```

### No Log Entries Found

**Symptom**: "Total 0 log entries found"

**Causes**:
- TrackID not present in server logs
- Log path configuration doesn't match server log locations
- Time range calculation excludes relevant logs
- Pattern regex doesn't match log format

**Solutions**:
```bash
# Test TrackID exists on server
ssh -i key -p 5001 user@host "grep SAMPLE001 /tmp/logs/*.log"

# Verify log paths in log-collection-skill.js line 25-28
logPaths: ['/var/log/application.log', '/var/log/app/*.log', '/tmp/logs/*.log']

# Adjust time range in log-patterns.json
"timeRanges": { "searchBefore": 3600, "searchAfter": 3600 }  # 1 hour

# Test pattern matching
cd dev-environment/scripts
node check_search_patterns.js
```

### Pattern Extraction Issues

**Symptom**: TrackIDs not extracted from task descriptions

**Causes**:
- TrackID format doesn't match any of the 5 supported patterns
- Encoding issues in Excel file (BOM, special characters)

**Solutions**:
```javascript
// Check supported patterns in log-collection-skill.js lines 232-239:
// 1. TrackID:\s*([A-Z0-9]{3,10})
// 2. trackId=([A-Z0-9]{3,10})
// 3. \[ID:\s*([A-Z0-9]{3,10})\]
// 4. #([A-Z0-9]{3,10})
// 5. \(識別:\s*([A-Z0-9]{3,10})\)

// Test extraction
cd dev-environment/scripts
node analyze_patterns.js
```

## Performance Characteristics

- **Parallel Operations**: All servers connected simultaneously
- **Timeout Management**: 30s connection timeout, 60s search timeout per server
- **Memory Usage**: ~50MB per active SSH connection
- **Typical Collection Time**: 10-30 seconds for 3 servers with 20-50 log entries
- **Scalability**: Designed for up to 3 servers (can be extended by adding SSH_HOST_4+)

## Security Considerations

### Production Deployment

- **SSH Keys**: Use dedicated keys with 600 permissions, never commit to git
- **SSH User**: Use non-root user with minimal permissions (read-only access to log files)
- **Network**: Ensure SSH connections over secure internal network
- **Key Rotation**: Rotate SSH keys periodically per security policy
- **Audit Trail**: All collections logged to console with timestamps

### Development Environment

⚠️ **WARNING**: Development SSH keys in `dev-environment/sample-data/` are for TESTING ONLY.

**Never use these keys in production**:
- `log_collector_key` / `log_collector_key.pub`
- `log_collector_key_pem`
- `mock_ssh_key.pem` / `mock_ssh_key.pem.pub`

## Issue #15 Implementation Notes

This codebase implements Issue #15 specifications:
- Multi-server SSH log collection ✅
- Excel task management file processing ✅
- Configurable regex patterns via JSON ✅
- Time-range based searching ✅
- Excel + CSV report generation ✅
- Docker-based test environment ✅
- Port mapping (5001, 5002, 5003) ✅
- Windows production compatibility ✅

**Key Commits**:
- Initial implementation: SHA e0a2369
- Windows production support + SSH fixes: SHA 8f1309c (feat: Issue #15 完全実装)