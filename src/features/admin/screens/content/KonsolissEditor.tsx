import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,TextInput,View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {supabase} from '../../lib/supabase';
import {createAssetUploadId,listCmsAssets,publishCmsAsset,uploadCmsAsset} from '../../lib/adminBackend';
import {saveHomepage,publishHomepage,stable,type HomepageRow} from '../../lib/konsolissHomepageCms';
import {fetchPublishedWantissContent} from '../../lib/wantissCms';
import {Card,Section} from '../../ui/Card';
import {OutlineBtn} from '../../ui/Controls';
import {Txt} from '../../ui/Txt';
import {PhoneFrame} from './PhoneFrame';
import KonsolissConsumerPreviewScreen from './KonsolissConsumerPreviewScreen';
import KonsolissBookingCopyEditor from './KonsolissBookingCopyEditor';
import {KONSOLISS_COPY_DEFAULTS as DEFAULTS,KONSOLISS_LOCALES,KONSOLISS_IMAGE_SLOTS,konsolissLocaleDefaults,type KonsolissLocale} from './konsolissPreview/cms/catalog';
import {publicationErrors,placeholders,type HomepagePayload} from './konsolissPreview/cms/model';
import {PREVIEW_SCENARIOS} from './konsolissPreview/konsolissPreviewScenarios';
import type {Scenario} from './konsolissPreview/previewData';

