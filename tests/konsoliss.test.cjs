const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'../src/features/admin');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Konsoliss editor and operations files have parseable TSX',()=>{
  for(const file of ['screens/content/KonsolissEditor.tsx','screens/konsoliss/KonsolissAdminScreen.tsx']){
    const source=ts.createSourceFile(file,get(file),99,true,ts.ScriptKind.TSX);
    assert.equal(source.parseDiagnostics.length,0,file+': '+source.parseDiagnostics.map(d=>d.messageText).join('; '));
  }
});
test('Konsoliss content editor uses yellow dotted outlined editable copy and dedicated CMS key',()=>{
  const source=get('screens/content/KonsolissEditor.tsx');
  assert.match(source,/konsoliss\.content/);
  assert.match(source,/#FFD93D/);
  assert.match(source,/borderStyle:'dotted'/);
  assert.match(source,/publishCmsVersion/);
  assert.match(source,/saveCmsVersion/);
  assert.match(source,/canEdit/);
  assert.match(source,/canPublish/);
});
test('Konsoliss operational workspace requires active Super Admin',()=>{
  for(const file of ['screens/konsoliss/KonsolissAdminScreen.tsx','screens/ecosystem/ServiceHubScreen.tsx','screens/workspace/ServiceWorkspaceScreen.tsx']){
    const source=get(file);
    assert.match(source,/session\.role\s*!==\s*'super_admin'|session\.role\s*===\s*'super_admin'/,file);
    assert.match(source,/session\.status\s*!==\s*'active'|session\.status\s*===\s*'active'/,file);
  }
  const source=get('screens/konsoliss/KonsolissAdminScreen.tsx');
  assert.match(source,/konsoliss_admin_manage_container/);
  assert.match(source,/konsoliss_admin_list_containers/);
  assert.match(source,/p_reason/);
});
test('Konsoliss editor is reachable independently of operational permissions',()=>{
  const source=get('screens/content/CustomerPageEditorScreen.tsx');
  assert.match(source,/KonsolissEditor/);
  assert.match(source,/setPageChoice\(requested === 'goodies' \? 'Goodies' : 'Konsoliss'\)/);
  assert.match(source,/can\(\.\.\.REQ\.content\)/);
  assert.match(source,/can\(\.\.\.REQ\.publish\)/);
});

test('Konsoliss phone preview renders the mirrored real consumer 3D engine and uses Goodies phone frame',()=>{
  const editor=get('screens/content/KonsolissEditor.tsx');
  const preview=get('screens/content/KonsolissConsumerPreviewScreen.tsx');
  assert.match(editor,/KonsolissConsumerPreviewScreen/);
  assert.match(editor,/<PhoneFrame/);
  assert.match(editor,/Manual editor/);
  assert.match(editor,/Phone preview/);
  assert.doesNotMatch(editor,/3D container runs in consumer app/);
  assert.match(preview,/const CONTAINER_JS = \[/);
  assert.match(preview,/requestAnimationFrame\(draw\)/);
  assert.match(preview,/onTouchStart=\{\(\) => setScroll\(false\)\}/);
  assert.match(preview,/react-native-webview/);
});

test('Konsoliss preview is deferred until selected and optional admin snapshots have a deadline',()=>{
 const editor=get('screens/content/CustomerPageEditorScreen.tsx');
 assert.match(editor,/lazy\(\(\) => import\('\.\/KonsolissEditor'\)/);
 assert.match(editor,/<Suspense fallback=/);
 const snapshots=get('lib/hydrateAdminState.ts');
 assert.match(snapshots,/SNAPSHOT_TIMEOUT_MS = 12000/);
 assert.match(snapshots,/snapshotWithDeadline\(load\(\)\)/);
});

test('Konsoliss editor starts at 75% and without a selected label',()=>{
  const editor=get('screens/content/KonsolissEditor.tsx');
  const overlay=get('screens/content/KonsolissPreviewSelection.tsx');
  const preview=get('screens/content/KonsolissConsumerPreviewScreen.tsx');
  assert.match(editor,/useState\(0\.75\)/);
  assert.match(editor,/\[0\.75,0\.85,1,1\.25\]/);
  assert.match(editor,/\[selected,setSelected\]=useState\(''\)/);
  assert.match(overlay,/borderWidth:active\?1\.5:0/);
  assert.match(preview,/const dark = false;/);
});
test('Goodies preview has one Home tab and separate zoom options row',()=>{
  const preview=get('screens/content/GoodiesConsumerPreview.tsx');
  assert.match(preview,/key !== 'byo' && key !== 'wantiss'/);
  assert.match(preview,/\[0\.75, 0\.85, 1, 1\.25\]/);
  assert.match(preview,/useState\(0\.75\)/);
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'goodiesConsumer/customerPageCatalog.json'),'utf8'));
  const keys=catalog.flatMap(page=>page.routes.filter(key=>key !== 'byo' && key !== 'wantiss').map(key=>({key,label:page.name})));
  assert.equal(keys.filter(item=>item.label==='Home').length,1);
});

