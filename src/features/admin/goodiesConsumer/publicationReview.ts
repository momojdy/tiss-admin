/** Publication validates content structure and placeholders, not translation review status.
 * Translation review remains an independent editorial workflow. */
export function goodiesPublicationErrors(draft: any): string[] {
  const errors: string[] = [];
  for (const entry of draft?.faq || []) {
    if (/^\s*answer coming soon[.!]?\s*$/i.test(entry.a?.en?.v || ''))
      errors.push('Replace placeholder FAQ answers before publishing.');
  }
  return errors;
}
