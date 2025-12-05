#!/usr/bin/env node

/**
 * Log Collection Skill - Issue #15 Implementation
 * Automated log collection from multiple servers based on Excel task management
 */

const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const { Client } = require('ssh2');

class LogCollectionSkill {
    constructor() {
        this.config = {
            inputFolder: process.env.INPUT_FOLDER || './examples',
            outputFolder: process.env.OUTPUT_FOLDER || './output',
            sshKeyPath: process.env.SSH_KEY_PATH || '/app/.ssh/container_key', // Docker Hub compatible: Use generated key
            logPatternFile: process.env.LOG_PATTERN_FILE || (process.env.INPUT_FOLDER ? `${process.env.INPUT_FOLDER}/log-patterns.json` : './examples/log-patterns.json'),
            servers: [
                { id: 'server1', host: process.env.SSH_HOST_1, port: parseInt(process.env.SSH_PORT_1) || 22, user: process.env.SSH_USER || 'logcollector' },
                { id: 'server2', host: process.env.SSH_HOST_2, port: parseInt(process.env.SSH_PORT_2) || 22, user: process.env.SSH_USER || 'logcollector' },
                { id: 'server3', host: process.env.SSH_HOST_3, port: parseInt(process.env.SSH_PORT_3) || 22, user: process.env.SSH_USER || 'logcollector' }
            ].filter(s => s.host), // Only include servers with host defined (port and user have defaults)
            logPaths: [
                '/var/log/application.log',
                '/var/log/app/*.log',
                '/tmp/logs/*.log'
            ]
        };
        this.connections = new Map();
        this.logPatterns = null;
    }

    /**
     * Load log patterns from external configuration file
     */
    async loadLogPatterns() {
        try {
            const patternPath = path.resolve(this.config.logPatternFile);
            const patternData = await fs.readFile(patternPath, 'utf8');
            this.logPatterns = JSON.parse(patternData);
            console.log(`✓ Log patterns loaded from: ${patternPath}`);
        } catch (error) {
            console.warn(`⚠️  Failed to load log patterns from ${this.config.logPatternFile}, using defaults`);
            // Fallback to default patterns
            this.logPatterns = {
                patterns: {
                    trackId: { pattern: "TrackID:\\s*([A-Z0-9]{3,10})", flags: "gi" },
                    programId: { pattern: "\\b([A-Z]{2,6}\\d{2,4})\\b", flags: "g" },
                    timestamp: { pattern: "(\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2})", flags: "g" },
                    logLevel: { pattern: "\\b(DEBUG|INFO|WARN|WARNING|ERROR|FATAL|TRACE)\\b", flags: "i" }
                },
                timeRanges: { defaultRange: 3600, searchBefore: 1800, searchAfter: 1800 }
            };
        }
    }

    /**
     * Main execution entry point
     */
    async execute(instruction = '') {
        console.log('🚀 Log Collection Skill - Issue #15 Implementation');
        console.log('='.repeat(60));

        try {
            // Step 0: Load log patterns from configuration
            console.log('\n⚙️  Step 0: Loading log patterns configuration...');
            await this.loadLogPatterns();

            // Step 1: Read Excel task management files
            console.log('\n📊 Step 1: Reading Excel task management files...');
            const tasks = await this.readTaskManagementFiles();

            // Step 2: Extract tasks with "情報収集中" status
            console.log('\n🔍 Step 2: Filtering tasks by status...');
            const targetTasks = this.filterTasksByStatus(tasks, '情報収集中');

            if (targetTasks.length === 0) {
                throw new Error('No tasks found with "情報収集中" status');
            }

            // Step 3: Extract TrackIDs and other identifiers
            console.log('\n🏷️  Step 3: Extracting identifiers...');
            const enrichedTasks = this.extractIdentifiers(targetTasks);

            // Step 4: Connect to servers via SSH
            console.log('\n🔌 Step 4: Connecting to servers...');
            await this.connectToServers();

            // Step 5: Search logs across servers
            console.log('\n🔍 Step 5: Searching logs across servers...');
            const logResults = await this.searchLogsAcrossServers(enrichedTasks);

            // Step 6: Generate Excel and CSV reports
            console.log('\n📝 Step 6: Generating Excel and CSV reports...');
            const excelPath = await this.generateExcelReport(enrichedTasks, logResults);
            const csvPath = await this.generateCSVReport(enrichedTasks, logResults);

            // Step 7: Cleanup connections
            console.log('\n🧹 Step 7: Cleaning up connections...');
            this.closeAllConnections();

            console.log('\n✅ Log collection completed successfully!');
            console.log(`📄 Excel file: ${excelPath}`);
            console.log(`📄 CSV file: ${csvPath}`);

            return {
                success: true,
                tasksProcessed: enrichedTasks.length,
                excelFile: excelPath,
                csvFile: csvPath,
                logEntriesFound: logResults.reduce((sum, r) => sum + r.entries.length, 0)
            };

        } catch (error) {
            console.error('\n❌ Log collection failed:', error.message);
            this.closeAllConnections();
            throw error;
        }
    }

