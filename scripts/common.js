// Shared helpers for setup.js and start.js (Node built-ins only, no extra dependencies).
const fs = require('fs');
const net = require('net');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const MONGO_DIR = path.join(ROOT, 'mongodb');
const MONGO_BIN = path.join(MONGO_DIR, 'bin', process.platform === 'win32' ? 'mongod.exe' : 'mongod');
const MONGO_DATA = path.join(MONGO_DIR, 'data');
const MONGO_PORT = 27017;
const MONGO_VERSION = '7.0.14';

function log(message) {
  console.log(`[setup] ${message}`);
}

// "localhost" servers may listen on IPv4 (127.0.0.1) or IPv6 (::1) only, so check both.
async function isPortOpen(port) {
  return (await canConnect(port, '127.0.0.1')) || (await canConnect(port, '::1'));
}

function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function randomString(length) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

// Creates backend/.env and frontend/.env if they don't exist. Existing files are never overwritten.
function ensureEnvFiles() {
  const backendEnv = path.join(BACKEND, '.env');
  if (!fs.existsSync(backendEnv)) {
    fs.writeFileSync(
      backendEnv,
      [
        'PORT=5000',
        `MONGO_URI=mongodb://127.0.0.1:${MONGO_PORT}/clinic-queue`,
        'RECEPTIONIST_USERNAME=reception',
        `RECEPTIONIST_PASSWORD=${randomString(16)}`,
        `AUTH_SECRET=${randomString(64)}`,
        '',
      ].join('\n')
    );
    log('Created backend/.env with a generated receptionist password');
  }

  const frontendEnv = path.join(FRONTEND, '.env');
  if (!fs.existsSync(frontendEnv)) {
    fs.writeFileSync(frontendEnv, 'VITE_API_URL=http://localhost:5000/api\n');
    log('Created frontend/.env');
  }
}

function readEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

function npmInstall(dir, force = false) {
  if (!force && fs.existsSync(path.join(dir, 'node_modules'))) return;
  log(`Installing dependencies in ${path.relative(ROOT, dir)}/ ...`);
  const result = spawnSync('npm', ['install', '--no-fund', '--no-audit'], {
    cwd: dir,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(`npm install failed in ${path.relative(ROOT, dir)}/`);
  }
}

// Returns the path of a mongod executable we can launch, or null if MongoDB is already running.
// Order: running server on 27017 -> mongod on PATH -> bundled mongodb/bin -> download (Windows).
async function ensureMongo() {
  if (await isPortOpen(MONGO_PORT)) {
    log(`MongoDB is already running on port ${MONGO_PORT}`);
    return null;
  }

  if (fs.existsSync(MONGO_BIN)) return MONGO_BIN;

  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['mongod'], {
    encoding: 'utf8',
  });
  if (which.status === 0 && which.stdout.trim()) {
    return which.stdout.trim().split(/\r?\n/)[0];
  }

  if (process.platform !== 'win32') {
    throw new Error('MongoDB not found. Install MongoDB Community Server and run this again.');
  }

  await downloadMongo();
  return MONGO_BIN;
}

// Downloads the official MongoDB Community Server zip and keeps only mongod.exe.
async function downloadMongo() {
  const url = `https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-${MONGO_VERSION}.zip`;
  const zipPath = path.join(MONGO_DIR, 'mongodb.zip');
  const extractDir = path.join(MONGO_DIR, 'extract');
  fs.mkdirSync(path.dirname(MONGO_BIN), { recursive: true });

  log(`MongoDB not found. Downloading MongoDB ${MONGO_VERSION} (about 600 MB, one time only)...`);
  log(`Source: ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (HTTP ${response.status})`);

  const total = Number(response.headers.get('content-length')) || 0;
  const file = fs.createWriteStream(zipPath);
  let received = 0;
  let lastPercent = -10;
  for await (const chunk of response.body) {
    file.write(chunk);
    received += chunk.length;
    const percent = total ? Math.floor((received / total) * 100) : 0;
    if (percent >= lastPercent + 10) {
      lastPercent = percent;
      log(`  ${percent}%`);
    }
  }
  await new Promise((resolve) => file.end(resolve));

  log('Extracting mongod.exe ...');
  const ps = spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${extractDir}' -Force; ` +
        `Copy-Item (Get-ChildItem -LiteralPath '${extractDir}' -Recurse -Filter mongod.exe | Select-Object -First 1).FullName '${MONGO_BIN}'`,
    ],
    { stdio: 'inherit' }
  );
  fs.rmSync(zipPath, { force: true });
  fs.rmSync(extractDir, { recursive: true, force: true });
  if (ps.status !== 0 || !fs.existsSync(MONGO_BIN)) {
    throw new Error('Could not extract MongoDB. Install MongoDB Community Server manually.');
  }
  log('MongoDB downloaded');
}

module.exports = {
  ROOT,
  BACKEND,
  FRONTEND,
  MONGO_DATA,
  MONGO_PORT,
  log,
  isPortOpen,
  waitForPort,
  ensureEnvFiles,
  readEnv,
  npmInstall,
  ensureMongo,
};
