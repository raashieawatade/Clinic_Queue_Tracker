// Starts MongoDB (if needed), the backend API and the frontend, then opens the browser.
// Usage (from the project root):  npm start      Stop everything with Ctrl + C.
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const {
  BACKEND,
  FRONTEND,
  MONGO_DATA,
  MONGO_PORT,
  isPortOpen,
  waitForPort,
  ensureEnvFiles,
  readEnv,
  npmInstall,
  ensureMongo,
} = require('./common');

const APP_URL = 'http://localhost:5173';
const children = [];

function log(message) {
  console.log(`[start] ${message}`);
}

// Runs a process and prefixes each output line with a label, e.g. "[api] Server running".
function run(label, command, args, cwd) {
  const child = spawn(command, args, { cwd, windowsHide: true });
  const prefix = (stream, out) => {
    let buffer = '';
    stream.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) if (line.trim()) out.write(`[${label}] ${line}\n`);
    });
  };
  prefix(child.stdout, process.stdout);
  prefix(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[${label}] stopped unexpectedly (exit code ${code}). Shutting down.`);
      shutdown(1);
    }
  });
  children.push(child);
  return child;
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  log('Stopping all services...');
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGINT');
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function openBrowser(url) {
  const opener =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).unref();
}

async function main() {
  // Make sure setup has been done (fast no-op when everything is already in place).
  ensureEnvFiles();
  npmInstall(BACKEND);
  npmInstall(FRONTEND);

  for (const [port, name] of [
    [5000, 'backend'],
    [5173, 'frontend'],
  ]) {
    if (await isPortOpen(port)) {
      throw new Error(
        `Port ${port} (${name}) is already in use. Is the app already running? Close it and try again.`
      );
    }
  }

  // 1. MongoDB
  const mongod = await ensureMongo();
  if (mongod) {
    fs.mkdirSync(MONGO_DATA, { recursive: true });
    log('Starting MongoDB...');
    run(
      'mongo',
      mongod,
      ['--dbpath', MONGO_DATA, '--port', String(MONGO_PORT), '--bind_ip', '127.0.0.1', '--quiet', '--logpath', path.join(MONGO_DATA, 'mongod.log'), '--logappend'],
      path.dirname(MONGO_DATA)
    );
    if (!(await waitForPort(MONGO_PORT, 30000))) {
      throw new Error('MongoDB did not start. See mongodb/data/mongod.log for details.');
    }
    log(`MongoDB running on port ${MONGO_PORT}`);
  }

  // 2. Backend API
  log('Starting backend...');
  run('api', process.execPath, ['server.js'], BACKEND);
  if (!(await waitForPort(5000, 30000))) throw new Error('Backend did not start.');

  // 3. Frontend
  log('Starting frontend...');
  run(
    'web',
    process.execPath,
    [path.join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', '5173', '--strictPort'],
    FRONTEND
  );
  if (!(await waitForPort(5173, 30000))) throw new Error('Frontend did not start.');

  const env = readEnv(path.join(BACKEND, '.env'));
  console.log('');
  console.log('==========================================================');
  console.log('  Clinic Queue Tracker is running');
  console.log(`  App:          ${APP_URL}`);
  console.log('  API:          http://localhost:5000/api/health');
  console.log(`  Receptionist: username "${env.RECEPTIONIST_USERNAME || 'reception'}"`);
  console.log('                password is RECEPTIONIST_PASSWORD in backend/.env');
  console.log('  Press Ctrl + C to stop everything.');
  console.log('==========================================================');
  console.log('');

  if (!process.argv.includes('--no-browser')) openBrowser(APP_URL);
}

main().catch((err) => {
  console.error(`[start] ERROR: ${err.message}`);
  shutdown(1);
});
