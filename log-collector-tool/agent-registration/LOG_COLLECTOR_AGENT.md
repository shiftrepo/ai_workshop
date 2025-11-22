---
name: LogCollector
description: Automates multi-server SSH log collection from Excel incident tasks, extracting TrackIDs and timestamps from embedded log messages, searching across configured servers with time-range filtering, and generating comprehensive Excel/CSV reports. Use for incident management, log analysis, and automated operations workflows.
color: orange
---

# Log Collector Agent

## Agent Overview

**Agent Name**: Log Collector Agent
**Version**: 1.0.0
**Purpose**: Automated multi-server SSH log collection and analysis system
**Domain**: Operations, Incident Management, Log Analysis

## Description

The Log Collector Agent automates the process of collecting logs from multiple servers via SSH based on incident information stored in Excel task management files. It extracts TrackIDs, timestamps, and program IDs from incident descriptions, searches for relevant logs across configured servers, and generates comprehensive Excel and CSV reports.

## Key Capabilities

### 1. Excel Task Processing
- Reads Excel task management files (`.xlsx`, `.xls`)
- Filters tasks by status ("情報収集中" - Information Collecting)
- Extracts incident ID, timestamp, description, and metadata

### 2. Intelligent Log Pattern Extraction
- **TrackID Extraction**: Multiple pattern support
  - `TrackID:` format
  - `trackId=` format
  - `[ID:]` format
  - `#` prefix format
  - `(識別:)` format
- **Timestamp Extraction**: Automatic detection from log messages
  - ISO 8601 format: `YYYY-MM-DD HH:MM:SS`
  - Extracts timestamps embedded in incident descriptions
- **Program ID Extraction**: Pattern-based extraction
  - Format: `[A-Z]{2,6}\d{2,4}`

### 3. Multi-Server SSH Operations
- Parallel SSH connections to multiple servers
- RSA key-based authentication
- Configurable server endpoints (host, port, user)
- Automatic connection management and cleanup
- Supports up to 3 servers simultaneously (expandable)

### 4. Time-Range Based Log Search
- Calculates search windows from extracted timestamps
- Default: ±30 minutes (configurable via `log-patterns.json`)
- Searches multiple log file paths per server
- Handles multiple log formats

### 5. Report Generation
- **Excel Reports**: Formatted with summary and detail sheets
- **CSV Reports**: Plain-text format for easy integration
- Output includes:
  - Task ID
  - TrackID
  - Program ID
  - Server name
  - Timestamp
  - Log level
  - Log file path
  - Full log content

## Technical Specifications

### Runtime Environment
- **Platform**: Node.js 14.x or higher
- **Operating Systems**:
  - Production: Windows (primary), Linux
  - Development: Docker/Podman containerized environment

### Dependencies
```json
{
  "exceljs": "^4.3.0",
  "ssh2": "^1.11.0",
  "chalk": "^4.1.2"
}
```

### Configuration Files

#### 1. Environment Variables
```bash
# SSH Configuration
SSH_KEY_PATH=/path/to/ssh/private_key
SSH_HOST_1=server1.example.com
SSH_HOST_2=server2.example.com
SSH_HOST_3=server3.example.com
SSH_PORT_1=22
SSH_PORT_2=22
SSH_PORT_3=22
SSH_USER=logcollector

# Directory Configuration
INPUT_FOLDER=./examples
OUTPUT_FOLDER=./output

# Pattern Configuration
LOG_PATTERN_FILE=./examples/log-patterns.json
```

#### 2. Log Patterns Configuration (`log-patterns.json`)
```json
{
  "patterns": {
    "trackId": {
      "pattern": "TrackID:\\s*([A-Z0-9]{3,10})",
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
    "searchBefore": 1800,
    "searchAfter": 1800
  }
}
```

### Log Search Paths
Default paths searched on each server:
- `/var/log/application.log`
- `/var/log/app/*.log`
- `/tmp/logs/*.log`

