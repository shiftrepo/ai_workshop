// Check specific cell highlighting for different types of differences
const Excel = require('exceljs');

async function checkCellHighlighting(filePath) {
  console.log(`\n🎨 CELL-LEVEL HIGHLIGHTING ANALYSIS: ${filePath}`);
  console.log('================================================\n');

  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filePath);

  const mainSheet = workbook.getWorksheet('All Items');

  console.log('Checking individual cell highlighting for different types...\n');

  for (let rowNum = 2; rowNum <= mainSheet.rowCount; rowNum++) {
    const row = mainSheet.getRow(rowNum);
    const status = row.getCell(1).value;
    const path = row.getCell(2).value;
    const differences = row.getCell(17).value;

    if (status === '相違あり' && differences) {
      console.log(`📁 ${path} (Differences: ${differences})`);

      // Check size highlighting (columns D and E)
      if (differences.includes('size')) {
        const sizeCell1 = row.getCell(4);
        const sizeCell2 = row.getCell(5);
        console.log(`   💾 Size highlighting: ${getCellColor(sizeCell1)} / ${getCellColor(sizeCell2)}`);
      }

      // Check modification time highlighting (columns F and G)
      if (differences.includes('modTime')) {
        const modTimeCell1 = row.getCell(6);
        const modTimeCell2 = row.getCell(7);
        console.log(`   📅 ModTime highlighting: ${getCellColor(modTimeCell1)} / ${getCellColor(modTimeCell2)}`);
      }

      // Check permissions highlighting (columns L and M)
      if (differences.includes('permissions')) {
        const permCell1 = row.getCell(12);
        const permCell2 = row.getCell(13);
        console.log(`   🔐 Permissions highlighting: ${getCellColor(permCell1)} / ${getCellColor(permCell2)}`);
      }

      // Check owner highlighting (columns H and I)
      if (differences.includes('owner')) {
        const ownerCell1 = row.getCell(8);
        const ownerCell2 = row.getCell(9);
        console.log(`   👤 Owner highlighting: ${getCellColor(ownerCell1)} / ${getCellColor(ownerCell2)}`);
      }

      // Check group highlighting (columns J and K)
      if (differences.includes('group')) {
        const groupCell1 = row.getCell(10);
        const groupCell2 = row.getCell(11);
        console.log(`   🔐 Group highlighting: ${getCellColor(groupCell1)} / ${getCellColor(groupCell2)}`);
      }

      // Check content highlighting (columns O, P, Q)
      if (differences.includes('content')) {
        const checksumCell1 = row.getCell(15);
        const checksumCell2 = row.getCell(16);
        const contentMatchCell = row.getCell(16);
        console.log(`   📄 Content highlighting: ${getCellColor(checksumCell1)} / ${getCellColor(checksumCell2)}`);
        console.log(`   ✅ Content match highlighting: ${getCellColor(contentMatchCell)}`);
      }

      console.log('');
    }
  }

  // Check differences sheet highlighting
  const differencesSheet = workbook.getWorksheet('Differences');
  if (differencesSheet) {
    console.log('\n🔍 DIFFERENCES SHEET HIGHLIGHTING:');

    const attributeColors = {};
    for (let rowNum = 2; rowNum <= Math.min(10, differencesSheet.rowCount); rowNum++) {
      const row = differencesSheet.getRow(rowNum);
      const attribute = row.getCell(3).value;
      const color = getCellColor(row.getCell(1));

      if (attribute && color !== 'No color') {
        if (!attributeColors[attribute]) {
          attributeColors[attribute] = color;
        }
      }
    }

    console.log('   Attribute colors:');
    Object.entries(attributeColors).forEach(([attr, color]) => {
      console.log(`   ${attr}: ${color}`);
    });
  }
}

function getCellColor(cell) {
  if (cell.fill && cell.fill.fgColor && cell.fill.fgColor.argb) {
    const argb = cell.fill.fgColor.argb;
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
    return `${colorMap[argb] || 'Unknown'} (${argb})`;
  }
  return 'No color';
}

// Main execution
const reportFile = process.argv[2] || 'comparison_report.xlsx';
checkCellHighlighting(reportFile).catch(console.error);