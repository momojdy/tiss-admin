const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),preview=path.join(root,'src/features/admin/screens/content/konsolissPreview');
const get=p=>fs.readFileSync(path.join(root,'src/features/admin',p),'utf8');
const cache=new Map();function load(file){file=path.resolve(root,file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>name.startsWith('.')?load(path.relative(root,path.resolve(path.dirname(file),name+'.ts'))):require(name),m,m.exports);return m.exports;}
test('editor, measurement controls and source-generated homepage have parseable TSX',()=>{
 for(const file of ['screens/content/KonsolissEditor.tsx','screens/konsoliss/KonsolissMeasurements.tsx','screens/konsoliss/KonsolissAdminScreen.tsx','screens/content/konsolissPreview/konsolissHomeScreen.tsx']){const source=ts.createSourceFile(file,get(file),99,true,ts.ScriptKind.TSX);assert.equal(source.parseDiagnostics.length,0,file);}
});
test('generated preview files and images exactly match their recorded source hashes',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(preview,'source-manifest.json'),'utf8'));assert.ok(Object.keys(manifest.generated).length>=9);
 for(const [file,hash] of Object.entries(manifest.generated))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(preview,file))).digest('hex'),hash,file);
 const consumer=process.env.KONSOLISS_CONSUMER_ROOT||path.resolve(root,'../consumer');if(fs.existsSync(consumer))for(const [file,hash] of Object.entries(manifest.sources)){const target=file.startsWith('assets/')?path.join(consumer,'src/assets/konsoliss',file.slice(7)):path.join(consumer,'src/screens/Konsoliss',file);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex'),hash,file);}
});
test('phone preview dependency graph has no live customer queries, storage or support writes',()=>{
 function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())visit(full);else if(/\.tsx?$/.test(full)){const source=fs.readFileSync(full,'utf8');assert.doesNotMatch(source,/supabase\.|fetch\(|from ['"].*\/supabase['"]/,full);}}}visit(preview);
 const native=fs.readFileSync(path.join(preview,'PreviewModal.tsx'),'utf8');assert.match(native,/StyleSheet.absoluteFill/);
});
test('operational workspace and measurements require active Super Admin while CMS retains separate permissions',()=>{
 for(const file of ['screens/konsoliss/KonsolissAdminScreen.tsx','screens/konsoliss/KonsolissMeasurements.tsx']){const text=get(file);assert.match(text,/session\.role\s*===\s*'super_admin'/);assert.match(text,/session\.status\s*===\s*'active'/);}
 const route=get('screens/content/CustomerPageEditorScreen.tsx');assert.match(route,/KonsolissEditor canEdit=\{can\(\.\.\.REQ\.content\)\} canPublish=\{can\(\.\.\.REQ\.publish\)\}/);
});
test('every supported locale and image slot is part of the homepage contract',()=>{
 const contract=load('src/features/admin/screens/content/konsolissPreview/cms/catalog.ts');assert.deepEqual([...contract.KONSOLISS_LOCALES],['en','fr','ht','es','zh-Hans']);assert.equal(contract.KONSOLISS_IMAGE_SLOTS.length,11);for(const key of ['home.load.heading','load.physical','menu.help','lifecycle.arrived.description','a11y.selectContainer'])assert.equal(typeof contract.KONSOLISS_COPY_DEFAULTS[key],'string');
});
const api=load('src/features/admin/lib/konsolissHomepageCms.ts');const {KONSOLISS_COPY_DEFAULTS:labels}=load('src/features/admin/screens/content/konsolissPreview/cms/catalog.ts');
function client(row,rpcError=null){return {rpc:async()=>({data:row.id,error:rpcError}),from:()=>({select(){return this;},eq(){return this;},single:async()=>({data:row,error:null})})};}
const payload={v:2,labels,reviewed:Object.keys(labels),images:{}};
test('draft save is accepted only after exact locale and content read-back',async()=>{
 const row={id:'draft',version:1,locale:'zh-Hans',status:'draft',payload};assert.equal((await api.saveHomepage(client(row),'zh-Hans',payload,0)).id,'draft');
 await assert.rejects(api.saveHomepage(client({...row,locale:'en'}),'zh-Hans',payload,0),/verified/);
 await assert.rejects(api.saveHomepage(client(row,{code:'40001'}),'zh-Hans',payload,0),/changed/);
});
test('publication distinguishes confirmed customer endpoint from committed-but-unverified cache state',async()=>{
 const draft={id:'draft',version:2,locale:'fr',status:'draft',payload},published={...draft,status:'published'};
 const verified=await api.publishHomepage(client(published),draft,async()=>({content:[{...published,content_key:'konsoliss.content'}]}));assert.equal(verified.publicConfirmed,true);
 const pending=await api.publishHomepage(client(published),draft,async()=>{throw Error('offline');});assert.equal(pending.publicConfirmed,false);assert.equal(pending.row.status,'published');
 await assert.rejects(api.publishHomepage(client(published),{...draft,payload:{...payload,reviewed:[]}},async()=>({content:[]})),/review/);
});
test('Goodies preview retains one Home tab and its existing zoom controls',()=>{
 const source=get('screens/content/GoodiesConsumerPreview.tsx');assert.match(source,/key !== 'byo' && key !== 'wantiss'/);assert.match(source,/\[0\.75, 0\.85, 1, 1\.25\]/);
});

 test('Content Studio lists all 23 directly selectable fixture states and offers explicit review only',()=>{
 const editor=get('screens/content/KonsolissEditor.tsx'),wrapper=get('screens/content/KonsolissConsumerPreviewScreen.tsx');assert.match(editor,/PREVIEW_SCENARIOS\.map\(\(item,index\)/);assert.match(editor,/previewIndex=\{previewIndex\}/);assert.match(wrapper,/previewIndex,selected,onSelect/);assert.match(editor,/I reviewed all labels in this locale/);const contract=load('src/features/admin/screens/content/konsolissPreview/cms/catalog.ts'),S=load('src/features/admin/screens/content/konsolissPreview/konsolissPreviewScenarios.ts');assert.equal(S.PREVIEW_SCENARIOS.length,23);for(const locale of contract.KONSOLISS_LOCALES){const localized=contract.konsolissLocaleDefaults(locale);assert.equal(Object.keys(localized).length,Object.keys(contract.KONSOLISS_COPY_DEFAULTS).length);assert.ok(localized['deadline.reminder']);}
 });

test('all 68,001 physical occupancy values at 0.001 CBM precision display strictly increasing accurate percentages',()=>{
 const {formatContainerFillPercent:format,parseKonsolissOccupancy:parse}=load("src/features/admin/screens/content/konsolissPreview/konsolissOccupancyModel.ts");
 let previous=-1;
 for(let milli=0;milli<=68000;milli++){
  const loaded=milli/1000,free=(68000-milli)/1000,own=Math.min(milli,20)/1000,other=(milli-Math.min(milli,20))/1000;
  const value=parse({container_id:'verified',container_type:'40HQ',capacity_cbm:68,loaded_cbm:loaded,your_loaded_cbm:own,other_cargo_cbm:other,free_cbm:free,your_allocated_cbm:own},'verified');
  assert.ok(value,'valid '+milli);const label=format(value.loadedCbm,value.capacityCbm),percent=Number(label.slice(0,-1));
  const expected=Number((BigInt(milli)*100000n+34000n)/68000n)/1000;
  assert.equal(percent,expected,'percent '+milli);assert.ok(percent>previous,'strict monotonic '+milli);
  assert.equal(percent===0,milli===0);assert.equal(percent===100,milli===68000);
  assert.ok(Math.abs(percent-loaded/68*100)<=.000500001);
  assert.equal(Math.round((value.loadedCbm+value.freeCbm)*1000),68000);
  previous=percent;
 }
 for(const [loaded,label] of [[0,'0%'],[.001,'0.001%'],[.02,'0.029%'],[34,'50%'],[51.7,'76.029%'],[67.32,'99%'],[67.9,'99.853%'],[67.999,'99.999%'],[68,'100%']])assert.equal(format(loaded,68),label);
 for(const value of [-.001,68.001,NaN,Infinity,.0001])assert.equal(format(value,68),'—');
 assert.equal(format(34,67),'—');
});