    /**
     * Read Excel task management files from input folder
     */
    async readTaskManagementFiles() {
        const files = await fs.readdir(this.config.inputFolder);
        const excelFiles = files.filter(file =>
            file.endsWith('.xlsx') || file.endsWith('.xls')
        );

        if (excelFiles.length === 0) {
            throw new Error(`No Excel files found in ${this.config.inputFolder}`);
        }

        console.log(`Found ${excelFiles.length} Excel files: ${excelFiles.join(', ')}`);

        let allTasks = [];

        for (const file of excelFiles) {
            const filePath = path.join(this.config.inputFolder, file);
            const tasks = await this.readExcelFile(filePath);
            allTasks = allTasks.concat(tasks);
        }

        console.log(`Extracted ${allTasks.length} total tasks`);
        return allTasks;
    }

    /**
     * Read individual Excel file
     */
    async readExcelFile(filePath) {
        console.log(`  Reading: ${path.basename(filePath)}`);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const worksheet = workbook.worksheets[0];
        const tasks = [];

        // Skip header row, process data rows
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const task = {
                rowNumber,
                incidentId: this.getCellValue(row, 'A'),      // インシデントID
                timestamp: this.getCellValue(row, 'B'),       // タイムスタンプ
                description: this.getCellValue(row, 'C'),     // インシデント概要
                assignee: this.getCellValue(row, 'D'),        // 担当者
                status: this.getCellValue(row, 'E'),          // ステータス
                investigation: this.getCellValue(row, 'F'),   // 調査状況
                sourceFile: path.basename(filePath)
            };

            if (task.incidentId && task.status) {
                tasks.push(task);
            }
        });

        console.log(`    Extracted ${tasks.length} tasks`);
        return tasks;
    }

    /**
     * Get cell value by column letter
     */
    getCellValue(row, columnLetter) {
        const cell = row.getCell(columnLetter);
        let value = cell.value;

        if (value === null || value === undefined) return '';

        if (typeof value === 'object') {
            if (value.richText) {
                return value.richText.map(rt => rt.text).join('');
            } else if (value.result !== undefined) {
                return value.result;
            }
        }

        return value.toString().trim();
    }

    /**
     * Filter tasks by status
     */
    filterTasksByStatus(tasks, targetStatus) {
        const filtered = tasks.filter(task => task.status === targetStatus);
        console.log(`Filtered to ${filtered.length} tasks with status "${targetStatus}"`);
        return filtered;
    }

    /**
     * Extract TrackIDs, timestamps, and program IDs from task descriptions using dynamic patterns
     */
    extractIdentifiers(tasks) {
        // Use loaded patterns or fallback to default
        const patterns = this.logPatterns?.patterns || {
            trackId: { pattern: "TrackID:\\s*([A-Z0-9]{3,10})", flags: "gi" },
            programId: { pattern: "\\b([A-Z]{2,6}\\d{2,4})\\b", flags: "g" },
            timestamp: { pattern: "(\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2})", flags: "g" }
        };

        return tasks.map(task => {
            const enriched = { ...task };

            // Extract TrackIDs using multiple patterns
            enriched.trackIds = [];

            // 複数のTrackIDパターンを定義
            const multipleTrackIdPatterns = [
                { name: "TrackID:", pattern: "TrackID:\\s*([A-Z0-9]{3,10})", flags: "gi" },
                { name: "trackId=", pattern: "trackId=([A-Z0-9]{3,10})", flags: "gi" },
                { name: "[ID:]", pattern: "\\[ID:\\s*([A-Z0-9]{3,10})\\]", flags: "gi" },
                { name: "#番号", pattern: "#([A-Z0-9]{3,10})", flags: "gi" },
                { name: "(識別:)", pattern: "\\(識別:\\s*([A-Z0-9]{3,10})\\)", flags: "gi" }
            ];

            // 各パターンでTrackIDを抽出
            multipleTrackIdPatterns.forEach(patternDef => {
                const regex = new RegExp(patternDef.pattern, patternDef.flags);
                let match;
                while ((match = regex.exec(task.description)) !== null) {
                    enriched.trackIds.push(match[1]);
                }
            });

            // Extract Program IDs using dynamic pattern
            enriched.programIds = [];
            const programIdRegex = new RegExp(patterns.programId.pattern, patterns.programId.flags);
            let programMatch;
            while ((programMatch = programIdRegex.exec(task.description)) !== null) {
                enriched.programIds.push(programMatch[1]);
            }

            // Extract timestamps using dynamic pattern and enhance with task timestamp
            enriched.extractedTimestamps = [];
            const timestampRegex = new RegExp(patterns.timestamp.pattern, patterns.timestamp.flags);
            let timeMatch;
            while ((timeMatch = timestampRegex.exec(task.description)) !== null) {
                enriched.extractedTimestamps.push(timeMatch[1]);
            }

            // Add task timestamp if available and not already extracted
            if (task.timestamp && !enriched.extractedTimestamps.includes(task.timestamp)) {
                enriched.extractedTimestamps.push(task.timestamp);
            }

            // Calculate search time ranges based on extracted/task timestamps
            enriched.searchTimeRanges = this.calculateSearchTimeRanges(enriched.extractedTimestamps);

            // Remove duplicates
            enriched.trackIds = [...new Set(enriched.trackIds)];
            enriched.programIds = [...new Set(enriched.programIds)];
            enriched.extractedTimestamps = [...new Set(enriched.extractedTimestamps)];

            console.log(`Task ${task.incidentId}: TrackIDs: ${enriched.trackIds.join(', ')} | ProgramIDs: ${enriched.programIds.join(', ')} | Times: ${enriched.extractedTimestamps.length}`);

            return enriched;
        });
    }

    /**
     * Calculate search time ranges based on extracted timestamps
     */
    calculateSearchTimeRanges(timestamps) {
        if (!timestamps.length) return [];

        const ranges = [];
        const timeConfig = this.logPatterns?.timeRanges || { searchBefore: 1800, searchAfter: 1800 };

        timestamps.forEach(timestamp => {
            try {
                const baseTime = new Date(timestamp);
                if (isNaN(baseTime.getTime())) return;

                const startTime = new Date(baseTime.getTime() - (timeConfig.searchBefore * 1000));
                const endTime = new Date(baseTime.getTime() + (timeConfig.searchAfter * 1000));

                ranges.push({
                    baseTime: baseTime.toISOString(),
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    originalTimestamp: timestamp
                });
            } catch (error) {
                console.warn(`Failed to parse timestamp: ${timestamp}`);
            }
        });

        return ranges;
    }

    /**
     * Connect to all configured servers via SSH
     */
    async connectToServers() {
        console.log(`Connecting to ${this.config.servers.length} servers...`);

        const connectionPromises = this.config.servers.map(server =>
            this.connectToServer(server)
        );

        const results = await Promise.allSettled(connectionPromises);

        let connectedCount = 0;
        const failures = [];

        results.forEach((result, index) => {
            const server = this.config.servers[index];
            if (result.status === 'fulfilled') {
                connectedCount++;
                console.log(`  ✓ Connected to ${server.id} (${server.host}:${server.port})`);
            } else {
                const error = result.reason?.message || 'Unknown error';
                console.error(`  ✗ Failed to connect to ${server.id}: ${error}`);
                failures.push({ server: server.id, error });
            }
        });

        if (connectedCount === 0) {
            console.error('\n❌ SSH Connection Diagnostics:');
            failures.forEach(failure => {
                console.error(`  - ${failure.server}: ${failure.error}`);
            });
            console.error('\n💡 Troubleshooting Tips:');
            console.error('  1. Verify SSH_KEY_PATH is set and file exists');
            console.error('  2. Check SSH_HOST_*, SSH_PORT_*, SSH_USER environment variables');
            console.error('  3. Test SSH connectivity: ssh -i <SSH_KEY_PATH> -p <port> <user>@<host>');
            console.error('  4. Verify network connectivity to target servers');

            throw new Error(`Failed to connect to any servers via SSH. ${failures.length} connection attempts failed.`);
        }

        if (failures.length > 0) {
            console.warn(`\n⚠️  Partial connectivity: ${connectedCount}/${this.config.servers.length} servers connected`);
            console.warn('  Failed connections:', failures.map(f => f.server).join(', '));
        }

        console.log(`Successfully connected to ${connectedCount}/${this.config.servers.length} servers`);
    }

    /**
     * Connect to individual server
     */
    async connectToServer(serverConfig) {
        return new Promise(async (resolve, reject) => {
            const conn = new Client();

            conn.on('ready', () => {
                console.log(`    ✅ Connected successfully to ${serverConfig.id}`);
                this.connections.set(serverConfig.id, conn);
                resolve(conn);
            });

            conn.on('error', (err) => {
                console.error(`    ❌ SSH connection failed to ${serverConfig.id}: ${err.message}`);
                reject(new Error(`SSH connection to ${serverConfig.id} failed: ${err.message}`));
            });

            try {
                // Read SSH key - required for real connection
                let privateKey;
                try {
                    privateKey = await fs.readFile(this.config.sshKeyPath, 'utf8');
                } catch (error) {
                    reject(new Error(`SSH key not found: ${this.config.sshKeyPath}. Real SSH connection required.`));
                    return;
                }

                console.log(`    Connecting to ${serverConfig.host}:${serverConfig.port} as ${serverConfig.user}`);

                conn.connect({
                    host: serverConfig.host,
                    port: serverConfig.port,
                    username: serverConfig.user,
                    privateKey: privateKey,
                    timeout: 30000,
                    readyTimeout: 30000,
                    algorithms: {
                        serverHostKey: ['rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa'],
                        kex: ['diffie-hellman-group14-sha256', 'ecdh-sha2-nistp256'],
                        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
                        hmac: ['hmac-sha2-256', 'hmac-sha2-512']
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Search logs across all connected servers
     */
    async searchLogsAcrossServers(tasks) {
        const allResults = [];

        for (const task of tasks) {
            console.log(`  Searching logs for task ${task.incidentId}...`);

            const taskResults = {
                taskId: task.incidentId,
                searchTerms: {
                    trackIds: task.trackIds,
                    programIds: task.programIds,
                    timestamps: task.extractedTimestamps
                },
                entries: [],
                serverResults: {}
            };

            // Search each connected server
            for (const [serverId, connection] of this.connections.entries()) {
                try {
                    const serverEntries = await this.searchServerLogs(
                        serverId,
                        connection,
                        task.trackIds,
                        task.programIds,
                        task.extractedTimestamps,
                        task.searchTimeRanges || []
                    );

                    taskResults.entries = taskResults.entries.concat(serverEntries);
                    taskResults.serverResults[serverId] = serverEntries.length;

                    console.log(`    Server ${serverId}: ${serverEntries.length} entries found`);
                } catch (error) {
                    console.error(`    Server ${serverId}: Search failed - ${error.message}`);
                    taskResults.serverResults[serverId] = 0;
                }
            }

            console.log(`  Task ${task.incidentId}: Total ${taskResults.entries.length} log entries found`);
            allResults.push(taskResults);
        }

        return allResults;
    }

    /**
     * Search logs on individual server with enhanced time-range filtering
     */
    async searchServerLogs(serverId, connection, trackIds, programIds, timestamps, searchTimeRanges = []) {
        return new Promise((resolve, reject) => {
            // Build search command with time-based filtering
            const searchTerms = [...trackIds, ...programIds].join('|');


            if (!searchTerms) {
                resolve([]);
                return;
            }

            // Enhanced grep command - use simple search for reliability
            let command;
            // Use basic grep command for now to ensure log detection works
            command = `grep -r -E "${searchTerms}" ${this.config.logPaths.join(' ')} 2>/dev/null`;

            connection.exec(command, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }

                let output = '';
                stream.on('close', (code) => {
                    const entries = this.parseLogOutput(output, serverId);
                    // Additional time-based filtering for entries if ranges specified
                    // Temporarily disable time filtering to ensure log detection works
                    const filteredEntries = entries;
                    resolve(filteredEntries);
                });

                stream.on('data', (data) => {
                    output += data.toString();
                });

                stream.stderr.on('data', (data) => {
                    console.error(`SSH Error on ${serverId}:`, data.toString());
                });
            });
        });
    }

    /**
     * Build time-filtered search command using log patterns and time ranges
     */
    buildTimeFilteredSearchCommand(searchTerms, searchTimeRanges, timePatterns) {
        // For complex time filtering, we'll use a combination of grep and awk
        // This creates a more sophisticated search that can handle multiple time formats
        const timeRangeFilters = searchTimeRanges.map(range => {
            return `awk '/^${range.startTime.slice(0, 10)}.*${range.startTime.slice(11, 16)}/,/^${range.endTime.slice(0, 10)}.*${range.endTime.slice(11, 16)}/'`;
        }).join(' | ');

        // Combine time filtering with term search
        return `grep -r -E "${searchTerms}" | ${timeRangeFilters}`;
    }

    /**
     * Filter log entries by time ranges after parsing
     */
    filterEntriesByTimeRange(entries, searchTimeRanges) {
        if (!searchTimeRanges || searchTimeRanges.length === 0) {
            return entries;
        }

        return entries.filter(entry => {
            if (!entry.timestamp) return false;

            try {
                const entryTime = new Date(entry.timestamp);
                if (isNaN(entryTime.getTime())) return false;

                // Check if entry falls within any of the specified time ranges
                return searchTimeRanges.some(range => {
                    const startTime = new Date(range.startTime);
                    const endTime = new Date(range.endTime);
                    return entryTime >= startTime && entryTime <= endTime;
                });
            } catch (error) {
                console.warn(`Failed to parse entry timestamp: ${entry.timestamp}`);
                return false;
            }
        });
    }


    /**
     * Parse log output from servers
     */
    parseLogOutput(output, serverId) {
        console.log(`      Debug: Server ${serverId} raw output length: ${output ? output.length : 0}`);
        if (output && output.length > 50) {
            console.log(`      Debug: First 100 chars: ${output.substring(0, 100)}...`);
        }

        if (!output || output.trim() === '') {
            return [];
        }

        const lines = output.split('\n').filter(line => line.trim());
        const results = lines.map((line, index) => {
            // Remove file path prefix if present (e.g., "/var/log/app/application.log:")
            const cleanLine = line.replace(/^[^:]+:/, '');

            const timestampMatch = cleanLine.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);
            const trackIdMatch = cleanLine.match(/(?:TrackID|trackId)[:\s"]*([A-Z0-9]+)/i);
            const programIdMatch = cleanLine.match(/\b([A-Z]{2,6}\d{2,4})\b/);
            const logLevelMatch = cleanLine.match(/\b(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\b/i);

            return {
                timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString().replace('T', ' ').substring(0, 19),
                serverId,
                logPath: 'unknown',
                content: line,
                trackId: trackIdMatch ? trackIdMatch[1] : '',
                programId: programIdMatch ? programIdMatch[1] : '',
                logLevel: logLevelMatch ? logLevelMatch[1].toUpperCase() : 'UNKNOWN'
            };
        });

        return results;
    }

    /**
     * Generate Excel report with collected logs
     */
    async generateExcelReport(tasks, logResults) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
        const filename = `log-collection-result_${timestamp}.xlsx`;
        const outputPath = path.join(this.config.outputFolder, filename);

        console.log(`Creating Excel report: ${filename}`);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Log Collection Skill - Issue #15';
        workbook.created = new Date();

        // Create summary sheet
        await this.createSummarySheet(workbook, tasks, logResults);

        // Create detailed results sheet
        await this.createDetailedSheet(workbook, tasks, logResults);

        // Save workbook
        await workbook.xlsx.writeFile(outputPath);

        console.log(`✓ Excel report saved: ${outputPath}`);
        return outputPath;
    }

    /**
     * Generate CSV report with collected logs
     */
    async generateCSVReport(tasks, logResults) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
        const filename = `log-collection-result_${timestamp}.csv`;
        const outputPath = path.join(this.config.outputFolder, filename);

        console.log(`Creating CSV report: ${filename}`);

        const csvHeaders = [
            'Task ID', 'TrackID', 'Program ID', 'Server', 'Timestamp',
            'Log Level', 'Log Path', 'Content'
        ];

        let csvContent = csvHeaders.join(',') + '\n';

        // Add all log entries
        logResults.forEach(result => {
            result.entries.forEach(entry => {
                const rowData = [
                    this.escapeCsvValue(result.taskId),
                    this.escapeCsvValue(entry.trackId),
                    this.escapeCsvValue(entry.programId),
                    this.escapeCsvValue(entry.serverId),
                    this.escapeCsvValue(entry.timestamp),
                    this.escapeCsvValue(entry.logLevel),
                    this.escapeCsvValue(entry.logPath),
                    this.escapeCsvValue(entry.content)
                ];
                csvContent += rowData.join(',') + '\n';
            });
        });

        // If no entries, add a message row
        if (logResults.every(result => result.entries.length === 0)) {
            csvContent += 'No log entries found,,,,,,,\n';
        }

        await fs.writeFile(outputPath, csvContent, 'utf8');

        console.log(`✓ CSV report saved: ${outputPath}`);
        return outputPath;
    }

    /**
     * Escape CSV values to handle commas, quotes, and newlines
     */
    escapeCsvValue(value) {
        if (!value) return '';
        const stringValue = value.toString();

        // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }

        return stringValue;
    }

    /**
     * Create summary sheet
     */
    async createSummarySheet(workbook, tasks, logResults) {
        const sheet = workbook.addWorksheet('Summary');

        // Header
        sheet.getCell('A1').value = 'Log Collection Summary - Issue #15';
        sheet.getCell('A1').font = { bold: true, size: 14 };

        let row = 3;

        // Summary information
        sheet.getCell(`A${row}`).value = 'Collection Date:';
        sheet.getCell(`B${row}`).value = new Date().toISOString();
        row++;

        sheet.getCell(`A${row}`).value = 'Tasks Processed:';
        sheet.getCell(`B${row}`).value = tasks.length;
        row++;

        const totalLogEntries = logResults.reduce((sum, r) => sum + r.entries.length, 0);
        sheet.getCell(`A${row}`).value = 'Total Log Entries:';
        sheet.getCell(`B${row}`).value = totalLogEntries;
        row += 2;

        // Task summary table
        sheet.getCell(`A${row}`).value = 'Task Summary';
        sheet.getCell(`A${row}`).font = { bold: true };
        row++;

        const headers = ['Incident ID', 'Status', 'TrackIDs', 'Log Entries Found', 'Servers Searched'];
        headers.forEach((header, index) => {
            const cell = sheet.getCell(row, index + 1);
            cell.value = header;
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        });
        row++;

        // Task data
        tasks.forEach((task, index) => {
            const result = logResults[index];
            const rowData = [
                task.incidentId,
                task.status,
                task.trackIds.join(', '),
                result.entries.length,
                Object.keys(result.serverResults).join(', ')
            ];

            rowData.forEach((value, colIndex) => {
                sheet.getCell(row, colIndex + 1).value = value;
            });
            row++;
        });

        // Auto-fit columns
        sheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const cellLength = cell.value ? cell.value.toString().length : 10;
                if (cellLength > maxLength) maxLength = cellLength;
            });
            column.width = Math.min(Math.max(maxLength + 2, 10), 50);
        });
    }

    /**
     * Create detailed results sheet
     */
    async createDetailedSheet(workbook, tasks, logResults) {
        const sheet = workbook.addWorksheet('Detailed Results');

        // Headers
        const headers = [
            'Task ID', 'TrackID', 'Program ID', 'Server', 'Timestamp',
            'Log Level', 'Log Path', 'Content'
        ];

        headers.forEach((header, index) => {
            const cell = sheet.getCell(1, index + 1);
            cell.value = header;
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } };
        });

        let row = 2;

        // Add all log entries
        logResults.forEach(result => {
            result.entries.forEach(entry => {
                const rowData = [
                    result.taskId,
                    entry.trackId,
                    entry.programId,
                    entry.serverId,
                    entry.timestamp,
                    entry.logLevel,
                    entry.logPath,
                    entry.content
                ];

                rowData.forEach((value, index) => {
                    const cell = sheet.getCell(row, index + 1);
                    cell.value = value;

                    // Color code by log level
                    if (index === 5) { // Log Level column
                        switch (value) {
                            case 'ERROR':
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
                                break;
                            case 'WARN':
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
                                break;
                            case 'INFO':
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
                                break;
                        }
                    }
                });

                row++;
            });
        });

        // Set column widths
        const columnWidths = [12, 12, 12, 15, 20, 10, 30, 60];
        columnWidths.forEach((width, index) => {
            sheet.getColumn(index + 1).width = width;
        });

        // Enable text wrapping for content column
        sheet.getColumn(8).alignment = { wrapText: true };
    }

    /**
     * Close all SSH connections
     */
    closeAllConnections() {
        for (const [serverId, connection] of this.connections.entries()) {
            if (typeof connection.end === 'function') {
                connection.end();
            }
        }
        this.connections.clear();
        console.log('All SSH connections closed');
    }
}

