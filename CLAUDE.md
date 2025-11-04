# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository (ai_workshop) contains resources for an AI workshop, including:
1. Documentation for environment setup (SSH keys, PAT, Node.js, GitHub CLI, Claude Code)
2. A directory comparison tool (excelMCPserverSPECFew-shot) that generates Excel reports in sdiff format

## Project: Directory Comparison Tool (excelMCPserverSPECFew-shot)

This tool compares two directories and generates an Excel file with side-by-side comparison similar to Linux's sdiff command.

### Architecture

**Two-phase design for on-premise environments:**
- **Server-side (Linux)**: Collects directory information using `ls` and `md5sum`, outputs JSON
- **Client-side (Node.js)**: Reads JSON files, performs comparison, generates Excel with ExcelJS

**Key principle**: Linux command outputs (permissions, owner, group, timestamps) must never be transformed or converted - use raw string values only.

### Essential Commands

```bash
# Initial setup (run once)
cd excelMCPserverSPECFew-shot
bash setup.sh

# Server-side: Collect directory information (on Linux)
cd server
./collect.sh /path/to/folder1 folder1.json
./collect.sh /path/to/folder2 folder2.json

# Client-side: Compare and generate Excel (on Windows/Mac)
cd client
node compare.js folder1.json folder2.json output.xlsx
```

### Code Architecture

**server/collect.sh**:
- Uses `ls -lAR --time-style=full-iso` to recursively collect file metadata
- Extracts: permissions, owner, group, size, datetime, symlink targets
- Calculates MD5 checksums for regular files
- Outputs structured JSON with all node information

**client/compare.js**:
- Loads two JSON files and maps nodes by path
- Performs detailed comparison: type, permissions, owner, group, size, datetime, checksum
- Generates Excel with:
  - Column A-F: Folder 1 info (name, path, permissions, owner, datetime, checksum)
  - Column G-H: Diff status and filter type
  - Column I-N: Folder 2 info (same structure)
  - Color coding: Pink (differences), Blue/Purple (exists in one folder only)
  - Red text highlights specific changed fields
  - Auto-filter enabled on all columns

**client/package.json**:
- Single dependency: `exceljs` for Excel file generation

### Important Implementation Rules

1. **Never transform Linux command outputs**: Use ls/md5sum results as-is (string values only)
2. **Preserve exact datetime formats**: Use `--time-style=full-iso` for consistent ISO 8601 timestamps
3. **Handle all node types**: Regular files, directories, symlinks
4. **Checksum files only**: Directories get null checksum, or "ディレクトリ" label in Excel

### GitHub Integration

```bash
# View issues
gh issue list -R [username]/[repository] --json number,title,state,createdAt

# View specific issue with attachments
gh issue view <number> --repo <owner>/<repo> --json number,title,body,comments
```

### Environment Variables

Required for Claude Code and GitHub integration:

```
ANTHROPIC_MODEL=us.anthropic.claude-3-7-sonnet-20250219-v1:0
ANTHROPIC_SMALL_FAST_MODEL=us.anthropic.claude-3.5-haiku-20241022-v1:0
AWS_ACCESS_KEY_ID=[personal AWS access key]
AWS_REGION=us-east-1
AWS_SECRET_ACCESS_KEY=[personal AWS secret key]
CLAUDE_CODE_USE_BEDROCK=1
GH_TOKEN=[personal GitHub access token]
```

### Troubleshooting

* **Environment Variables**: After setting, open new command prompt or restart PC to apply changes
* **GitHub Authentication**: Check PAT expiration date and permissions (must be < 1 year)
* **SSH Key Errors**: Verify key registration status
* **Bash script errors on Windows**: Use Git Bash or similar Unix-compatible environment