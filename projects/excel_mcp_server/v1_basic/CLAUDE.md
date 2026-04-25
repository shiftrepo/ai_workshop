# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains a Node.js-based tool for comparing two file directories and generating detailed Excel reports of differences. It examines file existence, content, permissions, owners, groups, modification times, and symlink targets. The tool is designed to work in Windows/GitBash environments and provides visual color-coding in Excel to easily identify different types of file differences.

## Essential Commands

### Installation

```bash
# Install dependencies
npm install
```

### Running the Folder Comparison Tool

The application provides three ways to run the folder comparison:

1. **Basic comparison with console output:**
```bash
node compare_folders.js <dir1_path> <dir2_path>
```

2. **Detailed comparison with Excel report:**
```bash
node mcp_folder_compare.js <dir1_path> <dir2_path> <output_excel_path>
```

3. **GitBash wrapper script (automatically generates timestamped output file):**
```bash
./compare_folders.sh <dir1_path> <dir2_path>
```

4. **Windows batch wrapper script (automatically generates timestamped output file):**
```bash
compare_folders.bat <dir1_path> <dir2_path>
```

### Available npm Scripts

```bash
# Run basic comparison script
npm run compare -- <dir1_path> <dir2_path>

# Run MCP detailed comparison script
npm run mcp-compare -- <dir1_path> <dir2_path> <output_excel_path>
```

## Architecture and Code Structure

### Workflow

1. User provides two directory paths to compare
2. The tool recursively scans both directories, collecting file metadata
3. Files are compared based on existence, content (via checksums), and attributes
4. Differences are categorized and formatted for output
5. Results are either displayed in the console or formatted into a detailed Excel report

### Key Files

- **mcp_folder_compare.js**: The main script that performs detailed folder comparison and generates Excel reports with color-coded highlighting of differences.
- **compare_folders.js**: A simpler version that performs basic comparison and outputs results to console.
- **compare_folders.sh**: Bash wrapper script for GitBash environments.
- **compare_folders.bat**: Windows batch wrapper script.

### Core Components

1. **File System Operations** (mcp_folder_compare.js, compare_folders.js)
   - Uses Node.js fs module with promisify wrappers for async operations
   - Recursively scans directories
   - Handles symlinks, permissions, and file metadata

2. **Comparison Logic** (mcp_folder_compare.js, compare_folders.js)
   - File content comparison via SHA-256 checksums
   - Attribute comparison (size, permissions, ownership, dates)
   - Detailed difference detection and categorization

3. **Excel Report Generation** (mcp_folder_compare.js)
   - Uses ExcelJS library to generate detailed reports
   - Multiple worksheets for different views (summary, all items, differences, files only in dir1/dir2)
   - Color-coding system for visual identification of differences

4. **Environment-Specific Features**
   - GitBash integration for Linux-style file permissions (rwx format)
   - Fallback mechanisms for different operating systems
   - Owner/group handling with text resolution where possible

### Key Functions

- **scanDirectory**: Recursively scans directories and collects file information
- **getFileDetails**: Extracts detailed file metadata including permissions and checksums
- **compareStructures**: Compares two directory structures
- **compareTwoFiles**: Compares attributes of individual files
- **createExcelReport**: Generates detailed Excel report with formatting and filtering

## Excel Report Structure

The generated Excel report contains the following worksheets:

1. **Summary** - Overview of comparison results with statistics and color-coded indicators
2. **All Items** - Complete list of all files with comparison results and visual indicators
3. **Differences** - Detailed analysis of files with differences, highlighting specific attributes that differ
4. **Only in Dir1** - Files that exist only in the first directory
5. **Only in Dir2** - Files that exist only in the second directory

Each worksheet includes filtering capabilities to help analyze large comparison results.

## Special Considerations

1. **GitBash Integration**
   - The application uses GitBash's `ls -l` command to get accurate Linux-style permissions and owner information
   - For directories, `ls -ld` is used to avoid the "total" line issue
   - Fallback mechanisms exist for environments without GitBash

2. **Excel Report Features**
   - Color-coded highlighting: green (identical), orange (different), red (only in one directory)
   - Attribute-specific highlighting: yellow (size), blue (time), purple (content), light green (permissions)
   - Japanese localization for status indicators
   - Millisecond-precision timestamp comparison

3. **Cross-Platform Compatibility**
   - Includes handling for Windows path differences
   - Alternative wrapper scripts for different environments (.sh and .bat)
   - Handles symbolic links with appropriate error handling for Windows limitations