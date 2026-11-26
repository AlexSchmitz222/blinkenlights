import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { FETCH, GITHUB_API, RUNNING_BUILD, VersionService } from './version.service';
import { BuildInfo } from '../build-info';

const running: BuildInfo = { commit: 'a'.repeat(40), subject: 'test', builtAt: '2026-11-26T12:00:00Z', dirty: false };

/** A document on the published site (not localhost), with a reload we can watch. */
function fakeDocument(hostname = 'alexschmitz222.github.io') {
  return {
    baseURI: `https://${hostname}/blinkenlights/`,
    location: { hostname, reload: vi.fn() },
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

describe('VersionService', () => {
  function setup(answers: Record<string, () => Promise<Response>>, options: { build?: BuildInfo | null; hostname?: string } = {}) {
    const calls: string[] = [];
    const fetchFn = vi.fn((url: string) => {
      calls.push(url);
      const key = Object.keys(answers).find(k => url.includes(k));
      return key ? answers[key]() : Promise.reject(new Error('offline'));
    });
    const doc = fakeDocument(options.hostname);
    TestBed.configureTestingModule({
      providers: [
        { provide: FETCH, useValue: fetchFn },
        { provide: RUNNING_BUILD, useValue: options.build === undefined ? running : options.build },
        { provide: DOCUMENT, useValue: doc },
      ],
    });
    return { version: TestBed.inject(VersionService), calls, doc };
  }

  it('reports "up to date" when the running build is the newest commit on main', async () => {
    const { version, calls } = setup({ 'version.json': () => json({ commit: running.commit }), '/compare/': () => json({ status: 'identical' }) });
    await version.checkDeployed();
    await version.checkGithub();
    expect(version.reloadAvailable()).toBe(false);
    expect(version.github()).toEqual({ state: 'current' });
    expect(calls).toContain(`${GITHUB_API}/compare/${running.commit}...main`);
  });

  it('counts newer commits on main that are not published yet', async () => {
    const { version } = setup({ '/compare/': () => json({ status: 'ahead', ahead_by: 3 }) });
    await version.checkGithub();
    expect(version.github()).toEqual({ state: 'behind', count: 3 });
  });

  it('recognises a build that is newer than GitHub, and commits GitHub does not know', async () => {
    let answer = json({ status: 'behind', behind_by: 2 });
    const { version } = setup({ '/compare/': () => answer });
    await version.checkGithub();
    expect(version.github()).toEqual({ state: 'ahead' });
    answer = json({ message: 'Not Found' }, 404);
    await version.checkGithub();
    expect(version.github()).toEqual({ state: 'unknown' });
  });

  it('offers a reload when a newer version has been deployed than the one running', async () => {
    const { version, doc } = setup({ 'version.json': () => json({ commit: 'b'.repeat(40) }) });
    await version.checkDeployed();
    expect(version.reloadAvailable()).toBe(true);
    version.reload();
    expect(doc.location.reload).toHaveBeenCalled();
  });

  it('asks the server for version.json without using the cache', async () => {
    const fetchFn = vi.fn(() => json({ commit: running.commit }));
    TestBed.configureTestingModule({
      providers: [
        { provide: FETCH, useValue: fetchFn },
        { provide: RUNNING_BUILD, useValue: running },
        { provide: DOCUMENT, useValue: fakeDocument() },
      ],
    });
    await TestBed.inject(VersionService).checkDeployed();
    expect(fetchFn).toHaveBeenCalledWith('https://alexschmitz222.github.io/blinkenlights/version.json', { cache: 'no-store' });
  });

  it('stays quiet when offline or without version.json (ng serve)', async () => {
    const { version } = setup({});
    await version.checkDeployed();
    await version.checkGithub();
    expect(version.reloadAvailable()).toBe(false);
    expect(version.github()).toEqual({ state: 'unknown' });
  });

  it('does not ask GitHub for local builds', async () => {
    const { version, calls } = setup({ 'version.json': () => json({ commit: running.commit }) }, { hostname: 'localhost' });
    await version.checkGithub();
    expect(version.github()).toEqual({ state: 'skipped' });
    expect(calls.some(c => c.includes('api.github.com'))).toBe(false);
  });

  it('does nothing in development builds', () => {
    const { version, calls } = setup({}, { build: null });
    version.start();
    expect(calls).toEqual([]);
    expect(version.github()).toEqual({ state: 'skipped' });
  });
});
