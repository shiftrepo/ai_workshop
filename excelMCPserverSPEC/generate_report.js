#!/usr/bin/env node

/**
 * Excel MCP Server - レポート生成ツール
 * ======================================
 *
 * 使用方法: node generate_report.js
 *
 * compare_folders.shによって生成された比較データJSONを読み込み、
 * Excel形式とPDF形式のレポートを生成します。
 * 設定はconfig.jsonから読み込まれます。
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit-table');
const util = require('util');
const crypto = require('crypto'); // チェックサム計算用
const { execSync } = require('child_process'); // lsコマンド実行用

// 現在の日時（ファイル名用）
const now = new Date();
const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

// パス設定
const scriptDir = __dirname;
const outputDir = path.join(scriptDir, 'output');
const logDir = path.join(scriptDir, 'logs');
const jsonFilePath = path.join(outputDir, 'comparison_data.json');
const configFilePath = path.join(scriptDir, 'config.json');

// ディレクトリ作成
try {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  console.error(`エラー: ディレクトリ作成に失敗しました: ${err.message}`);
  process.exit(1);
}

// ログファイル設定
const logFilePath = path.join(logDir, `report_generation_${timestamp}.log`);
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// ログ関数
function log(level, message) {
  const logMessage = `[${level.toUpperCase()}] ${new Date().toISOString()} - ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

// エラーハンドリング関数
function handleError(message, err) {
  log('error', `${message}: ${err.message}`);
  console.error(`エラー: ${message}`);
  process.exit(1);
}

// チェックサム計算関数（ファイルパスを受け取ってMD5ハッシュを返す）
function calculateChecksum(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(fileContent).digest('hex');
    }
  } catch (err) {
    log('warn', `チェックサム計算エラー (${filePath}): ${err.message}`);
  }
  return '';
}

// ファイルのパーミッション文字列取得（ls -laの結果からそのまま取得）
function getPermissionString(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      // lsコマンドを実行して権限文字列を取得
      const filename = path.basename(filePath);
      const parentDir = path.dirname(filePath);
      const lsOutput = execSync(`ls -la "${parentDir}"`).toString();

      // 結果から該当ファイルの行を探す
      const lines = lsOutput.split('\n');
      for (const line of lines) {
        // 行を解析して最後のカラム（ファイル名）が一致するか確認
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 7 && parts[parts.length - 1] === filename) {
          // 最初のカラムが権限文字列 (-rw-r--r-- or drwxr-xr-x など)
          return parts[0];
        }
      }

      // ファイルは存在するが、ls -la の結果で見つからなかった場合は空文字列を返す
      // (理論上はここには到達しないはずだが、念のため)
      return '';
    }
    // ファイルが存在しない場合は空文字列を返す
    return '';
  } catch (err) {
    log('warn', `パーミッション取得エラー (${filePath}): ${err.message}`);
    // エラーが発生した場合も空文字列を返す
    return '';
  }
}

// 日付をミリ秒まで表示する関数
function formatDateWithMs(dateStr) {
  if (!dateStr) return '';

  try {
    // 日付文字列をパース
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // パース失敗時は元の文字列を返す

    // YYYY-MM-DD HH:MM:SS.mmm 形式に変換
    return date.toISOString().replace('T', ' ').replace('Z', '')
  } catch (err) {
    return dateStr;
  }
}

// 設定読み込み
let config;
try {
  const configData = fs.readFileSync(configFilePath, 'utf8');
  config = JSON.parse(configData);
  log('info', 'config.jsonを読み込みました');
} catch (err) {
  handleError('設定ファイルの読み込みに失敗しました', err);
}

// 比較データ読み込み
let comparisonData;
try {
  if (!fs.existsSync(jsonFilePath)) {
    handleError(`比較データJSONファイルが見つかりません: ${jsonFilePath}`, new Error('ファイルが存在しません'));
  }

  const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
  comparisonData = JSON.parse(jsonData);
  log('info', `比較データを読み込みました: ${jsonFilePath}`);
} catch (err) {
  handleError('比較データの読み込みに失敗しました', err);
}

// Excelファイル名とPDFファイル名を設定から取得
const excelFilename = config.output_options.excel_filename || 'comparison_result.xlsx';
const pdfFilename = config.output_options.pdf_filename || 'comparison_report.pdf';
const excelFilePath = path.join(outputDir, excelFilename);
const pdfFilePath = path.join(outputDir, pdfFilename);

/**
 * Excel出力機能
 */
