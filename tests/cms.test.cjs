const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {test}=require('node:test');
const root=path.resolve(__dirname,'../src/features/admin/goodiesConsumer');
function loadModule(filename,cache=new Map()){
 if(cache.has(filename))return cache.get(filename).exports;
 const module={exports:{}};cache.set(filename,module);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const requireLocal=id=>{
  if (filename.endsWith('GoodiesPageContentFields.tsx')) {
    if(id==='react-native')return {TextInput:'TextInput',View:'View'};
    if(id.endsWith('/ui/Card'))return {Section:'Section'};
    if(id.endsWith('/ui/Txt'))return {Txt:'Txt'};
    if(id.endsWith('/ui/Controls'))return {OutlineBtn:'OutlineBtn'};
    if(id.endsWith('/theme/ThemeContext'))return {useTheme:()=>({c:{ink:'#000',card:'#fff',bd:'#ddd'}})};
  }
  if(id==='./i18n')return {t:key=>key};
  if(!id.startsWith('.'))return require(id);
  const base=path.resolve(path.dirname(filename),id),target=[base,base+'.ts',base+'.tsx',base+'.json',path.join(base,'index.ts')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
  if(!target)throw new Error('Missing module '+base);
  if(target.endsWith('.json'))return JSON.parse(fs.readFileSync(target,'utf8'));
  return loadModule(target,cache);
 };
 vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename})(requireLocal,module,module.exports);return module.exports;
}
const editing=loadModule(path.join(root,'contentEditing.ts')),draft=loadModule(path.join(root,'draft.ts'));
const catalog=require(path.join(root,'customerLabelCatalog.json')),pages=require(path.join(root,'customerPageCatalog.json'));
test('every registered source field is manually editable in all five locales and survives save serialization',()=>{
 let value=draft.buildStarterDraft();const byId=new Map(value.labels.map(row=>[row.id,row]));
 for(const field of catalog){assert.ok(byId.has(field.id),'Missing '+field.id);const row=byId.get(field.id);
  for(const locale of ['en','fr','ht','es','zh-Hans'])row.t=editing.setLocalizedText(row.t,locale,locale+' edited '+field.text);
 }
 const saved=JSON.parse(JSON.stringify(draft.sanitizeForSave(value)));
 assert.deepEqual(draft.validateGoodiesDraft(saved,true),[]);
 for(const field of catalog)for(const locale of ['en','fr','ht','es','zh-Hans']){
  const translated=saved.labels.find(row=>row.id===field.id).t[locale];assert.equal(translated.v,locale+' edited '+field.text);assert.equal(translated.s,'draft');
 }
});
test('opening an existing draft preserves all edited content, translations and protected configuration',()=>{
 const original={v:5,labels:[{id:catalog[0].id,t:{en:{v:'Existing editor copy',s:'reviewed'},ht:{v:'Human reviewed copy',s:'reviewed'}}}],fees:{svc:3.5,privateDeliveryProofs:false},custom:{preserve:true}};
 const result=editing.mergeMissingLabels(original,draft.buildStarterDraft());
 assert.deepEqual(result.labels[0],original.labels[0]);assert.deepEqual(result.fees,original.fees);assert.deepEqual(result.custom,original.custom);
 assert.equal(new Set(result.labels.map(row=>row.id)).size,result.labels.length);
});
test('every discovered route has a page entry and every referenced label exists in the starter',()=>{
 const keys=new Set(draft.buildStarterDraft().labels.map(row=>row.id));
 for(const page of pages)for(const id of page.fields)assert.ok(keys.has(id),page.name+': '+id);
 for(const route of ['home','cats','cart','checkout','track','orders','settings','profile','addresses','payments','help','contact','policy','policies','ndetail','supdone','addcard','cardauth','grouporder','byo','reviews'])assert.ok(pages.some(page=>page.routes.includes(route)),'Missing route '+route);
});
test('FAQ, support topics and policy edits preserve all locales through serialization',()=>{
 const value=draft.buildStarterDraft();value.faq=[{q:{},a:{}}];value.topics=[{id:'topic.1',t:{}}];value.legal=[{id:'legal.terms',st:'Live',t:{}}];
 for(const locale of ['en','fr','ht','es','zh-Hans'])for(const [row,key] of [[value.faq[0],'q'],[value.faq[0],'a'],[value.topics[0],'t'],[value.legal[0],'t']])row[key]=editing.setLocalizedText(row[key],locale,'Edited '+locale);
 const saved=JSON.parse(JSON.stringify(draft.sanitizeForSave(value)));
 assert.equal(saved.legal[0].t.ht.v,'Edited ht');assert.equal(saved.faq[0].q.es.v,'Edited es');assert.equal(saved.topics[0].t['zh-Hans'].v,'Edited zh-Hans');
 assert.deepEqual(draft.validateGoodiesDraft(saved),[]);
 assert.deepEqual(editing.moveContentEntry(['a','b'],1,-1),['b','a']);
});
test('required dynamic placeholders cannot disappear on save and edits never promote human review',()=>{
 const source=catalog.find(field=>editing.requiredPlaceholders(field.text).length);assert.ok(source);
 const value=draft.buildStarterDraft(),entry=value.labels.find(row=>row.id===source.id);entry.t=editing.setLocalizedText(entry.t,'en','Missing dynamic value');
 assert.ok(draft.validateGoodiesDraft(value,true).some(error=>error.includes(source.id)));
 assert.equal(editing.setLocalizedText({ht:{v:'Old',s:'reviewed'}},'ht','New').ht.s,'draft');
});

