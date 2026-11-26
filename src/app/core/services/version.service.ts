import { DOCUMENT, DestroyRef, Injectable, InjectionToken, inject, signal } from '@angular/core';
import { BuildInfo, buildInfo } from '../build-info';

/** fetch(), injectable so tests can answer without a network. */
export const FETCH = new InjectionToken<typeof fetch>('fetch', { factory: () => globalThis.fetch.bind(globalThis) });
/** The build that is running; injectable so tests can pretend to be a deployed build. */
export const RUNNING_BUILD = new InjectionToken<BuildInfo | null>('running build', { factory: () => buildInfo });

export const GITHUB_API = 'https://api.github.com/repos/AlexSchmitz222/blinkenlights';
const BRANCH = 'main';
/** Re-check version.json at most this often when the tab becomes visible again. */
const RECHECK_AFTER = 5 * 60_000;

/**
 * Compared with GitHub:
 * - current: the running build is the newest commit on main
 * - behind: main has `count` newer commits that are not in this build (not deployed yet, or the deployment failed)
 * - ahead: this build is newer than main (a local build of unpushed work)
 * - unknown: GitHub doesn't know the commit (a local commit), or the check couldn't run
 */
export type GithubStatus =
  | { state: 'checking' }
  | { state: 'current' }
  | { state: 'behind'; count: number }
  | { state: 'ahead' }
  | { state: 'unknown' }
  | { state: 'skipped' };

/**
 * Tells whether the running app is up to date:
 * - `reloadAvailable`: a newer version has been deployed than the one this browser runs (version.json)
 * - `github`: how the running build relates to the newest commit on GitHub
 */
@Injectable({ providedIn: 'root' })
export class VersionService {
  private fetch = inject(FETCH);
  private document = inject(DOCUMENT);
  private running = inject(RUNNING_BUILD);

  readonly reloadAvailable = signal(false);
  readonly github = signal<GithubStatus>({ state: this.running ? 'checking' : 'skipped' });

  private started = false;
  private lastCheck = 0;

  /** Starts the checks once (development builds skip them). */
  start(destroyRef?: DestroyRef) {
    if (this.started || !this.running) return;
    this.started = true;
    void this.checkDeployed();
    void this.checkGithub();

    // a tab that stays open for days should still notice new deployments
    const onVisible = () => {
      if (this.document.visibilityState === 'visible' && Date.now() - this.lastCheck > RECHECK_AFTER) void this.checkDeployed();
    };
    this.document.addEventListener('visibilitychange', onVisible);
    destroyRef?.onDestroy(() => this.document.removeEventListener('visibilitychange', onVisible));
  }

  reload() {
    this.document.location.reload();
  }

  /** Compares the running build with version.json on the server (never from the cache). */
  async checkDeployed() {
    if (!this.running) return;
    this.lastCheck = Date.now();
    try {
      const response = await this.fetch(new URL('version.json', this.document.baseURI).href, { cache: 'no-store' });
      if (!response.ok) return; // e.g. ng serve: there is no version.json
      const deployed = (await response.json()) as { commit?: string };
      this.reloadAvailable.set(!!deployed.commit && deployed.commit !== this.running.commit);
    } catch {
      // offline: nothing to say
    }
  }

  /** Asks GitHub how the running commit relates to the newest one on main. */
  async checkGithub() {
    if (!this.running) return;
    if (this.isLocal()) {
      // only the published site is compared with GitHub (local builds are usually ahead anyway)
      this.github.set({ state: 'skipped' });
      return;
    }
    try {
      const response = await this.fetch(`${GITHUB_API}/compare/${this.running.commit}...${BRANCH}`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!response.ok) {
        this.github.set({ state: 'unknown' });
        return;
      }
      // compare base...head: "ahead" means main (head) has commits the running build (base) doesn't
      const result = (await response.json()) as { status?: string; ahead_by?: number };
      if (result.status === 'identical') this.github.set({ state: 'current' });
      else if (result.status === 'ahead') this.github.set({ state: 'behind', count: result.ahead_by ?? 1 });
      else if (result.status === 'behind') this.github.set({ state: 'ahead' });
      else this.github.set({ state: 'unknown' });
    } catch {
      this.github.set({ state: 'unknown' });
    }
  }

  private isLocal(): boolean {
    return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(this.document.location?.hostname ?? '');
  }
}
