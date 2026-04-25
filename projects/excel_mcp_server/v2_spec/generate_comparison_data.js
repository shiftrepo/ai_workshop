const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const folder1 = process.argv[2] || './test_folder1';
const folder2 = process.argv[3] || './test_folder2';

// ファイル一覧を再帰的に取得
function getAllFiles(dir, baseDir = dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(filePath, baseDir));
      } else {
        const relativePath = path.relative(baseDir, filePath);
        results.push(relativePath);
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  return results;
}

// MD5チェックサム計算
function calculateChecksum(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (err) {
    return null;
  }
}

// ファイル情報を取得
function getFileInfo(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return {
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      mode: stat.mode
    };
  } catch (err) {
    return null;
  }
}

console.log(`[INFO] フォルダ1: ${folder1}`);
console.log(`[INFO] フォルダ2: ${folder2}`);

// ファイル一覧取得
const files1 = getAllFiles(folder1);
const files2 = getAllFiles(folder2);

console.log(`[INFO] フォルダ1のファイル数: ${files1.length}`);
console.log(`[INFO] フォルダ2のファイル数: ${files2.length}`);

// 共通ファイルと差分を計算
const files1Set = new Set(files1);
const files2Set = new Set(files2);

const onlyInDir1 = files1.filter(f => !files2Set.has(f));
const onlyInDir2 = files2.filter(f => !files1Set.has(f));
const commonFiles = files1.filter(f => files2Set.has(f));

console.log(`[INFO] 共通ファイル: ${commonFiles.length}`);
console.log(`[INFO] フォルダ1のみ: ${onlyInDir1.length}`);
console.log(`[INFO] フォルダ2のみ: ${onlyInDir2.length}`);

// ファイル内容比較
const identicalFiles = [];
const differentFiles = [];

commonFiles.forEach(file => {
  const filePath1 = path.join(folder1, file);
  const filePath2 = path.join(folder2, file);

  const checksum1 = calculateChecksum(filePath1);
  const checksum2 = calculateChecksum(filePath2);

  if (checksum1 === checksum2) {
    identicalFiles.push({
      file: file,
      checksum: checksum1
    });
  } else {
    differentFiles.push({
      file: file,
      checksum_folder1: checksum1,
      checksum_folder2: checksum2
    });
  }
});

// 属性詳細
const attributeDetails = [];

commonFiles.forEach(file => {
  const filePath1 = path.join(folder1, file);
  const filePath2 = path.join(folder2, file);

  const info1 = getFileInfo(filePath1);
  const info2 = getFileInfo(filePath2);

  if (info1 && info2) {
    attributeDetails.push({
      file: file,
      size: {
        folder1: info1.size,
        folder2: info2.size,
        different: info1.size !== info2.size
      },
      timestamp: {
        folder1: info1.mtime,
        folder2: info2.mtime,
        different: info1.mtime !== info2.mtime
      },
      permissions: {
        folder1: info1.mode,
        folder2: info2.mode,
        different: info1.mode !== info2.mode
      }
    });
  }
});

// ディレクトリ構造
function getAllDirs(dir, baseDir = dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      if (stat && stat.isDirectory()) {
        const relativePath = path.relative(baseDir, itemPath);
        results.push(relativePath);
        results = results.concat(getAllDirs(itemPath, baseDir));
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  return results;
}

const dirs1 = getAllDirs(folder1);
const dirs2 = getAllDirs(folder2);

const dirs1Set = new Set(dirs1);
const dirs2Set = new Set(dirs2);

const dirsOnlyInDir1 = dirs1.filter(d => !dirs2Set.has(d));
const dirsOnlyInDir2 = dirs2.filter(d => !dirs1Set.has(d));
const commonDirs = dirs1.filter(d => dirs2Set.has(d));

// パーミッション情報の計算
const permissionsDetails = [];
let ownerDiffCount = 0;
let groupDiffCount = 0;
let otherDiffCount = 0;
const ownerDiffFiles = [];
const groupDiffFiles = [];
const otherDiffFiles = [];

// 共通ファイルのパーミッション詳細情報を生成
commonFiles.forEach(file => {
  const filePath1 = path.join(folder1, file);
  const filePath2 = path.join(folder2, file);

  const info1 = getFileInfo(filePath1);
  const info2 = getFileInfo(filePath2);

  if (info1 && info2) {
    // 所有者権限の比較 (0o700 / 448)
    const owner1 = (info1.mode & 0o700) >> 6;
    const owner2 = (info2.mode & 0o700) >> 6;
    const ownerDiff = owner1 !== owner2;

    // グループ権限の比較 (0o070 / 56)
    const group1 = (info1.mode & 0o070) >> 3;
    const group2 = (info2.mode & 0o070) >> 3;
    const groupDiff = group1 !== group2;

    // その他権限の比較 (0o007 / 7)
    const other1 = (info1.mode & 0o007);
    const other2 = (info2.mode & 0o007);
    const otherDiff = other1 !== other2;

    // 差分カウンター更新
    if (ownerDiff) {
      ownerDiffCount++;
      ownerDiffFiles.push(file);
    }
    if (groupDiff) {
      groupDiffCount++;
      groupDiffFiles.push(file);
    }
    if (otherDiff) {
      otherDiffCount++;
      otherDiffFiles.push(file);
    }

    // 詳細情報格納
    if (ownerDiff || groupDiff || otherDiff) {
      permissionsDetails.push({
        file: file,
        numeric_mode: {
          folder1: info1.mode,
          folder2: info2.mode
        },
        owner: {
          folder1: '', // lsコマンドから取得する場合はここを設定
          folder2: ''
        },
        group: {
          folder1: '', // lsコマンドから取得する場合はここを設定
          folder2: ''
        },
        owner_permissions: {
          folder1: owner1,
          folder2: owner2,
          different: ownerDiff
        },
        group_permissions: {
          folder1: group1,
          folder2: group2,
          different: groupDiff
        },
        other_permissions: {
          folder1: other1,
          folder2: other2,
          different: otherDiff
        }
      });
    }
  }
});

// 比較データ作成
const comparisonData = {
  comparison_info: {
    folder1: folder1,
    folder2: folder2,
    timestamp: new Date().toISOString()
  },
  file_existence: {
    only_in_dir1: onlyInDir1,
    only_in_dir2: onlyInDir2,
    common_files: commonFiles
  },
  file_content: {
    identical_files: identicalFiles,
    different_files: differentFiles
  },
  file_attributes: {
    attribute_details: attributeDetails
  },
  directory_structure: {
    only_in_dir1: dirsOnlyInDir1,
    only_in_dir2: dirsOnlyInDir2,
    common_directories: commonDirs
  },
  permissions: {
    owner_diff_count: ownerDiffCount,
    group_diff_count: groupDiffCount,
    other_diff_count: otherDiffCount,
    owner_diff_files: ownerDiffFiles,
    group_diff_files: groupDiffFiles,
    other_diff_files: otherDiffFiles,
    permissions_details: permissionsDetails
  }
};

// JSON出力
const outputPath = './output/comparison_data.json';
fs.mkdirSync('./output', { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(comparisonData, null, 2));

console.log(`[完了] 比較データを生成しました: ${outputPath}`);
console.log(`[INFO] 同一ファイル: ${identicalFiles.length}`);
console.log(`[INFO] 差分ファイル: ${differentFiles.length}`);
