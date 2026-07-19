const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { readRows, updateRow } = require('./excel-io');
const { invokeClaude, extractJson, loadConfig } = require('./subagent-invoker');

const XLSX = process.env.INCIDENT_XLSX
  || path.join(__dirname, '..', '..', 'examples', 'incident_management.xlsx');
const DEMO_APP = path.join(__dirname, '..', '..', '..', 'demo-app');
const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..', '..');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'output');
const LOG_COLLECTOR = path.join(__dirname, '..', '..', '..', 'log-collector-skill', 'scripts', 'log-collection-skill.js');

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

const inFlight = new Set();
let logSink = (msg) => console.log(`[driver ${new Date().toISOString()}] ${msg}`);

function setLogSink(fn) { logSink = fn; }
function log(msg) { logSink(msg); }

// row から表示用の "INC001 TrackID:XXX" 形式のprefixを組み立てる
function rowTag(row) {
  const parts = [];
  if (row && row.id) parts.push(row.id);
  if (row && row.trackId) parts.push(`TrackID:${row.trackId}`);
  return parts.length ? `[${parts.join(' ')}]` : '[?]';
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

// log_collector が出力したCSVから、対象タスクの行を server×logPath(client/service) 別に抽出する
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
    const kind = /service\.log/.test(logPath) ? 'service' : /app\.log/.test(logPath) ? 'client' : 'other';
    entries.push({ server, kind, content: r[idx.content] || '' });
  }
  return entries;
}

// 収集エントリを "[server1/client] <生ログ本文>" 形式で連結する (H列・LLM入力の両方で使う)
function formatRawLogLines(entries) {
  return entries.map(e => `[${e.server}/${e.kind}] ${e.content}`).join('\n');
}

