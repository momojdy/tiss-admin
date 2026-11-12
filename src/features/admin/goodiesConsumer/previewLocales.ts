/** Codes already supported by Goodies; labels retain the main account settings. */
export const WANTISS_LANGUAGES = [
  {code:'en',label:'English'}, {code:'fr',label:'Français'},
  {code:'ht',label:'Kreyòl Ayisyen'}, {code:'es',label:'Español'},
  {code:'zh-Hans',label:'简体中文'},
] as const;
export type WantissLocale = typeof WANTISS_LANGUAGES[number]['code'];
export function wantissLocale(value: unknown): WantissLocale {
  const normalized=String(value || '').trim().toLowerCase();
  return WANTISS_LANGUAGES.find(language=>language.code.toLowerCase()===normalized || language.label.toLowerCase()===normalized)?.code || 'en';
}