async function generateExcelReport() {
  log('info', 'Excelレポート生成を開始します...');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Excel MCP Server';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ----------------------------------------------
  // 新規追加: 統合比較シート（sdiff風の左右表示）- 拡張版
  // ----------------------------------------------
  const unifiedComparisonSheet = workbook.addWorksheet('統合比較表示', {
    properties: { tabColor: { argb: '9B59B6' } }
  });

  // ヘッダー
  unifiedComparisonSheet.mergeCells('A1:M1');
  unifiedComparisonSheet.getCell('A1').value = 'フォルダ比較統合ビュー（sdiff形式）';
  unifiedComparisonSheet.getCell('A1').font = {
    name: 'Yu Gothic',
    family: 2,
    size: 16,
    bold: true,
    color: { argb: '0070C0' }
  };
  unifiedComparisonSheet.getCell('A1').alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };
  unifiedComparisonSheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'E6E6FA' }
  };

  // フォルダ情報
  unifiedComparisonSheet.mergeCells('A3:F3');
  unifiedComparisonSheet.getCell('A3').value = comparisonData.comparison_info.folder1;
  unifiedComparisonSheet.getCell('A3').font = { bold: true, name: 'Yu Gothic' };
  unifiedComparisonSheet.getCell('A3').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DDEBF7' }
  };

  unifiedComparisonSheet.getCell('G3').value = '差分';
  unifiedComparisonSheet.getCell('G3').font = { bold: true, name: 'Yu Gothic' };
  unifiedComparisonSheet.getCell('G3').alignment = { horizontal: 'center' };
  unifiedComparisonSheet.getCell('G3').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2CC' }
  };

  unifiedComparisonSheet.mergeCells('H3:M3');
  unifiedComparisonSheet.getCell('H3').value = comparisonData.comparison_info.folder2;
  unifiedComparisonSheet.getCell('H3').font = { bold: true, name: 'Yu Gothic' };
  unifiedComparisonSheet.getCell('H3').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DDEBF7' }
  };

  // カラムヘッダー
  unifiedComparisonSheet.getRow(4).values = [
    'パス',            // A - フォルダ1のパス
    'フルパス',         // B - フォルダ1のフルパス
    '権限',            // C - フォルダ1の権限
    'オーナー',         // D - フォルダ1のオーナー
    '更新日時',         // E - フォルダ1の日時
    'チェックサム',      // F - フォルダ1のチェックサム
    '状態',            // G - 差分状態
    'パス',            // H - フォルダ2のパス
    'フルパス',         // I - フォルダ2のフルパス
    '権限',            // J - フォルダ2の権限
    'オーナー',         // K - フォルダ2のオーナー
    '更新日時',         // L - フォルダ2の日時
    'チェックサム'       // M - フォルダ2のチェックサム
  ];
  unifiedComparisonSheet.getRow(4).font = { bold: true, name: 'Yu Gothic' };
  unifiedComparisonSheet.getRow(4).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'D9D9D9' }
  };

  // データの収集と一元化
  let allItems = new Map(); // パスをキーに、比較データを保存

  log('info', '拡張された統合比較データを収集中...');

  // 共通ファイル
  if (comparisonData.file_existence && comparisonData.file_existence.common_files) {
    comparisonData.file_existence.common_files.forEach(file => {
      let status = '一致';
      let contentInfo = '内容一致';

      // ファイルの実際のパス
      const filePath1 = path.join(comparisonData.comparison_info.folder1, file);
      const filePath2 = path.join(comparisonData.comparison_info.folder2, file);

      // チェックサム（MD5）計算
      const checksum1 = calculateChecksum(filePath1);
      const checksum2 = calculateChecksum(filePath2);
      const checksumStatus = checksum1 === checksum2 ? '一致' : '不一致';

      // 内容チェック
      if (comparisonData.file_content) {
        if (comparisonData.file_content.different_files.includes(file)) {
          status = '差分';
          contentInfo = '内容不一致';
        }
      }

      // 属性詳細情報
      let attrDetail = null;
      if (comparisonData.file_attributes) {
        attrDetail = comparisonData.file_attributes.attribute_details.find(attr => attr.file === file);
        if (attrDetail) {
          if (attrDetail.size.different || attrDetail.timestamp.different || attrDetail.permissions.different) {
            status = '差分';
          }
        }
      }

      // lsコマンドの結果からオーナー情報を取得
      let owner1 = '';
      let owner2 = '';
      try {
        // ファイル1のオーナー情報を取得
        const lsResult1 = execSync(`ls -la "${filePath1}"`).toString();
        const filename1 = path.basename(filePath1);
        const lines1 = lsResult1.split('\n');

        // Windowsの場合、パス区切りが異なるので完全一致が難しいため、含まれるかで判断
        for (const line of lines1) {
          if (line.includes(filename1)) {
            // 典型的なls -laの結果: "-rw-r--r-- 1 kappappa 197121 20 Sep 30 11:44 test_folder1\date_file.txt"
            // パターン: 権限 + リンク + ユーザー名 + グループ + サイズ + 月 + 日 + 時間 + ファイル名
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 7) {
              owner1 = parts[2]; // ユーザー名は通常3番目の項目
              break;
            }
          }
        }

        // ファイル2のオーナー情報を取得
        const lsResult2 = execSync(`ls -la "${filePath2}"`).toString();
        const filename2 = path.basename(filePath2);
        const lines2 = lsResult2.split('\n');

        for (const line of lines2) {
          if (line.includes(filename2)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 7) {
              owner2 = parts[2]; // ユーザー名
              break;
            }
          }
        }
      } catch (err) {
        log('warn', `オーナー情報取得エラー: ${err.message}`);
      }

      allItems.set(file, {
        path: file,
        folder1: {
          exists: true,
          fullPath: filePath1,
          permissions: getPermissionString(filePath1),
          owner: owner1,
          timestamp: attrDetail ? formatDateWithMs(attrDetail.timestamp.folder1) : '',
          checksum: checksum1
        },
        folder2: {
          exists: true,
          fullPath: filePath2,
          permissions: getPermissionString(filePath2),
          owner: owner2,
          timestamp: attrDetail ? formatDateWithMs(attrDetail.timestamp.folder2) : '',
          checksum: checksum2
        },
        status: status,
        checksumStatus: checksumStatus,
        contentInfo: contentInfo
      });
    });
  }

  // フォルダ1のみのファイル
  if (comparisonData.file_existence && comparisonData.file_existence.only_in_dir1) {
    comparisonData.file_existence.only_in_dir1.forEach(file => {
      // ファイルの実際のパス
      const filePath1 = path.join(comparisonData.comparison_info.folder1, file);

      // チェックサム（MD5）計算
      const checksum1 = calculateChecksum(filePath1);

      // 権限とタイムスタンプを取得
      let permissions = '';
      let timestamp = '';
      let owner = '';

      try {
        // ls -la コマンドの結果から直接パーミッション文字列を取得
        permissions = getPermissionString(filePath1);

        // lsコマンドの結果からオーナー情報を取得
        const lsResult = execSync(`ls -la "${filePath1}"`).toString();
        const filename = path.basename(filePath1);
        const lines = lsResult.split('\n');
        for (const line of lines) {
          if (line.includes(filename)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 7) {
              owner = parts[2]; // ユーザー名
              break;
            }
          }
        }

        timestamp = formatDateWithMs(fs.statSync(filePath1).mtime.toISOString());
      } catch (err) {
        log('warn', `ファイル属性取得エラー (${filePath1}): ${err.message}`);
      }

      allItems.set(file, {
        path: file,
        folder1: {
          exists: true,
          fullPath: filePath1,
          permissions: permissions,
          owner: owner,
          timestamp: timestamp,
          checksum: checksum1
        },
        folder2: {
          exists: false,
          fullPath: '',
          permissions: '',
          owner: '',
          timestamp: '',
          checksum: ''
        },
        status: 'フォルダ1のみ',
        checksumStatus: '',
        contentInfo: ''
      });
    });
  }

  // フォルダ2のみのファイル
  if (comparisonData.file_existence && comparisonData.file_existence.only_in_dir2) {
    comparisonData.file_existence.only_in_dir2.forEach(file => {
      // ファイルの実際のパス
      const filePath2 = path.join(comparisonData.comparison_info.folder2, file);

      // チェックサム（MD5）計算
      const checksum2 = calculateChecksum(filePath2);

      // 権限とタイムスタンプを取得
      let permissions = '';
      let timestamp = '';
      let owner = '';

      try {
        // ls -la コマンドの結果から直接パーミッション文字列を取得
        permissions = getPermissionString(filePath2);

        // lsコマンドの結果からオーナー情報を取得
        const lsResult = execSync(`ls -la "${filePath2}"`).toString();
        const filename = path.basename(filePath2);
        const lines = lsResult.split('\n');
        for (const line of lines) {
          if (line.includes(filename)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 7) {
              owner = parts[2]; // ユーザー名
              break;
            }
          }
        }

        timestamp = formatDateWithMs(fs.statSync(filePath2).mtime.toISOString());
      } catch (err) {
        log('warn', `ファイル属性取得エラー (${filePath2}): ${err.message}`);
      }

      allItems.set(file, {
        path: file,
        folder1: {
          exists: false,
          fullPath: '',
          permissions: '',
          owner: '',
          timestamp: '',
          checksum: ''
        },
        folder2: {
          exists: true,
          fullPath: filePath2,
          permissions: permissions,
          owner: owner,
          timestamp: timestamp,
          checksum: checksum2
        },
        status: 'フォルダ2のみ',
        checksumStatus: '',
        contentInfo: ''
      });
    });
  }

  // ディレクトリ構造
  if (comparisonData.directory_structure) {
    // 共通ディレクトリ
    comparisonData.directory_structure.common_directories.forEach(dir => {
      // ディレクトリの実際のパス
      const dirPath1 = path.join(comparisonData.comparison_info.folder1, dir);
      const dirPath2 = path.join(comparisonData.comparison_info.folder2, dir);

      // 権限とタイムスタンプを取得
      let permissions1 = '';
      let timestamp1 = '';
      let owner1 = '';
      let permissions2 = '';
      let timestamp2 = '';
      let owner2 = '';

      try {
        // ls -la コマンドの結果から直接パーミッション文字列を取得 - フォルダ1
        permissions1 = getPermissionString(dirPath1);

        // ディレクトリ1のオーナー情報を取得
        const dirname1 = path.basename(dirPath1);
        const parentDir1 = path.dirname(dirPath1);
        const parentLsResult1 = execSync(`ls -la "${parentDir1}"`).toString();
        const lines1 = parentLsResult1.split('\n');
        for (const line of lines1) {
          if (line.includes(dirname1)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 7) {
              owner1 = parts[2]; // ユーザー名
              break;
            }
          }
        }

        timestamp1 = formatDateWithMs(fs.statSync(dirPath1).mtime.toISOString());

        // ls -la コマンドの結果から直接パーミッション文字列を取得 - フォルダ2
        permissions2 = getPermissionString(dirPath2);

        // ディレクトリ2のオーナー情報を取得
        const dirname2 = path.basename(dirPath2);
        const parentDir2 = path.dirname(dirPath2);
        const parentLsResult2 = execSync(`ls -la "${parentDir2}"`).toString();
        const lines2 = parentLsResult2.split('\n');
        for (const line of lines2) {
          if (line.includes(dirname2)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 7) {
              owner2 = parts[2]; // ユーザー名
              break;
            }
          }
        }

        timestamp2 = formatDateWithMs(fs.statSync(dirPath2).mtime.toISOString());
      } catch (err) {
        log('warn', `ディレクトリ属性取得エラー: ${err.message}`);
      }

      allItems.set(dir, {
        path: dir,
        folder1: {
          exists: true,
          fullPath: dirPath1,
          permissions: permissions1,
          owner: owner1,
          timestamp: timestamp1,
          checksum: 'ディレクトリ'
        },
        folder2: {
          exists: true,
          fullPath: dirPath2,
          permissions: permissions2,
          owner: owner2,
          timestamp: timestamp2,
          checksum: 'ディレクトリ'
        },
        status: timestamp1 === timestamp2 && permissions1 === permissions2 ? '一致' : '差分',
        checksumStatus: '',
        contentInfo: 'ディレクトリ'
      });
    });

    // フォルダ1のみのディレクトリ
    comparisonData.directory_structure.only_in_dir1.forEach(dir => {
      // ディレクトリの実際のパス
      const dirPath1 = path.join(comparisonData.comparison_info.folder1, dir);

      // 権限とタイムスタンプを取得
      let permissions = '';
      let timestamp = '';
      let owner = '';

      try {
        // ls -la コマンドの結果から直接パーミッション文字列を取得
        permissions = getPermissionString(dirPath1);

        // ディレクトリのオーナー情報を取得
        const dirname = path.basename(dirPath1);
        const parentDir = path.dirname(dirPath1);
        const lsResult = execSync(`ls -la "${parentDir}"`).toString();
        const lines = lsResult.split('\n');
        for (const line of lines) {
          if (line.includes(dirname)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 7) {
              owner = parts[2]; // ユーザー名
              break;
            }
          }
        }

        timestamp = formatDateWithMs(fs.statSync(dirPath1).mtime.toISOString());
      } catch (err) {
        log('warn', `ディレクトリ属性取得エラー (${dirPath1}): ${err.message}`);
      }

      allItems.set(dir, {
        path: dir,
        folder1: {
          exists: true,
          fullPath: dirPath1,
          permissions: permissions,
          owner: owner,
          timestamp: timestamp,
          checksum: 'ディレクトリ'
        },
        folder2: {
          exists: false,
          fullPath: '',
          permissions: '',
          owner: '',
          timestamp: '',
          checksum: ''
        },
        status: 'フォルダ1のみ',
        checksumStatus: '',
        contentInfo: 'ディレクトリ'
      });
    });

    // フォルダ2のみのディレクトリ
    comparisonData.directory_structure.only_in_dir2.forEach(dir => {
      // ディレクトリの実際のパス
      const dirPath2 = path.join(comparisonData.comparison_info.folder2, dir);

      // 権限とタイムスタンプを取得
      let permissions = '';
      let timestamp = '';
      let owner = '';

      try {
        // ls -la コマンドの結果から直接パーミッション文字列を取得
        permissions = getPermissionString(dirPath2);

        // ディレクトリのオーナー情報を取得
        const dirname = path.basename(dirPath2);
        const parentDir = path.dirname(dirPath2);
        const lsResult = execSync(`ls -la "${parentDir}"`).toString();
        const lines = lsResult.split('\n');
        for (const line of lines) {
          if (line.includes(dirname)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 7) {
              owner = parts[2]; // ユーザー名
              break;
            }
          }
        }

        timestamp = formatDateWithMs(fs.statSync(dirPath2).mtime.toISOString());
      } catch (err) {
        log('warn', `ディレクトリ属性取得エラー (${dirPath2}): ${err.message}`);
      }

      allItems.set(dir, {
        path: dir,
        folder1: {
          exists: false,
          fullPath: '',
          permissions: '',
          owner: '',
          timestamp: '',
          checksum: ''
        },
        folder2: {
          exists: true,
          fullPath: dirPath2,
          permissions: permissions,
          owner: owner,
          timestamp: timestamp,
          checksum: 'ディレクトリ'
        },
        status: 'フォルダ2のみ',
        checksumStatus: '',
        contentInfo: 'ディレクトリ'
      });
    });
  }

  // パス順にソート
  const sortedItems = Array.from(allItems.values()).sort((a, b) => a.path.localeCompare(b.path));

  log('info', `統合比較データを取得完了: ${sortedItems.length}件`);

  // データの書き込み
  sortedItems.forEach((item, index) => {
    const rowIndex = 5 + index;

    // フォルダ1側
    unifiedComparisonSheet.getCell(`A${rowIndex}`).value = item.folder1.exists ? item.path : '';
    unifiedComparisonSheet.getCell(`B${rowIndex}`).value = item.folder1.fullPath;
    unifiedComparisonSheet.getCell(`C${rowIndex}`).value = item.folder1.permissions;
    unifiedComparisonSheet.getCell(`D${rowIndex}`).value = item.folder1.owner;
    unifiedComparisonSheet.getCell(`E${rowIndex}`).value = item.folder1.timestamp;
    unifiedComparisonSheet.getCell(`F${rowIndex}`).value = item.folder1.checksum;

    // 差分状態
    unifiedComparisonSheet.getCell(`G${rowIndex}`).value = item.status;
    unifiedComparisonSheet.getCell(`G${rowIndex}`).alignment = { horizontal: 'center' };

    // フォルダ2側
    unifiedComparisonSheet.getCell(`H${rowIndex}`).value = item.folder2.exists ? item.path : '';
    unifiedComparisonSheet.getCell(`I${rowIndex}`).value = item.folder2.fullPath;
    unifiedComparisonSheet.getCell(`J${rowIndex}`).value = item.folder2.permissions;
    unifiedComparisonSheet.getCell(`K${rowIndex}`).value = item.folder2.owner;
    unifiedComparisonSheet.getCell(`L${rowIndex}`).value = item.folder2.timestamp;
    unifiedComparisonSheet.getCell(`M${rowIndex}`).value = item.folder2.checksum;

    // セル内テキストの縮小表示設定
    for (let col of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']) {
      unifiedComparisonSheet.getCell(`${col}${rowIndex}`).alignment = {
        ...unifiedComparisonSheet.getCell(`${col}${rowIndex}`).alignment,
        shrinkToFit: true
      };
    }

    // チェックサムが異なる場合は赤字で表示
    if (item.folder1.exists && item.folder2.exists && item.folder1.checksum !== item.folder2.checksum) {
      unifiedComparisonSheet.getCell(`F${rowIndex}`).font = { color: { argb: 'FF0000' } };
      unifiedComparisonSheet.getCell(`M${rowIndex}`).font = { color: { argb: 'FF0000' } };
    }

    // 差分による行の色分け
    if (item.status === '差分') {
      unifiedComparisonSheet.getRow(rowIndex).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDDDD' }
      };
    } else if (item.status === 'フォルダ1のみ') {
      unifiedComparisonSheet.getRow(rowIndex).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'DDFFDD' }
      };
    } else if (item.status === 'フォルダ2のみ') {
      unifiedComparisonSheet.getRow(rowIndex).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'DDDDFF' }
      };
    }
  });

  // カラム幅の設定
  unifiedComparisonSheet.getColumn('A').width = 20; // パス
  unifiedComparisonSheet.getColumn('B').width = 25; // フルパス
  unifiedComparisonSheet.getColumn('C').width = 12; // 権限
  unifiedComparisonSheet.getColumn('D').width = 10; // オーナー
  unifiedComparisonSheet.getColumn('E').width = 20; // 更新日時
  unifiedComparisonSheet.getColumn('F').width = 18; // チェックサム
  unifiedComparisonSheet.getColumn('G').width = 12; // 状態
  unifiedComparisonSheet.getColumn('H').width = 20; // パス
  unifiedComparisonSheet.getColumn('I').width = 25; // フルパス
  unifiedComparisonSheet.getColumn('J').width = 12; // 権限
  unifiedComparisonSheet.getColumn('K').width = 10; // オーナー
  unifiedComparisonSheet.getColumn('L').width = 20; // 更新日時
  unifiedComparisonSheet.getColumn('M').width = 18; // チェックサム

  // フィルターを追加
  unifiedComparisonSheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4 + sortedItems.length, column: 13 }
  };

  // 罫線を追加
  for (let i = 4; i <= 4 + sortedItems.length; i++) {
    for (let j = 1; j <= 13; j++) {
      const cell = unifiedComparisonSheet.getCell(i, j);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }

  // ----------------------------------------------
  // 元からある以下のシート作成処理を引き続き維持
  // ----------------------------------------------

  // サマリーシートの作成
  const summarySheet = workbook.addWorksheet('概要', {
    properties: { tabColor: { argb: '4472C4' } }
  });

  // タイトルとメタデータ
  summarySheet.mergeCells('A1:H1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'フォルダ比較結果レポート';
  titleCell.font = {
    name: 'Yu Gothic', // 日本語フォントを指定
    family: 2,
    size: 16,
    bold: true,
    color: { argb: '0070C0' }
  };
  titleCell.alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };

  // メタデータヘッダーとデータ
  summarySheet.mergeCells('A3:D3');
  summarySheet.getCell('A3').value = '比較情報';
  summarySheet.getCell('A3').font = { bold: true, size: 12, name: 'Yu Gothic' };
  summarySheet.getCell('A3').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DDEBF7' }
  };

  // メタデータ行
  const metaRows = [
    ['フォルダ1', comparisonData.comparison_info.folder1],
    ['フォルダ2', comparisonData.comparison_info.folder2],
    ['比較実行日時', comparisonData.comparison_info.start_time],
    ['処理時間', comparisonData.comparison_info.duration]
  ];

  metaRows.forEach((row, index) => {
    const rowIndex = index + 4;
    summarySheet.getCell(`A${rowIndex}`).value = row[0];
    summarySheet.getCell(`A${rowIndex}`).font = { bold: true, name: 'Yu Gothic' };
    summarySheet.getCell(`B${rowIndex}`).value = row[1];
    summarySheet.getCell(`B${rowIndex}`).font = { name: 'Yu Gothic' };
  });

  // サマリーテーブル
  summarySheet.mergeCells('A8:D8');
  summarySheet.getCell('A8').value = '比較概要';
  summarySheet.getCell('A8').font = { bold: true, size: 12, name: 'Yu Gothic' };
  summarySheet.getCell('A8').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DDEBF7' }
  };

  const summaryHeaders = [
    { header: '比較項目', key: 'category', width: 25 },
    { header: '結果', key: 'result', width: 10 },
    { header: '詳細', key: 'details', width: 50 }
  ];

  summarySheet.getRow(9).values = summaryHeaders.map(h => h.header);
  summarySheet.getRow(9).font = { bold: true, name: 'Yu Gothic' };
  summarySheet.getRow(9).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DDEBF7' }
  };

  // 概要行データの作成
  const summaryRows = [];

  // ファイル存在比較
  if (comparisonData.file_existence) {
    summaryRows.push({
      category: 'ファイル存在',
      result: '差分あり',
      details: `共通: ${comparisonData.file_existence.common_files_count}件, フォルダ1のみ: ${comparisonData.file_existence.only_in_dir1_count}件, フォルダ2のみ: ${comparisonData.file_existence.only_in_dir2_count}件`
    });
  }

  // ファイル内容比較
  if (comparisonData.file_content) {
    summaryRows.push({
      category: 'ファイル内容',
      result: comparisonData.file_content.different_files_count > 0 ? '差分あり' : '一致',
      details: `同一: ${comparisonData.file_content.identical_files_count}件, 差分あり: ${comparisonData.file_content.different_files_count}件, バイナリ: ${comparisonData.file_content.binary_files_count}件`
    });
  }

  // ファイル属性比較
  if (comparisonData.file_attributes) {
    summaryRows.push({
      category: 'ファイル属性',
      result: (
        comparisonData.file_attributes.size_diff_count > 0 ||
        comparisonData.file_attributes.timestamp_diff_count > 0 ||
        comparisonData.file_attributes.permission_diff_count > 0
      ) ? '差分あり' : '一致',
      details: `サイズ差分: ${comparisonData.file_attributes.size_diff_count}件, タイムスタンプ差分: ${comparisonData.file_attributes.timestamp_diff_count}件, 権限差分: ${comparisonData.file_attributes.permission_diff_count}件`
    });
  }

  // ディレクトリ構造比較
  if (comparisonData.directory_structure) {
    summaryRows.push({
      category: 'ディレクトリ構造',
      result: (
        comparisonData.directory_structure.only_in_dir1.length > 0 ||
        comparisonData.directory_structure.only_in_dir2.length > 0
      ) ? '差分あり' : '一致',
      details: `共通: ${comparisonData.directory_structure.common_directories.length}件, フォルダ1のみ: ${comparisonData.directory_structure.only_in_dir1.length}件, フォルダ2のみ: ${comparisonData.directory_structure.only_in_dir2.length}件`
    });
  }

  // ファイル種別比較
  if (comparisonData.file_types) {
    summaryRows.push({
      category: 'ファイル種別',
      result: comparisonData.file_types.type_diff_count > 0 ? '差分あり' : '一致',
      details: `種別差分: ${comparisonData.file_types.type_diff_count}件, 拡張子不整合: ${comparisonData.file_types.extension_mismatch_count}件`
    });
  }

  // アクセス権限比較
  if (comparisonData.permissions) {
    summaryRows.push({
      category: 'アクセス権限',
      result: (
        comparisonData.permissions.owner_diff_count > 0 ||
        comparisonData.permissions.group_diff_count > 0 ||
        comparisonData.permissions.other_diff_count > 0
      ) ? '差分あり' : '一致',
      details: `所有者権限: ${comparisonData.permissions.owner_diff_count}件, グループ権限: ${comparisonData.permissions.group_diff_count}件, その他権限: ${comparisonData.permissions.other_diff_count}件`
    });
  }

  // データの書き込み
  summaryRows.forEach((row, index) => {
    const rowIndex = 10 + index;
    summarySheet.getCell(`A${rowIndex}`).value = row.category;
    summarySheet.getCell(`A${rowIndex}`).font = { name: 'Yu Gothic' };
    summarySheet.getCell(`B${rowIndex}`).value = row.result;
    summarySheet.getCell(`B${rowIndex}`).font = { name: 'Yu Gothic' };

    // 差分ありの場合は赤色
    if (row.result === '差分あり') {
      summarySheet.getCell(`B${rowIndex}`).font = { color: { argb: 'FF0000' }, name: 'Yu Gothic' };
    } else {
      summarySheet.getCell(`B${rowIndex}`).font = { color: { argb: '008000' }, name: 'Yu Gothic' };
    }

    summarySheet.getCell(`C${rowIndex}`).value = row.details;
    summarySheet.getCell(`C${rowIndex}`).font = { name: 'Yu Gothic' };
  });

  // カラム幅の設定
  summarySheet.getColumn('A').width = 25;
  summarySheet.getColumn('B').width = 10;
  summarySheet.getColumn('C').width = 30;
  summarySheet.getColumn('D').width = 20;

  // 詳細シート: ファイル存在
  if (comparisonData.file_existence) {
    const fileExistSheet = workbook.addWorksheet('ファイル存在比較', {
      properties: { tabColor: { argb: '5B9BD5' } }
    });

    // ヘッダー
    fileExistSheet.mergeCells('A1:C1');
    fileExistSheet.getCell('A1').value = 'ファイル存在比較';
    fileExistSheet.getCell('A1').font = { bold: true, size: 14, name: 'Yu Gothic' };
    fileExistSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DDEBF7' }
    };

    // フォルダ1のみのファイル
    if (comparisonData.file_existence.only_in_dir1.length > 0) {
      fileExistSheet.mergeCells('A3:C3');
      fileExistSheet.getCell('A3').value = `${comparisonData.comparison_info.folder1} のみに存在するファイル (${comparisonData.file_existence.only_in_dir1.length}件)`;
      fileExistSheet.getCell('A3').font = { bold: true, name: 'Yu Gothic' };
      fileExistSheet.getCell('A3').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FCE4D6' }
      };

      fileExistSheet.getCell('A4').value = 'ファイルパス';
      fileExistSheet.getCell('A4').font = { bold: true, name: 'Yu Gothic' };

      comparisonData.file_existence.only_in_dir1.forEach((file, index) => {
        fileExistSheet.getCell(`A${5 + index}`).value = file;
        fileExistSheet.getCell(`A${5 + index}`).font = { name: 'Yu Gothic' };
      });
    }

    // フォルダ2のみのファイル
    const folder2StartRow = 5 + comparisonData.file_existence.only_in_dir1.length + 2;
    if (comparisonData.file_existence.only_in_dir2.length > 0) {
      fileExistSheet.mergeCells(`A${folder2StartRow}:C${folder2StartRow}`);
      fileExistSheet.getCell(`A${folder2StartRow}`).value = `${comparisonData.comparison_info.folder2} のみに存在するファイル (${comparisonData.file_existence.only_in_dir2.length}件)`;
      fileExistSheet.getCell(`A${folder2StartRow}`).font = { bold: true, name: 'Yu Gothic' };
      fileExistSheet.getCell(`A${folder2StartRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'DDEBF7' }
      };

      fileExistSheet.getCell(`A${folder2StartRow + 1}`).value = 'ファイルパス';
      fileExistSheet.getCell(`A${folder2StartRow + 1}`).font = { bold: true, name: 'Yu Gothic' };

      comparisonData.file_existence.only_in_dir2.forEach((file, index) => {
        fileExistSheet.getCell(`A${folder2StartRow + 2 + index}`).value = file;
        fileExistSheet.getCell(`A${folder2StartRow + 2 + index}`).font = { name: 'Yu Gothic' };
      });
    }

    // カラム幅の設定
    fileExistSheet.getColumn('A').width = 70;
  }

  // 詳細シート: ファイル内容
  if (comparisonData.file_content && comparisonData.file_content.different_files.length > 0) {
    const fileContentSheet = workbook.addWorksheet('ファイル内容比較', {
      properties: { tabColor: { argb: 'ED7D31' } }
    });

    // ヘッダー
    fileContentSheet.mergeCells('A1:C1');
    fileContentSheet.getCell('A1').value = 'ファイル内容比較 - 内容が異なるファイル';
    fileContentSheet.getCell('A1').font = { bold: true, size: 14, name: 'Yu Gothic' };
    fileContentSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FCE4D6' }
    };

    fileContentSheet.getCell('A3').value = 'ファイルパス';
    fileContentSheet.getCell('A3').font = { bold: true, name: 'Yu Gothic' };

    comparisonData.file_content.different_files.forEach((file, index) => {
      fileContentSheet.getCell(`A${4 + index}`).value = file;
      fileContentSheet.getCell(`A${4 + index}`).font = { name: 'Yu Gothic' };
    });

    // カラム幅の設定
    fileContentSheet.getColumn('A').width = 70;
  }

  // 詳細シート: ファイル属性
  if (comparisonData.file_attributes && comparisonData.file_attributes.attribute_details.length > 0) {
    const fileAttrSheet = workbook.addWorksheet('ファイル属性比較', {
      properties: { tabColor: { argb: 'A5A5A5' } }
    });

    // ヘッダー
    fileAttrSheet.mergeCells('A1:G1');
    fileAttrSheet.getCell('A1').value = 'ファイル属性比較';
    fileAttrSheet.getCell('A1').font = { bold: true, size: 14, name: 'Yu Gothic' };
    fileAttrSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DDEBF7' }
    };

    // カラムヘッダー
    fileAttrSheet.getRow(3).values = [
      'ファイルパス',
      'サイズ (フォルダ1)',
      'サイズ (フォルダ2)',
      'サイズ差分',
      '更新日時 (フォルダ1)',
      '更新日時 (フォルダ2)',
      '権限 (フォルダ1)',
      '権限 (フォルダ2)'
    ];
    fileAttrSheet.getRow(3).font = { bold: true, name: 'Yu Gothic' };
    fileAttrSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DDEBF7' }
    };

    // 属性データ
    comparisonData.file_attributes.attribute_details.forEach((attr, index) => {
      const rowIndex = 4 + index;
      fileAttrSheet.getCell(`A${rowIndex}`).value = attr.file;
      fileAttrSheet.getCell(`A${rowIndex}`).font = { name: 'Yu Gothic' };
      fileAttrSheet.getCell(`B${rowIndex}`).value = attr.size.folder1;
      fileAttrSheet.getCell(`C${rowIndex}`).value = attr.size.folder2;
      fileAttrSheet.getCell(`D${rowIndex}`).value = attr.size.different ? '異なる' : '一致';
      fileAttrSheet.getCell(`D${rowIndex}`).font = { name: 'Yu Gothic' };

      if (attr.size.different) {
        fileAttrSheet.getCell(`D${rowIndex}`).font = { color: { argb: 'FF0000' }, name: 'Yu Gothic' };
      }

      fileAttrSheet.getCell(`E${rowIndex}`).value = formatDateWithMs(attr.timestamp.folder1);
      fileAttrSheet.getCell(`F${rowIndex}`).value = formatDateWithMs(attr.timestamp.folder2);
      fileAttrSheet.getCell(`G${rowIndex}`).value = attr.permissions.folder1;
      fileAttrSheet.getCell(`H${rowIndex}`).value = attr.permissions.folder2;

      // 差分がある行に色付け
      if (attr.size.different || attr.timestamp.different || attr.permissions.different) {
        fileAttrSheet.getRow(rowIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2CC' }
        };
      }
    });

    // カラム幅の設定
    fileAttrSheet.getColumn('A').width = 40;
    fileAttrSheet.getColumn('B').width = 15;
    fileAttrSheet.getColumn('C').width = 15;
    fileAttrSheet.getColumn('D').width = 10;
    fileAttrSheet.getColumn('E').width = 25;
    fileAttrSheet.getColumn('F').width = 25;
    fileAttrSheet.getColumn('G').width = 10;
    fileAttrSheet.getColumn('H').width = 10;
  }

  // 詳細シート: ディレクトリ構造
  if (comparisonData.directory_structure) {
    const dirStructSheet = workbook.addWorksheet('ディレクトリ構造比較', {
      properties: { tabColor: { argb: '70AD47' } }
    });

    // ヘッダー
    dirStructSheet.mergeCells('A1:C1');
    dirStructSheet.getCell('A1').value = 'ディレクトリ構造比較';
    dirStructSheet.getCell('A1').font = { bold: true, size: 14, name: 'Yu Gothic' };
    dirStructSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DDEBF7' }
    };

    // フォルダ1のみのディレクトリ
    if (comparisonData.directory_structure.only_in_dir1.length > 0) {
      dirStructSheet.mergeCells('A3:C3');
      dirStructSheet.getCell('A3').value = `${comparisonData.comparison_info.folder1} のみに存在するディレクトリ (${comparisonData.directory_structure.only_in_dir1.length}件)`;
      dirStructSheet.getCell('A3').font = { bold: true, name: 'Yu Gothic' };
      dirStructSheet.getCell('A3').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E2EFDA' }
      };

      dirStructSheet.getCell('A4').value = 'ディレクトリパス';
      dirStructSheet.getCell('A4').font = { bold: true, name: 'Yu Gothic' };

      comparisonData.directory_structure.only_in_dir1.forEach((dir, index) => {
        dirStructSheet.getCell(`A${5 + index}`).value = dir;
        dirStructSheet.getCell(`A${5 + index}`).font = { name: 'Yu Gothic' };
      });
    }

    // フォルダ2のみのディレクトリ
    const folder2StartRow = 5 + comparisonData.directory_structure.only_in_dir1.length + 2;
    if (comparisonData.directory_structure.only_in_dir2.length > 0) {
      dirStructSheet.mergeCells(`A${folder2StartRow}:C${folder2StartRow}`);
      dirStructSheet.getCell(`A${folder2StartRow}`).value = `${comparisonData.comparison_info.folder2} のみに存在するディレクトリ (${comparisonData.directory_structure.only_in_dir2.length}件)`;
      dirStructSheet.getCell(`A${folder2StartRow}`).font = { bold: true, name: 'Yu Gothic' };
      dirStructSheet.getCell(`A${folder2StartRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E2EFDA' }
      };

      dirStructSheet.getCell(`A${folder2StartRow + 1}`).value = 'ディレクトリパス';
      dirStructSheet.getCell(`A${folder2StartRow + 1}`).font = { bold: true, name: 'Yu Gothic' };

      comparisonData.directory_structure.only_in_dir2.forEach((dir, index) => {
        dirStructSheet.getCell(`A${folder2StartRow + 2 + index}`).value = dir;
        dirStructSheet.getCell(`A${folder2StartRow + 2 + index}`).font = { name: 'Yu Gothic' };
      });
    }

    // シンボリックリンク情報
    const symlinkStartRow = folder2StartRow + comparisonData.directory_structure.only_in_dir2.length + 4;
    dirStructSheet.mergeCells(`A${symlinkStartRow}:C${symlinkStartRow}`);
    dirStructSheet.getCell(`A${symlinkStartRow}`).value = 'シンボリックリンク情報';
    dirStructSheet.getCell(`A${symlinkStartRow}`).font = { bold: true, size: 12, name: 'Yu Gothic' };
    dirStructSheet.getCell(`A${symlinkStartRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DDEBF7' }
    };

    dirStructSheet.getCell(`A${symlinkStartRow + 1}`).value = `${comparisonData.comparison_info.folder1}: ${comparisonData.directory_structure.symlinks_dir1_count}件`;
    dirStructSheet.getCell(`A${symlinkStartRow + 1}`).font = { name: 'Yu Gothic' };
    dirStructSheet.getCell(`A${symlinkStartRow + 2}`).value = `${comparisonData.comparison_info.folder2}: ${comparisonData.directory_structure.symlinks_dir2_count}件`;
    dirStructSheet.getCell(`A${symlinkStartRow + 2}`).font = { name: 'Yu Gothic' };

    // カラム幅の設定
    dirStructSheet.getColumn('A').width = 70;
  }

  // 詳細シート: ファイル種別
  if (comparisonData.file_types && comparisonData.file_types.file_types.length > 0) {
    const fileTypesSheet = workbook.addWorksheet('ファイル種別比較', {
      properties: { tabColor: { argb: 'FFC000' } }
    });

    // ヘッダー
    fileTypesSheet.mergeCells('A1:D1');
    fileTypesSheet.getCell('A1').value = 'ファイル種別比較';
    fileTypesSheet.getCell('A1').font = { bold: true, size: 14, name: 'Yu Gothic' };
    fileTypesSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DDEBF7' }
    };

    // カラムヘッダー
    fileTypesSheet.getRow(3).values = [
      'ファイルパス',
      '拡張子',
      '種別 (フォルダ1)',
      '種別 (フォルダ2)',
      '差分'
    ];
    fileTypesSheet.getRow(3).font = { bold: true, name: 'Yu Gothic' };
    fileTypesSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DDEBF7' }
    };

    // 種別が異なるファイルのみ表示
    const typeDiffFiles = comparisonData.file_types.file_types.filter(file => file.different);

    typeDiffFiles.forEach((file, index) => {
      const rowIndex = 4 + index;
      fileTypesSheet.getCell(`A${rowIndex}`).value = file.file;
      fileTypesSheet.getCell(`A${rowIndex}`).font = { name: 'Yu Gothic' };
      fileTypesSheet.getCell(`B${rowIndex}`).value = file.extension;
      fileTypesSheet.getCell(`C${rowIndex}`).value = file.type_folder1;
      fileTypesSheet.getCell(`D${rowIndex}`).value = file.type_folder2;
      fileTypesSheet.getCell(`E${rowIndex}`).value = file.different ? '異なる' : '一致';
      fileTypesSheet.getCell(`E${rowIndex}`).font = { name: 'Yu Gothic' };

      if (file.different) {
        fileTypesSheet.getCell(`E${rowIndex}`).font = { color: { argb: 'FF0000' }, name: 'Yu Gothic' };
      }
    });

    // 拡張子不整合情報
    if (comparisonData.file_types.extension_mismatch && comparisonData.file_types.extension_mismatch.length > 0) {
      const mismatchStartRow = 4 + typeDiffFiles.length + 3;

      fileTypesSheet.mergeCells(`A${mismatchStartRow}:E${mismatchStartRow}`);
      fileTypesSheet.getCell(`A${mismatchStartRow}`).value = '拡張子と実際の種別の不整合';
      fileTypesSheet.getCell(`A${mismatchStartRow}`).font = { bold: true, size: 12, name: 'Yu Gothic' };
      fileTypesSheet.getCell(`A${mismatchStartRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2CC' }
      };

      fileTypesSheet.getRow(mismatchStartRow + 1).values = [
        'ファイルパス',
        '拡張子',
        '実際の種別',
        '想定される種別'
      ];
      fileTypesSheet.getRow(mismatchStartRow + 1).font = { bold: true, name: 'Yu Gothic' };

      comparisonData.file_types.extension_mismatch.forEach((file, index) => {
        const rowIndex = mismatchStartRow + 2 + index;
        fileTypesSheet.getCell(`A${rowIndex}`).value = file.file;
        fileTypesSheet.getCell(`A${rowIndex}`).font = { name: 'Yu Gothic' };
        fileTypesSheet.getCell(`B${rowIndex}`).value = file.extension;
        fileTypesSheet.getCell(`C${rowIndex}`).value = file.actual_type;
        fileTypesSheet.getCell(`D${rowIndex}`).value = file.expected_type;
        fileTypesSheet.getCell(`D${rowIndex}`).font = { name: 'Yu Gothic' };
      });
    }

    // カラム幅の設定
    fileTypesSheet.getColumn('A').width = 40;
    fileTypesSheet.getColumn('B').width = 10;
    fileTypesSheet.getColumn('C').width = 40;
    fileTypesSheet.getColumn('D').width = 40;
    fileTypesSheet.getColumn('E').width = 10;
  }

  // 詳細シート: アクセス権限
  if (comparisonData.permissions && comparisonData.permissions.permissions_details.length > 0) {
    const permissionsSheet = workbook.addWorksheet('アクセス権限比較', {
      properties: { tabColor: { argb: '4472C4' } }
    });

    // ヘッダー
    permissionsSheet.mergeCells('A1:G1');
    permissionsSheet.getCell('A1').value = 'アクセス権限比較';
    permissionsSheet.getCell('A1').font = { bold: true, size: 14, name: 'Yu Gothic' };
    permissionsSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DDEBF7' }
    };

    // カラムヘッダー
    permissionsSheet.getRow(3).values = [
      'ファイルパス',
      'モード (フォルダ1)',
      'モード (フォルダ2)',
      '所有者 (フォルダ1)',
      '所有者 (フォルダ2)',
      'グループ (フォルダ1)',
      'グループ (フォルダ2)'
    ];
    permissionsSheet.getRow(3).font = { bold: true, name: 'Yu Gothic' };
    permissionsSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DDEBF7' }
    };

    // 権限に差分のあるファイルのみ表示
    const permDiffFiles = comparisonData.permissions.permissions_details.filter(
      perm => perm.owner_permissions.different ||
              perm.group_permissions.different ||
              perm.other_permissions.different
    );

    permDiffFiles.forEach((perm, index) => {
      const rowIndex = 4 + index;
      permissionsSheet.getCell(`A${rowIndex}`).value = perm.file;
      permissionsSheet.getCell(`A${rowIndex}`).font = { name: 'Yu Gothic' };
      permissionsSheet.getCell(`B${rowIndex}`).value = perm.numeric_mode.folder1;
      permissionsSheet.getCell(`C${rowIndex}`).value = perm.numeric_mode.folder2;
      permissionsSheet.getCell(`D${rowIndex}`).value = perm.owner.folder1;
      permissionsSheet.getCell(`E${rowIndex}`).value = perm.owner.folder2;
      permissionsSheet.getCell(`F${rowIndex}`).value = perm.group.folder1;
      permissionsSheet.getCell(`G${rowIndex}`).value = perm.group.folder2;

      // 差分がある場合はセルに色付け
      if (perm.owner_permissions.different) {
        permissionsSheet.getCell(`B${rowIndex}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCCC' }
        };
        permissionsSheet.getCell(`C${rowIndex}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCCC' }
        };
      }
    });

    // カラム幅の設定
    permissionsSheet.getColumn('A').width = 40;
    permissionsSheet.getColumn('B').width = 15;
    permissionsSheet.getColumn('C').width = 15;
    permissionsSheet.getColumn('D').width = 15;
    permissionsSheet.getColumn('E').width = 15;
    permissionsSheet.getColumn('F').width = 15;
    permissionsSheet.getColumn('G').width = 15;
  }

  // ファイルに保存
  try {
    await workbook.xlsx.writeFile(excelFilePath);
    log('info', `Excelレポートを作成しました: ${excelFilePath}`);
  } catch (err) {
    handleError('Excelファイルの書き込みに失敗しました', err);
  }
}