test('selected Konsoliss content editor renders directly under the phone within the preview section',()=>{
 const source=get('screens/content/KonsolissEditor.tsx');
 const start=source.indexOf('<Section title="Konsoliss phone preview">');
 const selected=source.indexOf('accessibilityLabel="Selected Konsoliss content editor"');
 const end=source.indexOf('<Section title="Pages · Text">');
 assert.ok(start>=0 && selected>start && end>selected,'selected content editor must be between the phone preview and Pages · Text');
 const phoneSection=source.slice(start,end);
 assert.match(phoneSection,/KonsolissConsumerPreviewScreen/);
 assert.match(phoneSection,/editMode&&selected\?<View/);
 assert.match(phoneSection,/Edit '\+selected/);
 assert.doesNotMatch(source,/<Section title=\{'Selected text/);
});

test('editor preview guidance is clear and Konsoliss zoom has no Published button',()=>{
 const konsoliss=get('screens/content/KonsolissEditor.tsx');
 const goodies=get('screens/content/GoodiesConsumerPreview.tsx');
 assert.match(konsoliss,/Choose a screen, then tap the text you want to change/);
 assert.match(goodies,/Choose a screen, then tap the content you want to change/);
 assert.doesNotMatch(konsoliss,/>Published<\/Txt>/);
 assert.match(konsoliss,/Publish…/);
 assert.match(konsoliss,/\[0\.75,0\.85,1,1\.25\]/);
});

test('Konsoliss preview scenarios are isolated from live operations and cover each requested state',()=>{
 const source=get('screens/content/KonsolissPreviewFixtures.ts');
 const preview=get('screens/content/KonsolissConsumerPreviewScreen.tsx');
 const editor=get('screens/content/KonsolissEditor.tsx');
 const fixtureFile=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const fake={exports:{}};
 require('node:vm').runInNewContext(fixtureFile,{module:fake,exports:fake.exports});
 const fixtures=fake.exports;
 const general=fixtures.KONSOLISS_PREVIEW_GENERAL;
 const lifecycle=fixtures.KONSOLISS_PREVIEW_LIFECYCLE;
 assert.deepEqual(Array.from(general,x=>x.id),['default','loading','error','no-container','booking-success','booking-failed']);
 assert.deepEqual(Array.from(lifecycle,x=>x.id),['filling','filled','departed','arrived']);
 for(const row of [...general,...lifecycle]){
   const data=fixtures.konsolissPreviewFixture(row.id);
   assert.equal(data.scenario,row.id);
   assert.equal(typeof data.availableForBooking,'boolean');
 }
 for(const key of ['loading','error','no-container']){
   const state=fixtures.konsolissPreviewFixture(key);
   assert.equal(state.containerNumber,null);
   assert.equal(state.availableForBooking,false);
   assert.equal(fixtures.konsolissPreviewNeedsFallback(state),true);
 }
 for(const key of ['filled','departed','arrived']){
   const state=fixtures.konsolissPreviewFixture(key);
   assert.equal(state.status,key);
   assert.equal(state.availableForBooking,false);
   assert.ok(state.occupiedCbm<=state.capacityCbm);
   assert.match(fixtures.konsolissPreviewStatusLabel(state),new RegExp(key,'i'));
 }
 for(const key of ['booking-success','booking-failed']){
   assert.equal(fixtures.konsolissPreviewFixture(key).status,'filling');
 }
 assert.match(editor,/KONSOLISS_PREVIEW_GENERAL\.map/);
 assert.match(editor,/KONSOLISS_PREVIEW_LIFECYCLE\.map/);
 assert.match(editor,/scenario=\{scenario\}/);
 assert.match(preview,/konsolissPreviewFixture\(scenario\)/);
 assert.match(preview,/scenario==='booking-success'/);
 assert.match(preview,/scenario==='booking-failed'/);
 assert.match(preview,/konsolissPreviewNeedsFallback\(fixture\)/);
 assert.match(preview,/ActivityIndicator/);
 assert.match(preview,/onRetry/);
 assert.doesNotMatch(source,/\b(?:supabase|fetch|axios|createClient|rpc)\s*\(/);
 assert.doesNotMatch(preview,/supabase\.(?:from|rpc|functions)|fetch\(/);
});
