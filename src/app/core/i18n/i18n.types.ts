/** Same structure as T, but every text may be any string (used to type translations of en.ts). */
export type Dictionary<T> = { [K in keyof T]: T[K] extends string ? string : Dictionary<T[K]> };

/** All dotted keys of a dictionary that point to a text, e.g. 'shows.title'. */
export type TranslationPath<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : TranslationPath<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationParams = Record<string, string | number>;
