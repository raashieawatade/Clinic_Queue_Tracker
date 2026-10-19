// One-time setup: installs dependencies, creates .env files and makes sure MongoDB is available.
// Usage (from the project root):  npm run setup
const path = require('path');
const { BACKEND, FRONTEND, log, ensureEnvFiles, npmInstall, ensureMongo } = require('./common');

async function main() {
  const force = process.argv.includes('--force');

  ensureEnvFiles();
  npmInstall(BACKEND, force);
  npmInstall(FRONTEND, force);

  const mongod = await ensureMongo();
  if (mongod) log(`MongoDB server ready: ${path.relative(process.cwd(), mongod) || mongod}`);

  log('Setup complete. Start the app with:  npm start   (or double-click start.bat)');
}

main().catch((err) => {
  console.error(`[setup] ERROR: ${err.message}`);
  process.exit(1);
});
