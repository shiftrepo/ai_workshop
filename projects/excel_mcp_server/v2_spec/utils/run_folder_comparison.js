const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// このスクリプトが置かれているディレクトリを基準に相対パスを解決
const rootDir = path.resolve(__dirname, '..');

/**
 * フォルダ比較を実行し、レポートを生成する
 * @param {string} folder1Path - 比較対象フォルダ1のパス
 * @param {string} folder2Path - 比較対象フォルダ2のパス
 */
function runFolderComparison(folder1Path, folder2Path) {
  try {
    // 絶対パスに変換
    const absFolder1 = path.isAbsolute(folder1Path) ? folder1Path : path.resolve(process.cwd(), folder1Path);
    const absFolder2 = path.isAbsolute(folder2Path) ? folder2Path : path.resolve(process.cwd(), folder2Path);

    console.log(`フォルダ比較を実行します:
- フォルダ1: ${absFolder1}
- フォルダ2: ${absFolder2}
`);

    // 1. 比較データ生成
    console.log('1. 比較データを生成しています...');
    const generateComparisonScript = path.join(rootDir, 'generate_comparison_data.js');

    // スクリプトの存在確認
    if (!fs.existsSync(generateComparisonScript)) {
      throw new Error(`比較データ生成スクリプトが見つかりません: ${generateComparisonScript}`);
    }

    // 比較データ生成実行
    const compareOutput = execSync(
      `node "${generateComparisonScript}" "${absFolder1}" "${absFolder2}"`,
      { cwd: rootDir }
    ).toString();
    console.log(compareOutput);

    // 2. レポート生成
    console.log('2. レポートを生成しています...');
    const generateReportScript = path.join(rootDir, 'generate_report.js');

    // スクリプトの存在確認
    if (!fs.existsSync(generateReportScript)) {
      throw new Error(`レポート生成スクリプトが見つかりません: ${generateReportScript}`);
    }

    // レポート生成実行
    const reportOutput = execSync(
      `node "${generateReportScript}"`,
      { cwd: rootDir }
    ).toString();
    console.log(reportOutput);

    // 3. 完了メッセージ
    const outputDir = path.join(rootDir, 'output');
    const excelPath = path.join(outputDir, 'comparison_result.xlsx');
    const pdfPath = path.join(outputDir, 'comparison_report.pdf');

    console.log(`
フォルダ比較が完了しました！

出力ファイル:
- Excel: ${excelPath}
- PDF:   ${pdfPath}
`);

  } catch (error) {
    console.error(`エラー: フォルダ比較の実行中にエラーが発生しました:`, error.message);
    process.exit(1);
  }
}

// コマンドライン引数の処理
function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.log(`
使用方法: node run_folder_comparison.js <フォルダ1のパス> <フォルダ2のパス>

例:
node run_folder_comparison.js ./test_folder1 ./test_folder2
`);
    process.exit(1);
  }

  const folder1 = args[0];
  const folder2 = args[1];

  runFolderComparison(folder1, folder2);
}

main();