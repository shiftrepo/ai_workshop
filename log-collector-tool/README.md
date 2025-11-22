# Log Collector Tool

A powerful log collection and analysis tool designed for on-premise Linux environments. Collects logs from files, performs filtering and analysis, and generates comprehensive reports.

## Features

### Server-side (Log Collection)
- Collect logs from any text-based log file
- Multiple timestamp format support (ISO 8601, RFC 3339, syslog)
- Flexible filtering options:
  - Time range (start/end time)
  - Log levels (ERROR, WARN, INFO, DEBUG, TRACE)
  - Keywords (case-insensitive, comma-separated)
- Structured JSON output for easy processing
- Real-time progress indicators for large files
- Automatic log level detection

### Client-side (Analysis & Reporting)
- Load and analyze JSON log data
- Advanced filtering options
- Statistical analysis:
  - Log level distribution
  - Hourly distribution patterns
  - Error keyword frequency analysis
- Colorized console output for better readability
- Export reports to text files
- Sample entry display with configurable count

## Architecture

```
log-collector-tool/
├── server/          # Log collection scripts (Bash)
│   └── collect.sh   # Main collection script
├── client/          # Analysis tool (Node.js)
│   ├── analyze.js   # Main analysis script
│   └── package.json # Dependencies
├── examples/        # Sample log files
├── output/          # Default output directory
├── setup.sh         # Setup script
└── README.md        # This file
```

## Requirements

### Server-side
- Bash shell (Linux/Unix)
- `jq` - JSON processor
- Standard Unix tools: `grep`, `sed`, `awk`, `date`

### Client-side
- Node.js 14.x or higher
- npm (for package management)

## Installation

### 1. Install System Dependencies

**RHEL/CentOS:**
```bash
sudo yum install jq
```

**Ubuntu/Debian:**
```bash
sudo apt install jq
```

### 2. Run Setup Script

```bash
cd log-collector-tool
bash setup.sh
```

This will:
- Check for required commands
- Make server scripts executable
- Install client Node.js dependencies
- Create output directories

## Usage

### Basic Workflow

**Step 1: Collect logs (server-side)**
```bash
cd server
./collect.sh /path/to/logfile.log ../output/logs.json
```

**Step 2: Analyze logs (client-side)**
```bash
cd client
node analyze.js ../output/logs.json
```

### Server-side: collect.sh

#### Basic Usage
```bash
./collect.sh <log_file> <output_json>
```

#### With Filters
```bash
# Filter by time range
./collect.sh /var/log/app.log output.json \
  --start-time "2025-11-22T00:00:00" \
  --end-time "2025-11-22T23:59:59"

# Filter by keywords
./collect.sh /var/log/app.log output.json \
  --keywords "error,failed,timeout"

# Filter by log level
./collect.sh /var/log/app.log output.json \
  --level ERROR

# Combine multiple filters
./collect.sh /var/log/app.log output.json \
  --start-time "2025-11-22T10:00:00" \
  --keywords "database" \
  --level ERROR
```

#### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--start-time TIME` | Filter logs after this time | `--start-time "2025-11-22T00:00:00"` |
| `--end-time TIME` | Filter logs before this time | `--end-time "2025-11-22T23:59:59"` |
| `--keywords WORDS` | Comma-separated keywords | `--keywords "error,warning,failed"` |
| `--level LEVEL` | Filter by log level | `--level ERROR` |

### Client-side: analyze.js

#### Basic Usage
```bash
node analyze.js <json_file>
```

#### With Options
```bash
# Show top 20 entries
node analyze.js logs.json --top 20

# Filter by log level
node analyze.js logs.json --level ERROR

# Search for specific text
node analyze.js logs.json --search "database"

# Save report to file
node analyze.js logs.json --output report.txt

# Combine options
node analyze.js logs.json --level ERROR --search "timeout" --top 50 --output errors.txt
```

#### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--top N` | Show top N entries (default: 10) | `--top 20` |
| `--level LEVEL` | Filter by log level | `--level ERROR` |
| `--search TEXT` | Search for text in messages | `--search "database"` |
| `--output FILE` | Save report to file | `--output report.txt` |

## Output Format

### JSON Structure

