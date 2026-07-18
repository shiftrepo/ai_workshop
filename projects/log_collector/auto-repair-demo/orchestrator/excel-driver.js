#!/usr/bin/env node
const { tickAll, XLSX, setLogSink } = require('./lib/driver-core');

const POLL_MS = Number(process.env.POLL_MS || 3000);
const DRY_RUN = process.argv.includes('--dry-run');
const ONCE = process.argv.includes('--once');

function log(msg) { console.log(`[driver ${new Date().toISOString()}] ${msg}`); }
setLogSink(log);

async function main() {
  log(`xlsx=${XLSX}`);
  log(`poll_ms=${POLL_MS} dry_run=${DRY_RUN} once=${ONCE}`);
  if (ONCE) {
    await tickAll({ dryRun: DRY_RUN });
    return;
  }
  const iv = setInterval(() => { tickAll({ dryRun: DRY_RUN }).catch(err => log(`tick error: ${err.message}`)); }, POLL_MS);
  process.on('SIGINT', () => { clearInterval(iv); process.exit(0); });
  await tickAll({ dryRun: DRY_RUN });
}

main().catch(err => { console.error(err); process.exit(1); });
