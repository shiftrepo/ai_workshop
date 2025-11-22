# Log Collector Tool

A powerful log collection tool for gathering logs from multiple servers via SSH, designed for on-premise Linux environments.

## Overview

The Log Collector Tool automates log collection from multiple servers based on task management data:

- Reads Excel task management files to identify tasks requiring log collection
- Extracts TrackIDs, Program IDs, and timestamps using configurable regex patterns
- Connects to multiple servers via SSH simultaneously
- Searches for relevant log entries within calculated time ranges
- Generates comprehensive Excel and CSV reports

## Project Structure

```
log-collector-tool/
├── client/                      # Core application (production-ready)
│   ├── log-collection-skill.js  # Main log collection script
│   ├── log-collection-csv.js    # CSV-focused variant
│   ├── excel-to-csv.js          # Excel to CSV converter
│   ├── examples/                # Configuration and patterns
│   │   ├── log-patterns.json    # Regex patterns for log parsing
│   │   └── task_management_sample.xlsx  # Sample input
│   ├── output/                  # Generated reports
│   └── package.json             # Dependencies
│
├── dev-environment/             # Development and testing (not for production)
│   ├── docker/                  # Container orchestration
│   │   ├── Dockerfile           # Container definition
│   │   ├── docker-compose.yml   # 3-server cluster
│   │   ├── setup-containers.sh  # Container management
│   │   └── DEPLOYMENT_GUIDE.md  # Deployment instructions
│   ├── scripts/                 # Test and dev scripts
│   │   ├── startup.sh           # Container initialization
│   │   ├── generate-logs.sh     # Log generation
│   │   └── test-real-ssh.js     # SSH testing
│   ├── sample-data/             # Test fixtures and SSH keys
│   │   ├── task_management_sample.xlsx
│   │   └── log_collector_key*   # SSH keys (test only)
│   └── README.md                # Development environment guide
│
├── CLAUDE.md                    # AI assistant guidance
└── README.md                    # This file
```

## Quick Start

### Production Use

1. **Install dependencies:**

```bash
cd client
npm install
```

2. **Configure SSH and patterns:**

Create `.env` file or set environment variables:

```bash
export SSH_HOST_1=your-server1.com
export SSH_HOST_2=your-server2.com
export SSH_HOST_3=your-server3.com
export SSH_PORT_1=22
export SSH_PORT_2=22
export SSH_PORT_3=22
export SSH_USER=your-ssh-user
export SSH_KEY_PATH=/path/to/your/ssh/key
export INPUT_FOLDER=./input
export OUTPUT_FOLDER=./output
export LOG_PATTERN_FILE=./examples/log-patterns.json
```

3. **Prepare task management file:**

Place your Excel task management file in the input folder with columns:
- インシデントID (Incident ID)
- タイムスタンプ (Timestamp)
- インシデント概要 (Description with TrackIDs)
- ステータス (Status - must be "情報収集中" for collection)

4. **Run log collection:**

```bash
cd client
node log-collection-skill.js
```

### Development/Testing

For development and testing with Docker containers:

```bash
cd dev-environment/docker
./setup-containers.sh start
```

See `dev-environment/README.md` for detailed development environment documentation.

## Core Features

### Multi-Server SSH Collection

- Connects to multiple servers simultaneously
- Key-based authentication
- Parallel log search operations
- Graceful error handling per server

### Pattern-Based Extraction

Configurable regex patterns in `log-patterns.json`:

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
    "searchBefore": 1800,  # 30 minutes before
    "searchAfter": 1800    # 30 minutes after
  }
}
```

### Report Generation

Generates both Excel and CSV reports with:
- Task ID
- TrackID
- Program ID
- Server name
- Timestamp
- Log level
- Log path
- Full log content

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SSH_HOST_*` | Server hostnames | localhost |
| `SSH_PORT_*` | SSH ports | 5001, 5002, 5003 |
| `SSH_USER` | SSH username | logcollector |
| `SSH_KEY_PATH` | Path to SSH private key | ./examples/log_collector_key |
| `INPUT_FOLDER` | Task management file location | ./examples |
| `OUTPUT_FOLDER` | Report output directory | ./output |
| `LOG_PATTERN_FILE` | Pattern configuration file | ./examples/log-patterns.json |

