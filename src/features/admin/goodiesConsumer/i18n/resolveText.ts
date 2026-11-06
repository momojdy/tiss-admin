import type {LangCode, Txt} from '../data/types.ts';

/** Production never promotes a machine draft to a reviewed translation. */
export function resolveGoodiesText(value: Txt | string | null | undefined, locale: LangCode, allowDrafts = false): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const entry = value[locale];
  const eligible = entry?.v && (entry.s === 'reviewed' || (allowDrafts && (locale !== 'ht' || entry.s !== 'missing')));
  return eligible ? entry.v : value.en?.v || '';
}