```json
{
  "collection_info": {
    "timestamp": "2025-11-22T03:59:00Z",
    "source_files": ["/var/log/app.log"],
    "filter": {
      "start_time": "",
      "end_time": "",
      "keywords": "",
      "level": ""
    }
  },
  "entries": [
    {
      "timestamp": "2025-11-22T10:15:30",
      "level": "ERROR",
      "source": "/var/log/app.log",
      "raw": "2025-11-22 10:15:30 ERROR Database connection failed"
    }
  ],
  "statistics": {
    "total_lines": 1000,
    "total_entries": 150,
    "by_level": {
      "ERROR": 5,
      "WARN": 20,
      "INFO": 125,
      "DEBUG": 0,
      "TRACE": 0,
      "UNKNOWN": 0
    }
  }
}
```

### Analysis Report

The analysis tool generates a comprehensive report including:
- **Collection Information**: Source files, filters applied
- **Statistics**: Entry counts, level distribution
- **Log Level Distribution**: Visual bar chart
- **Time Range**: First and last entry timestamps
- **Hourly Distribution**: Activity patterns by hour
- **Top Error Keywords**: Most frequent words in error messages
- **Sample Entries**: Top N log entries with details

## Examples

### Example 1: Collect All Errors from Today
```bash
cd server
./collect.sh /var/log/application.log ../output/errors.json \
  --start-time "$(date +%Y-%m-%d)T00:00:00" \
  --level ERROR

cd ../client
node analyze.js ../output/errors.json --top 50
```

### Example 2: Find Database-Related Issues
```bash
cd server
./collect.sh /var/log/app.log ../output/db_issues.json \
  --keywords "database,connection,timeout"

cd ../client
node analyze.js ../output/db_issues.json --search "failed" --output db_report.txt
```

### Example 3: Analyze System Logs for Last Hour
```bash
cd server
./collect.sh /var/log/syslog ../output/recent.json \
  --start-time "$(date -d '1 hour ago' '+%Y-%m-%dT%H:%M:%S')"

cd ../client
node analyze.js ../output/recent.json --level ERROR --level WARN
```

## Supported Log Formats

The tool automatically detects and parses multiple timestamp formats:

1. **ISO 8601**: `2025-11-22T10:15:30` or `2025-11-22T10:15:30Z`
2. **RFC 3339**: `2025-11-22 10:15:30`
3. **Syslog**: `Nov 22 10:15:30` (assumes current year)

Log levels detected:
- ERROR, ERRO, ERR
- WARN, WARNING
- INFO
- DEBUG
- TRACE

## Troubleshooting

### "jq: command not found"
Install jq using your package manager:
```bash
# RHEL/CentOS
sudo yum install jq

# Ubuntu/Debian
sudo apt install jq
```

### "Permission denied" when running collect.sh
Make the script executable:
```bash
chmod +x server/collect.sh
```

### Large Log Files Taking Too Long
- Use time filters to reduce the data set:
  ```bash
  ./collect.sh large.log output.json --start-time "2025-11-22T10:00:00"
  ```
- Filter by specific log levels:
  ```bash
  ./collect.sh large.log output.json --level ERROR
  ```

### JSON Output is Invalid
- Check that your log file doesn't contain special characters that break JSON
- The script attempts to escape quotes and backslashes, but some formats may cause issues
- Try processing a smaller sample first

### No Timestamps Detected
- Check that your log format matches one of the supported formats
- Logs without recognizable timestamps will have empty timestamp fields
- You can still collect and analyze such logs, but time-based filtering won't work

## Performance Considerations

- **Large Files**: Processing files with millions of lines may take several minutes
- **Filtering**: Apply filters during collection (server-side) for better performance
- **Memory**: The client loads the entire JSON into memory; very large datasets may require splitting
- **Progress**: Collection shows progress every 1000 entries for large files

## Extending the Tool

### Adding Custom Timestamp Formats

Edit `server/collect.sh` and add a new pattern in the `extract_timestamp` function:

```bash
# Add your custom format
if echo "$line" | grep -Eq 'your-regex-pattern'; then
    echo "$line" | grep -oE 'your-extraction-pattern' | head -1
    return
fi
```

### Adding Custom Analysis Metrics

Edit `client/analyze.js` and extend the `analyzeEntries` function:

```javascript
// Add custom analysis
analysis.customMetric = entries.filter(e => /* your condition */).length;
```

## License

ISC

## Contributing

Contributions are welcome! Please ensure:
- Follow existing code style
- Test with various log formats
- Update documentation for new features

## Support

For issues and questions:
1. Check the Troubleshooting section
2. Review example log files in `examples/`
3. Verify system requirements are met
