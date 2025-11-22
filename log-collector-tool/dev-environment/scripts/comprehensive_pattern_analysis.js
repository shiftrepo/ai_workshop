const ExcelJS = require('exceljs');

async function comprehensivePatternAnalysis() {
    console.log('=== TrackID抽出パターンの包括的分析 ===\n');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('./examples/task_management_sample.xlsx');
    const worksheet = workbook.worksheets[0];

    // 定義されている5つのパターン
    const patterns = [
        { name: 'パターン1: TrackID:', regex: /TrackID:\s*([A-Z0-9]{3,10})/gi, example: 'TrackID: ABC123' },
        { name: 'パターン2: trackId=', regex: /trackId=([A-Z0-9]{3,10})/gi, example: 'trackId=DEF789' },
        { name: 'パターン3: [ID:]', regex: /\[ID:\s*([A-Z0-9]{3,10})\]/gi, example: '[ID: GHI012]' },
        { name: 'パターン4: #番号', regex: /#([A-Z0-9]{3,10})/gi, example: '#JKL345' },
        { name: 'パターン5: (識別:)', regex: /\(識別:\s*([A-Z0-9]{3,10})\)/gi, example: '(識別: MNO678)' }
    ];

    console.log('🎯 定義されているパターン一覧:');
    patterns.forEach((pattern, index) => {
        console.log('   ' + (index + 1) + '. ' + pattern.name + ' → ' + pattern.example);
    });
    console.log('');

    let totalPatternsUsed = 0;
    const patternUsage = {};
    const taskPatternCounts = [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1 && row.getCell('E').value === '情報収集中') {
            const incidentId = row.getCell('A').value;
            const description = row.getCell('C').value;

            console.log('🏷️  ' + incidentId + ':');
            console.log('   Description: ' + description);
            console.log('   パターン分析:');

            let taskPatternCount = 0;
            const taskTrackIds = [];

            patterns.forEach((pattern, index) => {
                const matches = [];
                let match;
                const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
                while ((match = regex.exec(description)) !== null) {
                    matches.push(match[1]);
                    taskTrackIds.push(match[1]);
                }

                if (matches.length > 0) {
                    console.log('     ✅ ' + pattern.name + ' → [' + matches.join(', ') + ']');
                    taskPatternCount++;
                    patternUsage[pattern.name] = (patternUsage[pattern.name] || 0) + 1;
                } else {
                    console.log('     ❌ ' + pattern.name + ' → 未使用');
                }
            });

            const uniqueTrackIds = [...new Set(taskTrackIds)];
            console.log('   📊 抽出TrackID数: ' + uniqueTrackIds.length + '個');
            console.log('   🎯 使用パターン数: ' + taskPatternCount + '/5');
            console.log('');

            totalPatternsUsed += taskPatternCount;
            taskPatternCounts.push(taskPatternCount);
        }
    });

    console.log('=== 全体的なパターン使用状況 ===');
    console.log('📈 パターン別使用回数:');
    Object.keys(patternUsage).forEach(patternName => {
        console.log('   - ' + patternName + ': ' + patternUsage[patternName] + '回');
    });
    console.log('');

    // 未使用パターンの特定
    const unusedPatterns = patterns.filter(p => !patternUsage[p.name]);
    if (unusedPatterns.length > 0) {
        console.log('❌ 未使用パターン:');
        unusedPatterns.forEach(pattern => {
            console.log('   - ' + pattern.name + ' (' + pattern.example + ')');
        });
        console.log('');
    }

    console.log('📊 使用されているパターン種類: ' + Object.keys(patternUsage).length + '/5');
    console.log('📊 平均パターン使用数/タスク: ' + (totalPatternsUsed / 4).toFixed(1));

    // パターン多様性の評価
    const patternDiversity = Object.keys(patternUsage).length;
    if (patternDiversity >= 4) {
        console.log('\n✅ パターン多様性: 優秀 (' + patternDiversity + '/5 種類使用)');
    } else if (patternDiversity >= 3) {
        console.log('\n⚠️  パターン多様性: 改善の余地あり (' + patternDiversity + '/5 種類使用)');
        console.log('   → 未使用パターンの活用または新パターンの追加が推奨');
    } else {
        console.log('\n❌ パターン多様性: 不十分 (' + patternDiversity + '/5 種類使用)');
        console.log('   → さらなるパターン追加が必要');
    }

    // パターン分布の均等性チェック
    const maxPatternCount = Math.max(...taskPatternCounts);
    const minPatternCount = Math.min(...taskPatternCounts);
    console.log('\n📊 タスク間のパターン数分布:');
    console.log('   - 最大: ' + maxPatternCount + ' パターン/タスク');
    console.log('   - 最小: ' + minPatternCount + ' パターン/タスク');
    console.log('   - 分布差: ' + (maxPatternCount - minPatternCount));

    if (maxPatternCount - minPatternCount > 1) {
        console.log('   ⚠️  タスク間でパターン数に差異あり → より均等な分散が推奨');
    } else {
        console.log('   ✅ タスク間のパターン分布は適切');
    }
}

comprehensivePatternAnalysis().catch(console.error);