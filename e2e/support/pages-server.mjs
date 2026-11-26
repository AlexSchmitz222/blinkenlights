/**
 * Serves the GitHub Pages build (npm run build:pages) the way GitHub Pages does: under /blinkenlights/,
 * with 404.html (a copy of the app) for unknown paths. Used to run the UI tests against the real
 * deployment build:  npm run test:ui:pages
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist/blinkenlights/browser');
const prefix = '/blinkenlights';
const port = Number(process.env.PORT ?? 4400);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain',
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith(prefix + '/')) {
    res.writeHead(302, { location: prefix + '/' }).end();
    return;
  }
  const relative = decodeURIComponent(url.pathname.slice(prefix.length + 1)) || 'index.html';
  const file = path.join(root, relative);
  try {
    if (!file.startsWith(root)) throw new Error('outside');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    // GitHub Pages answers unknown paths with 404.html and status 404 (FALLBACK_STATUS only for experiments)
    res.writeHead(Number(process.env.FALLBACK_STATUS ?? 404), { 'content-type': types['.html'] }).end(await readFile(path.join(root, '404.html')));
  }
}).listen(port, () => console.log(`GitHub Pages build on http://localhost:${port}${prefix}/`));
