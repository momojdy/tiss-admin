import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, TextInput, View} from 'react-native';
import {supabase} from '../../lib/supabase';
import {publishCmsVersion, saveCmsVersion} from '../../lib/adminBackend';
import {Section, Card} from '../../ui/Card';
import {OutlineBtn} from '../../ui/Controls';
import {PhoneFrame} from './PhoneFrame';
import KonsolissConsumerPreviewScreen from './KonsolissConsumerPreviewScreen';
import {KonsolissPreviewSelectionContext} from './KonsolissPreviewSelection';
import {useTheme} from '../../theme/ThemeContext';
import {Txt} from '../../ui/Txt';

const KEY = 'konsoliss.content';
const YELLOW = '#FFD93D';
const RED = '#A90E02';
const CREAM = '#FFFBD4';
const LANGS = ['en', 'fr', 'ht', 'es', 'zh-Hans'] as const;
type Lang = typeof LANGS[number];
const PAGES = ['Home', 'Warehouse', 'Consolidated', 'Sourcing+', 'Hub', 'Book Space', 'CBM Calculator', 'Shared navigation'] as const;
const DEFAULTS: Record<string, string> = {
  'home.brand': 'Konsoliss',
  'home.load.heading': 'My current load',
  'home.available': 'available',
  'home.otherCargo': 'Other cargo',
  'home.yourSpace': 'Your space',
  'home.free': 'Free',
  'home.book.title': 'Book Space',
  'home.book.subtitle': 'Reserve container capacity',
  'home.load.title': 'Load Items',
  'home.load.subtitle': 'Move warehouse goods',
  'home.calc.title': 'CBM Calculator',
  'home.calc.subtitle': 'Calculate your package volume',
  'home.warehouse.title': 'Warehouse',
  'home.packages.received': 'packages received',
  'home.packages.ready': 'ready to load',
  'home.consolidated.title': 'Consolidated',
  'home.departure': 'Est. departure:',
  'home.sourcing.title': 'Sourcing+',
  'home.sourcing.subtitle': 'Find products, compare prices, get them delivered',
  'home.how.heading': 'How consolidation works',
  'home.how.1.title': 'Book Space',
  'home.how.1.body': 'Reserve the CBM you need for your shipment.\nStarting from 0.02 CBM',
  'home.how.2.title': 'Inbound to warehouse',
  'home.how.2.body': 'Buy on WANTISS, \npaste a product link \nfor us to purchase,\nor ship external items \nto our warehouse.',
  'home.how.3.title': 'Items processing',
  'home.how.3.body': 'We verify incoming items \nand optimize packaging \nwhen needed',
  'home.how.4.title': 'Load items',
  'home.how.4.body': 'Allocate items \nto your reserved space',
  'home.how.5.title': 'Container departs',
  'home.how.5.body': 'Your orders are shipped \nand delivered to you \nor ready for pickup \nat a designated location',
  'book.heading': 'Book Space',
  'book.review': 'Review',
  'calc.heading': 'CBM calculator',
  'calc.instructions': 'Enter size in cm',
  'calc.length': 'Length',
  'calc.width': 'Width',
  'calc.height': 'Height',
  'calc.quantity': 'Quantity',
  'nav.home': 'Home',
  'nav.warehouse': 'Warehouse',
  'nav.consolidated': 'Konso',
  'nav.sourcing': 'Sourcing+',
  'nav.hub': 'Hub',
  'warehouse.heading': 'Warehouse',
  'consolidated.heading': 'Consolidated',
  'sourcing.heading': 'Sourcing+',
  'hub.heading': 'Hub',
};
const fields: Record<string, string[]> = {
  'Home': Object.keys(DEFAULTS).filter(k=>k.startsWith('home.')),
  'Warehouse': ['warehouse.heading'],
  'Consolidated': ['consolidated.heading'],
  'Sourcing+': ['sourcing.heading'],
  'Hub': ['hub.heading'],
  'Book Space': Object.keys(DEFAULTS).filter(k=>k.startsWith('book.')),
  'CBM Calculator': Object.keys(DEFAULTS).filter(k=>k.startsWith('calc.')),
  'Shared navigation': Object.keys(DEFAULTS).filter(k=>k.startsWith('nav.')),
};
type CmsRow = {id:string;version:number;status:'draft'|'published'|'archived';locale:string;payload:{labels?:Record<string,string>}};
const labelFor=(id:string)=>id.split('.').slice(1).join(' / ').replace(/([a-z])([A-Z])/g,'$1 $2');
export function KonsolissEditor({canEdit,canPublish}:{canEdit:boolean;canPublish:boolean}) {
  const {c}=useTheme();
  const [page,setPage]=useState<string>('Home');
  const [zoom,setZoom]=useState(1);
  const [previewSheet,setPreviewSheet]=useState<'book'|'calc'|null>(null);
  const [lang,setLang]=useState<Lang>('en');
  const [rows,setRows]=useState<CmsRow[]>([]);
  const [draft,setDraft]=useState<Record<string,string>>({...DEFAULTS});
  const [selected,setSelected]=useState('home.brand');
  const [mode,setMode]=useState<'Edit'|'Preview'|'Published'>('Edit');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [dirty,setDirty]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const [version,setVersion]=useState<CmsRow|null>(null);
  const published=rows.find(r=>r.locale===lang&&r.status==='published');
  const text=(key:string)=>draft[key]??DEFAULTS[key]??'';
  const shown=mode==='Published'?{...DEFAULTS,...(published?.payload?.labels||{})}:draft;
  const load=useCallback(async()=>{
    setError('');
    const {data,error:e}=await supabase.from('wantiss_cms_content').select('id,version,status,locale,payload').eq('content_key',KEY).order('version',{ascending:false}).limit(150);
    if(e){setError('Konsoliss content could not be loaded.');return;}
    setRows((data||[]) as CmsRow[]);
  },[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    const row=rows.find(r=>r.locale===lang&&r.status==='draft')||rows.find(r=>r.locale===lang&&r.status==='published')||null;
    setVersion(row);setDraft({...DEFAULTS,...(row?.payload?.labels||{})});setDirty(false);setConfirm(false);setSelected(fields[page]?.[0]||'home.brand');
  },[lang,rows]);
  const change=(key:string,value:string)=>{if(!canEdit||mode!=='Edit')return;setDraft(d=>({...d,[key]:value}));setDirty(true);setConfirm(false);};
  const save=async()=>{
    if(!canEdit||busy)return;
    setBusy(true);setError('');
    try{
      const labels=Object.fromEntries(Object.entries(draft).filter(([key])=>key in DEFAULTS));
      await saveCmsVersion({key:KEY,locale:lang,payload:{v:1,labels},status:'draft'});
      await load();setDirty(false);
    }catch{setError('Could not save the Konsoliss draft.');}finally{setBusy(false);}
  };
  const publish=async()=>{
    if(!canPublish||!version||version.status!=='draft'||dirty||busy)return;
    setBusy(true);setError('');
    try{await publishCmsVersion(version.id);await load();setConfirm(false);}
    catch{setError('Could not publish Konsoliss content.');}finally{setBusy(false);}
  };
  const choose=(id:string)=>{if(Object.prototype.hasOwnProperty.call(DEFAULTS,id))setSelected(id);};
  const goPage=(name:string)=>{setPage(name);setSelected('');setPreviewSheet(name==='Book Space'?'book':name==='CBM Calculator'?'calc':null);};
  const selectedText=useMemo(()=>shown[selected]??DEFAULTS[selected]??'', [shown,selected]);
  const editMode=mode==='Edit'&&canEdit;
  const navScreen=['Home','Book Space','CBM Calculator'];
  return <View>
    <Section title="Konsoliss content" right={<View style={{flexDirection:'row',flexWrap:'wrap',gap:5}}>
      <OutlineBtn primary={mode==='Edit'} disabled={!canEdit} onPress={()=>{setMode('Edit');setSelected('');}}>Manual editor</OutlineBtn>
      <OutlineBtn primary={mode==='Preview'} onPress={()=>{setMode('Preview');setSelected('');}}>Phone preview</OutlineBtn>
    </View>}>
      <Txt size={10.5} mut>{version?'Version '+version.version+' · '+version.status:'Starter content (not yet saved)'}{dirty?' · unsaved changes':''}</Txt>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:8}}>
        <OutlineBtn primary onPress={()=>{void save();}} disabled={!canEdit||!dirty||busy}>{busy?'Saving…':'Save draft'}</OutlineBtn>
        <OutlineBtn onPress={()=>{void load();}} disabled={busy}>{dirty?'Discard changes & reload':'Reload'}</OutlineBtn>
        <OutlineBtn onPress={()=>setConfirm(true)} disabled={!canPublish||!version||version.status!=='draft'||dirty||busy}>Publish…</OutlineBtn>
      </View>
      {confirm?<View style={{marginTop:6,padding:10,borderWidth:1,borderColor:YELLOW,borderRadius:12}}>
        <Txt size={11}>Publish saved Konsoliss version {version?.version} to customers?</Txt>
        <Txt size={10} mut>Only customer-facing copy changes. Operational data and prices remain protected.</Txt>
        <View style={{flexDirection:'row',flexWrap:'wrap',marginTop:8}}>
          <OutlineBtn primary onPress={()=>{void publish();}} disabled={busy}>Yes, publish</OutlineBtn>
          <OutlineBtn onPress={()=>setConfirm(false)}>Cancel</OutlineBtn>
        </View>
      </View>:null}
      {error?<Txt size={11} color={RED}>{error}</Txt>:null}
      {!canEdit?<Txt size={10} mut>View only: content editing requires a delegated Content Studio permission.</Txt>:null}
    </Section>
    <Section title="Konsoliss phone preview">
      <View style={{alignItems:'center',paddingVertical:6}}>
        <View style={{width:'100%',maxWidth:390,marginBottom:10,paddingHorizontal:4}}>
          <Txt size={12} weight={600}>{editMode?'Edit Konsoliss content preview':'Konsoliss content preview'}</Txt>
          <Txt size={10} mut style={{marginTop:3,lineHeight:15}}>{editMode?'Use the screen tabs to open a page, then tap yellow-dotted editable text in the phone to select its matching field.':'Rendered from the current content with isolated sample values. No booking or payment is saved.'}</Txt>
          <Txt size={10} mut style={{marginTop:6}}>Draft preview · Sample operational data only · Actual consumer homepage and interactive 3D container.</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingVertical:8}}>
            {([{id:'en',name:'English'},{id:'fr',name:'Français'},{id:'ht',name:'Kreyòl Ayisyen'},{id:'es',name:'Español'},{id:'zh-Hans',name:'简体中文'}] as const).map(l=>
              <Pressable key={l.id} onPress={()=>setLang(l.id)} accessibilityRole="button" accessibilityLabel={'Preview in '+l.name}
                style={{borderRadius:18,padding:9,backgroundColor:lang===l.id?YELLOW:'#F1F1F2'}}>
                <Txt size={10} color="#2B1210">{l.name}</Txt>
              </Pressable>)}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingVertical:6}}>
            {[0.75,1,1.25].map(z=><Pressable key={z} onPress={()=>setZoom(z)} accessibilityRole="button" accessibilityLabel={'Preview zoom '+Math.round(z*100)+'%'}
              style={{borderRadius:18,padding:8,backgroundColor:zoom===z?YELLOW:'#F1F1F2'}}><Txt size={10} color="#2B1210">{Math.round(z*100)}%</Txt></Pressable>)}
            <Pressable accessibilityRole="button" onPress={()=>{setMode(mode==='Published'?'Preview':'Published');setSelected('');}}
              style={{borderRadius:18,padding:8,backgroundColor:mode==='Published'?YELLOW:'#F1F1F2'}}><Txt size={10} color="#2B1210">Published</Txt></Pressable>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingVertical:10}}>
            {navScreen.map(name=><Pressable key={name} onPress={()=>goPage(name)} accessibilityRole="button" accessibilityLabel={'Preview screen: '+name}
              style={{borderRadius:18,paddingHorizontal:12,paddingVertical:8,backgroundColor:page===name?YELLOW:'#F1F1F2',borderWidth:page===name?0:1,borderColor:'#E5E5E7'}}>
              <Txt size={10} color="#2B1210" weight={600}>{name}</Txt>
            </Pressable>)}
          </ScrollView>
          {mode==='Published'&&!published?<Txt size={10} color={RED}>No published content in this language. Showing built-in defaults.</Txt>:null}
        </View>
        <ScrollView horizontal contentContainerStyle={{flexGrow:1,justifyContent:'center'}}>
          <PhoneFrame background="#FFFBD4" zoom={zoom}>
            <KonsolissPreviewSelectionContext.Provider value={{selected,onSelect:choose,enabled:editMode}}>
              <KonsolissConsumerPreviewScreen copy={shown} previewSheet={previewSheet}/>
            </KonsolissPreviewSelectionContext.Provider>
          </PhoneFrame>
        </ScrollView>
      </View>
    </Section>
    {editMode&&selected?<Section title={'Selected text · '+labelFor(selected)}>
      <View style={{borderWidth:2,borderStyle:'dotted',borderColor:YELLOW,borderRadius:12,padding:10}}>
        <Txt size={10} mut>{selected}</Txt>
        <TextInput accessibilityLabel={'Edit '+selected} value={text(selected)} onChangeText={v=>change(selected,v)} multiline
          style={{minHeight:62,borderWidth:1,borderColor:c.bd,borderRadius:10,padding:10,marginTop:8,backgroundColor:c.card,color:c.ink,textAlignVertical:'top'}}/>
      </View>
      <View style={{marginTop:8}}><OutlineBtn onPress={()=>setSelected('')}>Done editing this item</OutlineBtn></View>
    </Section>:null}
    {editMode?<Section title="Pages · Text">
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:8}}>
        {PAGES.map(name=><OutlineBtn key={name} primary={page===name} onPress={()=>goPage(name)}>{name}</OutlineBtn>)}
      </View>
      {(fields[page]||[]).map(id=><Pressable key={id} onPress={()=>choose(id)} accessibilityRole="button"
        style={{borderTopWidth:1,borderTopColor:selected===id?YELLOW:c.bd,paddingVertical:8}}>
        <Txt size={10.5} weight={500}>{labelFor(id)}</Txt>
        <Txt size={10} mut>{draft[id]||'—'}</Txt>
      </Pressable>)}
      {!navScreen.includes(page)?<Txt size={10} mut style={{marginTop:8}}>This consumer page is not implemented yet. Its text keys are prepared, but the phone stays on the real homepage rather than showing an invented screen.</Txt>:null}
    </Section>:null}
  </View>;
}
