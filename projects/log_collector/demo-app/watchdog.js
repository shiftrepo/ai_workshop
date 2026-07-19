#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ExcelJS = require('exceljs');
const { invokeClaude, extractJson, loadConfig } = require('../auto-repair-demo/orchestrator/lib/subagent-invoker');

const LOG_PATH = path.join(__dirname, 'logs', 'app.log');
const EXCEL_PATH = process.env.INCIDENT_XLSX
  || path.join(__dirname, '..', 'auto-repair-demo', 'examples', 'incident_management.xlsx');
const TEMPLATE_PATH = path.join(__dirname, '..', 'auto-repair-demo', 'examples', 'incident_management_template.xlsx');
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const OUTPUT_DIR = path.join(__dirname, '..', 'auto-repair-demo', 'output');
const LOG_COLLECTOR = path.join(__dirname, '..', 'log-collector-skill', 'scripts', 'log-collection-skill.js');

// demo-config.json の logCollector 設定から SSH 接続用の環境変数を組み立てる
function logCollectorEnv() {
  const cfg = loadConfig().logCollector;
  if (!cfg) return {};
  const env = {};
  if (cfg.sshKeyPath) env.SSH_KEY_PATH = path.join(REPO_ROOT, cfg.sshKeyPath);
  if (cfg.sshUser) env.SSH_USER = cfg.sshUser;
  (cfg.servers || []).forEach((s, i) => {
    env[`SSH_HOST_${i + 1}`] = s.host;
    env[`SSH_PORT_${i + 1}`] = String(s.port);
  });
  return env;
}

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

// RFC4180準拠の簡易CSVパーサ (log-collection-skill.js の escapeCsvValue と対になる)
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = ''; rows.push(row); row = [];
    } else if (c === '\r') {
      // skip
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// log_collector が出力したCSVから、対象タスクの行を server別に抽出する。
// Content列は "logPath:実ログ行" 形式 (grep -r の出力そのまま) なので、
// 先頭のファイルパスプレフィックスだけ取り除き、ログ本文はそのまま保持する。
function extractCollectedEntries(csvPath, taskId) {
  const text = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0];
  const idx = {
    taskId: header.indexOf('Task ID'),
    server: header.indexOf('Server'),
    logPath: header.indexOf('Log Path'),
    content: header.indexOf('Content'),
  };
  const entries = [];
  for (const r of rows.slice(1)) {
    if (r[idx.taskId] !== taskId) continue;
    const server = r[idx.server] || '?';
    const logPath = r[idx.logPath] || '';
    const rawContent = r[idx.content] || '';
    const line = rawContent.startsWith(`${logPath}:`) ? rawContent.slice(logPath.length + 1) : rawContent;
    entries.push({ server, logPath, line });
  }
  return entries;
}

// 収集エントリを "[サーバ名 ログパス] <ログ本文そのまま>" 形式で連結する (H列・LLM入力の両方で使う)。
// サーバ/取得元ファイル以外の加工 (件数集計・分類ラベル付け) はしない。
function formatRawLogLines(entries) {
  return entries.map(e => `[${e.server} ${e.logPath}] ${e.line}`).join('\n');
}

// log-collection-skill.js はExcel入力ファイルから対象行を読む設計のため、
// 起票前にTrackID単発でSSH収集させるには、この1件だけを含む一時Excelを渡す。
// INPUT_FOLDER配下の.xlsxは全て読まれるため、呼び出しごとに専用の空ディレクトリを使い
// 他の一時ファイルと混在しないようにする (使用後にディレクトリごと削除)。
const STAGING_ROOT = path.join(OUTPUT_DIR, 'staging');
async function writeStagingExcel(id, trackId, ts, summary) {
  const dir = path.join(STAGING_ROOT, id);
  fs.mkdirSync(dir, { recursive: true });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('incidents');
  ws.addRow(['インシデントID', 'TrackID', 'タイムスタンプ', 'インシデント概要', '担当者', 'ステータス', '調査状況']);
  ws.addRow([id, trackId, ts, summary, 'AI-Watchdog', 'インシデント検出', '']);
  const stagingPath = path.join(dir, `${id}.xlsx`);
  await wb.xlsx.writeFile(stagingPath);
  return stagingPath;
}