### Log Pattern Configuration

Edit `client/examples/log-patterns.json` to customize:
- TrackID extraction patterns
- Program ID patterns
- Timestamp formats
- Time range windows for search

### Server Log Paths

Configure in `log-collection-skill.js`:

```javascript
logPaths: [
  '/var/log/application.log',
  '/var/log/app/*.log',
  '/tmp/logs/*.log'
]
```

## Output Format

### Excel Report

- **Summary Sheet**: Task overview with total log counts
- **Detail Sheets**: Per-task log entries with full context
- Formatted with headers and filters

### CSV Report

Single CSV file with all log entries:

```csv
Task ID,TrackID,Program ID,Server,Timestamp,Log Level,Log Path,Content
INC001,ABC123,AUTH101,server1,2025-11-22 10:30:00,ERROR,/var/log/app.log,"Full log entry..."
```

## Requirements

### Production Environment

- Node.js 14.x or higher
- SSH access to target servers
- SSH private key for authentication
- Excel task management files (.xlsx)

### Development Environment

Additional requirements for dev/test:
- Docker or Podman
- Docker Compose
- 8GB RAM recommended
- Ports 5001-5003 available

## Dependencies

Core dependencies (automatically installed):
- `exceljs`: Excel file processing
- `ssh2`: SSH client for server connections
- `chalk`: Console output formatting (optional)

## Security Considerations

### Production Deployment

- **SSH Keys**: Use dedicated SSH keys with restricted permissions
- **User Permissions**: Use non-root SSH user with minimal log read permissions
- **Network Security**: Ensure SSH connections are over secure networks
- **Key Management**: Never commit SSH private keys to repositories
- **Input Validation**: Task management files are validated before processing

### Development Environment

⚠️ **Development keys in `dev-environment/sample-data/` are for testing only!**

Never use these keys in production:
- `log_collector_key*`
- `mock_ssh_key.pem*`

## Troubleshooting

### SSH Connection Failures

```bash
# Test SSH connectivity manually
ssh -i /path/to/key -p PORT user@host

# Check SSH key permissions (must be 600)
chmod 600 /path/to/ssh/key

# Verify user has log read permissions on target servers
ssh -i /path/to/key -p PORT user@host "ls -la /var/log/app/"
```

### No Logs Found

- Verify TrackID exists in server logs: `grep "TrackID" /var/log/app/*.log`
- Check time range calculation in output
- Verify log path configuration matches server setup
- Check log pattern regex in `log-patterns.json`

### Excel Processing Errors

- Verify Excel file format is .xlsx
- Check column names match expected Japanese headers
- Ensure "情報収集中" status is exact (including characters)

## Performance

- **Parallel Operations**: Connects to all servers simultaneously
- **Timeout Management**: 30-second SSH connection timeout, 60-second search timeout
- **Memory Usage**: ~50MB per active SSH connection
- **Typical Collection Time**: 10-30 seconds for 3 servers with 20-50 log entries

## Limitations

- Maximum 3 servers configured (can be extended by modifying code)
- Excel files must follow Japanese task management format
- SSH key-based authentication only (no password auth)
- Log files must be text-based and grep-searchable

## Examples

### Basic Collection

```bash
cd client
node log-collection-skill.js
```

### CSV Output Only

```bash
cd client
node log-collection-csv.js
```

### Custom Configuration

```bash
cd client
SSH_KEY_PATH=/path/to/custom/key \
INPUT_FOLDER=/path/to/tasks \
OUTPUT_FOLDER=/path/to/reports \
node log-collection-skill.js
```

## Development

See `dev-environment/README.md` for:
- Development environment setup
- Container management
- Test script usage
- Sample data generation
- SSH connectivity testing

## License

ISC

## Support

For issues and questions:
1. Check `CLAUDE.md` for AI assistant context
2. Review `dev-environment/README.md` for development setup
3. See `dev-environment/docker/DEPLOYMENT_GUIDE.md` for deployment details