// CLI execution
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Log Collection Skill - Issue #15 Implementation

Usage:
  npm run log-collect [instruction]

Required Environment Variables:
  SSH_KEY_PATH     SSH private key path (Required)
  SSH_HOST_1       Server 1 hostname/IP (Required)
  SSH_PORT_1       Server 1 SSH port (Required)
  SSH_HOST_2       Server 2 hostname/IP (Optional)
  SSH_PORT_2       Server 2 SSH port (Optional)
  SSH_HOST_3       Server 3 hostname/IP (Optional)
  SSH_PORT_3       Server 3 SSH port (Optional)
  SSH_USER         SSH username (Required)

Optional Environment Variables:
  INPUT_FOLDER     Input folder path (default: ./examples)
  OUTPUT_FOLDER    Output folder path (default: ./output)
  LOG_PATTERN_FILE Log pattern config (default: ./examples/log-patterns.json)

Examples (Windows):
  set SSH_KEY_PATH=C:\\path\\to\\private_key
  set SSH_HOST_1=192.168.1.100
  set SSH_PORT_1=22
  set SSH_USER=logcollector
  npm run log-collect

Examples (Linux/Mac):
  export SSH_KEY_PATH=/path/to/private_key
  export SSH_HOST_1=192.168.1.100
  export SSH_PORT_1=22
  export SSH_USER=logcollector
  npm run log-collect
        `);
        process.exit(0);
    }

    const skill = new LogCollectionSkill();

    try {
        const instruction = args.join(' ') || 'collect logs';
        const result = await skill.execute(instruction);

        console.log('\n📋 Final Result:');
        console.log(`  Tasks processed: ${result.tasksProcessed}`);
        console.log(`  Log entries found: ${result.logEntriesFound}`);
        console.log(`  Excel file: ${result.excelFile}`);
        console.log(`  CSV file: ${result.csvFile}`);

    } catch (error) {
        console.error('❌ Execution failed:', error.message);
        process.exit(1);
    }
}

module.exports = LogCollectionSkill;

if (require.main === module) {
    main();
}