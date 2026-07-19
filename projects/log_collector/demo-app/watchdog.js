#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const LOG_PATH = path.join(__dirname, 'logs', 'app.log');
const EXCEL_PATH = process.env.INCIDENT_XLSX
  || path.join(__dirname, '..', 'auto-repair-demo', 'examples', 'incident_management.xlsx');
const TEMPLATE_PATH = path.join(__dirname, '..', 'auto-repair-demo', 'examples', 'incident_management_template.xlsx');

const HEADERS = [
  'インシデントID', 'TrackID', 'タイムスタンプ', 'インシデント概要', '担当者',
  'ステータス', '調査状況',
  '収集ログサマリ', '一次解析結果', '改修案', '承認者', 'PR URL', '最終更新',
];

const seenTrackIds = new Map();

let writeQueue = Promise.resolve();
function serialize(fn) {
  const next = writeQueue.then(fn, fn);
  writeQueue = next.catch(() => {});
  return next;
}

function wlog(msg, trackId) {
  const tag = trackId ? ` TrackID:${trackId}` : '';
  console.log(`[watchdog ${new Date().toISOString()}${tag}] ${msg}`);
}

async function ensureExcel() {
  if (fs.existsSync(EXCEL_PATH)) return;
  const wb = new ExcelJS.Workbook();
  if (fs.existsSync(TEMPLATE_PATH)) {
    await wb.xlsx.readFile(TEMPLATE_PATH);
  } else {
    const ws = wb.addWorksheet('incidents');
    ws.addRow(HEADERS);
    ws.getRow(1).font = { bold: true };
  }
  await wb.xlsx.writeFile(EXCEL_PATH);
  wlog(`created ${EXCEL_PATH}`);
}

async function loadWorkbook() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  return wb;
}

async function saveWorkbook(wb) {
  const tmp = EXCEL_PATH + '.tmp';
  await wb.xlsx.writeFile(tmp);
  fs.renameSync(tmp, EXCEL_PATH);
}

function parseLogLine(line) {
  const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
  const levelMatch = line.match(/\s(INFO|WARN|ERROR)\s/);
  const trackMatch = line.match(/TrackID:([A-Z0-9]{3,10})/);
  const pathMatch = line.match(/\[([^\]]+)\]/);
  const errMatch = line.match(/err=([^\n]+?)(?:\s+at=|$)/);
  if (!tsMatch || !levelMatch || !trackMatch) return null;
  return {
    ts: tsMatch[1],
    level: levelMatch[1],
    trackId: trackMatch[1],
    path: pathMatch ? pathMatch[1] : '',
    err: errMatch ? errMatch[1].trim() : '',
    raw: line.trim(),
  };
}

function nextIncidentId(ws) {
  let max = 0;
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const v = row.getCell(1).value;
    if (typeof v === 'string') {
      const m = v.match(/^INC(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    }
  });
  return `INC${String(max + 1).padStart(3, '0')}`;
}

function findRowByTrackId(ws, trackId) {
  let hit = null;
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1 || hit) return;
    if (row.getCell(2).value === trackId) {
      hit = { row, rowNum };
    }
  });
  return hit;
}

async function handleError(parsed) {
  const wb = await loadWorkbook();
  const ws = wb.getWorksheet('incidents') || wb.worksheets[0];

  if (findRowByTrackId(ws, parsed.trackId)) {
    const cnt = (seenTrackIds.get(parsed.trackId) || 0) + 1;
    seenTrackIds.set(parsed.trackId, cnt);
    wlog(`duplicate ERROR (already in Excel, seen=${cnt})`, parsed.trackId);
    return;
  }
  seenTrackIds.set(parsed.trackId, 1);

  wlog(`detected ERROR: ${parsed.err}`, parsed.trackId);

  const id = nextIncidentId(ws);
  const summary = `${parsed.path} で ${parsed.err} TrackID:${parsed.trackId}`;
  const now = new Date().toISOString();

  ws.addRow([
    id, parsed.trackId, parsed.ts, summary, 'AI-Watchdog',
    'インシデント検出', '',
    '', '', '', '', '', now,
  ]);

  await saveWorkbook(wb);
  wlog(`appended ${id} to Excel (row ${ws.rowCount})`, parsed.trackId);
}

function tailFile(filePath, onLine) {
  let position = 0;
  const check = () => {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    if (stat.size < position) position = 0;
    if (stat.size === position) return;
    const stream = fs.createReadStream(filePath, { start: position, end: stat.size });
    let buf = '';
    stream.on('data', chunk => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\n');
      buf = lines.pop();
      lines.forEach(onLine);
    });
    stream.on('end', () => {
      if (buf) onLine(buf);
      position = stat.size;
    });
  };
  setInterval(check, 500);
  check();
}

async function main() {
  await ensureExcel();
  wlog(`tailing ${LOG_PATH}`);
  wlog(`writing to ${EXCEL_PATH}`);

  tailFile(LOG_PATH, line => {
    const parsed = parseLogLine(line);
    if (!parsed || parsed.level !== 'ERROR') return;
    if (!parsed.err) return;
    serialize(() => handleError(parsed)).catch(err => wlog(`error: ${err.message}`, parsed.trackId));
  });
}

main().catch(err => { console.error(err); process.exit(1); });
