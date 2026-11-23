import {publicationErrors,type HomepagePayload} from '../screens/content/konsolissPreview/cms/model';
export type HomepageRow={id:string;version:number;locale:string;status:'draft'|'published'|'archived';payload:HomepagePayload};
export function stable(value:unknown):string{if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stable(v)).join(',')+'}';return JSON.stringify(value);}
export async function saveHomepage(client:any,locale:string,payload:HomepagePayload,expectedVersion:number):Promise<HomepageRow>{
 const result=await client.rpc('konsoliss_admin_save_homepage',{p_locale:locale,p_payload:payload,p_expected_version:expectedVersion});
 if(result.error)throw new Error(result.error.code==='40001'?'This locale changed. Reload before saving.':'The draft save could not be confirmed. Reload before retrying.');
 const saved=await client.from('wantiss_cms_content').select('id,locale,version,status,payload').eq('id',result.data).single();
 if(saved.error||!saved.data||saved.data.locale!==locale||saved.data.status!=='draft'||stable(saved.data.payload)!==stable(payload))throw new Error('Stored draft could not be verified. Your edits are preserved; reload to reconcile.');
 return saved.data;
}
export async function publishHomepage(client:any,row:HomepageRow,fetchPublic:(locale:string)=>Promise<{content:any[]}>){
 const issues=publicationErrors(row.payload);if(issues.length)throw new Error(issues[0]);
 const result=await client.rpc('konsoliss_admin_publish_homepage',{p_content_id:row.id,p_expected_version:row.version});
 if(result.error)throw new Error('Publication was rejected. Check permissions, translations and image publication.');
 const stored=await client.from('wantiss_cms_content').select('id,locale,version,status,payload').eq('id',row.id).single();
 if(stored.error||stored.data?.status!=='published')throw new Error('Publication could not be read back. Reload before retrying.');
 let publicConfirmed=false;
 try{const response=await fetchPublic(row.locale);publicConfirmed=response.content.some(record=>record.content_key==='konsoliss.content'&&record.locale===row.locale&&record.version===row.version&&stable(record.payload)===stable(row.payload));}catch{/* A committed publication may wait for public cache/network recovery. */}
 return {row:stored.data as HomepageRow,publicConfirmed};
}
