#!/usr/bin/env node

/**
 * Log Collection Skill - CSV Output Version
 * CSV形式でのログ収集結果表示
 */

const fs = require('fs').promises;
const path = require('path');
const LogCollectionSkill = require('./log-collection-skill.js');

class LogCollectionCSV extends LogCollectionSkill {
    /**
     * CSV形式でのレポート生成
     */
    async generateCSVReport(tasks, logResults) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
        const csvPath = path.join(this.config.outputFolder, `log-collection-result_${timestamp}.csv`);

        console.log(`Creating CSV report: ${path.basename(csvPath)}`);

        // CSV header
        const csvLines = [
            'Task ID,TrackID,Program ID,Server,Timestamp,Log Level,Log Path,Content'
        ];

        // Add all log entries
        logResults.forEach(result => {
            result.entries.forEach(entry => {
                const csvLine = [
                    result.taskId,
                    `"${entry.trackId || ''}"`,
                    `"${entry.programId || ''}"`,
                    `"${entry.serverId || ''}"`,
                    `"${entry.timestamp || ''}"`,
                    `"${entry.logLevel || ''}"`,
                    `"${entry.logPath || ''}"`,
                    `"${(entry.content || '').replace(/"/g, '""')}"`  // Escape quotes
                ].join(',');
                csvLines.push(csvLine);
            });
        });

        // Write CSV file
        const csvContent = csvLines.join('\n');
        await fs.writeFile(csvPath, csvContent, 'utf8');

        console.log(`✓ CSV report saved: ${csvPath}`);
        return { csvPath, csvContent };
    }

    /**
     * CSV形式での結果表示
     */
    async displayCSVResults(tasks, logResults) {
        console.log('\n📊 Log Collection Results in CSV Format:');
        console.log('='.repeat(80));

        // Generate CSV content
        const { csvContent } = await this.generateCSVReport(tasks, logResults);

        // Display CSV content
        console.log(csvContent);

        return csvContent;
    }

    /**
     * 実行メソッドをCSV出力版に変更
     */
    async execute(instruction = '') {
        console.log('🚀 Log Collection Skill - CSV Output Version');
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

            // Step 6: Display CSV results
            console.log('\n📝 Step 6: Displaying CSV results...');
            const csvContent = await this.displayCSVResults(enrichedTasks, logResults);

            // Step 7: Cleanup connections
            console.log('\n🧹 Step 7: Cleaning up connections...');
            this.closeAllConnections();

            console.log('\n✅ Log collection completed successfully!');

            return {
                success: true,
                tasksProcessed: enrichedTasks.length,
                logEntriesFound: logResults.reduce((sum, r) => sum + r.entries.length, 0),
                csvContent
            };

        } catch (error) {
            console.error('\n❌ Log collection failed:', error.message);
            this.closeAllConnections();
            throw error;
        }
    }
}

// CLI execution
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Log Collection Skill - CSV Output Version

Usage:
  npm run log-collect-csv [instruction]

Environment Variables:
  INPUT_FOLDER     Input folder path (default: ./examples)
  OUTPUT_FOLDER    Output folder path (default: ./output)
  SSH_KEY_PATH     SSH private key path (default: ./examples/log_collector_key)

Examples:
  node log-collection-csv.js
  node log-collection-csv.js "collect logs and display as CSV"
        `);
        process.exit(0);
    }

    const skill = new LogCollectionCSV();

    try {
        const instruction = args.join(' ') || 'collect logs';
        const result = await skill.execute(instruction);

        console.log('\n📋 Final Result:');
        console.log(`  Tasks processed: ${result.tasksProcessed}`);
        console.log(`  Log entries found: ${result.logEntriesFound}`);

    } catch (error) {
        console.error('❌ Execution failed:', error.message);
        process.exit(1);
    }
}

module.exports = LogCollectionCSV;

if (require.main === module) {
    main();
}