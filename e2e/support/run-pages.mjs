/**
 * Runs the UI tests against the GitHub Pages build, served like GitHub Pages serves it
 * (sub-path /blinkenlights/, 404.html fallback). Build first: npm run build:pages.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const port = 4400;
const base = `http://localhost:${port}/blinkenlights`;

const server = spawn(process.execPath, [path.join(here, 'pages-server.mjs')], { env: { ...process.env, PORT: String(port) }, stdio: 'inherit' });

const deadline = Date.now() + 15_000;
for (;;) {
  try {
    if ((await fetch(base + '/')).ok) break;
  } catch {
    // not up yet
  }
  if (Date.now() > deadline) {
    server.kill();
    throw new Error('Pages test server did not start');
  }
  await new Promise(r => setTimeout(r, 200));
}

const tests = spawn(process.execPath, ['--test', '--test-concurrency=1', 'e2e/**/*.e2e.mjs'], {
  cwd: root,
  env: { ...process.env, E2E_BASE_URL: base },
  stdio: 'inherit',
});
tests.on('exit', code => {
  server.kill();
  process.exit(code ?? 1);
});