// サーバ×ログ種別ごとの件数サマリ ("server1/client=3, server1/service=2")
function summarizeCounts(entries) {
  const counts = new Map();
  for (const e of entries) {
    const key = `${e.server}:${e.kind}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort()
    .map(([key, n]) => { const [server, kind] = key.split(':'); return `${server}/${kind}=${n}`; })
    .join(', ');
}

// log-collection-skill.js を子プロセスで実行し、終了コードを待つだけの薄いラッパー
function spawnLogCollector() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [LOG_COLLECTOR], {
      env: {
        ...process.env,
        INPUT_FOLDER: path.dirname(XLSX),
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

async function runLogCollector(row, opts = {}) {
  log(`${rowTag(row)} running log_collector`);
  if (opts.dryRun) return { collect_summary: '[dry-run] log_collector skipped' };

  const { code } = await spawnLogCollector();

  const files = fs.existsSync(OUTPUT_DIR) ? fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.xlsx')) : [];
  const latest = files.sort().pop();
  if (!latest) {
    return { collect_summary: `no output (exit ${code}, ログサーバ未起動または対象TrackIDのログ0件)` };
  }

  const csvName = latest.replace(/\.xlsx$/, '.csv');
  const csvPath = path.join(OUTPUT_DIR, csvName);
  let entries = [];
  if (fs.existsSync(csvPath)) {
    try {
      entries = extractCollectedEntries(csvPath, row.id);
    } catch (e) {
      log(`${rowTag(row)} CSV解析失敗: ${e.message}`);
    }
  }

  if (entries.length === 0) {
    return { collect_summary: `no matching entries in output/${latest}${code !== 0 ? ` (exit ${code})` : ''}` };
  }

  // H列 (収集ログ) には各サーバから取得した生ログをそのまま結合して格納する
  const rawLogs = formatRawLogLines(entries);
  const collect_summary = rawLogs;

  // D列 (インシデント概要) は、収集した生ログを元にLLMで事象概要を再生成する
  const updates = { collect_summary };
  if (opts.skipSummary) {
    return updates;
  }
  try {
    const input = { id: row.id, trackId: row.trackId, raw_logs: rawLogs };
    const { stdout } = await invokeClaude('log-summarizer', JSON.stringify(input));
    const parsed = extractJson(stdout);
    if (parsed && parsed.summary) {
      updates.summary = parsed.summary;
    } else {
      log(`${rowTag(row)} log-summarizer: JSON抽出失敗、概要(D列)は既存値を維持`);
    }
  } catch (e) {
    log(`${rowTag(row)} log-summarizer error: ${e.message} (概要(D列)は既存値を維持)`);
  }
  return updates;
}

async function runIncidentAnalyzer(row, opts = {}) {
  log(`${rowTag(row)} running incident-analyzer`);
  const input = {
    id: row.id,
    trackId: row.trackId,
    summary: row.summary,
    collected_logs: row.collect_summary,
    app_source_root: path.relative(REPO_ROOT, DEMO_APP),
  };
  if (opts.dryRun) {
    return { analysis: `[dry-run analysis] ${row.id} summary=${row.summary}` };
  }
  const { stdout } = await invokeClaude('incident-analyzer', JSON.stringify(input));
  const parsed = extractJson(stdout);
  const analysis = parsed && parsed.analysis ? parsed.analysis : stdout.trim();
  return { analysis };
}

async function runRepairPlanner(row, opts = {}) {
  log(`${rowTag(row)} running repair-planner`);
  const input = {
    id: row.id,
    trackId: row.trackId,
    analysis: row.analysis,
    app_source_root: path.relative(REPO_ROOT, DEMO_APP),
  };
  if (opts.dryRun) {
    return { repair_plan: `[dry-run repair plan] for ${row.id}` };
  }
  const { stdout } = await invokeClaude('repair-planner', JSON.stringify(input));
  const parsed = extractJson(stdout);
  const repair_plan = parsed && parsed.repair_plan ? parsed.repair_plan : stdout.trim();
  return { repair_plan };
}

async function runPrPublisher(row, opts = {}) {
  log(`${rowTag(row)} running pr-publisher (approver=${row.approver})`);
  if (!row.approver) {
    return { pr_url: 'ERROR: 承認者(J列)未記入のためPR発行中止' };
  }
  const input = {
    id: row.id,
    trackId: row.trackId,
    summary: row.summary,
    analysis: row.analysis,
    repair_plan: row.repair_plan,
    approver: row.approver,
    app_source_root: path.relative(REPO_ROOT, DEMO_APP),
  };
  if (opts.dryRun) {
    return { pr_url: `[dry-run] PR would be created for ${row.id}` };
  }
  const { stdout } = await invokeClaude('pr-publisher', JSON.stringify(input));
  const parsed = extractJson(stdout);
  const pr_url = parsed && parsed.pr_url ? parsed.pr_url : (stdout.match(/https:\/\/github\.com\/[^\s)]+\/pull\/\d+/) || [stdout.trim()])[0];
  return { pr_url };
}

// 状態機械: watchdog は起票時に最初から「インシデント検出」で書き込む (=起票が確認待ち)。
//   インシデント検出 ─[ログ収集]→ ログ収集済み ─[調査]→ 解析済み ─[改修案]→ 要承認 ★手動ゲート
//   要承認 ─(承認者+PR作成待ちを人が記入)→ PR作成待ち ─[PR発行]→ 対応完了
// 「▶ 調査＆改修案」ボタンで インシデント検出 → 要承認 まで一気に実行 (log_collector+analyzer+planner)。
const HANDLERS = {
  'インシデント検出': { fn: runLogCollector,       next: 'ログ収集済み' },
  'ログ収集済み':     { fn: runIncidentAnalyzer,   next: '解析済み' },
  '解析済み':         { fn: runRepairPlanner,      next: '要承認' },
  'PR作成待ち':       { fn: runPrPublisher,        next: '対応完了' },
};

// 手動ゲート状態: この状態に「到達」したら advanceRowToGate は停止し、
// 次に進めるには人が改めてボタンを押す (=/api/advance を再度呼ぶ) 必要がある。
const STOP_STATES = new Set(['要承認', '対応完了']);

async function processRow(row, opts = {}) {
  const handler = HANDLERS[row.status];
  if (!handler) return { skipped: true, reason: `no handler for status "${row.status}"` };
  if (inFlight.has(row.id)) return { skipped: true, reason: 'already in flight' };
  inFlight.add(row.id);
  try {
    const updates = await handler.fn(row, opts);
    await updateRow(XLSX, row.rowNum, { ...updates, status: handler.next });
    log(`${rowTag(row)} ${row.status} → ${handler.next}`);
    return { ok: true, from: row.status, to: handler.next, updates };
  } catch (err) {
    log(`${rowTag(row)} ERROR in ${row.status}: ${err.message}`);
    await updateRow(XLSX, row.rowNum, { note: `[driver error] ${err.message}` });
    return { ok: false, error: err.message };
  } finally {
    inFlight.delete(row.id);
  }
}

async function processRowById(rowId, opts = {}) {
  const rows = await readRows(XLSX);
  const row = rows.find(r => r.id === rowId);
  if (!row) return { skipped: true, reason: `row ${rowId} not found` };
  return processRow(row, opts);
}

// 指定行を「次の手動ゲート」まで連続的に進める
// インシデント検出 → ログ収集済み → 解析済み → 要承認 (log収集+調査+改修案を一気に実行し要承認で停止)
// PR作成待ち → 対応完了 (PR発行後に終端)
async function advanceRowToGate(rowId, opts = {}) {
  const stages = [];
  const maxSteps = 6; // 安全弁
  // 最初に一度読んで TrackID を確定
  const initRows = await readRows(XLSX);
  const initRow = initRows.find(r => r.id === rowId);
  const tag = rowTag(initRow);
  log(`${tag} advanceRowToGate begin (from status="${initRow ? initRow.status : '?'}")`);
  for (let i = 0; i < maxSteps; i++) {
    const rows = await readRows(XLSX);
    const row = rows.find(r => r.id === rowId);
    if (!row) { log(`${tag} advanceRowToGate row not found`); return { ok: false, error: `row ${rowId} not found`, stages }; }
    if (!HANDLERS[row.status]) {
      log(`${rowTag(row)} advanceRowToGate reached gate/terminal: "${row.status}"`);
      return { ok: true, stages, finalStatus: row.status, reason: 'reached gate or terminal' };
    }
    const result = await processRow(row, opts);
    stages.push({ id: rowId, trackId: row.trackId, from: row.status, ...result });
    if (!result.ok) { log(`${rowTag(row)} advanceRowToGate aborted: ${result.error || result.reason}`); return { ok: false, stages, error: result.error || result.reason }; }
    // 遷移先が手動ゲートなら、そのステップを最後に停止 (次段は人がボタンを押すまで実行しない)
    if (STOP_STATES.has(result.to)) {
      log(`${rowTag(row)} advanceRowToGate stopped at manual gate: "${result.to}"`);
      return { ok: true, stages, finalStatus: result.to, reason: 'reached manual gate' };
    }
  }
  log(`${tag} advanceRowToGate exceeded max steps (${maxSteps})`);
  return { ok: false, stages, error: `max steps exceeded (${maxSteps})` };
}

async function tickAll(opts = {}) {
  if (!fs.existsSync(XLSX)) return { rows: 0, results: [] };
  const rows = await readRows(XLSX);
  const results = [];
  for (const row of rows) {
    if (HANDLERS[row.status]) {
      results.push({ id: row.id, ...(await processRow(row, opts)) });
    }
  }
  return { rows: rows.length, results };
}

function inFlightSize() { return inFlight.size; }

module.exports = {
  XLSX,
  HANDLERS,
  processRow,
  processRowById,
  advanceRowToGate,
  tickAll,
  setLogSink,
  inFlightSize,
};
