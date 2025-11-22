#!/usr/bin/env node

/**
 * Excel to CSV converter for task management sample display
 */

const ExcelJS = require('exceljs');
const path = require('path');

async function convertExcelToCSV(excelFile) {
    console.log('📊 サンプル課題管理表 (CSV形式)');
    console.log('='.repeat(80));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFile);

    const worksheet = workbook.worksheets[0];
    const csvLines = [];

    worksheet.eachRow((row, rowNumber) => {
        const values = [];

        // A-F列を取得
        for (let colNumber = 1; colNumber <= 6; colNumber++) {
            const cell = row.getCell(colNumber);
            let value = cell.value;

            if (value === null || value === undefined) {
                value = '';
            } else if (typeof value === 'object') {
                if (value.richText) {
                    value = value.richText.map(rt => rt.text).join('');
                } else if (value.result !== undefined) {
                    value = value.result;
                } else {
                    value = value.toString();
                }
            } else {
                value = value.toString();
            }

            // CSV用にエスケープ
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }

            values.push(value);
        }

        csvLines.push(values.join(','));
    });

    // CSV表示
    csvLines.forEach(line => {
        console.log(line);
    });

    console.log('\n✅ 課題管理表CSV表示完了\n');

    return csvLines;
}

// メイン実行
async function main() {
    try {
        const excelFile = path.join(__dirname, 'examples/task_management_sample.xlsx');
        await convertExcelToCSV(excelFile);
    } catch (error) {
        console.error('❌ Excel to CSV変換エラー:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { convertExcelToCSV };