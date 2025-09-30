const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const jsonFilePath = path.join(__dirname, 'output', 'comparison_data.json');

// 問題の特定のセクションをシミュレート
function simulateSection() {
  try {
    console.log('Loading comparison data...');
    const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
    const comparisonData = JSON.parse(jsonData);

    // エラーの起きている可能性がある箇所をチェック
    console.log('\n== Checking specific sections ==');

    // セクション1: file_existence.common_files.forEach
    try {
      console.log('\nSection 1: file_existence.common_files.forEach');
      if (comparisonData.file_existence && comparisonData.file_existence.common_files) {
        comparisonData.file_existence.common_files.forEach(file => {
          console.log(`Processing file: ${file}`);
        });
        console.log('Section 1 passed successfully');
      } else {
        console.log('Section 1 skipped due to missing properties');
      }
    } catch (err) {
      console.error('Error in Section 1:', err);
    }

    // セクション2: directory_structure.common_directories.forEach
    try {
      console.log('\nSection 2: directory_structure.common_directories.forEach');
      if (comparisonData.directory_structure && comparisonData.directory_structure.common_directories) {
        comparisonData.directory_structure.common_directories.forEach(dir => {
          console.log(`Processing directory: ${dir}`);
        });
        console.log('Section 2 passed successfully');
      } else {
        console.log('Section 2 skipped due to missing properties');
      }
    } catch (err) {
      console.error('Error in Section 2:', err);
    }

    // セクション3: file_attributes.attribute_details
    try {
      console.log('\nSection 3: file_attributes.attribute_details access');
      if (comparisonData.file_attributes && comparisonData.file_attributes.attribute_details) {
        console.log(`attribute_details count: ${comparisonData.file_attributes.attribute_details.length}`);
        console.log('Section 3 passed successfully');
      } else {
        console.log('Section 3 skipped due to missing properties');
      }
    } catch (err) {
      console.error('Error in Section 3:', err);
    }

    // セクション4: permissions の確認
    try {
      console.log('\nSection 4: permissions property check');
      if (comparisonData.permissions) {
        console.log('permissions property exists');
        console.log('Section 4 passed successfully');
      } else {
        console.log('permissions property does not exist, which may be causing the error');
      }
    } catch (err) {
      console.error('Error in Section 4:', err);
    }

    // セクション5: generate_report.js の実行セクションをチェック
    try {
      console.log('\nSection 5: Check unifiedComparisonSheet process');
      let allItems = new Map(); // パスをキーに、比較データを保存

      console.log('Simulating the Map building process...');

      // 共通ファイル
      if (comparisonData.file_existence && comparisonData.file_existence.common_files) {
        comparisonData.file_existence.common_files.forEach(file => {
          let status = '一致';
          let contentInfo = '内容一致';

          // ファイルの実際のパス
          const filePath1 = path.join(comparisonData.comparison_info.folder1, file);
          const filePath2 = path.join(comparisonData.comparison_info.folder2, file);

          allItems.set(file, {
            path: file,
            folder1: {
              exists: true,
              fullPath: filePath1,
              permissions: 'rwxr-xr-x', // ダミーデータ
              owner: 'user',
              timestamp: '2023-01-01 00:00:00',
              checksum: 'abc123'
            },
            folder2: {
              exists: true,
              fullPath: filePath2,
              permissions: 'rwxr-xr-x',
              owner: 'user',
              timestamp: '2023-01-01 00:00:00',
              checksum: 'abc123'
            },
            status: status,
            checksumStatus: '一致',
            contentInfo: contentInfo
          });
        });
      }

      // フォルダ1のみのファイル
      if (comparisonData.file_existence && comparisonData.file_existence.only_in_dir1) {
        comparisonData.file_existence.only_in_dir1.forEach(file => {
          const filePath1 = path.join(comparisonData.comparison_info.folder1, file);

          allItems.set(file, {
            path: file,
            folder1: {
              exists: true,
              fullPath: filePath1,
              permissions: 'rwxr-xr-x',
              owner: 'user',
              timestamp: '2023-01-01 00:00:00',
              checksum: 'abc123'
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
          const filePath2 = path.join(comparisonData.comparison_info.folder2, file);

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
              permissions: 'rwxr-xr-x',
              owner: 'user',
              timestamp: '2023-01-01 00:00:00',
              checksum: 'abc123'
            },
            status: 'フォルダ2のみ',
            checksumStatus: '',
            contentInfo: ''
          });
        });
      }

      console.log(`Total items in map: ${allItems.size}`);
      console.log('Section 5 passed successfully');
    } catch (err) {
      console.error('Error in Section 5:', err);
    }

  } catch (err) {
    console.error('Error loading or processing comparison data:', err);
  }
}

simulateSection();