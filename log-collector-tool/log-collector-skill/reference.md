# LogCollector Agent - Technical Reference

## Architecture Overview

LogCollector is a system designed to enhance operational efficiency in corporate incident management by integrating Excel-based task management with SSH log collection.

### Design Principles

1. **Production-First**: Docker-free operation with Node.js only for Windows/Linux compatibility
2. **Parallel Processing**: Simultaneous SSH connections to multiple servers for performance
3. **Configuration-Driven**: Flexible pattern matching through JSON-based regex configuration
4. **Fault-Tolerant**: Continues processing when individual servers fail
5. **Output Versatility**: Supports both Excel (formatted) and CSV (plain) outputs

### System Architecture

```
[Excel Task File] → [Pattern Extractor] → [SSH Connector] → [Log Parser] → [Report Generator]
       ↓                    ↓                   ↓              ↓               ↓
   Japanese Tasks      TrackID/Time Extract  Parallel Server   Log Structure   Excel/CSV Output
```

## Core Implementation

### Main Class: LogCollectionSkill

**File**: `scripts/log-collection-skill.js`

#### Configuration Object
```javascript
this.config = {
    inputFolder: process.env.INPUT_FOLDER || './examples',
    outputFolder: process.env.OUTPUT_FOLDER || './output',
    sshKeyPath: process.env.SSH_KEY_PATH,
    servers: [
        { id: 'server1', host: process.env.SSH_HOST_1, port: process.env.SSH_PORT_1, user: process.env.SSH_USER },
        { id: 'server2', host: process.env.SSH_HOST_2, port: process.env.SSH_PORT_2, user: process.env.SSH_USER },
        { id: 'server3', host: process.env.SSH_HOST_3, port: process.env.SSH_PORT_3, user: process.env.SSH_USER }
    ].filter(s => s.host && s.port && s.user),
    logPaths: [
        '/var/log/application.log',
        '/var/log/app/*.log',
        '/tmp/logs/*.log'
    ]
}
```

#### Key Methods

**`execute()` - Main Workflow**
```javascript
async execute() {
    // 7-step workflow implementation
    // 1. Task file detection and reading
    // 2. "情報収集中" status filtering
    // 3. TrackID and timestamp extraction
    // 4. Time range calculation
    // 5. Parallel SSH execution
    // 6. Log analysis and structuring
    // 7. Excel/CSV report generation
}
```

**`extractIdentifiers()` - Pattern Matching**

Processes 5 TrackID patterns in parallel:

```javascript
const patterns = [
    /TrackID:\s*([A-Z0-9]{3,10})/gi,
    /trackId=([A-Z0-9]{3,10})/g,
    /\[ID:\s*([A-Z0-9]{3,10})\]/g,
    /#([A-Z0-9]{3,10})/g,
    /\(識別:\s*([A-Z0-9]{3,10})\)/g
];
```

**`connectToServer()` - SSH Connection Management**

Uses SSH2 library with RSA key support:
```javascript
conn.connect({
    host: server.host,
    port: parseInt(server.port),
    username: server.user,
    privateKey: fs.readFileSync(this.config.sshKeyPath),
    algorithms: {
        serverHostKey: ['rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa'],
        kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group16-sha512'],
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr']
    }
});
```

**`searchServerLogs()` - Parallel Log Search**

Executes grep searches across all servers in parallel:
```javascript
const grepCommands = this.config.logPaths.map(path =>
    `grep -h "${trackId}" ${path} 2>/dev/null || echo ""`
).join('; ');
```

### Excel Processing Engine

**ExcelJS Library Integration**

#### Workbook Structure
1. **Summary Sheet**: Processing statistics, server status, error overview
2. **Log Entry Sheet**: Detailed log data with filtering support

#### Formatting
```javascript
// Header formatting
headerRow.font = { bold: true };
headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

// Data table formatting
worksheet.addTable({
    name: 'LogData',
    ref: 'A1:H' + (logEntries.length + 1),
    headerRow: true,
    style: { theme: 'TableStyleMedium9', showRowStripes: true }
});
```

### SSH Communication Layer

#### Security Configuration
- **Authentication Method**: RSA key-based authentication only
- **Timeouts**: 30-second connection, 60-second search
- **Permissions**: Read-only access
- **Protocol**: SSH2 (encrypted communication)

#### Connection Pool Management
```javascript
const results = await Promise.all(
    this.config.servers.map(server =>
        this.connectToServer(server)
            .catch(error => ({ server: server.id, error: error.message }))
    )
);
```

### Pattern Matching Engine

#### Configuration File: `log-patterns.json`
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
    "searchBefore": 1800,
    "searchAfter": 1800
  }
}
```

#### Time Range Calculation Algorithm
```javascript
const timeRange = {
    start: new Date(incidentTime - (searchBefore * 1000)),
    end: new Date(incidentTime + (searchAfter * 1000))
};
```

## Data Flow

### 1. Excel Reading Phase
```
[Excel File] → [ExcelJS Reader] → [Row Iterator] → [Column Mapping] → [Task Objects]
```

**Required Column Structure**:
- Column A: Incident ID (Task identifier)
- Column B: Timestamp (Date/time information)
- Column C: Incident Description (Contains TrackIDs)
- Column E: Status ("情報収集中" for filtering)

### 2. Pattern Extraction Phase
```
[Task Description] → [Multi-Pattern Regex] → [TrackID List] → [Deduplication] → [Validated IDs]
```

### 3. SSH Execution Phase
```
[Server Config] → [Parallel SSH] → [Grep Commands] → [Raw Log Output] → [Parsed Results]
```

### 4. Report Generation Phase
```
[Log Entries] → [Excel Formatter] → [Summary Calculator] → [Styled Workbook] → [File Output]
                     ↓
               [CSV Formatter] → [Plain Text] → [CSV File]
