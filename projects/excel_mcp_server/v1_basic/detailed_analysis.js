// Detailed analysis script focusing on the specific requirements
const Excel = require('exceljs');
const fs = require('fs');

async function detailedAnalysis(filePath) {
  console.log(`\n🔬 DETAILED ANALYSIS: ${filePath}`);
  console.log('========================================\n');

  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filePath);

  const mainSheet = workbook.getWorksheet('All Items');
  const differencesSheet = workbook.getWorksheet('Differences');

  // Requirement 1: File and directory permissions in rwx format
  console.log('1️⃣  PERMISSIONS FORMAT CHECK:');
  analyzePermissions(mainSheet);

  // Requirement 2: Owner and group as text strings
  console.log('\n2️⃣  OWNER/GROUP FORMAT CHECK:');
  analyzeOwnerGroup(mainSheet);

  // Requirement 3: Differences highlighting
  console.log('\n3️⃣  DIFFERENCES HIGHLIGHTING CHECK:');
  analyzeDifferencesHighlighting(mainSheet);

  // Requirement 4: Different colored highlighting for different types
  console.log('\n4️⃣  COLOR CODING CHECK:');
  analyzeColorCoding(mainSheet, differencesSheet);

  // Requirement 5: Content match column
  console.log('\n5️⃣  CONTENT MATCH TEXT CHECK:');
  analyzeContentMatch(mainSheet);
}

function analyzePermissions(worksheet) {
  const permissionsData = [];

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    if (!row.getCell(1).value) continue;

    const path = row.getCell(2).value;
    const type = row.getCell(3).value;
    const perm1 = row.getCell(12).value;
    const perm2 = row.getCell(13).value;

    permissionsData.push({
      path, type, perm1, perm2,
      perm1Valid: perm1 && typeof perm1 === 'string' && /^[dl-][rwx-]{9}$/.test(perm1),
      perm2Valid: perm2 && typeof perm2 === 'string' && /^[dl-][rwx-]{9}$/.test(perm2)
    });
  }

  const validCount = permissionsData.reduce((count, item) => {
    return count + (item.perm1Valid ? 1 : 0) + (item.perm2Valid ? 1 : 0);
  }, 0);

  const totalCount = permissionsData.reduce((count, item) => {
    return count + (item.perm1 ? 1 : 0) + (item.perm2 ? 1 : 0);
  }, 0);

  console.log(`   ✅ Valid rwx format: ${validCount}/${totalCount} entries`);
  console.log(`   📁 Sample directory permissions: ${permissionsData.find(p => p.type === 'directory')?.perm1 || 'N/A'}`);
  console.log(`   📄 Sample file permissions: ${permissionsData.find(p => p.type === 'file')?.perm1 || 'N/A'}`);

  // Show any invalid formats
  const invalid = permissionsData.filter(p =>
    (p.perm1 && !p.perm1Valid) || (p.perm2 && !p.perm2Valid)
  );
  if (invalid.length > 0) {
    console.log(`   ❌ Invalid formats found in ${invalid.length} items:`);
    invalid.slice(0, 3).forEach(item => {
      console.log(`      ${item.path}: "${item.perm1}" / "${item.perm2}"`);
    });
  }
}

function analyzeOwnerGroup(worksheet) {
  const ownerGroupData = [];

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    if (!row.getCell(1).value) continue;

    const path = row.getCell(2).value;
    const owner1 = row.getCell(8).value;
    const owner2 = row.getCell(9).value;
    const group1 = row.getCell(10).value;
    const group2 = row.getCell(11).value;

    ownerGroupData.push({
      path, owner1, owner2, group1, group2,
      owner1IsText: owner1 && typeof owner1 === 'string' && isNaN(owner1),
      owner2IsText: owner2 && typeof owner2 === 'string' && isNaN(owner2),
      group1IsText: group1 && typeof group1 === 'string' && isNaN(group1),
      group2IsText: group2 && typeof group2 === 'string' && isNaN(group2)
    });
  }

  const ownerTextCount = ownerGroupData.reduce((count, item) => {
    return count + (item.owner1IsText ? 1 : 0) + (item.owner2IsText ? 1 : 0);
  }, 0);

  const groupTextCount = ownerGroupData.reduce((count, item) => {
    return count + (item.group1IsText ? 1 : 0) + (item.group2IsText ? 1 : 0);
  }, 0);

  const totalOwners = ownerGroupData.reduce((count, item) => {
    return count + (item.owner1 ? 1 : 0) + (item.owner2 ? 1 : 0);
  }, 0);

  const totalGroups = ownerGroupData.reduce((count, item) => {
    return count + (item.group1 ? 1 : 0) + (item.group2 ? 1 : 0);
  }, 0);

  console.log(`   👤 Owner as text: ${ownerTextCount}/${totalOwners} entries`);
  console.log(`   🔐 Group as text: ${groupTextCount}/${totalGroups} entries`);

  // Show samples
  const sampleItem = ownerGroupData[0];
  if (sampleItem) {
    console.log(`   📝 Sample owner: "${sampleItem.owner1}" / "${sampleItem.owner2}"`);
    console.log(`   📝 Sample group: "${sampleItem.group1}" / "${sampleItem.group2}"`);
  }

  // Identify numeric vs text
  const numericOwners = ownerGroupData.filter(item =>
    (item.owner1 && !item.owner1IsText) || (item.owner2 && !item.owner2IsText)
  ).length;
  const numericGroups = ownerGroupData.filter(item =>
    (item.group1 && !item.group1IsText) || (item.group2 && !item.group2IsText)
  ).length;

  if (numericOwners > 0) {
    console.log(`   ⚠️  ${numericOwners} items have numeric owner IDs`);
  }
  if (numericGroups > 0) {
    console.log(`   ⚠️  ${numericGroups} items have numeric group IDs`);
  }
}

