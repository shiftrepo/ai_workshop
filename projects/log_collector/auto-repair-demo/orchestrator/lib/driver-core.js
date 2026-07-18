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

async function runLogCollector(row, opts = {}) {
  log(`${rowTag(row)} running log_collector`);
  if (opts.dryRun) return { collect_summary: '[dry-run] log_collector skipped' };
  return new Promise((resolve, reject) => {
    const args = [LOG_COLLECTOR];
    const child = spawn('node', args, {
      env: {
        ...process.env,
        INPUT_FOLDER: path.dirname(XLSX),
        OUTPUT_FOLDER: OUTPUT_DIR,
        ...logCollectorEnv(),   // demo-config.json の SSH 接続情報 (server1-3)
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { out += d.toString(); });
    child.on('close', code => {
      const files = fs.existsSync(OUTPUT_DIR) ? fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.xlsx')) : [];
      const latest = files.sort().pop();
      const summary = latest
        ? `collected → output/${latest}${code !== 0 ? ` (exit ${code}, ログサーバ未起動の可能性)` : ''}`
        : `no output (exit ${code}, ログサーバ未起動または対象TrackIDのログ0件)`;
      resolve({ collect_summary: summary });
    });
    child.on('error', reject);
  });
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

// 状態機械: handler を持つ状態は自動遷移可能、持たない状態 (インシデント検出/要承認/対応完了) は手動ゲート。
//   情報収集中 ─[ログ収集]→ インシデント検出 ★手動ゲート
//   インシデント検出 ─[調査]→ 解析済み ─[改修案]→ 要承認 ★手動ゲート
//   要承認 ─(承認者+PR作成待ちを人が記入)→ PR作成待ち ─[PR発行]→ 対応完了
const HANDLERS = {
  '情報収集中':       { fn: runLogCollector,       next: 'インシデント検出' },
  'インシデント検出': { fn: runIncidentAnalyzer,   next: '解析済み' },
  '解析済み':         { fn: runRepairPlanner,      next: '要承認' },
  'PR作成待ち':       { fn: runPrPublisher,        next: '対応完了' },
};

// 手動ゲート状態: この状態に「到達」したら advanceRowToGate は停止し、
// 次に進めるには人が改めてボタンを押す (=/api/advance を再度呼ぶ) 必要がある。
// 「インシデント検出」を含めることで、ログ収集(情報収集中→インシデント検出)の後に
// 一旦停止し、重い調査/改修 (analyzer/planner) は人の判断後にのみ実行される。
const STOP_STATES = new Set(['インシデント検出', '要承認', '対応完了']);

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
// 情報収集中 → インシデント検出 (ログ収集後に停止 ★手動ゲート)
// インシデント検出 → 解析済み → 要承認 (調査+改修案をまとめて実行し要承認で停止)
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