// log-collection-skill.js を子プロセスで実行し、終了コードを待つだけの薄いラッパー
function spawnLogCollector(stagingPath) {
  // log-collection-skill.js は OUTPUT_FOLDER を自動作成しない (ENOENT でExcel/CSV書き込みに
  // 失敗し exit 1 で終わる)。デモリセット等でこのディレクトリ自体が消えることがあるため、
  // 実行前に必ず存在を保証する。
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  return new Promise((resolve, reject) => {
    const child = spawn('node', [LOG_COLLECTOR], {
      env: {
        ...process.env,
        INPUT_FOLDER: path.dirname(stagingPath),
        OUTPUT_FOLDER: OUTPUT_DIR,
        FILTER_STATUS: 'インシデント検出',   // log_collector が処理する行のステータス
        ...logCollectorEnv(),   // demo-config.json の SSH 接続情報 (server1-3)
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { out += d.toString(); });
    child.on('close', code => resolve({ code, out }));
    child.on('error', reject);
  });
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

// TrackIDを頼りにSSHでログ収集し、生ログをLLMに渡して事象概要を生成する。
// 起票前に呼ぶため、log-collection-skill.jsには1件だけの一時Excelを読ませる。
async function collectLogsAndSummarize(id, trackId, ts, fallbackSummary) {
  const stagingPath = await writeStagingExcel(id, trackId, ts, fallbackSummary);
  try {
    const { code } = await spawnLogCollector(stagingPath);

    const files = fs.existsSync(OUTPUT_DIR) ? fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.xlsx')) : [];
    const latest = files.sort().pop();
    if (!latest) {
      return { collect_summary: `no output (exit ${code}, ログサーバ未起動または対象TrackIDのログ0件)`, summary: fallbackSummary };
    }

    const csvPath = path.join(OUTPUT_DIR, latest.replace(/\.xlsx$/, '.csv'));
    let entries = [];
    if (fs.existsSync(csvPath)) {
      try {
        entries = extractCollectedEntries(csvPath, id);
      } catch (e) {
        wlog(`CSV解析失敗: ${e.message}`, trackId);
      }
    }

    if (entries.length === 0) {
      return { collect_summary: `no matching entries in output/${latest}${code !== 0 ? ` (exit ${code})` : ''}`, summary: fallbackSummary };
    }

    // H列 (収集ログ) には各サーバから取得した生ログをそのまま結合して格納する
    const rawLogs = formatRawLogLines(entries);
    let summary = fallbackSummary;
    try {
      const input = { id, trackId, raw_logs: rawLogs };
      const { stdout } = await invokeClaude('log-summarizer', JSON.stringify(input));
      const parsed = extractJson(stdout);
      if (parsed && parsed.summary) summary = parsed.summary;
      else wlog('log-summarizer: JSON抽出失敗、概要はwatchdogの機械生成のまま', trackId);
    } catch (e) {
      wlog(`log-summarizer error: ${e.message} (概要はwatchdogの機械生成のまま)`, trackId);
    }

    return { collect_summary: rawLogs, summary };
  } finally {
    fs.rmSync(path.dirname(stagingPath), { recursive: true, force: true });
  }
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
  const fallbackSummary = `${parsed.path} で ${parsed.err} TrackID:${parsed.trackId}`;

  wlog(`collecting logs before filing ${id}...`, parsed.trackId);
  const { collect_summary, summary } = await collectLogsAndSummarize(id, parsed.trackId, parsed.ts, fallbackSummary);

  // ログ収集・概要生成の間に別のERRORが先に書き込まれている可能性があるため、
  // 追記直前に再読込してから最新の行番号で追加する。
  const wb2 = await loadWorkbook();
  const ws2 = wb2.getWorksheet('incidents') || wb2.worksheets[0];
  const now = new Date().toISOString();

  ws2.addRow([
    id, parsed.trackId, parsed.ts, summary, 'AI-Watchdog',
    'ログ収集済み', '',
    collect_summary, '', '', '', '', now,
  ]);

  await saveWorkbook(wb2);
  wlog(`appended ${id} to Excel as ログ収集済み (row ${ws2.rowCount})`, parsed.trackId);
}

// バイト位置(position)だけで差分判定する方式は、リセット(truncate)直後に
// 同一バイト数のログが再書き込みされるケース (このデモのバグは常に固定長TrackID+
// 固定フォーマットのため高確率で発生する) で "サイズ不変=変更なし" と誤判定し、
// 検知が止まる欠陥があった。前回読み取った全文(lastContent)と比較し、
// 新しい内容が末尾に追記されただけなら差分だけ、そうでない(truncateされた)場合は
// 全文を再処理する。再処理対象になった既処理行は handleError() 側の
// TrackID単位の冪等性 (findRowByTrackId) により安全に無視されるため実害はない。
function tailFile(filePath, onLine) {
  let lastContent = '';
  const check = () => {
    if (!fs.existsSync(filePath)) return;
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      return;
    }
    if (content === lastContent) return;
    const delta = content.startsWith(lastContent) ? content.slice(lastContent.length) : content;
    lastContent = content;
    delta.split('\n').filter(Boolean).forEach(onLine);
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
