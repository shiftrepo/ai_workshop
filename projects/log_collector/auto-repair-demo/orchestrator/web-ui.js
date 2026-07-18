#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const express = require('express');
const { readRows, updateRow } = require('./lib/excel-io');
const {
  XLSX, HANDLERS, processRowById, advanceRowToGate, tickAll, setLogSink, inFlightSize,
} = require('./lib/driver-core');

function rowTag(row) {
  const parts = [];
  if (row && row.id) parts.push(row.id);
  if (row && row.trackId) parts.push(`TrackID:${row.trackId}`);
  return parts.length ? `[${parts.join(' ')}]` : '[?]';
}

async function findRowByRowNum(rowNum) {
  if (!fs.existsSync(XLSX)) return null;
  const rows = await readRows(XLSX);
  return rows.find(r => r.rowNum === rowNum) || null;
}
async function findRowById(rowId) {
  if (!fs.existsSync(XLSX)) return null;
  const rows = await readRows(XLSX);
  return rows.find(r => r.id === rowId) || null;
}

const PORT = Number(process.env.WEB_UI_PORT || 4001);
const DEMO_APP = path.join(__dirname, '..', '..', 'demo-app');
const TEMPLATE_PATH = path.join(__dirname, '..', 'examples', 'incident_management_template.xlsx');
const APP_LOG = path.join(DEMO_APP, 'logs', 'app.log');
const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');
const REPO_SLUG = process.env.GH_REPO || 'shiftrepo/ai_workshop';

const STATUSES = ['情報収集中', 'インシデント検出', '解析済み', '要承認', 'PR作成待ち', '対応完了'];
const EDITABLE_FIELDS = new Set(['status', 'approver', 'assignee', 'note']);

const recentLogs = [];
function pushLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  recentLogs.push(line);
  if (recentLogs.length > 200) recentLogs.shift();
  console.log(line);
}
setLogSink(pushLog);

const app = express();
app.use(express.json());

app.get('/api/rows', async (req, res, next) => {
  try {
    if (!fs.existsSync(XLSX)) return res.json({ rows: [], xlsx: XLSX, missing: true });
    const rows = await readRows(XLSX);
    res.json({ rows, xlsx: XLSX, inFlight: inFlightSize() });
  } catch (err) { next(err); }
});

app.post('/api/rows/:rowNum', async (req, res, next) => {
  try {
    const rowNum = Number(req.params.rowNum);
    if (!Number.isInteger(rowNum) || rowNum < 2) return res.status(400).json({ error: 'invalid rowNum' });
    const updates = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (EDITABLE_FIELDS.has(k)) updates[k] = v;
    }
    if (updates.status && !STATUSES.includes(updates.status)) {
      return res.status(400).json({ error: `invalid status: ${updates.status}` });
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'no editable fields in body' });
    const before = await findRowByRowNum(rowNum);
    pushLog(`[api] edit ${rowTag(before)} R${rowNum} ${Object.keys(updates).join(',')}`);
    await updateRow(XLSX, rowNum, updates);
    const row = await findRowByRowNum(rowNum);

    // 自動発火: status=PR作成待ち かつ 承認者記入済み → pr-publisher をバックグラウンドで起動
    let autoTrigger = null;
    if (row && row.status === 'PR作成待ち' && row.approver) {
      autoTrigger = { agent: 'pr-publisher', id: row.id, trackId: row.trackId };
      pushLog(`[auto] ${rowTag(row)} triggering pr-publisher (approver=${row.approver})`);
      // 非同期でバックグラウンド実行 (レスポンスは待たない)
      advanceRowToGate(row.id, {}).catch(err => pushLog(`[auto] ${rowTag(row)} pr-publisher error: ${err.message}`));
    }

    res.json({ ok: true, row, autoTrigger });
  } catch (err) { next(err); }
});

// 1段だけ進める (デバッグ用)
app.post('/api/step/:rowId', async (req, res, next) => {
  try {
    const row = await findRowById(req.params.rowId);
    pushLog(`[api] step ${rowTag(row)} (single stage)`);
    const result = await processRowById(req.params.rowId, {});
    res.json(result);
  } catch (err) { next(err); }
});

// 次のゲートまで連続実行 (演者操作の本命)
app.post('/api/advance/:rowId', async (req, res, next) => {
  try {
    const row = await findRowById(req.params.rowId);
    pushLog(`[api] advance ${rowTag(row)} (to next gate)`);
    const result = await advanceRowToGate(req.params.rowId, {});
    res.json(result);
  } catch (err) { next(err); }
});

