#!/usr/bin/env node

/**
 * ディレクトリ比較ツール - クライアント側スクリプト
 * 使用方法: node compare.js <folder1.json> <folder2.json> [output.xlsx]
 * 出力ファイルを省略した場合は、../output/comparison.xlsx に出力されます
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// 引数チェック
if (process.argv.length < 4 || process.argv.length > 5) {
    console.error('使用方法: node compare.js <folder1.json> <folder2.json> [output.xlsx]');
    console.error('例: node compare.js folder1.json folder2.json');
    console.error('例: node compare.js folder1.json folder2.json custom_output.xlsx');
    process.exit(1);
}

const [, , json1Path, json2Path, outputPath = path.join(__dirname, '../output/comparison.xlsx')] = process.argv;

// 出力ディレクトリの作成
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// JSONファイル読み込み
function loadJson(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`エラー: ${filePath} を読み込めません:`, error.message);
        process.exit(1);
    }
}

console.log('JSONファイルを読み込んでいます...');
const folder1Data = loadJson(json1Path);
const folder2Data = loadJson(json2Path);

console.log(`フォルダ1: ${folder1Data.base_path} (${folder1Data.nodes.length} ノード)`);
console.log(`フォルダ2: ${folder2Data.base_path} (${folder2Data.nodes.length} ノード)`);

// ノードをパスでマッピング
const folder1Map = new Map();
const folder2Map = new Map();

folder1Data.nodes.forEach(node => {
    folder1Map.set(node.path, node);
});

folder2Data.nodes.forEach(node => {
    folder2Map.set(node.path, node);
});

// 全パスのユニオンを取得
const allPaths = new Set([...folder1Map.keys(), ...folder2Map.keys()]);

// 比較結果を格納
const comparisonResults = [];

console.log('ディレクトリを比較しています...');

for (const nodePath of Array.from(allPaths).sort()) {
    const node1 = folder1Map.get(nodePath);
    const node2 = folder2Map.get(nodePath);

    let diffStatus = '';
    let diffType = '';
    const differences = [];

    if (!node1 && node2) {
        // フォルダ2のみ存在
        diffStatus = 'フォルダ2のみ';
        diffType = 'only_in_2';
    } else if (node1 && !node2) {
        // フォルダ1のみ存在
        diffStatus = 'フォルダ1のみ';
        diffType = 'only_in_1';
    } else if (node1 && node2) {
        // 両方に存在 - 詳細比較
        if (node1.type !== node2.type) {
            differences.push('タイプ');
        }
        if (node1.permissions !== node2.permissions) {
            differences.push('パーミッション');
        }
        if (node1.owner !== node2.owner) {
            differences.push('オーナー');
        }
        if (node1.group !== node2.group) {
            differences.push('グループ');
        }
        if (node1.size !== node2.size) {
            differences.push('サイズ');
        }
        if (node1.datetime !== node2.datetime) {
            differences.push('日時');
        }
        if (node1.checksum && node2.checksum && node1.checksum !== node2.checksum) {
            differences.push('チェックサム');
        }

        if (differences.length > 0) {
            diffStatus = '差分';
            diffType = 'different';
        } else {
            diffStatus = '一致';
            diffType = 'identical';
        }
    }

    comparisonResults.push({
        path: nodePath,
        node1,
        node2,
        diffStatus,
        diffType,
        differences
    });
}

console.log(`比較完了: ${comparisonResults.length} エントリ`);

// Excel ファイル生成
console.log('Excelファイルを生成しています...');

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('フォルダ比較', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
});

// 列幅設定
worksheet.columns = [
    { key: 'name1', width: 25 },
    { key: 'path1', width: 40 },
    { key: 'permissions1', width: 12 },
    { key: 'owner1', width: 12 },
    { key: 'datetime1', width: 28 },
    { key: 'checksum1', width: 35 },
    { key: 'diff', width: 20 },
    { key: 'diffType', width: 15 },
    { key: 'name2', width: 25 },
    { key: 'path2', width: 40 },
    { key: 'permissions2', width: 12 },
    { key: 'owner2', width: 12 },
    { key: 'datetime2', width: 28 },
    { key: 'checksum2', width: 35 }
];

// タイトル行
const titleRow = worksheet.getRow(1);
titleRow.getCell(1).value = 'フォルダ比較統合ビュー（sdiff形式）';
titleRow.getCell(1).font = { size: 16, bold: true, color: { argb: 'FF000080' } };
titleRow.height = 25;
worksheet.mergeCells('A1:N1');
titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

// 空行
worksheet.getRow(2).height = 5;

// フォルダ名行
const folderRow = worksheet.getRow(3);
folderRow.getCell(1).value = path.basename(folder1Data.base_path) || 'test_folder1';
folderRow.getCell(1).font = { bold: true, size: 12 };
folderRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD4EDDA' }
};
worksheet.mergeCells('A3:F3');
folderRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

folderRow.getCell(7).value = '差分';
folderRow.getCell(7).font = { bold: true, size: 12 };
folderRow.getCell(7).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC107' }
};
worksheet.mergeCells('G3:H3');
folderRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

folderRow.getCell(9).value = path.basename(folder2Data.base_path) || 'test_folder2';
folderRow.getCell(9).font = { bold: true, size: 12 };
folderRow.getCell(9).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD4EDDA' }
};
worksheet.mergeCells('I3:N3');
folderRow.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };

// ヘッダー行
const headerRow = worksheet.getRow(4);
const headers = [
    'ノード名', 'フルパス', '権限', 'オーナー', '更新日時', 'チェックサム',
    '差分', 'フィルタ',
    'ノード名', 'フルパス', '権限', 'オーナー', '更新日時', 'チェックサム'
];

headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF28A745' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };
});

headerRow.height = 20;

// データ行
let rowNum = 5;

for (const result of comparisonResults) {
    const row = worksheet.getRow(rowNum);

    // フォルダ1の情報
    if (result.node1) {
        row.getCell(1).value = result.node1.name;
        row.getCell(2).value = result.node1.path;
        row.getCell(3).value = result.node1.permissions;
        row.getCell(4).value = result.node1.owner;
        row.getCell(5).value = result.node1.datetime;
        row.getCell(6).value = result.node1.checksum || (result.node1.type === 'directory' ? 'ディレクトリ' : '');
    }

    // 差分情報
    row.getCell(7).value = result.diffStatus;
    row.getCell(8).value = result.diffType;

    // フォルダ2の情報
    if (result.node2) {
        row.getCell(9).value = result.node2.name;
        row.getCell(10).value = result.node2.path;
        row.getCell(11).value = result.node2.permissions;
        row.getCell(12).value = result.node2.owner;
        row.getCell(13).value = result.node2.datetime;
        row.getCell(14).value = result.node2.checksum || (result.node2.type === 'directory' ? 'ディレクトリ' : '');
    }

    // 色付け
    let fillColor = null;
    if (result.diffType === 'only_in_1') {
        fillColor = { argb: 'FFE3F2FD' }; // 青系
    } else if (result.diffType === 'only_in_2') {
        fillColor = { argb: 'FFE1BEE7' }; // 紫系
    } else if (result.diffType === 'different') {
        fillColor = { argb: 'FFFFEBEE' }; // ピンク系
        // 差分がある項目を赤文字にする
        if (result.differences.includes('チェックサム')) {
            row.getCell(6).font = { color: { argb: 'FFFF0000' } };
            row.getCell(14).font = { color: { argb: 'FFFF0000' } };
        }
        if (result.differences.includes('パーミッション')) {
            row.getCell(3).font = { color: { argb: 'FFFF0000' } };
            row.getCell(11).font = { color: { argb: 'FFFF0000' } };
        }
        if (result.differences.includes('オーナー')) {
            row.getCell(4).font = { color: { argb: 'FFFF0000' } };
            row.getCell(12).font = { color: { argb: 'FFFF0000' } };
        }
        if (result.differences.includes('日時')) {
            row.getCell(5).font = { color: { argb: 'FFFF0000' } };
            row.getCell(13).font = { color: { argb: 'FFFF0000' } };
        }
    }

    if (fillColor) {
        for (let col = 1; col <= 14; col++) {
            row.getCell(col).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: fillColor
            };
        }
    }

    // 罫線
    for (let col = 1; col <= 14; col++) {
        row.getCell(col).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    }

    rowNum++;
}

// オートフィルタを追加
worksheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: rowNum - 1, column: 14 }
};

// ファイル保存
workbook.xlsx.writeFile(outputPath)
    .then(() => {
        console.log(`Excelファイルを生成しました: ${outputPath}`);
        console.log(`総エントリ数: ${comparisonResults.length}`);
        console.log(`  - 一致: ${comparisonResults.filter(r => r.diffType === 'identical').length}`);
        console.log(`  - 差分: ${comparisonResults.filter(r => r.diffType === 'different').length}`);
        console.log(`  - フォルダ1のみ: ${comparisonResults.filter(r => r.diffType === 'only_in_1').length}`);
        console.log(`  - フォルダ2のみ: ${comparisonResults.filter(r => r.diffType === 'only_in_2').length}`);
    })
    .catch(error => {
        console.error('エラー: Excelファイルの保存に失敗しました:', error.message);
        process.exit(1);
    });
