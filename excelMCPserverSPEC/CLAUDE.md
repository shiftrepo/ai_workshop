# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository (excelMCPserverSPEC) contains specifications and implementation plans for an Excel MCP (Model Context Protocol) Server. The project aims to create a system that compares two folders and generates detailed comparison reports in Excel and PDF formats.

## System Architecture

The system follows a two-part architecture:

1. **Server-side Shell Scripts**:
   - Collect and analyze information from specified folders
   - Compare files and directories based on various criteria
   - Output data in JSON format for client-side processing

2. **Client-side Node.js Application**:
   - Process comparison data from shell scripts
   - Generate Excel spreadsheets and PDF reports
   - Apply formatting and visualization to comparison results

## Common Development Commands

### Running the Folder Comparison

```bash
# Compare two folders and generate JSON output
./compare_folders.sh /path/to/folder1 /path/to/folder2
```

### Generating Reports

```bash
# Generate Excel and PDF reports from comparison data
node generate_report.js
```

### Testing with Sample Data

```bash
# Run comparison using the test folders
./compare_folders.sh ./test_folder1 ./test_folder2
```

## Key Configuration Files

- **config.json**: Controls comparison options, output formats, and file exclusions
  ```json
  {
    "exclude_patterns": ["*.tmp", "*.log", ".git/*"],
    "exclude_directories": [".git", "node_modules", "temp"],
    "comparison_options": {
      "check_file_existence": true,
      "check_file_content": true,
      "check_file_attributes": true,
      "check_directory_structure": true,
      "check_file_types": true,
      "check_permissions": true
    },
    "output_options": {
      "generate_excel": true,
      "generate_pdf": true,
      "excel_filename": "comparison_result.xlsx",
      "pdf_filename": "comparison_report.pdf"
    },
    "log_options": {
      "log_level": "info",
      "log_directory": "./logs"
    }
  }
  ```

## File Structure and Comparison Criteria

The system performs six primary types of comparisons between folders:

1. **File Existence Comparison**: Using `ls` to find files unique to either folder
2. **File Content Comparison**: Using `diff` to identify content differences
3. **File Attribute Comparison**: Using `ls -la` to compare permissions and timestamps
4. **Directory Structure Comparison**: Using `find` to analyze recursive structures
5. **File Type Comparison**: Using `file` command to determine file types
6. **Access Permission Comparison**: Using `stat` to compare detailed permissions

## Implementation Notes

When implementing this project, follow these guidelines:

1. The shell script should accept two folder paths as arguments
2. Implement the configuration file (config.json) for customizable settings
3. Use standard shell commands (ls, diff, find, stat, file) for comparisons
4. Format JSON output to be consumed by the Node.js application
5. In the Node.js application, use ExcelJS/xlsx for Excel generation and PDFKit/Puppeteer for PDF generation
6. Include appropriate error handling for file access issues
7. Implement the exclusion logic as specified in the config file

### Critical Implementation Requirements

**IMPORTANT**: When working with file permissions and ownership information:

1. **Permission Display Format**:
   - ALWAYS use Unix-style permission strings (e.g., `-rw-r--r--`, `drwxr-xr-x`)
   - NEVER convert permissions to numeric format (e.g., 644, 755)
   - Extract permission strings directly from `ls -la` command output without any conversion
   - Use the `getPermissionString()` function that parses `ls -la` output

2. **Owner Information Retrieval**:
   - ALWAYS extract owner information directly from `ls -la` command output
   - Use flexible pattern matching with `line.includes(filename)` to handle Windows/Unix path differences
   - Parse the 3rd field (parts[2]) from the `ls -la` output for the owner name
   - Apply consistent logic across all file and directory processing sections

3. **Default Values and Error Handling**:
   - NEVER use 'N/A' as a default value
   - Use empty strings ('') for missing or unavailable data
   - Return empty strings from helper functions (formatDateWithMs, calculateChecksum) on error
   - Continue processing even when individual file access errors occur

4. **Cross-Platform Considerations**:
   - Windows uses backslash (\) as path separator, Unix uses forward slash (/)
   - Use partial matching instead of exact filename matching to handle path separator differences
   - Test with both Windows (MINGW64) and Unix environments

## Testing Approach

Use the test_folder1 and test_folder2 directories containing sample files with various attributes:
- Regular text files
- Files with special attributes
- Executable files
- Read-only files
- Unique files to each folder
- Symbolic links
- Subdirectories

## Expected Output

1. **Excel Report**: Detailed comparison with conditional formatting
2. **PDF Report**: Summary information and graphical representation
3. **Logs**: Execution logs in the current directory

## Development History

### Permission and Owner Information Display Fix

#### Issues Identified
The initial implementation had several critical issues:
1. Permissions displayed in numeric format (644) instead of Unix-style strings (-rw-r--r--)
2. Owner information missing for regular files (only showing for directories)
3. 'N/A' values appearing in output where data should be empty or populated
4. Inconsistent handling across different file/directory processing sections

#### Root Causes
1. **Permission Format Issue**: Code was referencing numeric permission values from JSON data
2. **Owner Parsing Issue**: Exact filename matching (`parts[parts.length - 1] === filename`) failed on Windows due to backslash path separators in `ls` output
3. **Default Value Issue**: Multiple locations initializing variables with 'N/A' instead of empty strings

#### Solutions Implemented

1. **Permission String Extraction**:
   - Implemented `getPermissionString()` function to extract raw permission strings from `ls -la` output
   - Removed all numeric permission value references from JSON data
   - Applied consistently across all file and directory processing sections

2. **Owner Information Parsing**:
   - Changed from exact matching to flexible matching using `line.includes(filename)`
   - Handles Windows backslash and Unix forward slash path separators
   - Extracts owner from 3rd field (parts[2]) of `ls -la` output
   - Applied to all processing sections: common files, only_in_dir1, only_in_dir2, directories

3. **Default Value Cleanup**:
   - Replaced all 'N/A' initializations with empty strings ('')
   - Updated `formatDateWithMs()` to return '' instead of 'N/A'
   - Updated `calculateChecksum()` to return '' instead of 'N/A'
   - Updated `checksumStatus` default from 'N/A' to ''

#### Modified Code Sections
- Both folders file comparison (lines ~284-322 in generate_report.js)
- Only in dir1 files (lines ~363-383)
- Only in dir2 files (lines ~425-445)
- Both folders directory comparison (lines ~489-530)
- Only in dir1 directories (lines ~567-588)
- Only in dir2 directories (lines ~625-646)

#### Verification Results
After fixes, Excel output shows:
- Column C & J (Permissions): Unix-style strings (-rw-r--r--, drwxr-xr-x)
- Column D & K (Owner): Correct owner names (e.g., kappappa) for both files and directories
- No 'N/A' values in any output cells

#### Technical Decisions
1. **Direct ls Command Usage**: Prefer raw `ls -la` output over JSON data transformations
2. **Flexible Pattern Matching**: Use `includes()` instead of exact matching for cross-platform compatibility
3. **Consistent Empty String Handling**: Standardize on empty strings for all missing/unavailable data
4. **Error Resilience**: Return empty strings on errors rather than 'N/A' or throwing exceptions