# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Directory comparison tool that generates Excel reports in Linux sdiff format. Compares two directories and creates a side-by-side Excel comparison with visual diff highlighting.

**Design for on-premise environments**: Server-side (Linux) collects data, client-side (Node.js) performs comparison and generates Excel.

## Architecture

### Two-Phase Design

**Phase 1 - Server-side (Linux)**:
- Runs `ls -lAR --time-style=full-iso` to collect metadata
- Calculates MD5 checksums for files with `md5sum`
- Outputs structured JSON with node information

**Phase 2 - Client-side (Node.js)**:
- Loads two JSON files (one per directory)
- Maps nodes by path and performs detailed comparison
- Generates Excel file using ExcelJS library

### Key Architectural Principles

1. **No transformation of Linux command outputs**: All data from `ls` and `md5sum` must be used as-is (raw strings). Never convert permissions to octal, never transform usernames/groups, never reformat timestamps.

2. **String-based comparison only**: Compare permissions, owners, groups, and timestamps as exact string matches.

3. **Handles all node types**: Regular files, directories, and symbolic links.

## Essential Commands

```bash
# Initial setup (run once per environment)
bash setup.sh

# Server-side: Collect directory information (run on Linux)
cd server
# Default: outputs to ../output/<dirname>.json
./collect.sh /path/to/folder1
./collect.sh /path/to/folder2
# Or specify output path explicitly
./collect.sh /path/to/folder1 ../output/folder1.json
# Transfer JSON files to client machine

# Client-side: Compare and generate Excel
cd client
# Default: outputs to ../output/comparison.xlsx
node compare.js ../output/folder1.json ../output/folder2.json
# Or specify output path explicitly
node compare.js ../output/folder1.json ../output/folder2.json ../output/result.xlsx
```

**Important**: All output files (JSON and Excel) are saved to the `output/` directory by default. The server script prevents writing output files inside the target directory being scanned.

## Code Structure

### server/collect.sh
Bash script that collects directory information:
- Uses `ls -lAR --time-style=full-iso` for comprehensive metadata
- Parses ls output with regex to extract: permissions, links, owner, group, size, datetime, name
- Detects file type from permission string (d=directory, l=symlink, else=file)
- For symlinks, extracts link target from "name -> target" format
- Calculates MD5 checksums for regular files only
- Outputs JSON with structure:
  ```json
  {
    "base_path": "/absolute/path",
    "collected_at": "ISO-8601 timestamp",
    "nodes": [
      {
        "name": "filename",
        "path": "relative/path/to/file",
        "parent_dir": "relative/parent/dir",
        "type": "file|directory|symlink",
        "permissions": "-rw-r--r--",
        "owner": "username",
        "group": "groupname",
        "size": 1234,
        "datetime": "2025-09-30 15:03:13.586278278 +0900",
        "checksum": "md5hash",
        "link_target": "target" // only for symlinks
      }
    ]
  }
  ```

### client/compare.js
Node.js script that performs comparison and generates Excel:
- Loads two JSON files and creates Map<path, node> for O(1) lookups
- Takes union of all paths from both directories
- For each path, determines diff status:
  - `only_in_1`: Exists only in folder 1
  - `only_in_2`: Exists only in folder 2
  - `different`: Exists in both but differs (type, permissions, owner, group, size, datetime, or checksum)
  - `identical`: Exists in both and matches completely
- Generates Excel with ExcelJS:
  - Row 1: Title "フォルダ比較統合ビュー（sdiff形式）"
  - Row 3: Folder names with colored backgrounds
  - Row 4: Column headers (green background)
  - Data rows: One per node with color coding and borders
- Color scheme:
  - Pink background (`FFFFEBEE`): Different
  - Blue background (`FFE3F2FD`): Only in folder 1
  - Purple background (`FFE1BEE7`): Only in folder 2
  - Red text (`FFFF0000`): Specific fields that differ
- Auto-filter enabled on all columns

### client/package.json
Dependencies:
- `exceljs@^4.4.0`: Excel file generation

### setup.sh
Environment setup script:
- Checks for Node.js, npm, ls, md5sum
- Runs `npm install` in client directory
- Sets execute permission on server/collect.sh

## Important Implementation Rules

### Critical Constraints

1. **Never transform Linux command outputs**: Use raw string values from `ls` and `md5sum`. No conversion of permissions to octal, no UID/GID lookups, no timestamp parsing.

2. **Preserve exact datetime format**: Use `--time-style=full-iso` which outputs like `2025-09-30 15:03:13.586278278 +0900`. Compare these as strings.

3. **File type detection**: Based on first character of permissions string:
   - `d`: directory
   - `l`: symlink
   - `-`: regular file
   - Others (b, c, p, s): treated as files

4. **Checksum handling**:
   - Only calculate for regular files (not directories or symlinks)
   - Use MD5 for compatibility
   - Store as null for directories/symlinks in JSON
   - Display "ディレクトリ" label in Excel for directories

5. **Path handling**:
   - Server script converts target directory to absolute path
   - All node paths in JSON are relative to base_path
   - Use "." for nodes in root of scanned directory

### Excel Output Specifications

Column layout (14 columns total):
- A: Folder 1 - Node name
- B: Folder 1 - Full path
- C: Folder 1 - Permissions
- D: Folder 1 - Owner
- E: Folder 1 - Datetime
- F: Folder 1 - Checksum
- G: Diff status (差分/一致/フォルダ1のみ/フォルダ2のみ)
- H: Filter type (identical/different/only_in_1/only_in_2)
- I: Folder 2 - Node name
- J: Folder 2 - Full path
- K: Folder 2 - Permissions
- L: Folder 2 - Owner
- M: Folder 2 - Datetime
- N: Folder 2 - Checksum

## Testing

Test data locations:
- `test_folder1/`: Sample directory 1 (21 nodes)
- `test_folder2/`: Sample directory 2 (19 nodes)

Sample data includes:
- Regular files with different content
- Binary files
- Executable files (different permissions)
- Nested directory structures
- Symbolic links
- Files that exist in only one folder

Expected comparison results:
- 23 total entries (union of both folders)
- 0 identical
- 17 different
- 4 only in folder 1
- 2 only in folder 2

## Technical Constraints

### Environment Constraints

- **Server**: Linux, no internet access, only standard commands (ls, md5sum)
- **Client**: Windows/Mac with Node.js, npm access for initial setup only
- **Deployment**: Via git repository, must work offline after setup

### Design Decisions Rationale

- **Why JSON intermediate format**: Enables air-gapped operation - collect on Linux server, transfer files manually, process on client workstation
- **Why MD5 instead of SHA256**: Universally available on old Linux systems, sufficient for diff detection (not security)
- **Why string comparison**: Avoids complex parsing, preserves exact output from ls command
- **Why ExcelJS**: Pure JavaScript, works offline, no Excel installation required

## Troubleshooting

- **"mv: cannot move" error**: Output directory doesn't exist, provide full path or use current directory
- **Empty JSON nodes array**: Check ls command worked, verify permissions on target directory
- **Excel shows all differences**: Verify both JSONs were collected with same ls options and datetime format
- **Script fails on Windows**: Server scripts require bash (Git Bash recommended)
