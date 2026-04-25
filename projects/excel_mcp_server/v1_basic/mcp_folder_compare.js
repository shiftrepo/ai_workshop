// MCP Server Folder Comparison Script
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const Excel = require('exceljs');

// Function to calculate file checksum
async function calculateChecksum(filePath) {
  try {
    const fileBuffer = await readFileAsync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    return 'Error calculating checksum';
  }
}

// Function to get file details
async function getFileDetails(basePath, filePath) {
  const fullPath = path.join(basePath, filePath);

  try {
    const stats = await statAsync(fullPath);
    let isSymbolicLink = false;
    let linkTarget = '';

    try {
      const lstat = fs.lstatSync(fullPath);
      isSymbolicLink = lstat.isSymbolicLink();
      if (isSymbolicLink) {
        linkTarget = fs.readlinkSync(fullPath);
      }
    } catch (error) {
      // Ignore errors related to symlinks on Windows
    }

    const checksum = !stats.isDirectory() && !isSymbolicLink
      ? await calculateChecksum(fullPath)
      : '';

    // Format date for better readability with millisecond precision
    const formattedDate = stats.mtime.toISOString().replace('T', ' ');
    // Keep milliseconds part as well for precise comparison

    // Use Git Bash to get accurate Linux-style file information with rwx format
    let permissions = '';
    let ownerInfo = '';
    let groupInfo = '';

    try {
      // Execute ls -l command via Git Bash to get rwx format permissions and proper owner/group
      // For directories, use ls -ld to avoid the "total" line
      const lsCommand = stats.isDirectory() ?
        `ls -ld "${fullPath}"` :
        `ls -l "${fullPath}"`;

      const lsOutput = require('child_process').execSync(lsCommand, { encoding: 'utf8' });
      if (lsOutput && lsOutput.trim()) {
        // ls -l output format: permissions links owner group size date filename
        // e.g. -rw-r--r-- 1 username groupname 123 Sep 28 12:34 filename.txt
        const parts = lsOutput.trim().split(/\s+/);
        if (parts.length >= 7) {
          permissions = parts[0]; // Full rwx format with type prefix
          ownerInfo = parts[2];  // Username string
          groupInfo = parts[3];  // Group name string
        }
      }
    } catch (error) {
      // Fall back to node's built-in but less accurate permission format
      const modeOctal = stats.mode.toString(8);
      const lastThree = modeOctal.substring(modeOctal.length - 3);

      // Convert octal permissions to rwx format
      const rwxMap = {
        0: '---', 1: '--x', 2: '-w-', 3: '-wx',
        4: 'r--', 5: 'r-x', 6: 'rw-', 7: 'rwx'
      };

      // Determine file type prefix
      let typePrefix = '-';
      if (stats.isDirectory()) typePrefix = 'd';
      else if (isSymbolicLink) typePrefix = 'l';

      permissions = typePrefix +
                   rwxMap[parseInt(lastThree[0])] +
                   rwxMap[parseInt(lastThree[1])] +
                   rwxMap[parseInt(lastThree[2])];

      ownerInfo = stats.uid.toString();
      groupInfo = stats.gid.toString();
    }

    // Owner and group info already obtained from ls command or fallback above

    return {
      path: filePath,
      type: stats.isDirectory() ? 'directory' :
            isSymbolicLink ? 'symbolicLink' : 'file',
      size: stats.size,
      modTime: formattedDate,
      rawModTime: stats.mtime,
      permissions: permissions,
      owner: ownerInfo,
      group: groupInfo,
      checksum,
      linkTarget
    };
  } catch (error) {
    return {
      path: filePath,
      error: error.message
    };
  }
}

// Function to scan directory recursively
async function scanDirectory(basePath, relativePath = '') {
  const fullPath = path.join(basePath, relativePath);
  const result = {};

  try {
    const entries = await readdirAsync(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelativePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        // For directories, scan recursively
        const subDirResult = await scanDirectory(basePath, entryRelativePath);
        Object.assign(result, subDirResult);
        // Add directory itself
        result[entryRelativePath] = await getFileDetails(basePath, entryRelativePath);
      } else {
        // For files and symbolic links
        result[entryRelativePath] = await getFileDetails(basePath, entryRelativePath);
      }
    }

    return result;
  } catch (error) {
    console.error(`Error scanning directory ${fullPath}: ${error.message}`);
    return {};
  }
}