Configurable in `log-collection-skill.js` lines 467-507.

## Usage Patterns

### Basic Execution
```bash
cd client
npm install
node log-collection-skill.js
```

### With Environment Variables (Windows)
```cmd
set SSH_KEY_PATH=C:\keys\id_rsa
set SSH_HOST_1=192.168.1.100
set SSH_PORT_1=22
set SSH_USER=logcollector
npm run log-collect
```

### With Environment Variables (Linux)
```bash
export SSH_KEY_PATH=/path/to/private_key
export SSH_HOST_1=192.168.1.100
export SSH_PORT_1=22
export SSH_USER=logcollector
npm run log-collect
```

## Input Format

### Excel Task Management File Structure
Required columns (Japanese headers):
- **Column A**: インシデントID (Incident ID)
- **Column B**: タイムスタンプ (Timestamp)
- **Column C**: インシデント概要 (Incident Description)
- **Column D**: 担当者 (Assignee)
- **Column E**: ステータス (Status)
- **Column F**: 調査状況 (Investigation Status)

### Sample Incident Description Format
```
認証エラーが発生しました。以下のエラーログを確認してください。

2025-11-22 22:25:26 [AUTH] ERROR: Authentication failed for user admin TrackID: AUTH2025

システム管理者に連絡して原因を調査中です。
```

## Output Format

### Excel Report Structure
- **Sheet 1 (Summary)**: Task overview with log entry counts
- **Sheet 2 (Details)**: Complete log entries with formatting

### CSV Report Structure
```csv
Task ID,TrackID,Program ID,Server,Timestamp,Log Level,Log Path,Content
INC001,AUTH2025,AUTH2025,server1,2025-11-22 22:25:26,ERROR,/var/log/auth.log,"[AUTH] ERROR: ..."
```

## Performance Characteristics

### Scalability
- **Concurrent Connections**: 3 servers simultaneously
- **Processing Speed**: 10-30 seconds for 20-50 log entries
- **Memory Usage**: ~50MB per active SSH connection
- **Typical Collection**: 3 servers × 15 log entries = ~15 seconds

### Timeouts
- **SSH Connection**: 30 seconds
- **Log Search**: 60 seconds per server
- **Total Operation**: Configurable, typically 2-5 minutes

## Security Considerations

### Authentication
- **SSH Key-Based Only**: No password authentication
- **Key Format**: RSA 2048-bit or higher
- **Key Permissions**: Unix 600 (owner read/write only)

### Access Control
- **Minimum Privileges**: Read-only access to log directories
- **Non-Root User**: Dedicated `logcollector` user recommended
- **Network Segmentation**: Secure network paths for SSH connections

### Data Handling
- **No Sensitive Data Storage**: SSH keys not committed to repository
- **Secure Transmission**: All data encrypted via SSH
- **Output Security**: Reports stored in configurable output directory

## Error Handling

### Connection Failures
- Individual server failures don't stop collection
- Detailed error reporting per server
- Automatic connection cleanup on failure

### Pattern Extraction Failures
- Continues processing with available data
- Logs warnings for extraction issues
- Graceful degradation for missing patterns

### Report Generation Failures
- Validates data before writing
- Creates output directory if missing
- Reports specific file write errors

## Monitoring and Logging

### Console Output
```
🚀 Log Collection Skill - Issue #15 Implementation
⚙️  Step 0: Loading log patterns configuration...
📊 Step 1: Reading Excel task management files...
🔍 Step 2: Filtering tasks by status...
🏷️  Step 3: Extracting identifiers...
🔌 Step 4: Connecting to servers...
🔍 Step 5: Searching logs across servers...
📝 Step 6: Generating Excel and CSV reports...
🧹 Step 7: Cleaning up connections...
✅ Log collection completed successfully!
```

### Debug Output
- Server connection status
- Raw SSH command output (first 100 chars)
- Log entry counts per server
- Extraction results per task

