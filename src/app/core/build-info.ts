/** Replaced at build time by scripts/build.mjs (`ng build --define BUILD_INFO=…`). Absent in `ng serve`. */
declare const BUILD_INFO: BuildInfo | undefined;

export interface BuildInfo {
  /** Full commit hash. */
  commit: string;
  /** First line of the commit message. */
  subject: string;
  /** ISO timestamp of the build. */
  builtAt: string;
  /** Built locally from a work tree with uncommitted changes. */
  dirty: boolean;
}

/** Information about the running build, or null for a development build. */
export const buildInfo: BuildInfo | null = typeof BUILD_INFO !== 'undefined' ? BUILD_INFO : null;

export const REPOSITORY_URL = 'https://github.com/AlexSchmitz222/blinkenlights';
