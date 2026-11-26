#!/usr/bin/env node
/**
 * Production build with build information baked in (shown on the start page):
 * commit, commit subject, build time and whether there were uncommitted changes.
 *
 *   node scripts/build.mjs          → dist/ for serving at /
 *   node scripts/build.mjs --pages  → dist/ for GitHub Pages (/blinkenlights/) + 404.html for direct links
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';

const pages = process.argv.includes('--pages');

function git(...args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

// On GitHub Actions the commit comes from the environment; locally from git.
const commit = process.env.GITHUB_SHA || git('rev-parse', 'HEAD');
const info = {
  commit,
  subject: git('log', '-1', '--format=%s', commit || 'HEAD'),
  builtAt: new Date().toISOString(),
  // a local build from a work tree with changes isn't exactly the commit it names
  dirty: !process.env.GITHUB_ACTIONS && git('status', '--porcelain') !== '',
};

const args = ['ng', 'build', '--define', `BUILD_INFO=${JSON.stringify(info)}`];
if (pages) args.push('--base-href', '/blinkenlights/');

console.log(`Building ${info.commit.slice(0, 7) || '(no git)'}${info.dirty ? ' + local changes' : ''}${pages ? ' for GitHub Pages' : ''}`);
const result = spawnSync('npx', args, { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);

if (pages) {
  // GitHub Pages has no app routes: serve the app for every unknown path
  copyFileSync('dist/blinkenlights/browser/index.html', 'dist/blinkenlights/browser/404.html');
}