## Integration Points

### Input Integration
- Excel task management systems
- Incident tracking systems
- Service desk applications

### Output Integration
- Report analysis tools
- Log aggregation systems
- Incident documentation platforms

### Extensibility
- Custom log patterns via JSON configuration
- Additional server support via code modification
- Custom report formats via template modification

## Limitations

### Current Constraints
- Maximum 3 configured servers (code modification required for more)
- Japanese-specific Excel column headers
- SSH key-based authentication only (no password support)
- Text-based log files only (no binary formats)

### Known Issues
- OpenSSH 9.9+ requires explicit RSA key algorithm support
- Large log files (>100MB) may cause memory pressure
- Concurrent searches limited by SSH connection overhead

## Development and Testing

### Test Environment
Docker/Podman-based 3-server cluster:
```bash
cd dev-environment/docker
./setup-containers.sh start
```

### Test Data
- Sample task management files in `client/examples/`
- Generated test logs with known TrackIDs
- SSH test keys (development only, never use in production)

### Development Commands
```bash
# Container management
./setup-containers.sh rebuild   # Clean rebuild
./setup-containers.sh status    # Check status
./setup-containers.sh stop      # Stop containers

# Testing
cd client
npm test                        # Run test suite
node log-collection-skill.js    # Manual execution
```

## Documentation

### Available Documentation
- **README.md**: Main project overview (Japanese)
- **client/README.md**: Production deployment guide (Japanese)
- **dev-environment/README.md**: Development environment guide (Japanese)
- **CLAUDE.md**: AI assistant guidance
- **DEPLOYMENT_GUIDE.md**: Detailed deployment instructions

### Architecture Documentation
- Multi-server SSH architecture
- Pattern extraction system
- Time-range calculation logic
- Report generation pipeline

## Version History

### v1.0.0-log-collector (2025-11-22)
- Initial release
- Issue #15 complete implementation
- Windows production environment support
- Real-world incident pattern support
- Multi-TrackID support in single log message
- Comprehensive Japanese documentation

## Support and Maintenance

### Issue Tracking
- GitHub Issues: Track bugs and feature requests
- Project: log-collector-tool
- Repository: shiftrepo/ai_workshop

### Contact
- Project maintained as part of AI Workshop initiative
- Issue #15 reference for implementation details

## License

ISC License

## Agent Invocation Example

```javascript
// Agent configuration
const agentConfig = {
  type: "log-collector",
  mode: "automated",
  inputs: {
    taskManagementFile: "./examples/task_management_sample.xlsx",
    sshKeyPath: "/path/to/ssh_key",
    servers: [
      { host: "192.168.1.100", port: 22, user: "logcollector" },
      { host: "192.168.1.101", port: 22, user: "logcollector" },
      { host: "192.168.1.102", port: 22, user: "logcollector" }
    ],
    logPatternFile: "./examples/log-patterns.json"
  },
  outputs: {
    excelReport: "./output/log-collection-result_{timestamp}.xlsx",
    csvReport: "./output/log-collection-result_{timestamp}.csv"
  },
  options: {
    filterStatus: "情報収集中",
    searchBefore: 1800,  // 30 minutes
    searchAfter: 1800,   // 30 minutes
    parallelConnections: true,
    generateBothFormats: true
  }
};

// Execute agent
const result = await executeLogCollectorAgent(agentConfig);

// Result structure
{
  success: true,
  tasksProcessed: 4,
  logEntriesFound: 48,
  excelFile: "./output/log-collection-result_2025-11-22_23-26-22.xlsx",
  csvFile: "./output/log-collection-result_2025-11-22_23-26-22.csv",
  executionTime: "15.3s",
  serversConnected: 3
}
```

## Tags

`#log-collection` `#ssh-automation` `#incident-management` `#multi-server` `#excel-processing` `#operations` `#log-analysis` `#trackid-extraction` `#automated-reporting` `#nodejs` `#production-ready`
