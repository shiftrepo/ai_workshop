const fs = require('fs');
const path = require('path');

const jsonFilePath = path.join(__dirname, 'output', 'comparison_data.json');

try {
  // JSONデータの読み込み
  const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
  const comparisonData = JSON.parse(jsonData);

  // 基本構造の確認
  console.log('== Basic Structure Check ==');
  console.log('comparison_info exists:', !!comparisonData.comparison_info);
  console.log('file_existence exists:', !!comparisonData.file_existence);
  console.log('file_content exists:', !!comparisonData.file_content);
  console.log('file_attributes exists:', !!comparisonData.file_attributes);
  console.log('directory_structure exists:', !!comparisonData.directory_structure);

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

  // generate_reportのチェック
  console.log('\n== generate_report.js Specific Checks ==');
  console.log('file_content.different_files.includes exists:', typeof comparisonData.file_content.different_files.includes === 'function');

  const testFile = comparisonData.file_existence.common_files[0];
  console.log(`Test with file: ${testFile}`);
  console.log('Is in different_files:', comparisonData.file_content.different_files.includes(testFile));

  // file_attributesのチェック
  console.log('\n== file_attributes Details ==');
  console.log('attribute_details exists:', !!comparisonData.file_attributes.attribute_details);
  console.log('attribute_details is array:', Array.isArray(comparisonData.file_attributes.attribute_details));
  console.log('attribute_details length:', comparisonData.file_attributes.attribute_details?.length);

} catch (err) {
  console.error('Error examining comparison data:', err);
}