```

## Performance Characteristics

### Processing Capacity
- **Parallel Connections**: Up to 3 servers simultaneously
- **Memory Usage**: ~50MB per SSH connection
- **Processing Time**: 10-30 seconds (3 servers, 20-50 log entries)
- **Scalability**: Linear scaling with server count

### Timeout Management
```javascript
const timeouts = {
    connection: 30000,  // 30 seconds
    execution: 60000,   // 60 seconds
    total: 300000       // 5 minutes
};
```

### Error Handling
1. **Individual Server Failures**: Processing continues, warnings in report
2. **SSH Authentication Failures**: No retry attempts, error recorded
3. **File I/O Failures**: Process stops, detailed error output
4. **Pattern Match Failures**: Empty results, processing continues

## Dependencies

### Node.js Packages
```json
{
  "dependencies": {
    "chalk": "^4.1.2",      // Console colorization
    "exceljs": "^4.4.0",    // Excel read/write
    "ssh2": "^1.15.0"       // SSH connections
  }
}
```

### System Requirements
- **Node.js**: 16.0.0 or higher
- **OS**: Windows 10/11, Linux, macOS
- **Memory**: 256MB minimum, 512MB recommended
- **Network**: SSH-accessible server segment

## Directory Structure

```
log-collector-skill/
├── SKILL.md                          # Agent overview
├── reference.md                      # This file (technical details)
├── examples.md                       # Usage examples and tutorials
├── templates/                        # Configuration templates
│   ├── log-patterns.json             # Pattern configuration
│   ├── server-config.json            # Server configuration examples
│   └── task_management_sample.xlsx   # Sample task file
└── scripts/                          # Implementation files
    ├── log-collection-skill.js       # Main implementation
    ├── log-collection-csv.js         # CSV-only version
    ├── package.json                  # Dependency definitions
    ├── examples/                     # Sample files
    │   ├── log-patterns.json         # Pattern configuration
    │   └── task_management_sample.xlsx
    └── output/                       # Report output directory (auto-created)
```

## Security Considerations

### Authentication & Authorization
1. **SSH Key Authentication**: Password authentication disabled
2. **Minimum Privileges**: Log file read permissions only
3. **Key Management**: Proper storage and permissions for private keys
4. **Network Security**: Internal segment communication recommended

### Data Protection
1. **Log Content**: Proper handling of sensitive information
2. **Output Files**: Access restriction configuration
3. **Temporary Data**: In-memory processing, minimal disk storage
4. **Audit Logs**: Execution record retention

### Operational Security
1. **Key Rotation**: Regular SSH key updates
2. **Access Logs**: SSH connection monitoring
3. **Permission Reviews**: Regular access rights assessment
4. **Incident Response**: Security issue response procedures

## Troubleshooting

### Diagnostic Commands

#### SSH Connection Test
```bash
ssh -v -i <private_key> -p <port> <user>@<host>
```

#### Node.js Environment Check
```bash
node --version          # Requires 16.0.0+
npm list               # Dependency verification
```

#### File Permission Check
```bash
ls -la <ssh_key_path>  # Requires 600 permissions
```

### Common Issues

#### 1. SSH Connection Failures
**Symptoms**: "Connection reset by peer", "ECONNRESET"
**Causes**:
- Incorrect SSH key permissions (not 600)
- Server-side sshd configuration issues
- Network connectivity problems

**Solutions**:
```bash
chmod 600 <ssh_key_path>
ssh-keygen -lf <ssh_key_path>  # Key verification
telnet <host> <port>           # Connectivity check
```

#### 2. Excel Reading Failures
**Symptoms**: "Cannot read property 'getRow' of undefined"
**Causes**:
- File corruption
- Character encoding issues
- Column structure mismatch

**Solutions**:
- Manual Excel file verification
- UTF-8 encoding confirmation
- Comparison with sample file

#### 3. Pattern Matching Failures
**Symptoms**: "No TrackIDs found in task descriptions"
**Causes**:
- Unsupported TrackID format
- Regular expression errors
- String encoding issues

**Solutions**:
```javascript
// Debug pattern testing
const testString = "TrackID: SAMPLE001";
const pattern = /TrackID:\s*([A-Z0-9]{3,10})/gi;
console.log(testString.match(pattern));
```

## Extensibility

### Server Addition
Add environment variables `SSH_HOST_4`, `SSH_PORT_4`, etc. for 4+ server support

### Pattern Addition
Add new regex patterns to `log-patterns.json`

### Output Format Addition
Integrate new output formatters into `generateReport()` method

### Authentication Method Addition
Support additional authentication methods (certificates, etc.) through SSH2 library