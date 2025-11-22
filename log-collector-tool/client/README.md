# Log Collector Tool - Production Client

This directory contains the production-ready log collection system for Windows environments.

## 📁 Directory Structure

```
client/
├── log-collection-skill.js    # Main log collection script
├── log-collection-csv.js       # CSV-focused variant
├── package.json                # Node.js dependencies only
├── examples/
│   ├── log-patterns.json       # Log parsing patterns (required)
│   └── task_management_sample.xlsx  # Sample task file
├── output/                     # Generated reports (auto-created)
└── README.md                   # This file
```

## 🚀 Setup (Windows Environment)

### 1. Install Node.js
Download and install Node.js from https://nodejs.org/ (LTS version recommended)

### 2. Install Dependencies
```cmd
cd client
npm install
```

### 3. Prepare SSH Access
- Obtain SSH private key file from server administrator
- Note: username, server hostnames/IPs, and port numbers

### 4. Prepare Task Management Files
- Place Excel task files in `client/examples/` directory
- Files should contain tasks with status "情報収集中" (Information Collecting)

## 📊 Usage (Windows)

### Basic Execution
```cmd
rem Set required environment variables
set SSH_KEY_PATH=C:\path\to\your\private_key
set SSH_HOST_1=192.168.1.100
set SSH_PORT_1=22
set SSH_USER=logcollector

rem Run log collection
npm run log-collect
```

### Multiple Servers
```cmd
set SSH_KEY_PATH=C:\path\to\your\private_key
set SSH_USER=logcollector

rem Server 1
set SSH_HOST_1=192.168.1.100
set SSH_PORT_1=22

rem Server 2
set SSH_HOST_2=192.168.1.101
set SSH_PORT_2=22

rem Server 3
set SSH_HOST_3=192.168.1.102
set SSH_PORT_3=22

npm run log-collect
```

### Custom Input/Output Directories
```cmd
set SSH_KEY_PATH=C:\path\to\private_key
set SSH_HOST_1=192.168.1.100
set SSH_PORT_1=22
set SSH_USER=logcollector
set INPUT_FOLDER=C:\tasks
set OUTPUT_FOLDER=C:\results

npm run log-collect
```

## 🔧 Configuration

### Required Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `SSH_KEY_PATH` | Path to SSH private key | `C:\keys\id_rsa` |
| `SSH_HOST_1` | Server 1 hostname/IP | `192.168.1.100` |
| `SSH_PORT_1` | Server 1 SSH port | `22` |
| `SSH_USER` | SSH username | `logcollector` |

### Optional Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `INPUT_FOLDER` | Task file directory | `./examples` |
| `OUTPUT_FOLDER` | Report output directory | `./output` |
| `LOG_PATTERN_FILE` | Log pattern config | `./examples/log-patterns.json` |
| `SSH_HOST_2` | Server 2 hostname/IP | (not set) |
| `SSH_PORT_2` | Server 2 SSH port | (not set) |
| `SSH_HOST_3` | Server 3 hostname/IP | (not set) |
| `SSH_PORT_3` | Server 3 SSH port | (not set) |

## 📝 Output Files

The system generates two types of reports in the `output/` directory:

1. **Excel Report** (`log-collection-result_YYYY-MM-DD_HH-MM-SS.xlsx`)
   - Summary sheet with task overview
   - Detailed log entries with formatting
   - Filterable columns

2. **CSV Report** (`log-collection-result_YYYY-MM-DD_HH-MM-SS.csv`)
   - Plain text format
   - Easy to import into other tools
   - One log entry per row

## ❗ Troubleshooting

### SSH Connection Failed
1. Verify SSH_KEY_PATH is correct and file exists
2. Test SSH manually: `ssh -i <key> -p <port> <user>@<host>`
3. Check network connectivity to servers
4. Verify SSH credentials with administrator

### No Tasks Found
1. Check INPUT_FOLDER contains Excel files
2. Verify tasks have status "情報収集中"
3. Ensure Excel files are not corrupted

### No Logs Found
1. Verify TrackIDs in task descriptions
2. Check log-patterns.json configuration
3. Confirm log files exist on servers
4. Verify log file paths in configuration

## 🔒 Security Notes

- **Never commit SSH private keys** to version control
- Store keys in secure location with restricted permissions
- Rotate keys periodically per security policy
- Use strong passwords/passphrases for key files

## 📞 Support

For production deployment support, contact your system administrator.

## 🧪 Development Environment

Development and testing resources are located in `../dev-environment/`:
- Docker containers for local testing
- Sample SSH keys (for dev only)
- Test scripts and utilities

**Note**: The dev-environment is NOT needed for Windows production deployment.