app.get('/api/logs', (req, res) => {
  res.json({ logs: recentLogs.slice(-100) });
});

const CONSOLE_SOURCES = {
  robomart: '/tmp/robomart.log',
  watchdog: '/tmp/watchdog.log',
  webui:    '/tmp/webui.log',
  driver:   '/tmp/driver.log',
  applog:   APP_LOG,
};

app.get('/api/console', (req, res) => {
  const source = req.query.source || 'robomart';
  const lines = Math.min(500, Number(req.query.lines) || 80);
  const filePath = CONSOLE_SOURCES[source];
  if (!filePath) return res.status(400).json({ error: `unknown source. valid: ${Object.keys(CONSOLE_SOURCES).join(',')}` });
  if (!fs.existsSync(filePath)) return res.json({ source, path: filePath, lines: [], missing: true });
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const arr = content.split(/\r?\n/).filter(Boolean);
    res.json({ source, path: filePath, lines: arr.slice(-lines) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function collectPrUrls() {
  if (!fs.existsSync(XLSX)) return [];
  const rows = await readRows(XLSX);
  const urls = [];
  for (const r of rows) {
    const v = String(r.pr_url || '');
    const m = v.match(/https:\/\/github\.com\/([^\/]+\/[^\/]+)\/pull\/(\d+)/);
    if (m) urls.push({ repo: m[1], number: Number(m[2]), url: m[0], rowId: r.id, trackId: r.trackId });
  }
  return urls;
}

function runGh(args) {
  return new Promise((resolve) => {
    execFile('gh', args, { timeout: 60000 }, (err, stdout, stderr) => {
      resolve({ code: err ? (err.code || 1) : 0, stdout, stderr, err: err && err.message });
    });
  });
}

const DEMO_APP_TEMPLATES = path.join(DEMO_APP, '.demo-templates');
const DEMO_APP_PORT = Number(process.env.PORT || 3002);
let demoAppPid = null;

// port 3002 を listen している node プロセスだけを狙って kill (bash tool 誤爆防止)
function killDemoApp() {
  return new Promise((resolve) => {
    execFile('bash', ['-c', `ss -tlnp 2>/dev/null | awk '$4 ~ /:${DEMO_APP_PORT}$/ {print $NF}' | grep -oP 'pid=\\K\\d+' | sort -u`], { timeout: 5000 }, (err, stdout) => {
      const pids = (stdout || '').split(/\s+/).filter(Boolean).map(Number).filter(Number.isInteger);
      for (const pid of pids) {
        try { process.kill(pid, 'SIGTERM'); pushLog(`[reset] SIGTERM sent to demo-app pid ${pid}`); } catch (e) { pushLog(`[reset] kill ${pid} failed: ${e.message}`); }
      }
      setTimeout(resolve, 800);
    });
  });
}

function startDemoApp() {
  const out = fs.openSync('/tmp/robomart.log', 'a');
  const child = spawn('node', ['server.js'], {
    cwd: DEMO_APP,
    detached: true,
    stdio: ['ignore', out, out],
    env: { ...process.env, PORT: String(DEMO_APP_PORT) },
  });
  child.unref();
  demoAppPid = child.pid;
  return child.pid;
}

function walkFiles(root) {
  const results = [];
  function recur(dir) {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) recur(abs);
      else if (stat.isFile() && !name.startsWith('.') && name !== 'README.md') results.push(abs);
    }
  }
  if (fs.existsSync(root)) recur(root);
  return results;
}

async function restoreDemoTemplates() {
  const restored = [];
  const errors = [];
  const files = walkFiles(DEMO_APP_TEMPLATES);
  for (const src of files) {
    const rel = path.relative(DEMO_APP_TEMPLATES, src);
    const dst = path.join(DEMO_APP, rel);
    try {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      restored.push(rel);
    } catch (e) {
      errors.push({ target: rel, error: e.message });
    }
  }
  return { restored, errors };
}

function runGit(args) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd: REPO_ROOT, timeout: 30000 }, (err, stdout, stderr) => {
      resolve({ code: err ? (err.code || 1) : 0, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() });
    });
  });
}

