import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, TextInput, View} from 'react-native';
import {supabase} from '../../lib/supabase';
import {publishCmsVersion, saveCmsVersion} from '../../lib/adminBackend';
import {Section, Card} from '../../ui/Card';
import {OutlineBtn, Pill, SelectMenu} from '../../ui/Controls';
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
  const [page,setPage]=useState<string>('Home');
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
  const choose=(id:string)=>{setSelected(id);if(mode!=='Published'&&canEdit)setMode('Edit');};
  const selectedText=useMemo(()=>shown[selected]??DEFAULTS[selected]??'', [shown,selected]);
  const field=(id:string,large=false)=>{
    const active=id===selected&&mode==='Edit';
    return <Pressable key={id} accessibilityRole="button" accessibilityLabel={'Edit '+labelFor(id)}
      onPress={()=>choose(id)} style={{borderColor:active?YELLOW:'transparent',borderWidth:2,borderStyle:'dotted',borderRadius:7,padding:3,marginVertical:1}}>
      <Txt size={large?17:11} weight={large?600:500} color={id.endsWith('.heading')||id.endsWith('.title')?'#F0C900':'#2B1210'}>{shown[id]??DEFAULTS[id]}</Txt>
    </Pressable>;
  };
  const phone=()=> <View style={{alignSelf:'center',width:290,maxWidth:'100%',backgroundColor:CREAM,borderRadius:25,borderWidth:6,borderColor:'#242424',overflow:'hidden'}}>
    <View style={{height:18,backgroundColor:CREAM,alignItems:'center',justifyContent:'center'}}><View style={{width:55,height:4,borderRadius:3,backgroundColor:'#333'}}/></View>
    <ScrollView style={{maxHeight:510,minHeight:400}} contentContainerStyle={{padding:15,gap:8}}>
      {page==='Home'?<>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>{field('home.brand',true)}<Txt size={9} color={RED}>KS-2048 · Filling (sample)</Txt></View>
        {field('home.load.heading')}
        <Txt size={26} color={RED} weight={600}>51.7 <Txt size={12}>/ 68 CBM</Txt></Txt>
        <View style={{height:135,borderRadius:16,backgroundColor:'#EEE2B5',alignItems:'center',justifyContent:'center'}}><Txt size={12} color="#72554C">3D container runs in consumer app</Txt><Txt size={10} color="#72554C">Preview of editable content only</Txt></View>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}>{field('home.otherCargo')}{field('home.yourSpace')}{field('home.free')}</View>
        <View style={{flexDirection:'row',gap:5}}><View style={{flex:1,backgroundColor:RED,borderRadius:12,padding:8}}>{field('home.book.title')}{field('home.book.subtitle')}</View><View style={{flex:1,backgroundColor:'#FFFAE0',borderRadius:12,padding:8}}>{field('home.load.title')}{field('home.load.subtitle')}</View></View>
        <View style={{backgroundColor:'#FFF7DB',padding:8,borderRadius:12}}>{field('home.calc.title')}{field('home.calc.subtitle')}</View>
        <View style={{flexDirection:'row',gap:5}}>{['home.warehouse.title','home.consolidated.title'].map(id=><View key={id} style={{flex:1,padding:8,backgroundColor:'#FFF7DB',borderRadius:12}}>{field(id)}<Txt size={9}>Sample logistics metrics</Txt></View>)}</View>
        <View style={{padding:8,backgroundColor:'#FFF7DB',borderRadius:12}}>{field('home.sourcing.title')}{field('home.sourcing.subtitle')}</View>
        {field('home.how.heading',true)}
        {[1,2,3,4,5].map(n=><View key={n} style={{backgroundColor:'#FFF8DF',borderRadius:10,padding:8}}>{field('home.how.'+n+'.title')}{field('home.how.'+n+'.body')}</View>)}
      </>:fields[page].map(id=>field(id,true))}
    </ScrollView>
    <View style={{flexDirection:'row',justifyContent:'space-between',padding:6,backgroundColor:'#FFF6CB'}}>{['nav.home','nav.warehouse','nav.consolidated','nav.sourcing','nav.hub'].map(id=><Pressable key={id} onPress={()=>choose(id)} style={{flex:1}}><Txt size={8} color={id===selected?RED:'#5A3329'}>{shown[id]??DEFAULTS[id]}</Txt></Pressable>)}</View>
  </View>;
  return <View style={{gap:10}}>
    <Section title="Konsoliss · Customer content">
      <Txt size={10} mut>Goodies-style manual editor and phone selection. Yellow dashed outlines identify selected text. Yellow headings distinguish Konsoliss page titles. Operational data and container status are protected and not editable here.</Txt>
      <View style={{marginTop:8}}><SelectMenu label="Konsoliss page" value={page} options={[...PAGES]} onChange={v=>{setPage(v);setSelected(fields[v]?.[0]||'home.brand');}}/></View>
      <View style={{marginTop:8}}><SelectMenu label="Language" value={lang} options={[...LANGS]} onChange={v=>setLang(v as Lang)}/></View>
      <View style={{flexDirection:'row',gap:6,flexWrap:'wrap',marginTop:10}}>
        {(['Edit','Preview','Published'] as const).map(m=><OutlineBtn key={m} primary={mode===m} onPress={()=>setMode(m)} disabled={m==='Edit'&&!canEdit}>{m}</OutlineBtn>)}
        <OutlineBtn primary onPress={()=>{void save();}} disabled={!canEdit||!dirty||busy}>{busy?'Saving…':'Save draft'}</OutlineBtn>
        <OutlineBtn onPress={()=>setConfirm(true)} disabled={!canPublish||!version||version.status!=='draft'||dirty||busy}>Publish…</OutlineBtn>
        <OutlineBtn onPress={()=>{void load();}} disabled={busy}>Reload</OutlineBtn>
      </View>
      {dirty?<Txt size={10} color={RED}>Unsaved changes — save a new draft before publishing.</Txt>:null}
      {error?<Txt size={11} color={RED}>{error}</Txt>:null}
      {confirm?<View style={{padding:10,marginTop:5,borderWidth:1,borderColor:YELLOW,borderRadius:10}}><Txt size={11}>Publish the saved Konsoliss content version for {lang}? This will affect the live consumer app.</Txt><View style={{flexDirection:'row',gap:8,marginTop:8}}><OutlineBtn primary onPress={()=>{void publish();}}>Confirm publish</OutlineBtn><OutlineBtn onPress={()=>setConfirm(false)}>Cancel</OutlineBtn></View></View>:null}
      {mode==='Published'&&!published?<Txt size={10} color={RED}>No published content in this language. Default English content is shown.</Txt>:null}
    </Section>
    <Section title="Konsoliss customer phone preview">
      {phone()}
    </Section>
    {mode==='Edit'&&canEdit?<Section title={'Selected text · '+labelFor(selected)}>
      <Txt size={10} mut>Selected key: {selected}</Txt>
      <TextInput accessibilityLabel={'Edit '+selected} value={text(selected)} onChangeText={v=>change(selected,v)} multiline style={{minHeight:62,borderWidth:2,borderStyle:'dotted',borderColor:YELLOW,borderRadius:12,padding:10,backgroundColor:'#FFFDF0',color:'#2B1210',textAlignVertical:'top',marginTop:8}}/>
      <Txt size={10} mut>Tap another dotted text element in the preview, or select it below. Current editing language: {lang}.</Txt>
      {fields[page].map(id=><Pressable key={id} onPress={()=>choose(id)} style={{padding:8,borderBottomWidth:1,borderColor:'#DFD7AA'}}><Txt size={11} weight={id===selected?600:400}>{labelFor(id)}</Txt><Txt size={9} mut>{draft[id]||'—'}</Txt></Pressable>)}
    </Section>:null}
    <Card><Txt size={10} mut>Only the existing Konsoliss Home page currently renders consumer content. Warehouse, Consolidated, Sourcing+ and Hub header keys are prepared for their future screens; their full layouts are not yet implemented. Preview-only sample metrics are never published as operational data.</Txt></Card>
  </View>;
}
