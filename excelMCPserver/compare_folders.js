// Folder Comparison Script using MCP Server
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
};

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
    const isSymbolicLink = fs.lstatSync(fullPath).isSymbolicLink();
    let linkTarget = '';

    if (isSymbolicLink) {
      try {
        linkTarget = fs.readlinkSync(fullPath);
      } catch (error) {
        linkTarget = 'Error reading link target';
      }
    }

    const checksum = !stats.isDirectory() && !isSymbolicLink
      ? await calculateChecksum(fullPath)
      : '';

    return {
      path: filePath,
      type: stats.isDirectory() ? 'directory' :
            isSymbolicLink ? 'symbolicLink' : 'file',
      size: stats.size,
      modTime: stats.mtime,
      permissions: (stats.mode & parseInt('777', 8)).toString(8),
      owner: stats.uid,
      group: stats.gid,
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
        details: file2
      });
    } else if (!file2) {
      comparison.push({
        path,
        status: 'only-in-dir1',
        details: file1
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
          details: file1
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
  if (file1.modTime.getTime() !== file2.modTime.getTime()) differences.modTime = { dir1: file1.modTime, dir2: file2.modTime };
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

// Format differences for display
function formatDifference(diff) {
  if (diff.status === 'identical') {
    return `${colors.green}IDENTICAL${colors.reset} ${diff.path}`;
  } else if (diff.status === 'only-in-dir1') {
    return `${colors.red}ONLY IN DIR1${colors.reset} ${diff.path}`;
  } else if (diff.status === 'only-in-dir2') {
    return `${colors.red}ONLY IN DIR2${colors.reset} ${diff.path}`;
  } else if (diff.status === 'different') {
    let result = `${colors.yellow}DIFFERENT${colors.reset} ${diff.path}\n`;

    for (const [key, value] of Object.entries(diff.differences)) {
      if (key === 'content') {
        result += `  ${colors.magenta}Content differs${colors.reset} (different checksums)\n`;
      } else if (key === 'modTime') {
        result += `  ${colors.cyan}Modification time:${colors.reset} Dir1=${value.dir1.toISOString()} | Dir2=${value.dir2.toISOString()}\n`;
      } else {
        result += `  ${colors.cyan}${key}:${colors.reset} Dir1=${value.dir1} | Dir2=${value.dir2}\n`;
      }
    }

    return result;
  }

  return '';
}

// Main function to compare directories
async function compareDirectories(dir1Path, dir2Path) {
  console.log(`Comparing directories:\n  1: ${dir1Path}\n  2: ${dir2Path}\n`);

  console.log('Scanning directories...');
  const dir1Data = await scanDirectory(dir1Path);
  const dir2Data = await scanDirectory(dir2Path);

  console.log('Comparing...\n');
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

  // Display results
  console.log('=== COMPARISON RESULTS ===\n');

  let stats = {
    identical: 0,
    different: 0,
    onlyInDir1: 0,
    onlyInDir2: 0,
  };

  for (const diff of comparison) {
    console.log(formatDifference(diff));

    switch (diff.status) {
      case 'identical': stats.identical++; break;
      case 'different': stats.different++; break;
      case 'only-in-dir1': stats.onlyInDir1++; break;
      case 'only-in-dir2': stats.onlyInDir2++; break;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`${colors.green}Identical:${colors.reset} ${stats.identical}`);
  console.log(`${colors.yellow}Different:${colors.reset} ${stats.different}`);
  console.log(`${colors.red}Only in Dir1:${colors.reset} ${stats.onlyInDir1}`);
  console.log(`${colors.red}Only in Dir2:${colors.reset} ${stats.onlyInDir2}`);
  console.log(`${colors.blue}Total items:${colors.reset} ${comparison.length}`);
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('Usage: node compare_folders.js <dir1_path> <dir2_path>');
  process.exit(1);
}

const [dir1Path, dir2Path] = args;

// Run the comparison
compareDirectories(dir1Path, dir2Path).catch(error => {
  console.error('Error:', error);
});