test('real structured editor controls save edits and honor read-only access',()=>{
 const {GoodiesPageContentFields}=loadModule(path.resolve(root,'../screens/content/GoodiesPageContentFields.tsx'));
 const value={faq:[{q:{en:{v:'Question',s:'reviewed'}},a:{en:{v:'Answer',s:'reviewed'}}}],topics:[{id:'topic.1',t:{en:{v:'Topic',s:'reviewed'}}}],legal:[{id:'legal.terms',st:'Hidden',t:{en:{v:'Policy',s:'reviewed'}}}],rg:{texts:[{id:'rg.rules',t:{en:{v:'Rules {age}',s:'reviewed'}}}]}};
 const render=disabled=>GoodiesPageContentFields({draft:value,locale:'fr',disabled,edit:change=>change(value)});
 const elements=[];function visit(node){if(Array.isArray(node))return node.forEach(visit);if(!node||typeof node!=='object')return;elements.push(node);visit(node.props?.children);}
 visit(render(false));const inputs=elements.filter(node=>node.type==='TextInput'&&node.props.multiline);assert.equal(inputs.length,5);
 inputs.forEach((input,index)=>input.props.onChangeText('Edited '+index));
 assert.equal(value.faq[0].q.fr.v,'Edited 0');assert.equal(value.faq[0].a.fr.v,'Edited 1');assert.equal(value.topics[0].t.fr.v,'Edited 2');assert.equal(value.legal[0].t.fr.v,'Edited 3');assert.equal(value.rg.texts[0].t.fr.v,'Edited 4');
 assert.equal(value.legal[0].t.en.v,'Policy');assert.equal(value.legal[0].t.fr.s,'draft');
 elements.length=0;visit(render(true));assert.ok(elements.filter(node=>node.type==='TextInput').every(node=>node.props.editable===false));assert.ok(elements.filter(node=>node.type==='OutlineBtn').every(node=>node.props.disabled));
});
test('editing legacy string content preserves its English wording',()=>{
 const result=editing.setLocalizedText('Existing English','fr','Edited French');assert.equal(result.en.v,'Existing English');assert.equal(result.fr.v,'Edited French');
});
test('the existing starter draft remains valid without requiring unrelated text changes',()=>{
 assert.deepEqual(draft.validateGoodiesDraft(draft.buildStarterDraft(),true),[]);
});
test('CMS wording never replaces internal payment configuration keys',()=>{
 const filename=path.resolve(root,'screens/Shop.tsx'),ast=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),99,true);let checked=0;
 function visit(node){if(ts.isElementAccessExpression(node)&&node.expression.getText(ast)==='PAYON'){
  checked++;assert.ok(!/cmsText\(|label\(/.test(node.argumentExpression.getText(ast)),'Payment feature keys must remain protocol constants');
 }ts.forEachChild(node,visit);}visit(ast);assert.ok(checked);
});
test('asset listing reaches beyond the legacy 500-row cap and never reports partial results as complete',async()=>{
 const {listAllCmsAssets}=loadModule(path.resolve(root,'../lib/cmsAssetPagination.ts'));
 const rows=Array.from({length:650},(_,index)=>({id:String(index).padStart(5,'0'),created_at:new Date(index*1000).toISOString()}));let calls=0;
 const client={from(table){assert.equal(table,'wantiss_cms_assets');let cursor='',limit=0;const query={select(){return query;},order(){return query;},limit(value){limit=value;return query;},gt(key,value){assert.equal(key,'id');cursor=value;return query;},then(resolve,reject){calls++;return Promise.resolve({data:rows.filter(row=>row.id>cursor).slice(0,limit),error:null}).then(resolve,reject);}};return query;}};
 const result=await listAllCmsAssets(client);assert.equal(result.length,650);assert.equal(calls,4);assert.equal(new Set(result.map(row=>row.id)).size,650);assert.equal(result[0].id,'00649');
 const failing={from(){const query={select(){return query;},order(){return query;},limit(){return query;},then(resolve,reject){return Promise.resolve({data:null,error:{code:'42501'}}).then(resolve,reject);}};return query;}};
 await assert.rejects(()=>listAllCmsAssets(failing),/permission/);
});

