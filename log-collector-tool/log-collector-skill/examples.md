# LogCollector Agent - Usage Examples and Tutorials

## Basic Usage Examples

### Scenario 1: Simple Log Collection from Single Server

**Situation**: Collect logs for TrackID "AUTH001" from one web server

#### Step 1: Environment Setup
```cmd
# Windows environment configuration
set SSH_KEY_PATH=C:\keys\production_key
set SSH_HOST_1=192.168.10.50
set SSH_PORT_1=22
set SSH_USER=logops
```

#### Step 2: Task File Preparation
Create Excel file `incident_20241125.xlsx`:

| A (インシデントID) | B (タイムスタンプ) | C (インシデント概要) | D (担当者) | E (ステータス) |
|---|---|---|---|---|
| INC-2024-001 | 2024-11-25 14:30:00 | Authentication error occurred TrackID: AUTH001 | Tanaka | 情報収集中 |

#### Step 3: Execution
```cmd
cd log-collector-skill\scripts
npm run log-collect
```

#### Expected Output
```
✓ Found 1 Excel file: incident_20241125.xlsx
✓ Found 1 task with '情報収集中' status
✓ Extracted 1 TrackID: AUTH001
✓ Connected to server1 (192.168.10.50:22)
✓ Found 15 log entries for AUTH001
✓ Generated Excel report: output\log-collection-result_2024-11-25_14-45-30.xlsx
✓ Generated CSV report: output\log-collection-result_2024-11-25_14-45-30.csv
```

---

### Scenario 2: Large-scale Incident Investigation Across Multiple Servers

**Situation**: Collect logs from web server, application server, and database server for multiple TrackIDs

#### Step 1: Environment Setup
```cmd
# Multi-server configuration
set SSH_KEY_PATH=C:\keys\incident_key
set SSH_USER=incident_collector

# Server 1: Web server
set SSH_HOST_1=web01.company.com
set SSH_PORT_1=22

# Server 2: Application server
set SSH_HOST_2=app01.company.com
set SSH_PORT_2=2222

# Server 3: Database server
set SSH_HOST_3=db01.company.com
set SSH_PORT_3=22
```

#### Step 2: Complex Task File
Excel file `major_incident_20241125.xlsx`:

| A | B | C | D | E |
|---|---|---|---|---|
| INC-2024-050 | 2024-11-25 09:15:00 | System failure TrackID: SYS001, AUTH002 | System Team | 情報収集中 |
| INC-2024-051 | 2024-11-25 09:20:00 | DB connection error trackId=DB503 | DB Team | 情報収集中 |
| INC-2024-052 | 2024-11-25 09:25:00 | API response delay [ID: API101] | API Team | 情報収集中 |
| INC-2024-053 | 2024-11-25 09:30:00 | Login failure #LOGIN007 | Auth Team | 解決済み |

#### Step 3: Execution
```cmd
npm run log-collect
```

#### Expected Output
```
✓ Found 1 Excel file: major_incident_20241125.xlsx
✓ Found 3 tasks with '情報収集中' status (1 task skipped with '解決済み')
✓ Extracted 5 TrackIDs: SYS001, AUTH002, DB503, API101
✓ Connected to server1 (web01.company.com:22) ✓
✓ Connected to server2 (app01.company.com:2222) ✓
✓ Connected to server3 (db01.company.com:22) ✓
✓ Found 127 total log entries across all servers
   - server1: 45 entries
   - server2: 52 entries
   - server3: 30 entries
✓ Generated reports in output\ directory
```

---

### Scenario 3: Testing with Development Environment

**Situation**: Test with local Docker environment before production deployment

#### Step 1: Start Development Environment
```cmd
cd ..\..\dev-environment\docker
.\setup-containers.sh rebuild
```

#### Step 2: Test Environment Variables
```cmd
set SSH_KEY_PATH=..\..\dev-environment\sample-data\log_collector_key
set SSH_USER=logcollector
set SSH_HOST_1=localhost
set SSH_PORT_1=5001
set SSH_HOST_2=localhost
set SSH_PORT_2=5002
set SSH_HOST_3=localhost
set SSH_PORT_3=5003
```

#### Step 3: Test Execution
```cmd
cd log-collector-skill\scripts
node log-collection-skill.js
```

---

## Advanced Usage Examples

### Custom Pattern Configuration

#### Scenario: Support for Company-Specific TrackID Formats

**Requirement**: Support company-specific formats `REQ-2024-1234` and `Issue#5678`

#### Step 1: Edit Pattern File
Customize `templates/log-patterns.json`:

```json
{
  "patterns": {
    "trackId": {
      "pattern": "(?:TrackID|trackId|REQ-|Issue#)[:\\s#-]*([A-Z0-9\\-]{4,15})",
      "flags": "gi"
    },
    "timestamp": {
      "pattern": "(\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2})",
      "flags": "g"
    }
  },
  "timeRanges": {
    "searchBefore": 3600,
    "searchAfter": 3600
  }
}
```

#### Step 2: Use Custom Pattern
```cmd
set LOG_PATTERN_FILE=C:\custom\patterns\company-patterns.json
npm run log-collect
```

---

### Batch Processing Scripts

#### Scheduled Execution Batch File

**File**: `run_log_collection.bat`

