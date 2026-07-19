const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const LOG_PATH = path.join(LOG_DIR, 'app.log');
const SERVICE_LOG_PATH = path.join(LOG_DIR, 'service.log');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function genTrackId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7);
}

function iso(now) {
  return new Date(now).toISOString();
}

function writeLine(level, trackId, req, extra, targetPath = LOG_PATH) {
  const ts = iso(Date.now());
  const parts = [
    ts,
    level.padEnd(5, ' '),
    `TrackID:${trackId}`,
    `[${req.originalUrl || req.url}]`,
    `method=${req.method}`,
  ];
  for (const [k, v] of Object.entries(extra || {})) {
    parts.push(`${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`);
  }
  const line = parts.join(' ') + '\n';
  fs.appendFileSync(targetPath, line);
}

function requestLogger(req, res, next) {
  const trackId = genTrackId();
  req.trackId = trackId;
  const start = Date.now();

  writeLine('INFO', trackId, req, {});

  res.on('finish', () => {
    const latency_ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    writeLine(level, trackId, req, {
      status: res.statusCode,
      latency_ms,
    });
  });

  next();
}

function logError(req, err) {
  const trackId = req.trackId || genTrackId();
  const stackTop = (err.stack || '').split('\n')[1] || '';
  writeLine('ERROR', trackId, req, {
    status: 500,
    err: `${err.name}: ${err.message}`,
    at: stackTop.trim(),
  });
}

function logServiceCall(req, serviceName, extra) {
  const trackId = req.trackId || genTrackId();
  writeLine('INFO', trackId, req, { service: serviceName, ...extra }, SERVICE_LOG_PATH);
}

function logServiceError(req, err, serviceName) {
  const trackId = req.trackId || genTrackId();
  const stackTop = (err.stack || '').split('\n')[1] || '';
  writeLine('ERROR', trackId, req, {
    service: serviceName,
    status: 500,
    err: `${err.name}: ${err.message}`,
    at: stackTop.trim(),
  }, SERVICE_LOG_PATH);
}

module.exports = {
  requestLogger, logError, logServiceCall, logServiceError, LOG_PATH, SERVICE_LOG_PATH,
};