const KEY='konsoliss.content',YELLOW='#FFD93D';
const scenarios:Scenario[]=['default','loading','error','no-container','unverified','tiny','filling','filled','departed','arrived'];
const empty=(locale:string):HomepagePayload=>({v:2,labels:konsolissLocaleDefaults(locale),reviewed:[],images:{}});
export function KonsolissEditor({canEdit,canPublish}:{canEdit:boolean;canPublish:boolean}){
 const [lang,setLang]=useState<KonsolissLocale>('en');const [draft,setDraft]=useState<HomepagePayload>(empty('en'));const [row,setRow]=useState<HomepageRow|null>(null);
 const [baseline,setBaseline]=useState(stable(empty('en')));const [ready,setReady]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const [selected,setSelected]=useState('');const [mode,setMode]=useState<'Edit'|'Preview'>('Edit');const [zoom,setZoom]=useState(0.75);const [scenario,setScenario]=useState<Scenario>('default');const [previewIndex,setPreviewIndex]=useState<number|undefined>(undefined);const [dark,setDark]=useState(false);const [confirm,setConfirm]=useState(false);const [reviewAll,setReviewAll]=useState(false);const [group,setGroup]=useState('home');
 const [assets,setAssets]=useState<any[]>([]);const [urls,setUrls]=useState<Record<string,string>>({});
 const generation=useRef(0);const lock=useRef(false);const mounted=useRef(true);
 const dirty=stable(draft)!==baseline;const editMode=canEdit&&ready&&!busy&&mode==='Edit';
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
 const loadAssets=useCallback(async()=>{
  const all=await listCmsAssets();const mine=all.filter((asset:any)=>String(asset.asset_key).startsWith('konsoliss.'));
  if(!mounted.current)return;setAssets(mine);
  if(mine.length){const signed=await supabase.storage.from('wantiss-cms-assets').createSignedUrls(mine.map((asset:any)=>asset.storage_path),3600);if(signed.error)throw signed.error;const byPath=new Map((signed.data??[]).map(item=>[item.path,item.signedUrl]));if(mounted.current)setUrls(Object.fromEntries(mine.flatMap((asset:any)=>{const url=byPath.get(asset.storage_path);return url?[[asset.asset_key,url]]:[];})));}
 },[]);
 const load=useCallback(async()=>{
  const request=++generation.current;setReady(false);setError('');setNotice('');setConfirm(false);setReviewAll(false);
  try{
   const result=await supabase.from('wantiss_cms_content').select('id,version,status,locale,payload').eq('content_key',KEY).eq('locale',lang).order('version',{ascending:false}).limit(1).maybeSingle();
   if(result.error)throw result.error;if(!mounted.current||request!==generation.current)return;
   const head=result.data as HomepageRow|null;const payload:HomepagePayload={...empty(lang),...(head?.payload??{}),v:2,labels:{...empty(lang).labels,...(head?.payload?.labels??{})},reviewed:head?.payload?.reviewed??[],images:head?.payload?.images??{}};
   setRow(head);setDraft(payload);setBaseline(stable(payload));setReady(true);setSelected('');
  }catch{if(mounted.current&&request===generation.current)setError('Content could not be loaded. Retry before editing.');}
 },[lang]);
 useEffect(()=>{void load();},[load]);useEffect(()=>{void loadAssets().catch(()=>setNotice('Image previews could not be loaded. Retry image refresh.'));},[loadAssets]);
 const change=(key:string,value:string)=>{if(!editMode)return;setReviewAll(false);setDraft(current=>({...current,labels:{...current.labels,[key]:value},reviewed:current.reviewed.filter(id=>id!==key)}));setConfirm(false);};
 const choose=(key:string)=>{setSelected(key);if(!key.startsWith('image:'))setGroup(key.split('.')[0]);};
 const switchLang=(next:KonsolissLocale)=>{if(busy)return;setReviewAll(false);if(dirty){setNotice('Save your current draft or discard/reload before changing languages.');return;}setReady(false);setDraft(empty(next));setSelected('');setLang(next);};
 const save=async()=>{
  if(!editMode||(!dirty&&row)||lock.current)return;lock.current=true;setBusy(true);setError('');setConfirm(false);
  try{const saved=await saveHomepage(supabase,lang,draft,row?.version??0);if(mounted.current){setRow(saved);setBaseline(stable(saved.payload));setNotice('Draft version '+saved.version+' saved and read back successfully.');}}
  catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Draft save failed.');}finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const publish=async()=>{
  if(!canPublish||!ready||dirty||!row||row.status!=='draft'||lock.current)return;
  const issues=publicationErrors(draft);if(issues.length){setError(issues[0]);choose(issues[0].split(' ')[0]);return;}
  lock.current=true;setBusy(true);setError('');
  try{
   for(const key of new Set(Object.values(draft.images))){const asset=assets.find(item=>item.asset_key===key);if(!asset)throw new Error('Referenced image could not be found. Refresh images before publishing.');if(asset.status!=='published')await publishCmsAsset(asset.id);}
   const result=await publishHomepage(supabase,row,fetchPublishedWantissContent);if(mounted.current){setRow(result.row);setConfirm(false);setNotice(result.publicConfirmed?'Published and verified through the customer endpoint.':'Publication committed. Customer endpoint verification is pending; its cache can take up to one minute.');}await loadAssets();
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Publication failed.');}finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const upload=async()=>{
  if(!selected.startsWith('image:')||!editMode||lock.current)return;const slot=selected.slice(6);lock.current=true;setBusy(true);setError('');
  try{const result=await DocumentPicker.getDocumentAsync({type:'image/*',multiple:false,copyToCacheDirectory:true});if(result.canceled||!result.assets?.[0])return;const file=result.assets[0];const key='konsoliss.'+slot+'.'+createAssetUploadId();await uploadCmsAsset({key,uri:file.uri,fileName:file.name,contentType:file.mimeType??'image/jpeg',byteSize:file.size??0,altText:{[lang]:slot}});if(mounted.current){setDraft(current=>({...current,images:{...current.images,[slot]:key}}));setConfirm(false);setNotice('Image uploaded privately. Save the draft and publish to expose it to customers.');}await loadAssets();}
  catch{if(mounted.current)setError('Image upload could not be confirmed. Your previous image is retained.');}finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const shown=useMemo(()=>({...konsolissLocaleDefaults(lang),...Object.fromEntries(Object.entries(draft.labels).filter(([,value])=>typeof value==='string'&&value.trim()))}),[draft.labels,lang]);
 const images=useMemo(()=>Object.fromEntries(Object.entries(draft.images).flatMap(([slot,key])=>urls[key]?[[slot,urls[key]]]:[])),[draft.images,urls]);
 const keys=Object.keys(DEFAULTS).filter(key=>key.split('.')[0]===group);const filled=Object.keys(DEFAULTS).filter(key=>draft.labels[key]?.trim()).length;const reviewed=Object.keys(DEFAULTS).filter(key=>draft.reviewed.includes(key)).length;
 return <View>
  <Section title="Konsoliss homepage CMS">
   <Txt size={10.5} mut>{row?'Version '+row.version+' · '+row.status:'Starter content, not saved'}{dirty?' · unsaved changes':''}</Txt>
   <Txt size={10} mut>{filled}/{Object.keys(DEFAULTS).length} fields filled · {reviewed} reviewed in {lang}. Bundled translations are drafts until reviewed; published content is verified separately.</Txt>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:8}}>
    <OutlineBtn primary disabled={!editMode||(!dirty&&!!row)} onPress={()=>{void save();}}>Save draft</OutlineBtn>
    <OutlineBtn disabled={busy} onPress={()=>{void load();}}>{dirty?'Discard changes & reload':'Reload'}</OutlineBtn>
    <OutlineBtn disabled={!editMode} onPress={()=>setReviewAll(true)}>Review all translations…</OutlineBtn><OutlineBtn disabled={!canPublish||!ready||dirty||busy||row?.status!=='draft'} onPress={()=>setConfirm(true)}>Publish…</OutlineBtn>
   </View>
   {reviewAll?<Card><Txt size={11}>Only confirm after reading every translation for {lang}. This marks all current labels reviewed; it does not publish them.</Txt><OutlineBtn disabled={!editMode} primary onPress={()=>{const reviewed=Object.keys(DEFAULTS);const issues=publicationErrors({...draft,reviewed});if(issues.length){setError(issues[0]);choose(issues[0].split(' ')[0]);}else{setDraft(current=>({...current,reviewed}));setError('');}setReviewAll(false);}}>I reviewed all labels in this locale</OutlineBtn><OutlineBtn onPress={()=>setReviewAll(false)}>Cancel</OutlineBtn></Card>:null}
   {confirm?<Card><Txt size={11}>Publish saved version {row?.version} and its referenced image assets? All text must be reviewed for this locale. Customer quantities are never editable here.</Txt><OutlineBtn primary disabled={busy} onPress={()=>{void publish();}}>Yes, publish</OutlineBtn><OutlineBtn disabled={busy} onPress={()=>setConfirm(false)}>Cancel</OutlineBtn></Card>:null}
   {error?<Txt size={11} color="#A90E02">{error}</Txt>:null}{notice?<Txt size={11}>{notice}</Txt>:null}
   {!canEdit?<Txt size={10} mut>View only. Content editing permission is required.</Txt>:null}
  </Section>
  <Section title="Konsoliss phone preview">
   <Txt size={11}>Choose a screen state, then tap the text or image you want to change. This is the source-synchronized customer homepage; preview data never reaches customer records.</Txt>
   <ScrollView horizontal contentContainerStyle={{gap:6,paddingVertical:8}}>{KONSOLISS_LOCALES.map(locale=><OutlineBtn key={locale} disabled={busy} primary={lang===locale} onPress={()=>switchLang(locale)}>{locale}</OutlineBtn>)}</ScrollView>
   <View style={{flexDirection:'row',flexWrap:'wrap'}}><OutlineBtn primary={mode==='Edit'} disabled={!canEdit||busy} onPress={()=>setMode('Edit')}>Manual editor</OutlineBtn><OutlineBtn primary={mode==='Preview'} onPress={()=>setMode('Preview')}>Phone preview</OutlineBtn><OutlineBtn onPress={()=>setDark(value=>!value)}>{dark?'Light preview':'Dark preview'}</OutlineBtn></View>
   <ScrollView horizontal contentContainerStyle={{gap:6,paddingVertical:8}}>{[0.75,0.85,1,1.25].map(value=><OutlineBtn key={value} primary={zoom===value} onPress={()=>setZoom(value)}>{Math.round(value*100)}%</OutlineBtn>)}</ScrollView>
   <ScrollView horizontal contentContainerStyle={{gap:6,paddingVertical:8}}>{scenarios.map(value=><OutlineBtn key={value} primary={scenario===value} onPress={()=>{setPreviewIndex(undefined);setScenario(value);}}>{value}</OutlineBtn>)}</ScrollView>
   <Txt size={10} mut>All 23 load/container scenarios (fixture-only)</Txt><ScrollView horizontal contentContainerStyle={{gap:6,paddingVertical:8}}>{PREVIEW_SCENARIOS.map((item,index)=><OutlineBtn key={item.id} primary={previewIndex===index} onPress={()=>setPreviewIndex(index)}>{item.code+' · '+item.title}</OutlineBtn>)}</ScrollView><Txt size={10} mut>Preview only. No reservations, payments, cargo changes or support requests are submitted.</Txt>
   <ScrollView horizontal contentContainerStyle={{flexGrow:1,justifyContent:'center'}}><PhoneFrame background="#FFFBD4" zoom={zoom}><KonsolissConsumerPreviewScreen key={lang+':'+scenario+':'+dark+':'+previewIndex} previewIndex={previewIndex} copy={shown} images={images} scenario={scenario} dark={dark} editMode={editMode} selected={selected} onSelect={choose} onAction={action=>setNotice('Preview navigation: '+action+' (no live action).')}/></PhoneFrame></ScrollView>
   {mode==='Edit'&&selected?<View accessibilityLabel="Selected Konsoliss content editor" style={{borderWidth:2,borderStyle:'dotted',borderColor:YELLOW,padding:12,marginTop:12,borderRadius:12}}>
    <Txt size={12} weight={600}>{selected}</Txt>
    {selected.startsWith('image:')?<><Txt size={10}>{draft.images[selected.slice(6)]??'English/default image (built-in when no English override exists)'}</Txt><OutlineBtn disabled={!editMode} onPress={()=>{void upload();}}>Upload image from Files</OutlineBtn><OutlineBtn disabled={!editMode} onPress={()=>setDraft(current=>{const images={...current.images};delete images[selected.slice(6)];return {...current,images};})}>Use English/default image</OutlineBtn><OutlineBtn disabled={busy} onPress={()=>{void loadAssets().catch(()=>setError('Image refresh failed.'));}}>Refresh images</OutlineBtn><ScrollView style={{maxHeight:160}}>{assets.filter(asset=>asset.content_type?.startsWith('image/')).map(asset=><OutlineBtn key={asset.id} disabled={!editMode} onPress={()=>setDraft(current=>({...current,images:{...current.images,[selected.slice(6)]:asset.asset_key}}))}>{asset.asset_key+' · '+asset.status}</OutlineBtn>)}</ScrollView></>:
     <><TextInput accessibilityLabel={'Edit '+selected} value={draft.labels[selected]??''} editable={editMode} onChangeText={value=>change(selected,value)} multiline style={{minHeight:70,borderWidth:1,borderColor:'#DDD',borderRadius:10,padding:10,marginVertical:8}}/>
     <Txt size={10} mut>{'Required placeholders: '+(placeholders(DEFAULTS[selected]??'').join(', ')||'none')}</Txt>
     <OutlineBtn disabled={!editMode||!draft.labels[selected]?.trim()} onPress={()=>setDraft(current=>({...current,reviewed:current.reviewed.includes(selected)?current.reviewed.filter(key=>key!==selected):[...current.reviewed,selected]}))}>{draft.reviewed.includes(selected)?'Marked reviewed':'Mark this translation reviewed'}</OutlineBtn></>}
    <OutlineBtn onPress={()=>setSelected('')}>Done editing this item</OutlineBtn>
   </View>:null}
  </Section>
  {mode==='Edit'?<Section title="Homepage · Text and images">
   <View style={{flexDirection:'row',flexWrap:'wrap'}}>{[...new Set(Object.keys(DEFAULTS).map(key=>key.split('.')[0]))].map(prefix=><OutlineBtn key={prefix} primary={group===prefix} onPress={()=>setGroup(prefix)}>{prefix}</OutlineBtn>)}</View>
   {keys.map(key=><Pressable key={key} onPress={()=>choose(key)} style={{paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#EEE'}}><Txt size={10} weight={600}>{key+' · '+(draft.reviewed.includes(key)?'reviewed':'needs review')}</Txt><Txt size={11}>{draft.labels[key]||'Missing translation; bundled fallback in preview'}</Txt></Pressable>)}
   <Txt size={12} weight={600} style={{marginTop:14}}>Editable images</Txt>{KONSOLISS_IMAGE_SLOTS.map(slot=><OutlineBtn key={slot} onPress={()=>choose('image:'+slot)}>{slot}</OutlineBtn>)}
   <Txt size={10} mut>The container camera, geometry, carton colors, capacity and customer measurements are protected from CMS editing.</Txt>
  </Section>:null}
  <KonsolissBookingCopyEditor canEdit={canEdit} canPublish={canPublish}/>
 </View>;
}