```batch
@echo off
echo Log collection started: %date% %time%

REM Environment variable setup
set SSH_KEY_PATH=C:\keys\production\log_collector.key
set SSH_USER=logcollector
set SSH_HOST_1=prod-web01
set SSH_PORT_1=22
set SSH_HOST_2=prod-app01
set SSH_PORT_2=22
set SSH_HOST_3=prod-db01
set SSH_PORT_3=22

REM Input/output directory configuration
set INPUT_FOLDER=C:\incident_tasks
set OUTPUT_FOLDER=C:\log_reports\%date:~0,4%-%date:~5,2%-%date:~8,2%

REM Create output directory
if not exist "%OUTPUT_FOLDER%" mkdir "%OUTPUT_FOLDER%"

REM Execute log collection
cd /d C:\tools\log-collector-skill\scripts
npm run log-collect

REM Check results
if %ERRORLEVEL% EQU 0 (
    echo ✓ Log collection completed: %date% %time%
    echo Output location: %OUTPUT_FOLDER%
) else (
    echo ✗ Log collection failed: %date% %time%
    exit /b 1
)

echo Processing completed
```

#### Task Scheduler Configuration
```cmd
# Execute daily at 10:00 AM
schtasks /create /tn "LogCollection" /tr "C:\scripts\run_log_collection.bat" /sc daily /st 10:00
```

---

## Error Response Examples

### SSH Connection Error Handling

#### Symptoms
```
✗ Failed to connect to server1: Error: All configured authentication methods failed
```

#### Diagnosis Steps
```cmd
# 1. Manual SSH connection test
ssh -v -i C:\keys\production_key -p 22 logcollector@192.168.10.50

# 2. Key permission verification (Linux/WSL)
chmod 600 /mnt/c/keys/production_key
ls -la /mnt/c/keys/production_key

# 3. Key format verification
ssh-keygen -lf C:\keys\production_key
```

#### Resolution Example
```cmd
# Fix key permissions on Windows
icacls C:\keys\production_key /inheritance:r
icacls C:\keys\production_key /grant:r "%USERNAME%:R"
```

---

### Excel Reading Error Handling

#### Symptoms
```
✗ No tasks found with '情報収集中' status
```

#### Verification Items
1. **Exact Status String Match**
```
Correct: 情報収集中
Wrong: 情報収集中  (trailing space)
Wrong: 情報收集中  (variant characters)
```

2. **Excel File Structure Verification**
```
Required columns:
Column A: Incident ID
Column B: Timestamp
Column C: Incident Description (contains TrackID)
Column E: Status
```

3. **Character Encoding Verification**
```cmd
# Verify saved as UTF-8 with BOM
file -bi task_file.xlsx
```

---

### Performance Optimization Examples

#### Optimization for High-Volume Log Environment

**Scenario**: Efficient search from daily logs of 1 million lines

#### Configuration Adjustments
```json
{
  "timeRanges": {
    "searchBefore": 600,   // Reduced to 10 minutes
    "searchAfter": 600
  },
  "logPaths": [
    "/var/log/app/current.log",          // Latest logs only
    "/var/log/app/$(date +%Y%m%d).log"   // Today's logs only
  ]
}
```

#### Parallel Processing Optimization
```cmd
# Smaller time slices for multiple executions
set SEARCH_BEFORE=300
set SEARCH_AFTER=300
npm run log-collect
```

---

## Operational Practices

### Daily Operations Usage Patterns

#### 1. Regular Collection for Daily Meetings
```cmd
# Previous day's incident log collection
set INPUT_FOLDER=\\shared\incidents\yesterday
set OUTPUT_FOLDER=\\shared\reports\daily
npm run log-collect
```

#### 2. Emergency Incident Response
```cmd
# Immediate log collection (CSV output for speed)
set INPUT_FOLDER=C:\emergency\
npm run log-collect-csv
```

#### 3. Weekly Report Generation
```cmd
# Weekly data integration processing
set INPUT_FOLDER=\\shared\incidents\weekly
set OUTPUT_FOLDER=\\shared\reports\weekly
npm run log-collect
```

### Quality Assurance Checklist

#### Pre-execution Check
- [ ] SSH key validity verification
- [ ] Server connectivity verification
- [ ] Excel file format verification
- [ ] Output directory permission verification

#### Post-execution Check
- [ ] All server connection success verification
- [ ] Expected TrackID count extraction verification
- [ ] Log entry count validity verification
- [ ] Report file generation verification

### Security Operations

#### SSH Key Management
```cmd
# Quarterly key rotation
ssh-keygen -t rsa -b 4096 -f log_collector_key_2024q4
ssh-copy-id -i log_collector_key_2024q4.pub logcollector@server

# Old key deactivation verification
ssh-keygen -R server_hostname
```

#### Access Auditing
```bash
# Server-side access log verification
tail -f /var/log/auth.log | grep logcollector
```

## Frequently Asked Questions (FAQ)

### Q: How are multiple TrackIDs in one task processed?

**A**: All TrackIDs are automatically extracted. Example:
```
Input: "System failure TrackID: SYS001, AUTH002"
Extracted: ["SYS001", "AUTH002"]
Search: Parallel search execution for both IDs
```

### Q: What about multiple timestamp formats?

**A**: Supports ISO 8601 format and derivatives:
- `2024-11-25 14:30:00`
- `2024-11-25T14:30:00`
- `2024/11/25 14:30:00`

### Q: What happens if a server is temporarily unresponsive?

**A**: Processing continues on other servers with warnings in the report:
```
Warning: Failed to connect to server2 (app01.company.com)
Reason: Connection timeout after 30 seconds
```

### Q: Can I use CSV output only?

**A**: Use the CSV-specific command:
```cmd
npm run log-collect-csv
```
Or direct execution:
```cmd
node log-collection-csv.js
```

Use these examples as reference and customize according to your environment and needs.