/** Plain YYYY-MM-DD date helpers (UTC, so they never drift with the device time zone). */
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const utc = (s: string) => Date.parse(s + 'T00:00:00Z');
export const validDate = (s: string) => DATE.test(s) && !isNaN(utc(s)) && new Date(utc(s)).toISOString().slice(0, 10) === s;
export const addDays = (s: string, n: number) => new Date(utc(s) + n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((utc(b) - utc(a)) / 86400000);
export const realToday = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
