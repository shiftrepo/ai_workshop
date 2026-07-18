const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// このツール専用の設定 (親 Claude Code セッションの CLAUDE_EFFORT/ANTHROPIC_MODEL から独立)
const CONFIG_PATH = path.join(__dirname, '..', 'demo-config.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { model: 'us.anthropic.claude-sonnet-5', defaultEffort: 'low', agents: {} };
  }
}

function resolveSettings(agentName, opts = {}) {
  const cfg = loadConfig();
  const agentCfg = (cfg.agents && cfg.agents[agentName]) || {};
  return {
    model: opts.model || agentCfg.model || cfg.model || 'us.anthropic.claude-sonnet-5',
    effort: opts.effort || agentCfg.effort || cfg.defaultEffort || 'low',
    timeoutMs: opts.timeoutMs || agentCfg.timeoutMs || 180000,
  };
}

function invokeClaude(agentName, input, opts = {}) {
  const { model, effort, timeoutMs } = resolveSettings(agentName, opts);
  return new Promise((resolve, reject) => {
    const args = ['--agent', agentName, '--print', '--model', model, '--effort', effort];
    // このツールは親セッションの CLAUDE_EFFORT を継承しない (独立設定)。
    // AWS/Bedrock 認証系の環境変数は必要なので、effort 系だけを config 値で上書きする。
    const childEnv = { ...process.env, CLAUDE_EFFORT: effort };
    delete childEnv.CLAUDE_CODE_CHILD_SESSION; // 親セッションの effort 引き継ぎを断つ
    const child = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: childEnv,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`agent ${agentName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', err => { clearTimeout(timer); reject(err); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`agent ${agentName} exited ${code}\nstderr: ${stderr}`));
      resolve({ stdout, stderr, effort, model });
    });
    child.stdin.write(typeof input === 'string' ? input : JSON.stringify(input));
    child.stdin.end();
  });
}

function extractJson(text) {
  const fence = text.match(/```json\s*([\s\S]*?)```/);
  const src = fence ? fence[1] : text;
  const start = src.indexOf('{');
  const end = src.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(src.slice(start, end + 1));
  } catch {
    return null;
  }
}

module.exports = { invokeClaude, extractJson, loadConfig, resolveSettings };
