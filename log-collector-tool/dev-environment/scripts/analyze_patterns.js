const ExcelJS = require('exceljs');

async function analyzePatterns() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('./examples/task_management_sample.xlsx');
    const worksheet = workbook.worksheets[0];

    console.log('=== TrackID抽出パターンの詳細分析 ===\n');
    console.log('📊 各タスクから抽出されたTrackIDパターン:\n');

    const trackIdPattern = /TrackID:\s*([A-Z0-9]{3,10})/gi;

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1 && row.getCell('E').value === '情報収集中') {
            const incidentId = row.getCell('A').value;
            const description = row.getCell('C').value;

            console.log('🏷️  ' + incidentId + ':');
            console.log('   Description: ' + description);

            // TrackID抽出
            const trackIds = [];
            let match;
            const regex = new RegExp(trackIdPattern.source, trackIdPattern.flags);
            while ((match = regex.exec(description)) !== null) {
                trackIds.push(match[1]);
            }

            console.log('   抽出されたTrackID: [' + trackIds.join(', ') + '] (' + trackIds.length + '個)');
            console.log('   パターン詳細:');

            // 各TrackIDの位置と前後のテキストを表示
            trackIds.forEach((trackId, index) => {
                const searchStr = 'TrackID: ' + trackId;
                const pos = description.indexOf(searchStr);
                const before = description.substring(Math.max(0, pos-15), pos);
                const after = description.substring(pos + searchStr.length, pos + searchStr.length + 15);
                console.log('     ' + (index+1) + '. ' + trackId + ' - 位置: ' + pos + ' | 前: "' + before + '" | 後: "' + after + '"');
            });
            console.log('');
        }
    });

    // 実際のCSV結果と比較
    console.log('=== CSVファイルでの実際のTrackID分布 ===');
    const fs = require('fs');
    const csvContent = fs.readFileSync('./output/log-collection-result_2025-11-22_13-35-12.csv', 'utf8');
    const lines = csvContent.split('\n').slice(1); // ヘッダーを除く

    const taskTrackIds = {};
    lines.forEach(line => {
        if (line.trim()) {
            const [taskId, trackId] = line.split(',');
            if (!taskTrackIds[taskId]) {
                taskTrackIds[taskId] = {};
            }
            taskTrackIds[taskId][trackId] = (taskTrackIds[taskId][trackId] || 0) + 1;
        }
    });

    Object.keys(taskTrackIds).forEach(taskId => {
        console.log('📈 ' + taskId + ' 実際の検索結果:');
        const trackIds = Object.keys(taskTrackIds[taskId]).sort();
        trackIds.forEach(trackId => {
            console.log('   - ' + trackId + ': ' + taskTrackIds[taskId][trackId] + ' entries');
        });
        console.log('   合計TrackID種類: ' + trackIds.length + '個');
        console.log('');
    });
}

analyzePatterns().catch(console.error);