/** Design tokens, taken from the admin HTML's CSS variables (light and dark). */
export interface Palette {
  ink: string; on: string; gr: string; or: string; ye: string;
  card: string; inset: string; mut: string; bd: string;
  b1: string; b2: string; b3: string; out: string;
  /** fixed accents used directly in the HTML */
  blue: string; grey: string; night: string; forest: string; overlay: string;
}

const fixed = { blue: '#1a6fd6', grey: '#8a8d85', night: '#16191a', forest: '#2d5e4f' };

export const lightPalette: Palette = {
  ink: '#161a17', on: '#ffffff', gr: '#2f5d4e', or: '#d1481d', ye: '#f2c94c',
  card: 'rgba(251,250,245,0.84)', inset: 'rgba(0,0,0,0.05)', mut: '#7b7d76', bd: 'rgba(0,0,0,0.07)',
  b1: '#f6e4d2', b2: '#eef0e4', b3: '#e1ecdc', out: '#d8d5cc',
  overlay: 'rgba(236,232,220,0.5)', ...fixed,
};

export const darkPalette: Palette = {
  ink: '#f2efe6', on: '#161a17', gr: '#2f5d4e', or: '#d1481d', ye: '#f2c94c',
  card: 'rgba(36,40,37,0.86)', inset: 'rgba(255,255,255,0.07)', mut: '#a3a69d', bd: 'rgba(255,255,255,0.09)',
  b1: '#3a2c22', b2: '#232823', b3: '#1d2a22', out: '#101211',
  overlay: 'rgba(16,18,17,0.55)', ...fixed,
};

export const fonts = {
  300: 'Outfit_300Light',
  400: 'Outfit_400Regular',
  500: 'Outfit_500Medium',
  600: 'Outfit_600SemiBold',
} as const;
export type Weight = keyof typeof fonts;

/** Status colour names used by the data layer ('var(--gr)' in the HTML). */
export type Tone = 'gr' | 'or' | 'ye' | 'blue' | 'grey' | 'ink' | 'mut' | string;
export const toneColor = (p: Palette, t: Tone | undefined): string => {
  switch (t) {
    case 'gr': return p.gr; case 'or': return p.or; case 'ye': return p.ye;
    case 'blue': return p.blue; case 'grey': return p.grey; case 'ink': return p.ink; case 'mut': return p.mut;
    default: return t || p.ye;
  }
};

/** Status label to tone, mirrors SC in the HTML. */
export const STATUS_TONE: Record<string, Tone> = {
  Completed: 'gr', Pending: 'ye', Failed: 'or', Refunded: 'blue', 'Refund pending': 'blue',
  Submitted: 'ye', 'In review': 'gr', 'Needs info': 'or', Approved: 'blue', Rejected: 'grey',
  Live: 'gr', Scheduled: 'ye', Draft: '#aaaaaa', Paused: 'grey', Expired: 'grey', Archived: 'grey',
  verified: 'gr', pending: 'ye', rejected: 'or', missing: 'or', expired: 'or',
  Active: 'gr', Invited: 'ye', Open: 'ye', Escalated: 'or', Resolved: 'gr', Cancelled: 'grey',
  Accepted: 'gr', Discrepancy: 'or', Paid: 'gr',
};
