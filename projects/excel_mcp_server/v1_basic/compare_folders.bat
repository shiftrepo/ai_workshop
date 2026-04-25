@echo off
echo Folder Comparison Tool using Excel MCP Server
echo =========================================
echo.

IF "%~1"=="" GOTO Usage
IF "%~2"=="" GOTO Usage

SET DIR1=%~1
SET DIR2=%~2
SET OUTPUT_FILE=comparison_report_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.xlsx
SET OUTPUT_FILE=%OUTPUT_FILE: =0%

echo Comparing folders:
echo   1: %DIR1%
echo   2: %DIR2%
echo Output file: %OUTPUT_FILE%
echo.

node mcp_folder_compare.js "%DIR1%" "%DIR2%" "%OUTPUT_FILE%"
GOTO End

:Usage
echo Usage: compare_folders.bat [folder1] [folder2]
echo.
echo Example: compare_folders.bat C:\Project\v1 C:\Project\v2
echo.
echo The comparison report will be saved as comparison_report_[timestamp].xlsx

:End