// Compare two file/directory structures
function compareStructures(dir1Data, dir2Data) {
  const allPaths = new Set([...Object.keys(dir1Data), ...Object.keys(dir2Data)]);
  const comparison = [];

  for (const path of allPaths) {
    const file1 = dir1Data[path];
    const file2 = dir2Data[path];

    if (!file1) {
      comparison.push({
        path,
        status: 'only-in-dir2',
        details: file2,
        file1: null,
        file2
      });
    } else if (!file2) {
      comparison.push({
        path,
        status: 'only-in-dir1',
        details: file1,
        file1,
        file2: null
      });
    } else {
      // Both exist, compare them
      const differences = compareTwoFiles(file1, file2);

      if (Object.keys(differences).length > 0) {
        comparison.push({
          path,
          status: 'different',
          differences,
          file1,
          file2
        });
      } else {
        comparison.push({
          path,
          status: 'identical',
          details: file1,
          file1,
          file2
        });
      }
    }
  }

  return comparison;
}

// Compare two individual files
function compareTwoFiles(file1, file2) {
  const differences = {};

  // Skip if there was an error with either file
  if (file1.error || file2.error) {
    differences.error = true;
    return differences;
  }

  // Compare file attributes
  if (file1.type !== file2.type) differences.type = { dir1: file1.type, dir2: file2.type };
  if (file1.size !== file2.size) differences.size = { dir1: file1.size, dir2: file2.size };

  // Compare modification times with a more detailed approach
  const timeDiff = file1.rawModTime?.getTime() - file2.rawModTime?.getTime();
  if (timeDiff !== 0) {
    const diffInSeconds = Math.abs(timeDiff) / 1000;
    const diffDesc = diffInSeconds < 60 ? `${diffInSeconds} seconds` :
                    diffInSeconds < 3600 ? `${Math.round(diffInSeconds/60)} minutes` :
                    diffInSeconds < 86400 ? `${Math.round(diffInSeconds/3600)} hours` :
                    `${Math.round(diffInSeconds/86400)} days`;
    differences.modTime = {
      dir1: file1.modTime,
      dir2: file2.modTime,
      diffDesc: diffDesc,
      newer: timeDiff < 0 ? 'dir2' : 'dir1'
    };
  }

  if (file1.permissions !== file2.permissions) differences.permissions = { dir1: file1.permissions, dir2: file2.permissions };
  if (file1.owner !== file2.owner) differences.owner = { dir1: file1.owner, dir2: file2.owner };
  if (file1.group !== file2.group) differences.group = { dir1: file1.group, dir2: file2.group };

  // Compare checksums for regular files
  if (file1.type === 'file' && file2.type === 'file' && file1.checksum !== file2.checksum) {
    differences.content = { dir1: file1.checksum, dir2: file2.checksum };
  }

  // Compare symlink targets
  if (file1.type === 'symbolicLink' && file2.type === 'symbolicLink' && file1.linkTarget !== file2.linkTarget) {
    differences.linkTarget = { dir1: file1.linkTarget, dir2: file2.linkTarget };
  }

  return differences;
}