function analyzeDifferencesHighlighting(worksheet) {
  let totalDifferent = 0;
  let highlightedDifferent = 0;
  let specificHighlights = {
    permissions: 0,
    owner: 0,
    group: 0,
    size: 0,
    modTime: 0,
    content: 0
  };

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const status = row.getCell(1).value;

    if (status === '相違あり') {
      totalDifferent++;

      // Check if row has highlighting
      const firstCell = row.getCell(1);
      if (firstCell.fill && firstCell.fill.fgColor && firstCell.fill.fgColor.argb !== 'FFFFFFFF') {
        highlightedDifferent++;
      }

      // Check for specific difference highlighting
      const differences = row.getCell(17).value; // Differences column
      if (differences && typeof differences === 'string') {
        if (differences.includes('permissions')) {
          // Check if permissions columns are highlighted
          const perm1Cell = row.getCell(12);
          const perm2Cell = row.getCell(13);
          if ((perm1Cell.fill && perm1Cell.fill.fgColor) || (perm2Cell.fill && perm2Cell.fill.fgColor)) {
            specificHighlights.permissions++;
          }
        }
        if (differences.includes('owner')) specificHighlights.owner++;
        if (differences.includes('group')) specificHighlights.group++;
        if (differences.includes('size')) specificHighlights.size++;
        if (differences.includes('modTime')) specificHighlights.modTime++;
        if (differences.includes('content')) specificHighlights.content++;
      }
    }
  }

  console.log(`   📊 Different items with highlighting: ${highlightedDifferent}/${totalDifferent}`);
  console.log(`   🎨 Specific difference highlights:`);
  Object.entries(specificHighlights).forEach(([type, count]) => {
    console.log(`      ${type}: ${count}`);
  });
}

function analyzeColorCoding(mainSheet, differencesSheet) {
  const colorCounts = {};
  const statusColors = {};

  // Analyze main sheet colors
  for (let rowNum = 2; rowNum <= mainSheet.rowCount; rowNum++) {
    const row = mainSheet.getRow(rowNum);
    const status = row.getCell(1).value;
    const firstCell = row.getCell(1);

    if (firstCell.fill && firstCell.fill.fgColor) {
      const color = firstCell.fill.fgColor.argb;
      colorCounts[color] = (colorCounts[color] || 0) + 1;

      if (!statusColors[status]) {
        statusColors[status] = color;
      }
    }
  }

  console.log(`   🎨 Color distribution:`);
  Object.entries(colorCounts).forEach(([color, count]) => {
    console.log(`      ${color}: ${count} rows`);
  });

  console.log(`   📋 Status to color mapping:`);
  Object.entries(statusColors).forEach(([status, color]) => {
    const colorName = getColorName(color);
    console.log(`      ${status}: ${color} (${colorName})`);
  });

  // Check differences sheet color coding
  if (differencesSheet) {
    const diffColors = new Set();
    for (let rowNum = 2; rowNum <= differencesSheet.rowCount; rowNum++) {
      const row = differencesSheet.getRow(rowNum);
      const firstCell = row.getCell(1);

      if (firstCell.fill && firstCell.fill.fgColor) {
        diffColors.add(firstCell.fill.fgColor.argb);
      }
    }
    console.log(`   🔍 Differences sheet uses ${diffColors.size} different colors`);
  }
}

function analyzeContentMatch(worksheet) {
  const contentMatchCounts = {};

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const contentMatch = row.getCell(16).value;

    if (contentMatch) {
      contentMatchCounts[contentMatch] = (contentMatchCounts[contentMatch] || 0) + 1;
    }
  }

  console.log(`   📝 Content match values:`);
  Object.entries(contentMatchCounts).forEach(([value, count]) => {
    const isValid = ['はい', 'いいえ', '適用外'].includes(value);
    console.log(`      "${value}": ${count} ${isValid ? '✅' : '❌'}`);
  });

  const totalExpected = ['はい', 'いいえ', '適用外'].reduce((sum, key) => {
    return sum + (contentMatchCounts[key] || 0);
  }, 0);

  const totalEntries = Object.values(contentMatchCounts).reduce((sum, count) => sum + count, 0);

  console.log(`   ✅ Valid entries: ${totalExpected}/${totalEntries}`);
}

function getColorName(argb) {
  const colorMap = {
    'E2EFDA': 'Light Green',
    'FCE4D6': 'Light Orange',
    'F8CBAD': 'Light Red',
    'DDEBF7': 'Light Blue',
    'FFEB9C': 'Light Yellow',
    'E1D9F0': 'Light Purple',
    'D8E4BC': 'Light Green-Blue',
    'C2D1CC': 'Blue-Green'
  };

  return colorMap[argb] || 'Unknown';
}

// Main execution
const reportFile = process.argv[2] || 'comparison_report.xlsx';
detailedAnalysis(reportFile).catch(console.error);