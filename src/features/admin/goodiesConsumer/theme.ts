/* Design tokens copied from Goodies v24 CSS custom properties. */
export type Theme = typeof light;
export const light = {
  dark: false,
  bg: '#FFFFFF', soft: '#F4F4F5', card: '#FFFFFF', line: '#EAEAEC', ink: '#1B1B1F', mut: '#74747C',
  br: '#FD802E', brd: '#E5661A', brt: '#FFF0E5', sun: '#FFC93C', grn: '#0E9F6E', red: '#E5364B', pur: '#7B3FE4',
  page: '#E7E7EA', navink: '#233D4C',
  m2bg: '#E7F6EE', m2fg: '#0B3D2B', m3bg: '#E8F0FD', m3fg: '#14305F', chipOnText: '#E5661A',
};
export const dark: Theme = {
  ...light,
  dark: true,
  bg: '#121214', soft: '#1E1E22', card: '#1A1A1E', line: '#2A2A30', ink: '#F3F3F5', mut: '#9A9AA4',
  brt: '#2B1B10', grn: '#34D399', red: '#FF6B7D', page: '#08080A',
  m2bg: '#12261F', m2fg: '#BDF1D8', m3bg: '#14203A', m3fg: '#C6D8FF', chipOnText: '#FFB380',
};
/* gradient pairs: v24 classes bg0..bg4 (135deg) and promo gradients (110deg) */
export const BG = [
  ['#FFD9B8', '#FFB27A'], ['#CFE9F7', '#8EC7E8'], ['#D8F0CF', '#9ED48F'], ['#FBE3A8', '#F2C25A'], ['#F7D0DA', '#EE9FB3'],
] as const;
export const PROMO = {plum: ['#7B3FE4', '#A56BFF'], orange: ['#FD802E', '#FFA35C'], green: ['#1F7A5A', '#2FB584']} as const;
export const MODE1 = ['#FD802E', '#FF9F4D'] as const;
export const fonts = {regular: undefined as string | undefined};
