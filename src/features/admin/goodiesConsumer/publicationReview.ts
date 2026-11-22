import criticalKeys from './criticalContentKeys.json';

/** Pre-publication review feedback; backend authorization remains authoritative. Never marks text reviewed. */
export function goodiesPublicationErrors(draft: any): string[] {
  const errors: string[] = [], keys = new Set(criticalKeys);
  // Publishing the English source must not depend on incomplete translations.
  // Translation review remains visible in the editor and is enforced when a
  // translation is selected for customer display, not as a release gate.
  const check = (text: any, name: string) => {
    if (!text || typeof text !== 'object') return;
    const english = text.en;
    if (english?.s && english.s !== 'reviewed' && String(english.v || '').trim())
      errors.push(`${name} (en) needs review before publishing.`);
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