// Create Excel workbook with comparison results
async function createExcelReport(comparison, dir1Path, dir2Path, outputPath) {
  const workbook = new Excel.Workbook();

  // Add summary worksheet
  const summarySheet = workbook.addWorksheet('Summary');

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 20 },
    { header: 'Count', key: 'count', width: 15 }
  ];

  // Count statistics
  const stats = {
    identical: comparison.filter(item => item.status === 'identical').length,
    different: comparison.filter(item => item.status === 'different').length,
    onlyInDir1: comparison.filter(item => item.status === 'only-in-dir1').length,
    onlyInDir2: comparison.filter(item => item.status === 'only-in-dir2').length,
    total: comparison.length
  };

  // Add comparison info
  summarySheet.addRow({ metric: 'Directory 1', count: dir1Path });
  summarySheet.addRow({ metric: 'Directory 2', count: dir2Path });
  summarySheet.addRow({ metric: 'Date Generated', count: new Date().toISOString() });
  summarySheet.addRow({});  // Empty row

  // Add statistics
  summarySheet.addRow({ metric: 'Identical Items', count: stats.identical });
  summarySheet.addRow({ metric: 'Different Items', count: stats.different });
  summarySheet.addRow({ metric: 'Only in Dir 1', count: stats.onlyInDir1 });
  summarySheet.addRow({ metric: 'Only in Dir 2', count: stats.onlyInDir2 });
  summarySheet.addRow({ metric: 'Total Items', count: stats.total });

  // Format the summary sheet
  for (let i = 1; i <= 9; i++) {
    if (i <= 3) {
      summarySheet.getRow(i).font = { bold: true };
    }
    if (i >= 5) {
      // Background colors for statistics
      const rowColor = i === 5 ? 'E2EFDA' :  // Light green
                     i === 6 ? 'FCE4D6' :  // Light orange
                     i === 7 || i === 8 ? 'F8CBAD' : // Light red
                     'DDEBF7';  // Light blue
      summarySheet.getRow(i).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowColor }
      };
      summarySheet.getRow(i).font = { bold: true };
    }
  }

  // Add details worksheet
  const detailsSheet = workbook.addWorksheet('All Items');

  detailsSheet.columns = [
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Path', key: 'path', width: 50 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Size (Dir1)', key: 'sizeDir1', width: 12 },
    { header: 'Size (Dir2)', key: 'sizeDir2', width: 12 },
    { header: 'Modified (Dir1)', key: 'modTimeDir1', width: 20 },
    { header: 'Modified (Dir2)', key: 'modTimeDir2', width: 20 },
    { header: 'Owner (Dir1)', key: 'ownerDir1', width: 15 },
    { header: 'Owner (Dir2)', key: 'ownerDir2', width: 15 },
    { header: 'Group (Dir1)', key: 'groupDir1', width: 15 },
    { header: 'Group (Dir2)', key: 'groupDir2', width: 15 },
    { header: 'Permissions (Dir1)', key: 'permissionsDir1', width: 15 },
    { header: 'Permissions (Dir2)', key: 'permissionsDir2', width: 15 },
    { header: 'Checksum (Dir1)', key: 'checksumDir1', width: 20 },
    { header: 'Checksum (Dir2)', key: 'checksumDir2', width: 20 },
    { header: 'Content Match', key: 'contentMatch', width: 15 },
    { header: 'Differences', key: 'differences', width: 50 }
  ];

  // Format header and enable autofilter
  detailsSheet.getRow(1).font = { bold: true };
  detailsSheet.autoFilter = 'A1:Q1';

  // Add data rows
  comparison.forEach((item, index) => {
    // Status mapping for filtering
    let statusText = '';
    switch(item.status) {
      case 'identical': statusText = '一致'; break;  // 一致
      case 'different': statusText = '相違あり'; break;  // 相違あり
      case 'only-in-dir1': statusText = 'Dir1のみ'; break;  // Dir1のみ
      case 'only-in-dir2': statusText = 'Dir2のみ'; break;  // Dir2のみ
    }

    const row = {
      status: statusText,
      path: item.path,
      type: item.file1 ? item.file1.type : (item.file2 ? item.file2.type : ''),
      sizeDir1: item.file1 ? item.file1.size : '',
      sizeDir2: item.file2 ? item.file2.size : '',
      modTimeDir1: item.file1 ? item.file1.modTime : '',
      modTimeDir2: item.file2 ? item.file2.modTime : '',
      ownerDir1: item.file1 ? item.file1.owner : '',
      ownerDir2: item.file2 ? item.file2.owner : '',
      groupDir1: item.file1 ? item.file1.group : '',
      groupDir2: item.file2 ? item.file2.group : '',
      permissionsDir1: item.file1 ? item.file1.permissions : '',
      permissionsDir2: item.file2 ? item.file2.permissions : '',
      checksumDir1: item.file1 && item.file1.checksum ? item.file1.checksum.substring(0, 8) + '...' : '',
      checksumDir2: item.file2 && item.file2.checksum ? item.file2.checksum.substring(0, 8) + '...' : '',
      contentMatch: item.status === 'different' && item.differences.content ? 'いいえ' :
                    item.status === 'identical' ? 'はい' :
                    item.file1 && item.file2 && item.file1.type === 'file' && item.file2.type === 'file' ? 'いいえ' :
                    '適用外',  // はい/いいえ/適用外
      differences: item.status === 'different' ? Object.keys(item.differences).join(', ') : ''
    };

    const excelRow = detailsSheet.addRow(row);

    // Apply fill (background color) and font formatting based on status
    if (item.status === 'identical') {
      // Green background for identical
      excelRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E2EFDA' }  // Light green
        };
      });
      excelRow.font = { color: { argb: '006100' } };  // Dark green text
    } else if (item.status === 'different') {
      // Orange background for different
      excelRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FCE4D6' }  // Light orange
        };
      });
      excelRow.font = { color: { argb: '974706' } };  // Dark orange text
    } else {
      // Red background for only in one directory
      excelRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8CBAD' }  // Light red
        };
      });
      excelRow.font = { color: { argb: '9C0006' } };  // Dark red text
    }

    // Highlight specific differences with colored cells
    if (item.status === 'different') {
      if (item.differences.size) {
        // Highlight size cells with yellow
        detailsSheet.getCell(`D${index + 2}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEB9C' }  // Light yellow
        };
        detailsSheet.getCell(`E${index + 2}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEB9C' }  // Light yellow
        };
      }

      if (item.differences.modTime) {
        // Highlight modification time cells with light blue
        detailsSheet.getCell(`F${index + 2}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'DDEBF7' }  // Light blue
        };
        detailsSheet.getCell(`G${index + 2}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'DDEBF7' }  // Light blue
        };
      }

      if (item.differences.content) {
        // Highlight checksum cells with light purple
        detailsSheet.getCell(`O${index + 2}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E1D9F0' }  // Light purple
        };
        detailsSheet.getCell(`P${index + 2}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E1D9F0' }  // Light purple
        };
        // Highlight content match cell with light purple
        detailsSheet.getCell(`Q${index + 2}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E1D9F0' }  // Light purple
        };
      }
    }
  });

  // Create detailed differences worksheet
  const differencesSheet = workbook.addWorksheet('Differences');

  differencesSheet.columns = [
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Path', key: 'path', width: 50 },
    { header: 'Attribute', key: 'attribute', width: 15 },
    { header: 'Dir1 Value', key: 'dir1Value', width: 60 },
    { header: 'Dir2 Value', key: 'dir2Value', width: 60 },
    { header: 'Difference', key: 'diffDesc', width: 30 }
  ];

  // Format header and enable autofilter
  differencesSheet.getRow(1).font = { bold: true };
  differencesSheet.autoFilter = 'A1:F1';

  // Add data rows for differences
  let rowIndex = 2;
  comparison.filter(item => item.status === 'different').forEach((item) => {
    // Convert status to Japanese
    let statusText = '相違あり';  // 相違あり

    const headerRow = differencesSheet.addRow({
      status: statusText,
      path: item.path,
      attribute: 'ファイルパス',  // ファイルパス
      dir1Value: item.path,
      dir2Value: item.path
    });

    // Set background color for header row
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FCE4D6' }  // Light orange
      };
      cell.font = { bold: true };
    });

    Object.entries(item.differences).forEach(([key, value]) => {
      // Translate attribute names
      let attributeJp = key;
      switch(key) {
        case 'type': attributeJp = '種類'; break;  // 種類
        case 'size': attributeJp = 'サイズ'; break;  // サイズ
        case 'modTime': attributeJp = '更新日時'; break;  // 更新日時
        case 'permissions': attributeJp = '権限'; break;  // 権限
        case 'owner': attributeJp = '所有者'; break;  // 所有者
        case 'group': attributeJp = 'グループ'; break;  // グループ
        case 'content': attributeJp = '内容'; break;  // 内容
        case 'linkTarget': attributeJp = 'リンク先'; break;  // リンク先
      }

      // 差分の詳細情報
      let diffDesc = '';
      if (key === 'modTime' && value.diffDesc) {
        diffDesc = value.newer === 'dir1' ?
          `Dir1の方が${value.diffDesc}新しい` :
          `Dir2の方が${value.diffDesc}新しい`;
      } else if (key === 'size') {
        const sizeDiff = Math.abs(parseInt(value.dir1) - parseInt(value.dir2));
        diffDesc = `${sizeDiff} bytes`;
      }

      const diffRow = differencesSheet.addRow({
        status: statusText,
        path: item.path,
        attribute: attributeJp,
        dir1Value: value.dir1,
        dir2Value: value.dir2,
        diffDesc: diffDesc
      });

      // Set background color based on difference type
      diffRow.eachCell((cell) => {
        let colorArgb = 'FFFFFF';  // Default white
        switch(key) {
          case 'size': colorArgb = 'FFEB9C'; break;  // Yellow
          case 'modTime': colorArgb = 'DDEBF7'; break;  // Blue
          case 'content': colorArgb = 'E1D9F0'; break;  // Purple
          case 'permissions': colorArgb = 'D8E4BC'; break;  // Light green
          case 'owner': colorArgb = 'C2D1CC'; break;  // Blue-green
          case 'group': colorArgb = 'C2D1CC'; break;  // Blue-green
          default: colorArgb = 'F2F2F2'; break;  // Light grey
        }

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colorArgb }
        };
      });
    });

    // Add empty row between files
    differencesSheet.addRow({});
    rowIndex += Object.keys(item.differences).length + 2;
  });

  // Add files only in dir1 worksheet
  const onlyInDir1Sheet = workbook.addWorksheet('Only in Dir1');

  onlyInDir1Sheet.columns = [
    { header: 'Path', key: 'path', width: 50 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Size', key: 'size', width: 12 },
    { header: 'Modified', key: 'modTime', width: 20 },
    { header: 'Owner', key: 'owner', width: 15 },
    { header: 'Group', key: 'group', width: 15 },
    { header: 'Permissions', key: 'permissions', width: 15 }
  ];

  // Format header and enable autofilter
  onlyInDir1Sheet.getRow(1).font = { bold: true };
  onlyInDir1Sheet.autoFilter = 'A1:G1';

  // Add data for files only in dir1
  comparison.filter(item => item.status === 'only-in-dir1').forEach((item) => {
    const row = {
      path: item.path,
      type: item.file1.type,
      size: item.file1.size,
      modTime: item.file1.modTime,
      owner: item.file1.owner,
      group: item.file1.group,
      permissions: item.file1.permissions
    };

    const excelRow = onlyInDir1Sheet.addRow(row);

    // Apply fill and font formatting
    excelRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F8CBAD' }  // Light red
      };
    });
    excelRow.font = { color: { argb: '9C0006' } };  // Dark red text
  });

  // Add files only in dir2 worksheet
  const onlyInDir2Sheet = workbook.addWorksheet('Only in Dir2');

  onlyInDir2Sheet.columns = [
    { header: 'Path', key: 'path', width: 50 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Size', key: 'size', width: 12 },
    { header: 'Modified', key: 'modTime', width: 20 },
    { header: 'Owner', key: 'owner', width: 15 },
    { header: 'Group', key: 'group', width: 15 },
    { header: 'Permissions', key: 'permissions', width: 15 }
  ];

  // Format header and enable autofilter
  onlyInDir2Sheet.getRow(1).font = { bold: true };
  onlyInDir2Sheet.autoFilter = 'A1:G1';

  // Add data for files only in dir2
  comparison.filter(item => item.status === 'only-in-dir2').forEach((item) => {
    const row = {
      path: item.path,
      type: item.file2.type,
      size: item.file2.size,
      modTime: item.file2.modTime,
      owner: item.file2.owner,
      group: item.file2.group,
      permissions: item.file2.permissions
    };

    const excelRow = onlyInDir2Sheet.addRow(row);

    // Apply fill and font formatting
    excelRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F8CBAD' }  // Light red
      };
    });
    excelRow.font = { color: { argb: '9C0006' } };  // Dark red text
  });

  // Create directories for output if needed
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await workbook.xlsx.writeFile(outputPath);
  console.log(`Report saved to: ${outputPath}`);
}

// Main function to compare directories
async function compareDirectories(dir1Path, dir2Path, outputPath) {
  console.log(`Comparing directories:\n  1: ${dir1Path}\n  2: ${dir2Path}\n`);

  console.log('Scanning directories...');
  const dir1Data = await scanDirectory(dir1Path);
  const dir2Data = await scanDirectory(dir2Path);

  console.log('Comparing structures...');
  const comparison = compareStructures(dir1Data, dir2Data);

  // Sort comparison results
  comparison.sort((a, b) => {
    // Sort by status first
    const statusOrder = { 'identical': 0, 'different': 1, 'only-in-dir1': 2, 'only-in-dir2': 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    // Then by path
    return a.path.localeCompare(b.path);
  });

  // Display basic results
  console.log('\n=== COMPARISON SUMMARY ===');
  console.log(`Identical: ${comparison.filter(item => item.status === 'identical').length}`);
  console.log(`Different: ${comparison.filter(item => item.status === 'different').length}`);
  console.log(`Only in Dir1: ${comparison.filter(item => item.status === 'only-in-dir1').length}`);
  console.log(`Only in Dir2: ${comparison.filter(item => item.status === 'only-in-dir2').length}`);
  console.log(`Total items: ${comparison.length}`);

  // Create Excel report
  console.log('\nGenerating Excel report...');
  await createExcelReport(comparison, dir1Path, dir2Path, outputPath);

  console.log('\nComparison completed successfully.');
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.length !== 3) {
  console.log('Usage: node mcp_folder_compare.js <dir1_path> <dir2_path> <output_excel_path>');
  process.exit(1);
}

const [dir1Path, dir2Path, outputPath] = args;

// Run the comparison
compareDirectories(dir1Path, dir2Path, outputPath).catch(error => {
  console.error('Error:', error);
});