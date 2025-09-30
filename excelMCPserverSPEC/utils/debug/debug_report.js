const fs = require('fs');
const path = require('path');

// パスの調整: 現在の実行パスに関係なく正しくファイルを見つけられるようにする
const rootDir = path.resolve(__dirname, '../..');
const jsonFilePath = path.join(rootDir, 'output', 'comparison_data.json');

try {
  console.log(`JSON data path: ${jsonFilePath}`);
  console.log(`Current directory: ${process.cwd()}`);

  // JSONデータの読み込み
  const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
  const comparisonData = JSON.parse(jsonData);

  // 基本構造の確認
  console.log('\n== Basic Structure Check ==');
  console.log('comparison_info exists:', !!comparisonData.comparison_info);
  console.log('file_existence exists:', !!comparisonData.file_existence);
  console.log('file_content exists:', !!comparisonData.file_content);
  console.log('file_attributes exists:', !!comparisonData.file_attributes);
  console.log('directory_structure exists:', !!comparisonData.directory_structure);
  console.log('permissions exists:', !!comparisonData.permissions);

  // file_existence詳細
  console.log('\n== file_existence Details ==');
  console.log('only_in_dir1 exists:', !!comparisonData.file_existence.only_in_dir1);
  console.log('only_in_dir1 is array:', Array.isArray(comparisonData.file_existence.only_in_dir1));
  console.log('only_in_dir1 length:', comparisonData.file_existence.only_in_dir1?.length);

  console.log('only_in_dir2 exists:', !!comparisonData.file_existence.only_in_dir2);
  console.log('only_in_dir2 is array:', Array.isArray(comparisonData.file_existence.only_in_dir2));
  console.log('only_in_dir2 length:', comparisonData.file_existence.only_in_dir2?.length);

  console.log('common_files exists:', !!comparisonData.file_existence.common_files);
  console.log('common_files is array:', Array.isArray(comparisonData.file_existence.common_files));
  console.log('common_files length:', comparisonData.file_existence.common_files?.length);

  // file_content詳細
  console.log('\n== file_content Details ==');
  console.log('identical_files exists:', !!comparisonData.file_content.identical_files);
  console.log('identical_files is array:', Array.isArray(comparisonData.file_content.identical_files));
  console.log('identical_files length:', comparisonData.file_content.identical_files?.length);

  console.log('different_files exists:', !!comparisonData.file_content.different_files);
  console.log('different_files is array:', Array.isArray(comparisonData.file_content.different_files));
  console.log('different_files length:', comparisonData.file_content.different_files?.length);

  // directory_structure詳細
  console.log('\n== directory_structure Details ==');
  console.log('common_directories exists:', !!comparisonData.directory_structure.common_directories);
  console.log('common_directories is array:', Array.isArray(comparisonData.directory_structure.common_directories));
  console.log('common_directories length:', comparisonData.directory_structure.common_directories?.length);

  console.log('only_in_dir1 exists:', !!comparisonData.directory_structure.only_in_dir1);
  console.log('only_in_dir1 is array:', Array.isArray(comparisonData.directory_structure.only_in_dir1));
  console.log('only_in_dir1 length:', comparisonData.directory_structure.only_in_dir1?.length);

  // permissions詳細
  console.log('\n== permissions Details ==');
  console.log('permissions_details exists:', !!comparisonData.permissions?.permissions_details);
  console.log('permissions_details is array:', Array.isArray(comparisonData.permissions?.permissions_details));
  console.log('permissions_details length:', comparisonData.permissions?.permissions_details?.length);

  console.log('owner_diff_count:', comparisonData.permissions?.owner_diff_count);
  console.log('group_diff_count:', comparisonData.permissions?.group_diff_count);
  console.log('other_diff_count:', comparisonData.permissions?.other_diff_count);

} catch (err) {
  console.error('Error examining comparison data:', err);
}