test('critical publication requires explicit review and never promotes translation status',()=>{
 const {goodiesPublicationErrors}=loadModule(path.join(root,'publicationReview.ts'));
 const value=draft.buildStarterDraft(),row=value.labels.find(r=>r.id==='lbl.checkoutReview');
 for(const text of [...value.labels.map(r=>r.t),...(value.rg?.texts || []).map(r=>r.t)])for(const tr of Object.values(text || {}))if(tr?.v)tr.s='reviewed';
 row.t=editing.setLocalizedText(row.t,'ht','Synthetic Creole draft');
 assert.ok(goodiesPublicationErrors(value).some(e=>e.includes('ht')));assert.equal(row.t.ht.s,'draft');
 row.t.ht.s='reviewed';assert.deepEqual(goodiesPublicationErrors(value),[]);
 row.t.en={v:'Unreviewed English',s:'draft'};assert.ok(goodiesPublicationErrors(value).some(e=>e.includes('en')));
 value.faq=[{q:{en:{v:'Question',s:'reviewed'}},a:{en:{v:'Answer coming soon.',s:'reviewed'}}}];
 assert.ok(goodiesPublicationErrors(value).some(e=>e.includes('placeholder')));
});

test('all registered fields complete a local edit-save-review-serialization-consumer lookup round trip',()=>{
 const {goodiesPublicationErrors}=loadModule(path.join(root,'publicationReview.ts'));
 const consumer=path.resolve(__dirname,'../../tiss_tiss_beta/src/features/Goodies/i18n/resolveText.ts');
 const {resolveGoodiesText}=loadModule(consumer),value=draft.buildStarterDraft();
 for(const entry of value.labels)for(const locale of ['en','fr','ht','es','zh-Hans']){
  entry.t=editing.setLocalizedText(entry.t,locale,`${locale} synthetic edit ${entry.id}`);
  // Explicit synthetic reviewer action; this test does not certify real human translations.
  entry.t[locale].s='reviewed';
 }
 for(const entry of value.rg?.texts || [])for(const tr of Object.values(entry.t || {}))if(tr?.v)tr.s='reviewed';
 const serialized=JSON.parse(JSON.stringify(draft.sanitizeForSave(value)));
 assert.deepEqual(goodiesPublicationErrors(serialized),[]);
 for(const entry of serialized.labels)for(const locale of ['en','fr','ht','es','zh-Hans'])assert.equal(resolveGoodiesText(entry.t,locale),`${locale} synthetic edit ${entry.id}`);
});
