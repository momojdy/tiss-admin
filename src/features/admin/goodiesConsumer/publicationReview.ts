import criticalKeys from './criticalContentKeys.json';

/** Local feedback mirrors the database publication guard; it never marks text reviewed. */
export function goodiesPublicationErrors(draft: any): string[] {
  const errors: string[] = [], keys = new Set(criticalKeys);
  const check = (text: any, name: string) => {
    if (!text || typeof text !== 'object') return;
    for (const [locale, translation] of Object.entries(text) as [string, any][]) {
      if (locale === 'ht' && translation?.s !== 'reviewed') {
        const english = text.en;
        if (typeof english?.v !== 'string' || !english.v.trim() || english.s !== 'reviewed') errors.push(`${name} needs reviewed English for Haitian Creole fallback.`);
        continue;
      }
      if (String(translation?.v || '').trim() && translation.s !== 'reviewed' && (locale !== 'en' || translation.s)) errors.push(`${name} (${locale}) needs review before publishing.`);
    }
  };
  for (const entry of draft?.labels || []) if (keys.has(entry.id)) check(entry.t, entry.id);
  for (const entry of draft?.faq || []) {
    if (/^\s*answer coming soon[.!]?\s*$/i.test(entry.a?.en?.v || '')) errors.push('Replace placeholder FAQ answers before publishing.');
    check(entry.q,'FAQ question');check(entry.a,'FAQ answer');
  }
  for (const entry of draft?.legal || []) if (entry.st === 'Live') check(entry.t,'Policy');
  for (const entry of draft?.topics || []) check(entry.t,'Support topic');
  for (const entry of draft?.rg?.texts || []) check(entry.t,entry.id);
  return errors;
}
