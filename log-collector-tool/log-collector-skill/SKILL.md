---
title: LogCollector
description: Multi-server SSH log collection agent for incident management
version: "1.0.0"
author: Claude Code
category: operations
tags: ["ssh", "logs", "excel", "incident-management", "automation"]
requirements:
  - Node.js 16+
  - SSH access to target servers
  - Excel task management files
complexity: intermediate
use_cases:
  - Incident log collection
  - Multi-server log analysis
  - Task-driven log gathering
  - Excel-based workflow integration
---

# LogCollector Agent

Multi-server SSH log collection agent based on Excel task management

## Overview

LogCollector is an operational automation tool that extracts TrackIDs and timestamps from Excel task management files, establishes simultaneous SSH connections to multiple servers to collect logs, and generates both Excel and CSV reports.

## Key Features

- **Excel Task Management Integration**: Automatically extracts tasks with "情報収集中" (Information Collecting) status from Japanese Excel files
- **Multi-pattern TrackID Extraction**: Supports 5 TrackID formats (TrackID:, trackId=, [ID:], #, (識別:))
- **Parallel SSH Connections**: Connects simultaneously to up to 3 servers for log search execution
- **Time Range Search**: Automatically searches logs within ±30 minutes from timestamps
- **Dual Format Reports**: Generates reports in both Excel and CSV formats
- **Production Windows Support**: Runs with Node.js only, no Docker required

## Architecture

### 7-Step Workflow

1. **Task File Reading**: Detects Excel files from `INPUT_FOLDER`
2. **Status Filtering**: Extracts only tasks with "情報収集中" status
3. **Pattern Matching**: Extracts TrackIDs using configurable regular expressions
4. **Time Range Calculation**: Determines search time window from timestamps
5. **Parallel SSH Execution**: Performs simultaneous grep searches across all servers
6. **Log Analysis**: Converts search results into structured data
7. **Report Generation**: Outputs Excel and CSV files

### Directory Structure

```
log-collector-skill/
├── SKILL.md                    # This file
├── reference.md                # Technical reference details
├── examples.md                 # Usage examples and tutorials
├── templates/                  # Configuration templates
│   ├── log-patterns.json       # Log pattern configuration
│   ├── server-config.json      # Server configuration template
│   └── task_management_sample.xlsx # Sample task file
└── scripts/                    # Execution scripts
    ├── log-collection-skill.js # Main implementation
    ├── log-collection-csv.js   # CSV-only version
    ├── package.json            # Node.js dependencies
    ├── examples/               # Sample files
    └── output/                 # Report output directory
```

## Quick Start

### 1. Setup

```bash
# Install dependencies
cd log-collector-skill/scripts
npm install

# Set environment variables (Windows)
set SSH_KEY_PATH=C:\path\to\private_key
set SSH_HOST_1=192.168.1.100
set SSH_PORT_1=22
set SSH_USER=logcollector
```

### 2. Task File Preparation

Place Excel files in `scripts/examples/`. Required columns:

| Column | Header (Japanese) | Content |
|--------|-------------------|---------|
| A | インシデントID | Task identifier |
| B | タイムスタンプ | Incident timestamp |
| C | インシデント概要 | Description containing TrackIDs |
| E | ステータス | "情報収集中" for search targets |

### 3. Execution

```bash
npm run log-collect           # Excel + CSV output
npm run log-collect-csv       # CSV output only
```

## Configuration

### Required Environment Variables

- `SSH_KEY_PATH`: Path to SSH private key
- `SSH_HOST_1`: Server 1 hostname/IP
- `SSH_PORT_1`: Server 1 SSH port
- `SSH_USER`: SSH username

### Optional Configuration

- `SSH_HOST_2/3`, `SSH_PORT_2/3`: Additional servers
- `INPUT_FOLDER`: Task file directory (default: `./examples`)
- `OUTPUT_FOLDER`: Report output directory (default: `./output`)
- `LOG_PATTERN_FILE`: Pattern configuration file (default: `./examples/log-patterns.json`)

### TrackID Extraction Patterns

The system automatically detects the following formats:

1. `TrackID: SAMPLE001`
2. `trackId=SAMPLE001`
3. `[ID: SAMPLE001]`
4. `#SAMPLE001`
5. `(識別: SAMPLE001)`

## Output Formats

### Excel Reports
- **Summary Sheet**: Task overview and search statistics
- **Log Entry Sheet**: Detailed log information (filterable)
- **Formatting**: Header highlighting and data table format

### CSV Reports
- Plain text format
- One log entry per line
- Easy import to other tools

## Security

- **SSH Key-based Authentication**: Password authentication disabled
- **Read-only Access**: Log file read permissions only
- **Timeout Controls**: 30-second connection, 60-second search limits
- **Key Management**: Private keys excluded from version control

## Troubleshooting

### SSH Connection Failures
1. Verify SSH key path and permissions
2. Test manual SSH connection
3. Check server availability

### Task Search Failures
1. Verify Excel file exists
2. Check "情報収集中" status
3. Verify character encoding

### Log Search Failures
1. Check TrackID format
2. Verify log path configuration
3. Adjust time range

## Usage Examples

See `examples.md` for detailed usage examples and tutorials.
See `reference.md` for technical specifications.