/** Pure draft mutations shared by the manual editor and its regression tests. */
export function setLocalizedText(value: any, locale: string, text: string) {
  const next = value && typeof value === 'object' ? {...value} : typeof value === 'string' ? {en:{v:value,s:'draft'}} : {};
  next[locale] = {v: text, s: text.trim() ? 'draft' : 'missing'};
  return next;
}
export function mergeMissingLabels(payload: any, starter: any) {
  const known = new Set((payload.labels || []).map((entry: any) => entry.id));
  const existingTexts = payload.rg?.texts || [];
  const knownTexts = new Set(existingTexts.map((entry: any) => entry.id));
  return {...payload, rg: {...payload.rg, texts: [...existingTexts, ...(starter.rg?.texts || []).filter((entry: any) => !knownTexts.has(entry.id))]}, labels: [...(payload.labels || []), ...(starter.labels || []).filter((entry: any) => !known.has(entry.id))]};
}
export function moveContentEntry(entries: any[], index: number, delta: number) {
  const target = index + delta;
  if (target < 0 || target >= entries.length) return entries.slice();
  const next = entries.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
export function requiredPlaceholders(text: string): string[] {
  return Array.from(new Set(text.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g) || [])).sort();
}

export function contentTextValues(draft: any): any[] {
  const values: any[] = [];
  for (const [list, keys] of Object.entries({labels:['t'],modes:['title','sub'],promos:['title','sub','btn'],cats:['name'],lib:['name'],coupons:['title','desc'],faq:['q','a'],topics:['t'],legal:['t']})) {
    for (const entry of draft?.[list] || []) for (const key of keys) values.push(entry[key]);
  }
  for (const entry of draft?.rg?.texts || []) values.push(entry.t);
  return values;
}
