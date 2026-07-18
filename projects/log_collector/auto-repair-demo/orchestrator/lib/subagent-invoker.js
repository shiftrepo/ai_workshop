const { spawn } = require('child_process');

function invokeClaude(agentName, input, opts = {}) {
  const timeoutMs = opts.timeoutMs || 180000;
  const model = opts.model || process.env.CLAUDE_MODEL || 'us.anthropic.claude-sonnet-5';
  return new Promise((resolve, reject) => {
    const args = ['--agent', agentName, '--print', '--model', model];
    const child = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
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
      resolve({ stdout, stderr });
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

module.exports = { invokeClaude, extractJson };