// デモで作られた fix/inc* ローカルブランチを削除する。
// 現在チェックアウト中のブランチは削除できないので、リポジトリを汚さないよう
// 対象ブランチにいる場合はブランチ切替をせず、削除できるものだけ削除する。
async function cleanupFixBranches() {
  const deleted = [];
  const errors = [];
  const cur = await runGit(['branch', '--show-current']);
  const currentBranch = cur.stdout;
  const list = await runGit(['branch', '--list', 'fix/inc*']);
  const branches = (list.stdout || '')
    .split('\n')
    .map(s => s.replace(/^[*+ ]+/, '').trim())
    .filter(Boolean);
  for (const b of branches) {
    if (b === currentBranch) {
      errors.push({ branch: b, error: 'currently checked out — skipped (手動で切替後に削除してください)' });
      continue;
    }
    const r = await runGit(['branch', '-D', b]);
    if (r.code === 0) { deleted.push(b); pushLog(`[reset] deleted local branch ${b}`); }
    else errors.push({ branch: b, error: r.stderr });
  }
  return { deleted, errors, currentBranch };
}

app.post('/api/reset', async (req, res, next) => {
  try {
    const closePrs = req.body && req.body.closePrs !== false;
    const restoreCode = req.body && req.body.restoreCode !== false;
    const cleanBranches = req.body && req.body.cleanBranches !== false;
    const summary = { closedPrs: [], deletedBranches: [], errors: [], restoredFiles: [], demoAppRestarted: false, localBranchesDeleted: [] };

    if (closePrs) {
      const urls = await collectPrUrls();
      for (const p of urls) {
        const tag = `[${p.rowId || '?'}${p.trackId ? ` TrackID:${p.trackId}` : ''}]`;
        pushLog(`[reset] ${tag} closing PR ${p.repo}#${p.number}`);
        const r = await runGh(['pr', 'close', String(p.number), '--repo', p.repo, '--delete-branch']);
        if (r.code === 0) {
          summary.closedPrs.push({ repo: p.repo, number: p.number, rowId: p.rowId, trackId: p.trackId });
          summary.deletedBranches.push({ repo: p.repo, number: p.number });
        } else if ((r.stderr || '').match(/already closed|Not Found/i)) {
          summary.closedPrs.push({ repo: p.repo, number: p.number, rowId: p.rowId, trackId: p.trackId, note: 'already closed' });
        } else {
          summary.errors.push({ target: `PR#${p.number} ${tag}`, error: r.stderr || r.err });
        }
      }
    }

    if (fs.existsSync(TEMPLATE_PATH)) {
      fs.copyFileSync(TEMPLATE_PATH, XLSX);
      pushLog(`[reset] Excel reset from template`);
    } else {
      summary.errors.push({ target: 'template', error: `${TEMPLATE_PATH} not found` });
    }

    try {
      fs.writeFileSync(APP_LOG, '');
      pushLog(`[reset] logs/app.log truncated`);
    } catch (e) {
      summary.errors.push({ target: APP_LOG, error: e.message });
    }

    if (restoreCode) {
      const { restored, errors } = await restoreDemoTemplates();
      summary.restoredFiles = restored;
      summary.errors.push(...errors);
      pushLog(`[reset] restored ${restored.length} template file(s): ${restored.join(', ')}`);

      pushLog(`[reset] restarting demo-app (SIGTERM + respawn)`);
      await killDemoApp();
      const pid = startDemoApp();
      pushLog(`[reset] demo-app restarted with pid ${pid}`);
      summary.demoAppRestarted = true;
    }

    if (cleanBranches) {
      const { deleted, errors, currentBranch } = await cleanupFixBranches();
      summary.localBranchesDeleted = deleted;
      summary.errors.push(...errors.map(e => ({ target: `branch ${e.branch}`, error: e.error })));
      if (deleted.length) pushLog(`[reset] deleted ${deleted.length} local fix/inc* branch(es)`);
      if (errors.length) pushLog(`[reset] ${errors.length} branch(es) could not be deleted (current=${currentBranch})`);
    }

    res.json({ ok: true, summary });
  } catch (err) { next(err); }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'web-ui.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`[web-ui] listening on http://localhost:${PORT}`);
  console.log(`[web-ui] xlsx = ${XLSX}`);
  console.log(`[web-ui] editable fields = ${[...EDITABLE_FIELDS].join(', ')}`);
  console.log(`[web-ui] gh repo (for PR reset) = ${REPO_SLUG}`);
});
