# Log Collector Tool - Project Structure

## Directory Organization

This project separates **production core functionality** from **development/testing infrastructure**.

```
log-collector-tool/
│
├── client/                          # 🎯 PRODUCTION CORE
│   ├── log-collection-skill.js      # Main log collection application
│   ├── log-collection-csv.js        # CSV output variant
│   ├── excel-to-csv.js              # Excel converter utility
│   ├── package.json                 # Production dependencies
│   ├── examples/                    # Configuration templates
│   │   ├── log-patterns.json        # Pattern configuration
│   │   └── (placeholder for user data)
│   └── output/                      # Generated reports (gitignored)
│
├── dev-environment/                 # 🔧 DEVELOPMENT & TESTING
│   ├── docker/                      # Container infrastructure
│   │   ├── Dockerfile               # Container image definition
│   │   ├── docker-compose.yml       # Multi-server orchestration
│   │   ├── setup-containers.sh      # Container lifecycle management
│   │   ├── .env.example             # Configuration template
│   │   └── DEPLOYMENT_GUIDE.md      # Deployment documentation
│   │
│   ├── scripts/                     # Development utilities
│   │   ├── startup.sh               # Container initialization
│   │   ├── generate-logs.sh         # Log generation (continuous)
│   │   ├── generate-diverse-logs.sh # Log generation (batch)
│   │   ├── test-real-ssh.js         # SSH connectivity tests
│   │   ├── production-test.js       # Production simulation
│   │   ├── simulate-csv-report.js   # Report generation test
│   │   ├── analyze_patterns.js      # Pattern analysis tool
│   │   ├── check_search_patterns.js # Pattern validation
│   │   └── comprehensive_pattern_analysis.js  # Full pattern testing
│   │
│   ├── sample-data/                 # Test fixtures
│   │   ├── task_management_sample.xlsx  # Sample tasks
│   │   ├── log_collector_key*       # Test SSH keys
│   │   └── mock_ssh_key.pem*        # Alternative test keys
│   │
│   └── README.md                    # Development environment guide
│
├── README.md                        # Main project documentation
├── CLAUDE.md                        # AI assistant context
└── PROJECT_STRUCTURE.md             # This file

```

## Key Principles

### Production Code (`client/`)

✅ **Include in production deployment:**
- Core application files (`log-collection-skill.js`, `log-collection-csv.js`)
- Essential utilities (`excel-to-csv.js`)
- Configuration templates (`examples/log-patterns.json`)
- Dependencies (`package.json`, `package-lock.json`)

❌ **Exclude from production:**
- Sample task files (user provides their own)
- Test SSH keys (user provides production keys)
- Output directory (generated at runtime)

### Development Infrastructure (`dev-environment/`)

⚠️ **NEVER deploy to production**

This directory contains:
- Docker containers for local testing
- Synthetic log generation scripts
- Test SSH keys (compromised if used in production)
- Development utilities and analysis tools

## Deployment Scenarios

### Scenario 1: On-Premise Production

Deploy only `client/` directory:

```bash
# Copy production code
scp -r client/ user@production-server:/opt/log-collector/

# On production server
cd /opt/log-collector/client
npm install --production
cp examples/log-patterns.json examples/log-patterns.json.bak

# Configure for production
export SSH_KEY_PATH=/secure/path/to/production/key
export SSH_HOST_1=prod-server1.company.com
export SSH_HOST_2=prod-server2.company.com
export SSH_HOST_3=prod-server3.company.com
export SSH_PORT_1=22
export SSH_PORT_2=22
export SSH_PORT_3=22

# Run collection
node log-collection-skill.js
```

### Scenario 2: Development/Testing

Use full project with `dev-environment/`:

```bash
# Clone complete repository
git clone <repo> log-collector-tool
cd log-collector-tool

# Start test environment
cd dev-environment/docker
./setup-containers.sh start

# Run tests
cd ../../client
npm test

# Test log collection against containers
SSH_KEY_PATH=../dev-environment/sample-data/log_collector_key node log-collection-skill.js
```

### Scenario 3: CI/CD Pipeline

```yaml
# Example GitLab CI
stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - cd dev-environment/docker
    - ./setup-containers.sh start
    - cd ../../client
    - npm install
    - npm test
  only:
    - merge_requests

deploy_production:
  stage: deploy
  script:
    - rsync -av --exclude='node_modules' client/ production:/opt/log-collector/
    - ssh production "cd /opt/log-collector && npm install --production"
  only:
    - main
```

## File Purpose Reference

### Production Core Files

| File | Purpose | Deploy? |
|------|---------|---------|
| `client/log-collection-skill.js` | Main application | ✅ Yes |
| `client/log-collection-csv.js` | CSV variant | ✅ Yes |
| `client/excel-to-csv.js` | Utility converter | ✅ Yes |
| `client/package.json` | Dependencies | ✅ Yes |
| `client/examples/log-patterns.json` | Config template | ✅ Yes (customize) |

### Development/Test Files

| File | Purpose | Deploy? |
|------|---------|---------|
| `dev-environment/docker/*` | Container setup | ❌ No |
| `dev-environment/scripts/*` | Test utilities | ❌ No |
| `dev-environment/sample-data/*` | Test fixtures | ❌ No (⚠️ contains test keys) |

## Security Notes

### Test Keys in `dev-environment/sample-data/`

These keys are **publicly visible in the repository** and must **never be used in production**:

- `log_collector_key`
- `log_collector_key_pem`
- `mock_ssh_key.pem`

### Production Keys

Production SSH keys should:
- Be generated specifically for production use
- Have restricted file permissions (600)
- Be stored outside the application directory
- Never be committed to version control
- Be rotated regularly according to security policy

## Migration Guide

### Moving to Production

1. **Extract production code:**
   ```bash
   mkdir production-deployment
   cp -r client/ production-deployment/
   cd production-deployment/client
   rm -rf examples/task_management_sample.xlsx
   ```

2. **Configure for production:**
   - Update `examples/log-patterns.json` if needed
   - Set production environment variables
   - Configure production SSH keys

3. **Deploy:**
   ```bash
   scp -r production-deployment/client user@prod:/opt/log-collector/
   ```

### Maintaining Development Environment

Keep `dev-environment/` synchronized with production code changes:

- Update Docker files when dependencies change
- Regenerate test data when patterns change
- Update test scripts when features change

## Quick Reference

### I want to...

**Deploy to production** → Use only `client/` directory

**Develop new features** → Use full project with `dev-environment/`

**Test locally** → Run `dev-environment/docker/setup-containers.sh start`

**Debug production issues** → Replicate with `dev-environment/scripts/production-test.js`

**Add new log patterns** → Edit `client/examples/log-patterns.json`

**Generate test data** → Use `dev-environment/scripts/generate-*-logs.sh`

**Test SSH connectivity** → Run `dev-environment/scripts/test-real-ssh.js`

---

**Last Updated:** 2025-11-22
**Version:** 1.0.0
