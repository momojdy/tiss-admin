import {KONSOLISS_COPY_DEFAULTS as DEFAULTS,KONSOLISS_IMAGE_SLOTS,KONSOLISS_LOCALES,type KonsolissCopy,konsolissLocaleDefaults} from './catalog';
export type HomepagePayload={v:2;labels:Record<string,string>;reviewed:string[];images:Record<string,string>};
export const placeholders=(value:string)=>[...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(match=>match[1]).sort();
export function formatCopy(copy:KonsolissCopy,key:string,values:Record<string,string|number>={}){return (copy[key]??DEFAULTS[key]??key).replace(/\{(\w+)\}/g,(token,name)=>values[name]===undefined?token:String(values[name]));}
export function publicationErrors(payload:HomepagePayload):string[]{
 const errors:string[]=[];
 if(payload.v!==2)return ['Unsupported homepage content version'];
 for(const [key,source] of Object.entries(DEFAULTS)){
  const value=payload.labels[key];
  if(typeof value!=='string'||!value.trim())errors.push(key+' needs a translation');
  else if(JSON.stringify(placeholders(value))!==JSON.stringify(placeholders(source)))errors.push(key+' must preserve its placeholders');
  else if(value.length>4000)errors.push(key+' is too long');
  else if(!payload.reviewed.includes(key))errors.push(key+' needs review');
 }
 for(const key of Object.keys(payload.labels))if(!Object.hasOwn(DEFAULTS,key))errors.push('Unknown label '+key);
 for(const [slot,key] of Object.entries(payload.images))if(!(KONSOLISS_IMAGE_SLOTS as readonly string[]).includes(slot)||!/^konsoliss\.[a-zA-Z0-9._-]+$/.test(key))errors.push('Invalid image reference '+slot);
 return errors;
}
export function resolveHomepage(records:{content_key:string;locale:string;version:number;payload:Record<string,unknown>;status?:string}[],locale:string){
 const select=(lang:string)=>records.filter(row=>row.content_key==='konsoliss.content'&&row.locale===lang&&(!row.status||row.status==='published')).sort((a,b)=>b.version-a.version)[0];
 const bundled=konsolissLocaleDefaults(locale);const copy={...bundled};const images:Record<string,string>={};
 for(const row of [select('en'),locale==='en'?undefined:select(locale)]){
  if(!row)continue;
  const labels=row.payload.labels;
  if(!labels||typeof labels!=='object'||Array.isArray(labels))continue;
  const reviewed=Array.isArray(row.payload.reviewed)?row.payload.reviewed:[];
  for(const [key,value] of Object.entries(labels))if(Object.hasOwn(DEFAULTS,key)&&typeof value==='string'&&value.trim()&&JSON.stringify(placeholders(value))===JSON.stringify(placeholders(DEFAULTS[key]))&&(row.payload.v!==2||reviewed.includes(key)))if(row.locale!=='en'||locale==='en'||bundled[key]===DEFAULTS[key])copy[key]=value;
  if(row.payload.images&&typeof row.payload.images==='object')for(const [slot,key] of Object.entries(row.payload.images))if((KONSOLISS_IMAGE_SLOTS as readonly string[]).includes(slot)&&typeof key==='string')images[slot]=key;
 }
 return {copy,images};
}
export const validLocale=(value:string)=>(KONSOLISS_LOCALES as readonly string[]).includes(value);

export function contentKeyForText(copy:KonsolissCopy,text:unknown):string|undefined{
 if(typeof text!=='string'||!text.trim())return undefined;
 return Object.keys(copy).find(key=>{const template=copy[key];if(template===text)return true;if(!template.includes('{'))return false;const pattern=template.split(/(\{\w+\})/g).map(piece=>/^\{\w+\}$/.test(piece)?'[\\s\\S]+?':piece.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('');return new RegExp('^'+pattern+'$').test(text);});
}
export function estimateCbm(length:string,width:string,height:string,quantity:string):number|null{
 const decimal=(value:string)=>/^\d+(?:[.,]\d+)?$/.test(value.trim())?Number(value.replace(',','.')):NaN;
 const dimensions=[length,width,height].map(decimal);const count=/^\d+$/.test(quantity.trim())?Number(quantity):NaN;
 if(!dimensions.every(value=>Number.isFinite(value)&&value>0)||!Number.isSafeInteger(count)||count<=0)return null;
 const volume=dimensions.reduce((a,b)=>a*b,1)*count/1e6;return Number.isFinite(volume)&&volume>0?volume:null;
}
