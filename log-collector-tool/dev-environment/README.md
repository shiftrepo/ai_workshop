# Development Environment for Log Collector Tool

This directory contains development and testing infrastructure for the Log Collector Tool.

## Directory Structure

```
dev-environment/
├── docker/                  # Docker containerization
│   ├── Dockerfile           # Container image definition
│   ├── docker-compose.yml   # 3-server cluster orchestration
│   ├── setup-containers.sh  # Container management script
│   ├── .env.example         # Environment configuration template
│   └── DEPLOYMENT_GUIDE.md  # Detailed deployment instructions
├── scripts/                 # Test and development scripts
│   ├── startup.sh           # Container initialization script
│   ├── generate-logs.sh     # Continuous log generation
│   ├── generate-diverse-logs.sh  # Initial diverse log data
│   ├── test-real-ssh.js     # SSH connectivity testing
│   ├── production-test.js   # Production environment simulation
│   ├── simulate-csv-report.js    # CSV report generation test
│   ├── analyze_patterns.js       # Pattern analysis tool
│   ├── check_search_patterns.js  # Search pattern validation
│   └── comprehensive_pattern_analysis.js  # Comprehensive pattern testing
└── sample-data/             # Sample data and test fixtures
    ├── task_management_sample.xlsx  # Sample task management file
    ├── log_collector_key*           # SSH authentication keys
    └── mock_ssh_key.pem*           # Alternative SSH keys

```

## Quick Start

### Start Development Environment

```bash
cd dev-environment/docker
./setup-containers.sh start
```

### Rebuild from Scratch

```bash
cd dev-environment/docker
./setup-containers.sh rebuild
```

### Stop Environment

```bash
cd dev-environment/docker
./setup-containers.sh stop
```

### Check Status

```bash
cd dev-environment/docker
./setup-containers.sh status
```

## Container Architecture

The development environment creates a 3-server cluster:

- **log-server1-issue15**: Port 5001 (SSH)
- **log-server2-issue15**: Port 5002 (SSH)
- **log-server3-issue15**: Port 5003 (SSH)
- **log-client-issue15**: Test client container

All containers are connected via `log-collection-network` bridge.

## SSH Configuration

### Default SSH Settings

- **User**: `logcollector`
- **Authentication**: SSH key-based (no password)
- **Key Location**: `sample-data/log_collector_key`
- **Ports**: 5001, 5002, 5003 mapped to container port 22

### Manual SSH Connection Test

```bash
ssh -i dev-environment/sample-data/log_collector_key -p 5001 logcollector@localhost
```

## Log Generation

Logs are automatically generated on container startup:

- **Initial Logs**: Created by `generate-diverse-logs.sh`
- **Continuous Logs**: Enabled via `CONTINUOUS_LOGS=true` environment variable
- **Log Locations**:
  - `/var/log/app/*.log` - Application logs
  - `/tmp/logs/*.log` - Temporary logs

### Test Log Files

Small test log files are created in `/tmp/logs/test_sample.log` with controlled TrackIDs:

- `SAMPLE001`: Single TrackID pattern (13 entries across 3 servers)
- `MULTI001`, `MULTI002`: Multi-TrackID pattern (4 entries across 3 servers)

## Testing Scripts

### SSH Connectivity Test

```bash
cd dev-environment/scripts
node test-real-ssh.js
```

### Production Environment Simulation

```bash
cd dev-environment/scripts
node production-test.js
```

### Pattern Analysis

```bash
cd dev-environment/scripts
node analyze_patterns.js
node check_search_patterns.js
node comprehensive_pattern_analysis.js
```

## Sample Data

### Task Management Sample

The file `sample-data/task_management_sample.xlsx` contains sample tasks:

| Task ID | Status | TrackID | Description |
|---------|--------|---------|-------------|
| INC001  | 情報収集中 | SAMPLE001 | Single TrackID test case |
| INC002  | 情報収集中 | MULTI001, MULTI002 | Multi-TrackID test case |
| INC003  | 対応完了 | N/A | Completed (not collected) |

### SSH Keys

Multiple SSH key pairs are provided for testing:

- `log_collector_key` / `log_collector_key_pem`: Main keys
- `mock_ssh_key.pem`: Alternative keys

**Note**: These are test keys only. **Do not use in production.**

## Environment Variables

Configure via `.env` file (see `.env.example`):

```bash
# Server Configuration
SSH_HOST_1=localhost
SSH_HOST_2=localhost
SSH_HOST_3=localhost
SSH_PORT_1=5001
SSH_PORT_2=5002
SSH_PORT_3=5003
SSH_USER=logcollector

# Paths
SSH_KEY_PATH=./dev-environment/sample-data/log_collector_key
INPUT_FOLDER=./client/examples
OUTPUT_FOLDER=./client/output
LOG_PATTERN_FILE=./client/examples/log-patterns.json

# Log Generation
CONTINUOUS_LOGS=true
LOG_SERVER_ID=server1
```

## Troubleshooting

### Containers Won't Start

```bash
# Check Docker daemon
docker ps

# View container logs
docker logs log-server1-issue15

# Rebuild completely
cd dev-environment/docker
./setup-containers.sh rebuild
```

### SSH Connection Failures

```bash
# Verify container SSH daemon
docker exec log-server1-issue15 ps aux | grep ssh

# Check SSH key permissions
ls -la dev-environment/sample-data/log_collector_key

# Test SSH connection manually
ssh -v -i dev-environment/sample-data/log_collector_key -p 5001 logcollector@localhost
```

### Port Conflicts

If ports 5001-5003 are already in use:

1. Edit `docker/docker-compose.yml`
2. Change port mappings (e.g., `"5001:22"` → `"6001:22"`)
3. Update environment variables accordingly

## Production vs Development

This development environment is **not for production use**:

- Uses test SSH keys
- Disables some security features for convenience
- Generates synthetic log data
- Runs containers in non-secure mode

For production deployment, see:
- `docker/DEPLOYMENT_GUIDE.md`
- Main project `README.md`
- Production setup examples in `scripts/production-setup-example.sh`

## Next Steps

After setting up the dev environment:

1. Verify container health: `./setup-containers.sh status`
2. Test SSH connectivity: `ssh -i ../sample-data/log_collector_key -p 5001 logcollector@localhost`
3. Run log collection from main project: `cd ../../client && node log-collection-skill.js`
4. Check generated reports: `ls -la client/output/`

## Cleanup

To completely remove the development environment:

```bash
cd dev-environment/docker
./setup-containers.sh clean

# Optional: Remove sample data
rm -rf dev-environment/sample-data/*
```
