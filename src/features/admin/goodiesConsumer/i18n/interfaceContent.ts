import type {LangCode, Txt} from '../data/types';
import {resolveGoodiesText} from './resolveText';
let labels = new Map<string, Txt>();
/** Published customer content, or the editor's explicitly isolated draft. */
export function setInterfaceContent(entries: Array<{id: string; t: Txt}> = []) {
  labels = new Map(entries.map(entry => [entry.id, entry.t]));
}
export function interfaceText(key: string, locale: LangCode, showDrafts = false): string {
  return resolveGoodiesText(labels.get('lbl.interface.' + key), locale, showDrafts);
}