/**
 * PDF出力機能
 */
async function generatePDFReport() {
  log('info', 'PDFレポート生成を開始します...');

  // PDFドキュメントの作成（日本語フォント対応）
  const doc = new PDFDocument({
    margin: 30,
    size: 'A4',
    info: {
      Title: 'フォルダ比較結果レポート',
      Author: 'Excel MCP Server',
      Subject: '比較レポート'
    }
  });

  // PDFストリームの作成
  const pdfStream = fs.createWriteStream(pdfFilePath);
  doc.pipe(pdfStream);

  // タイトルとメタデータ
  doc.fontSize(24).fillColor('#0070C0').text('フォルダ比較結果レポート', { align: 'center' });
  doc.moveDown();

  // 線を引く
  doc.moveTo(30, 80)
     .lineTo(565, 80)
     .stroke();
  doc.moveDown();

  // 比較情報
  doc.fontSize(16).fillColor('#000000').text('比較情報');
  doc.moveDown(0.5);

  // メタデータテーブル
  const metaTable = {
    headers: ['項目', '内容'],
    rows: [
      ['フォルダ1', comparisonData.comparison_info.folder1],
      ['フォルダ2', comparisonData.comparison_info.folder2],
      ['比較実行日時', comparisonData.comparison_info.start_time],
      ['処理時間', comparisonData.comparison_info.duration]
    ]
  };

  doc.table(metaTable, {
    prepareHeader: () => doc.fontSize(10).fillColor('black'),
    prepareRow: (row, i) => doc.fontSize(10).fillColor('black')
  });
  doc.moveDown();

  // 比較概要
  doc.fontSize(16).text('比較概要');
  doc.moveDown(0.5);

  // 概要データの収集
  const summaryRows = [];

  // ファイル存在比較
  if (comparisonData.file_existence) {
    summaryRows.push([
      'ファイル存在',
      '差分あり',
      `共通: ${comparisonData.file_existence.common_files_count}件, ` +
      `フォルダ1のみ: ${comparisonData.file_existence.only_in_dir1_count}件, ` +
      `フォルダ2のみ: ${comparisonData.file_existence.only_in_dir2_count}件`
    ]);
  }

  // ファイル内容比較
  if (comparisonData.file_content) {
    summaryRows.push([
      'ファイル内容',
      comparisonData.file_content.different_files_count > 0 ? '差分あり' : '一致',
      `同一: ${comparisonData.file_content.identical_files_count}件, ` +
      `差分あり: ${comparisonData.file_content.different_files_count}件, ` +
      `バイナリ: ${comparisonData.file_content.binary_files_count}件`
    ]);
  }

  // ファイル属性比較
  if (comparisonData.file_attributes) {
    summaryRows.push([
      'ファイル属性',
      (
        comparisonData.file_attributes.size_diff_count > 0 ||
        comparisonData.file_attributes.timestamp_diff_count > 0 ||
        comparisonData.file_attributes.permission_diff_count > 0
      ) ? '差分あり' : '一致',
      `サイズ差分: ${comparisonData.file_attributes.size_diff_count}件, ` +
      `タイムスタンプ差分: ${comparisonData.file_attributes.timestamp_diff_count}件, ` +
      `権限差分: ${comparisonData.file_attributes.permission_diff_count}件`
    ]);
  }

  // ディレクトリ構造比較
  if (comparisonData.directory_structure) {
    summaryRows.push([
      'ディレクトリ構造',
      (
        comparisonData.directory_structure.only_in_dir1.length > 0 ||
        comparisonData.directory_structure.only_in_dir2.length > 0
      ) ? '差分あり' : '一致',
      `共通: ${comparisonData.directory_structure.common_directories.length}件, ` +
      `フォルダ1のみ: ${comparisonData.directory_structure.only_in_dir1.length}件, ` +
      `フォルダ2のみ: ${comparisonData.directory_structure.only_in_dir2.length}件`
    ]);
  }

  // ファイル種別比較
  if (comparisonData.file_types) {
    summaryRows.push([
      'ファイル種別',
      comparisonData.file_types.type_diff_count > 0 ? '差分あり' : '一致',
      `種別差分: ${comparisonData.file_types.type_diff_count}件, ` +
      `拡張子不整合: ${comparisonData.file_types.extension_mismatch_count}件`
    ]);
  }

  // アクセス権限比較
  if (comparisonData.permissions) {
    summaryRows.push([
      'アクセス権限',
      (
        comparisonData.permissions.owner_diff_count > 0 ||
        comparisonData.permissions.group_diff_count > 0 ||
        comparisonData.permissions.other_diff_count > 0
      ) ? '差分あり' : '一致',
      `所有者権限: ${comparisonData.permissions.owner_diff_count}件, ` +
      `グループ権限: ${comparisonData.permissions.group_diff_count}件, ` +
      `その他権限: ${comparisonData.permissions.other_diff_count}件`
    ]);
  }

  // 概要テーブル
  const summaryTable = {
    headers: ['比較項目', '結果', '詳細'],
    rows: summaryRows
  };

  doc.table(summaryTable, {
    prepareHeader: () => doc.fontSize(10).fillColor('black'),
    prepareRow: (row, i) => doc.fontSize(10).fillColor('black')
  });
  doc.moveDown(2);

  // 統合比較ビュー（sdiff風）を追加
  doc.addPage();
  doc.fontSize(18).fillColor('#0070C0').text('統合比較ビュー（sdiff形式）', { align: 'center' });
  doc.moveDown();

  // フォルダ情報テーブル
  const folderInfoTable = {
    headers: ['フォルダ1', '差分', 'フォルダ2'],
    rows: [
      [comparisonData.comparison_info.folder1, '', comparisonData.comparison_info.folder2]
    ]
  };

  doc.table(folderInfoTable, {
    prepareHeader: () => doc.fontSize(10).fillColor('black').font('Helvetica-Bold'),
    prepareRow: (row, i) => doc.fontSize(10).fillColor('black').font('Helvetica'),
    width: 500
  });
  doc.moveDown();

  // 差分項目の収集（共通ファイル、フォルダ1のみ、フォルダ2のみ）
  const diffItems = [];

  // 共通ファイル
  if (comparisonData.file_existence && comparisonData.file_existence.common_files) {
    comparisonData.file_content.different_files.forEach(file => {
      diffItems.push([file, '≠', file]);
    });

    comparisonData.file_content.identical_files.forEach(file => {
      diffItems.push([file, '=', file]);
    });
  }

  // フォルダ1のみのファイル
  if (comparisonData.file_existence && comparisonData.file_existence.only_in_dir1) {
    comparisonData.file_existence.only_in_dir1.forEach(file => {
      diffItems.push([file, '>', '']);
    });
  }

  // フォルダ2のみのファイル
  if (comparisonData.file_existence && comparisonData.file_existence.only_in_dir2) {
    comparisonData.file_existence.only_in_dir2.forEach(file => {
      diffItems.push(['', '<', file]);
    });
  }

  // 統合比較テーブル（表示数を制限）
  const maxDiffItemsToShow = Math.min(diffItems.length, 30);
  const diffTable = {
    headers: ['フォルダ1', '差分', 'フォルダ2'],
    rows: diffItems.slice(0, maxDiffItemsToShow)
  };

  doc.table(diffTable, {
    prepareHeader: () => doc.fontSize(10).fillColor('black').font('Helvetica-Bold'),
    prepareRow: (row, i) => doc.fontSize(9).fillColor('black').font('Helvetica'),
    width: 500
  });

  // 表示制限の注意を表示
  if (diffItems.length > maxDiffItemsToShow) {
    doc.moveDown();
    doc.fontSize(9).fillColor('#666666').text(
      `...他 ${diffItems.length - maxDiffItemsToShow} 項目（詳細はExcelレポートを参照）`
    );
  }
  doc.moveDown();

  // 詳細情報
  doc.addPage();
  doc.fontSize(18).fillColor('#0070C0').text('詳細情報', { align: 'center' });
  doc.moveDown();

  // ファイル存在の詳細
  if (comparisonData.file_existence) {
    doc.fontSize(16).fillColor('#000000').text('1. ファイル存在比較');
    doc.moveDown(0.5);

    // フォルダ1のみのファイル
    if (comparisonData.file_existence.only_in_dir1.length > 0) {
      doc.fontSize(12).fillColor('#000000')
         .text(`${comparisonData.comparison_info.folder1} のみに存在するファイル (${comparisonData.file_existence.only_in_dir1.length}件)`);
      doc.moveDown(0.5);

      // ファイル一覧（表示数を制限）
      const maxFilesToShow = Math.min(comparisonData.file_existence.only_in_dir1.length, 20);
      for (let i = 0; i < maxFilesToShow; i++) {
        doc.fontSize(10).text(`• ${comparisonData.file_existence.only_in_dir1[i]}`);
      }

      if (comparisonData.file_existence.only_in_dir1.length > maxFilesToShow) {
        doc.text(`... 他 ${comparisonData.file_existence.only_in_dir1.length - maxFilesToShow} 件`);
      }

      doc.moveDown();
    }

    // フォルダ2のみのファイル
    if (comparisonData.file_existence.only_in_dir2.length > 0) {
      doc.fontSize(12).fillColor('#000000')
         .text(`${comparisonData.comparison_info.folder2} のみに存在するファイル (${comparisonData.file_existence.only_in_dir2.length}件)`);
      doc.moveDown(0.5);

      // ファイル一覧（表示数を制限）
      const maxFilesToShow = Math.min(comparisonData.file_existence.only_in_dir2.length, 20);
      for (let i = 0; i < maxFilesToShow; i++) {
        doc.fontSize(10).text(`• ${comparisonData.file_existence.only_in_dir2[i]}`);
      }

      if (comparisonData.file_existence.only_in_dir2.length > maxFilesToShow) {
        doc.text(`... 他 ${comparisonData.file_existence.only_in_dir2.length - maxFilesToShow} 件`);
      }

      doc.moveDown();
    }
  }

  // ファイル内容の詳細
  if (comparisonData.file_content && comparisonData.file_content.different_files.length > 0) {
    doc.addPage();
    doc.fontSize(16).fillColor('#000000').text('2. ファイル内容比較');
    doc.moveDown(0.5);

    doc.fontSize(12).fillColor('#000000')
       .text(`内容が異なるファイル (${comparisonData.file_content.different_files.length}件)`);
    doc.moveDown(0.5);

    // ファイル一覧（表示数を制限）
    const maxFilesToShow = Math.min(comparisonData.file_content.different_files.length, 30);
    for (let i = 0; i < maxFilesToShow; i++) {
      doc.fontSize(10).text(`• ${comparisonData.file_content.different_files[i]}`);
    }

    if (comparisonData.file_content.different_files.length > maxFilesToShow) {
      doc.text(`... 他 ${comparisonData.file_content.different_files.length - maxFilesToShow} 件`);
    }

    doc.moveDown();
  }

  // ディレクトリ構造の詳細
  if (comparisonData.directory_structure) {
    doc.addPage();
    doc.fontSize(16).fillColor('#000000').text('3. ディレクトリ構造比較');
    doc.moveDown(0.5);

    // フォルダ1のみのディレクトリ
    if (comparisonData.directory_structure.only_in_dir1.length > 0) {
      doc.fontSize(12).fillColor('#000000')
         .text(`${comparisonData.comparison_info.folder1} のみに存在するディレクトリ (${comparisonData.directory_structure.only_in_dir1.length}件)`);
      doc.moveDown(0.5);

      // ディレクトリ一覧（表示数を制限）
      const maxDirsToShow = Math.min(comparisonData.directory_structure.only_in_dir1.length, 20);
      for (let i = 0; i < maxDirsToShow; i++) {
        doc.fontSize(10).text(`• ${comparisonData.directory_structure.only_in_dir1_dirs[i]}`);
      }

      if (comparisonData.directory_structure.only_in_dir1.length > maxDirsToShow) {
        doc.text(`... 他 ${comparisonData.directory_structure.only_in_dir1.length - maxDirsToShow} 件`);
      }

      doc.moveDown();
    }

    // フォルダ2のみのディレクトリ
    if (comparisonData.directory_structure.only_in_dir2.length > 0) {
      doc.fontSize(12).fillColor('#000000')
         .text(`${comparisonData.comparison_info.folder2} のみに存在するディレクトリ (${comparisonData.directory_structure.only_in_dir2.length}件)`);
      doc.moveDown(0.5);

      // ディレクトリ一覧（表示数を制限）
      const maxDirsToShow = Math.min(comparisonData.directory_structure.only_in_dir2.length, 20);
      for (let i = 0; i < maxDirsToShow; i++) {
        doc.fontSize(10).text(`• ${comparisonData.directory_structure.only_in_dir2[i]}`);
      }

      if (comparisonData.directory_structure.only_in_dir2.length > maxDirsToShow) {
        doc.text(`... 他 ${comparisonData.directory_structure.only_in_dir2.length - maxDirsToShow} 件`);
      }

      doc.moveDown();
    }
  }

  // 生成日時を入れてフッター
  doc.fontSize(10).fillColor('#666666').text(
    `レポート生成日時: ${new Date().toLocaleString('ja-JP')}`,
    { align: 'center' }
  );

  // ドキュメントを完了
  doc.end();

  // ストリーム終了を待つ
  return new Promise((resolve, reject) => {
    pdfStream.on('finish', () => {
      log('info', `PDFレポートを作成しました: ${pdfFilePath}`);
      resolve();
    });
    pdfStream.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * メイン処理
 */
async function main() {
  try {
    // Excel出力
    if (config.output_options.generate_excel) {
      await generateExcelReport();
    }

    // PDF出力
    if (config.output_options.generate_pdf) {
      await generatePDFReport();
    }

    // 完了メッセージ
    console.log('\n比較レポート生成が完了しました。');
    console.log(`Excelレポート: ${excelFilePath}`);
    console.log(`PDFレポート: ${pdfFilePath}`);
    console.log(`ログファイル: ${logFilePath}`);

  } catch (err) {
    handleError('レポート生成中にエラーが発生しました', err);
  }
}

// プログラム実行
main();