export type Mode = 'demo' | 'production';
export const MODE: Mode = 'production';
export const providerInfo = { demo: false };
export function assertDemoOnly(feature: string) {
  throw new Error('Unavailable until a real backend operation is configured: ' + feature + '.');
}
