# Log Collector Tool - Docker Hub Ready

Enterprise-grade log collection tool that automates SSH-based log gathering from multiple servers using Excel task management integration.

## 🚀 Quick Start

### Pull from Docker Hub
```bash
docker pull [your-dockerhub-username]/log-collector-tool:latest
```

### Run Single Container
```bash
docker run -d \
  --name log-server \
  -p 5001:22 \
  -e CONTINUOUS_LOGS=true \
  -e LOG_SERVER_ID=server1 \
  [your-dockerhub-username]/log-collector-tool:latest
```

### Run Complete Environment
```bash
# Download docker-compose.yml
wget https://raw.githubusercontent.com/[your-repo]/log-collector-tool/main/docker-compose.yml

# Set Docker Hub image
export DOCKER_IMAGE=[your-dockerhub-username]/log-collector-tool:latest

# Start 3-server environment
docker-compose up -d
```

## 📋 Features

- **Zero Configuration SSH**: Automatic SSH key generation and setup
- **Multi-Server Support**: Parallel log collection from up to 3 servers
- **Excel Integration**: Process Japanese task management files
- **Pattern Matching**: Configurable regex for TrackID extraction
- **Report Generation**: Excel and CSV output formats
- **Docker Hub Ready**: No local dependencies or environment setup required

## 🏗️ Architecture

```
┌─────────────────┐    SSH    ┌─────────────────┐
│   log-client    │◄─────────►│  log-server1    │
│                 │           │  (port 5001)    │
└─────────────────┘           └─────────────────┘
         │                    ┌─────────────────┐
         └─────SSH────────────►│  log-server2    │
         │                    │  (port 5002)    │
         │                    └─────────────────┘
         │                    ┌─────────────────┐
         └─────SSH────────────►│  log-server3    │
                              │  (port 5003)    │
                              └─────────────────┘
```

## 🔧 Configuration

### Mount Mode vs Copy Mode

**Mount Mode (Recommended for Development):**
- ✅ Live file updates without rebuild
- ✅ Direct access to output files on host
- ✅ Real-time code changes
- ✅ Better development experience
- Use `docker-compose-dev.yml`

**Copy Mode (Production):**
- ✅ Self-contained images
- ✅ Faster startup (no dependency installation)
- ✅ Docker Hub compatibility
- ✅ Production deployment ready
- Use `docker-compose.yml`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONTINUOUS_LOGS` | Enable continuous log generation | `false` |
| `LOG_SERVER_ID` | Server identifier for logs | `server1` |
| `LOG_INTERVAL` | Log generation interval (seconds) | `30` |
| `SSH_USER` | SSH username | `logcollector` |
| `SSH_HOST_*` | Target server hostnames | - |
| `SSH_PORT_*` | SSH port numbers | `22` |
| `NODE_ENV` | Node.js environment | `production` |

### Production Override
```bash
# Production environment
export SSH_HOST_1=prod-server1.company.com
export SSH_HOST_2=prod-server2.company.com
export SSH_HOST_3=prod-server3.company.com
export SSH_KEY_PATH=/secure/path/to/key
export INPUT_FOLDER=/data/excel-files
export OUTPUT_FOLDER=/reports
```

## 🔑 SSH Authentication

**Development**: Automatic SSH key generation
```bash
# Keys automatically generated at startup
/app/.ssh/container_key (private)
/app/.ssh/container_key.pub (public)
```

**Production**: Mount your SSH keys
```bash
docker run -v /host/ssh/key:/app/.ssh/production_key \
  -e SSH_KEY_PATH=/app/.ssh/production_key \
  [image-name]
```

## 📊 Log Collection Workflow

1. **Excel Input**: Japanese task management files
   - Column headers: インシデントID, タイムスタンプ, インシデント概要, etc.
   - Status filter: "情報収集中" (Information Collecting)

2. **Pattern Extraction**: Multiple TrackID patterns supported
   ```
   TrackID: SAMPLE001
   trackId=MULTI001
   [ID: CRITICAL001]
   #ERROR001
   (識別: WARN001)
   ```

3. **SSH Collection**: Parallel server connections
   ```bash
   # Automatic log search across multiple paths
   /var/log/application.log
   /var/log/app/*.log
   /tmp/logs/*.log
   ```

4. **Report Generation**: Excel + CSV formats

## 🐳 Docker Hub Usage Examples

### Development/Testing

**Mount Mode (Recommended for Development):**
```bash
# Development with live file mounting
docker-compose -f docker-compose-dev.yml up -d

# Access development container interactively
docker exec -it log-client-dev bash

# Inside container - run log collection with live updates
node /app/scripts/log-collection-skill.js

# View output directly on host
ls -la ./output/client/
```

**Production Mode:**
```bash
# Full 3-server test environment
docker-compose up -d

# Test SSH connectivity
docker exec log-client-issue15 \
  ssh -i /app/.ssh/container_key -p 22 logcollector@log-server1

# Run log collection
docker exec log-client-issue15 \
  node /app/scripts/log-collection-skill.js
```

### Production Deployment
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  log-collector:
    image: [your-dockerhub-username]/log-collector-tool:latest
    environment:
      - SSH_HOST_1=${PROD_SERVER_1}
      - SSH_HOST_2=${PROD_SERVER_2}
      - SSH_HOST_3=${PROD_SERVER_3}
      - SSH_KEY_PATH=/app/ssh/prod_key
    volumes:
      - ./production-ssh-key:/app/ssh/prod_key:ro
      - ./excel-files:/app/examples:ro
      - ./reports:/app/output
    command: ["node", "/app/log-collector-skill/scripts/log-collection-skill.js"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: log-collector
spec:
  replicas: 1
  selector:
    matchLabels:
      app: log-collector
  template:
    spec:
      containers:
      - name: log-collector
        image: [your-dockerhub-username]/log-collector-tool:latest
        env:
        - name: SSH_HOST_1
          value: "server1.internal.com"
        - name: SSH_KEY_PATH
          value: "/app/ssh/cluster_key"
        volumeMounts:
        - name: ssh-key
          mountPath: /app/ssh
          readOnly: true
        - name: input-data
          mountPath: /app/examples
        - name: output-data
          mountPath: /app/output
```

## 🔒 Security Considerations

- SSH keys automatically generated for development
- Production keys should be mounted as read-only volumes
- Container runs with minimal privileges
- No hardcoded credentials or secrets

## 📝 Log Patterns

Sample logs generated for testing:
```
2024-01-15T10:30:00Z INFO [AUTH101] User authentication successful TrackID: SAMPLE001
2024-01-15T10:31:00Z ERROR [DB503] Database connection timeout TrackID: SAMPLE002
2024-01-15T10:32:00Z CRITICAL [SEC999] Security violation detected TrackID: MULTI001
```

## 🚨 Troubleshooting

### SSH Connection Issues
```bash
# Check SSH daemon status
docker exec [container] pgrep sshd

# Test SSH connectivity
docker exec [container] ssh -v -i /app/.ssh/container_key logcollector@localhost

# View SSH logs
docker logs [container] | grep ssh
```

### No Log Entries Found
```bash
# Verify log paths exist
docker exec [container] ls -la /var/log/app /tmp/logs

# Check TrackID patterns
docker exec [container] grep -r "SAMPLE001" /var/log/app /tmp/logs
```

## 🏷️ Tags & Versions

- `latest`: Latest stable release
- `v1.0.0`: Issue #15 implementation
- `docker-hub-ready`: Docker Hub compatible version

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Submit pull request with tests
4. Ensure Docker Hub compatibility

---

**Built for enterprise log management** | **Docker Hub Ready** | **Zero Configuration**