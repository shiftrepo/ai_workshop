// Script to analyze the Excel report and check if requirements are met
const Excel = require('exceljs');
const fs = require('fs');

async function analyzeReport(filePath) {
  console.log(`\n=== ANALYZING: ${filePath} ===\n`);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filePath);

  // Analyze each worksheet
  workbook.eachSheet((worksheet, sheetId) => {
    console.log(`\n📋 WORKSHEET: ${worksheet.name}`);
    console.log(`   Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);

    if (worksheet.name === 'All Items') {
      analyzeMainSheet(worksheet);
    } else if (worksheet.name === 'Differences') {
      analyzeDifferencesSheet(worksheet);
    } else if (worksheet.name === 'Summary') {
      analyzeSummarySheet(worksheet);
    }
  });
}

function analyzeMainSheet(worksheet) {
  console.log('\n🔍 ANALYZING MAIN SHEET (All Items):');

  let permissionsInRwxFormat = 0;
  let ownersAsText = 0;
  let groupsAsText = 0;
  let contentMatchTexts = 0;
  let totalDataRows = 0;
  let coloredRows = 0;

  // Check headers first
  const headers = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value;
  });

  console.log('   Headers:', headers.filter(h => h).join(', '));

  // Analyze data rows (skip header)
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);

    // Skip empty rows
    if (!row.getCell(1).value) continue;

    totalDataRows++;

    // Check permissions format (columns L and M - permissions)
    const perm1 = row.getCell(12).value; // permissionsDir1
    const perm2 = row.getCell(13).value; // permissionsDir2

    if (perm1 && typeof perm1 === 'string' && (perm1.match(/^[dl-][rwx-]{9}$/))) {
      permissionsInRwxFormat++;
    }
    if (perm2 && typeof perm2 === 'string' && (perm2.match(/^[dl-][rwx-]{9}$/))) {
      permissionsInRwxFormat++;
    }

    // Check owner format (columns H and I - owner)
    const owner1 = row.getCell(8).value; // ownerDir1
    const owner2 = row.getCell(9).value; // ownerDir2

    if (owner1 && typeof owner1 === 'string' && isNaN(owner1)) {
      ownersAsText++;
    }
    if (owner2 && typeof owner2 === 'string' && isNaN(owner2)) {
      ownersAsText++;
    }

    // Check group format (columns J and K - group)
    const group1 = row.getCell(10).value; // groupDir1
    const group2 = row.getCell(11).value; // groupDir2

    if (group1 && typeof group1 === 'string' && isNaN(group1)) {
      groupsAsText++;
    }
    if (group2 && typeof group2 === 'string' && isNaN(group2)) {
      groupsAsText++;
    }

    // Check content match text (column P - contentMatch)
    const contentMatch = row.getCell(16).value; // contentMatch
    if (contentMatch && ['はい', 'いいえ', '適用外'].includes(contentMatch)) {
      contentMatchTexts++;
    }

    // Check if row has background color (highlighting)
    const firstCell = row.getCell(1);
    if (firstCell.fill && firstCell.fill.fgColor && firstCell.fill.fgColor.argb !== 'FFFFFFFF') {
      coloredRows++;
    }
  }

  // Report findings
  console.log(`\n   📊 DATA ANALYSIS (${totalDataRows} data rows):`);
  console.log(`   ✅ Permissions in rwx format: ${permissionsInRwxFormat} entries`);
  console.log(`   ✅ Owner info as text: ${ownersAsText} entries`);
  console.log(`   ✅ Group info as text: ${groupsAsText} entries`);
  console.log(`   ✅ Content match clear text: ${contentMatchTexts} entries`);
  console.log(`   🎨 Rows with highlighting: ${coloredRows} out of ${totalDataRows}`);

  // Sample some data
  console.log('\n   📝 SAMPLE DATA (first 3 data rows):');
  for (let rowNum = 2; rowNum <= Math.min(4, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    if (!row.getCell(1).value) continue;

    console.log(`     Row ${rowNum}:`);
    console.log(`       Status: ${row.getCell(1).value}`);
    console.log(`       Path: ${row.getCell(2).value}`);
    console.log(`       Permissions Dir1: ${row.getCell(12).value}`);
    console.log(`       Permissions Dir2: ${row.getCell(13).value}`);
    console.log(`       Owner Dir1: ${row.getCell(8).value}`);
    console.log(`       Owner Dir2: ${row.getCell(9).value}`);
    console.log(`       Group Dir1: ${row.getCell(10).value}`);
    console.log(`       Group Dir2: ${row.getCell(11).value}`);
    console.log(`       Content Match: ${row.getCell(16).value}`);

    // Check cell background color
    const bgColor = row.getCell(1).fill?.fgColor?.argb;
    console.log(`       Background: ${bgColor || 'No color'}`);
    console.log('');
  }
}

function analyzeDifferencesSheet(worksheet) {
  console.log('\n🔍 ANALYZING DIFFERENCES SHEET:');

  let coloredDifferences = 0;
  let totalDifferenceRows = 0;

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    if (!row.getCell(1).value) continue;

    totalDifferenceRows++;

    // Check if row has background color
    const firstCell = row.getCell(1);
    if (firstCell.fill && firstCell.fill.fgColor && firstCell.fill.fgColor.argb !== 'FFFFFFFF') {
      coloredDifferences++;
    }
  }

  console.log(`   📊 Total difference entries: ${totalDifferenceRows}`);
  console.log(`   🎨 Colored difference entries: ${coloredDifferences}`);
}

function analyzeSummarySheet(worksheet) {
  console.log('\n🔍 ANALYZING SUMMARY SHEET:');

  for (let rowNum = 1; rowNum <= Math.min(10, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum);
    const metric = row.getCell(1).value;
    const count = row.getCell(2).value;

    if (metric && count !== null && count !== undefined) {
      console.log(`   ${metric}: ${count}`);
    }
  }
}

// Main execution
const reportFile = process.argv[2] || 'comparison_report.xlsx';
analyzeReport(reportFile).catch(console.error);