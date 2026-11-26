/**
 * Small, fast, seedable pseudo-random generator (mulberry32). The same seed always gives the same
 * numbers, on every device: sparkles are stored as (density, seed) and drawn from it.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random whole number to use as a seed. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
