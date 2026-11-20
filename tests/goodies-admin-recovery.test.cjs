const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const base=path.resolve(__dirname,'../src/features/admin');
function extract(file,name,context={}){
 const filename=path.join(base,file),source=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),99,true);let declaration;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)declaration=node.getText(source).replace(/^export /,'');if(ts.isVariableDeclaration(node)&&node.name.getText(source)===name)declaration='const '+node.getText(source)+';';ts.forEachChild(node,visit);}visit(source);assert.ok(declaration,'Missing '+name);
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(declaration+'\nmodule.exports='+name+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText,{module,session:{userId:'synthetic-admin'},useCallback:fn=>fn,useMemo:fn=>fn(),...context});return module.exports;
}
function mutationFixture(){
 const context={mounted:{current:true},mutationLock:{current:false},session:{userId:'synthetic-admin'},setBusy(){}};
 return{...context,runMutation:extract('screens/goodies/GoodiesAdminScreen.tsx','runMutation',context)};
}
const editor='screens/content/GoodiesEditor.tsx',builder='screens/content/GoodiesBuilderConfigEditor.tsx';
function publication(overrides={}){
 const notices=[],rows=[],context={ready:true,canPublish:true,row:{id:'synthetic-draft',status:'draft',version:8},dirty:false,busy:'',draft:{labels:[]},assetLock:{current:false},operationLock:{current:false},goodiesPublicationErrors:()=>[],referencedAssetKeys:()=>[],setBusy(){},setNotice:value=>notices.push(value),setRow:value=>rows.push(value),setSource(){},setConfirmPublish(){},publishCmsVersion:async()=>{},fetchPublishedWantissContent:async()=>{throw Error('private readback transport detail');},GOODIES_CONTENT_KEY:'goodies.content',...overrides};return{context,notices,rows,run:extract(editor,'publish',context)};
}
test('successful CMS publication remains published when public readback fails',async()=>{
 const h=publication();await h.run();assert.equal(h.rows.at(-1).status,'published');assert.equal(h.notices.at(-1).tone,'warn');assert.match(h.notices.at(-1).text,/was published/);assert.doesNotMatch(h.notices.at(-1).text,/private|Not published/);assert.equal(h.context.operationLock.current,false);
});
test('a lost CMS publication response is reported as unconfirmed and requires reload',async()=>{
 const h=publication({publishCmsVersion:async()=>{throw Error('private SQL server detail');}});await h.run();assert.equal(h.rows.length,0);assert.equal(h.notices.at(-1).text,'Publication could not be confirmed. Reload its status before trying again.');
});
test('same-tick CMS publication taps issue one write and disabled/loading editors issue none',async()=>{
 let writes=0,finish;const h=publication({publishCmsVersion:()=>{writes++;return new Promise(done=>finish=done);}});const first=h.run(),second=h.run();assert.equal(writes,1);finish();await Promise.all([first,second]);
 for(const invalid of [{ready:false},{canPublish:false},{dirty:true},{assetLock:{current:true}}]){const invalidCase=publication({...invalid,publishCmsVersion:async()=>{writes++;}});await invalidCase.run();}assert.equal(writes,1);
});
test('same-tick draft saves issue one write and preserve readback uncertainty',async()=>{
 let writes=0,finish;const notices=[],lock={current:false};const context={ready:true,draft:{labels:[]},clean:{labels:[]},canEdit:true,busy:'',assetLock:{current:false},operationLock:lock,validateGoodiesDraft:()=>[],setBusy(){},setNotice:v=>notices.push(v),setConfirmPublish(){},saveCmsVersion:()=>{writes++;return new Promise(done=>finish=done);},supabase:{from(){return{select(){return this;},eq(){return this;},maybeSingle:async()=>({error:{message:'private readback failure'}})};}},GOODIES_CONTENT_KEY:'goodies.content',COLUMNS:'id'};
 const save=extract(editor,'save',context),first=save(),second=save();assert.equal(writes,1);finish('synthetic-id');await Promise.all([first,second]);assert.match(notices.at(-1).text,/could not be read back/);assert.doesNotMatch(notices.at(-1).text,/private/);assert.equal(lock.current,false);
});
test('deferred asset picking keeps the original field and locks duplicate picker calls',async()=>{
 let finish,picks=0;const applied=[],uploads=[];const context={selection:{kind:'category',id:'original',field:'art'},editMode:true,busy:'',assetLock:{current:false},setAssetBusy(){},setAssetNote(){},setPendingAssets(){},ImagePicker:{launchImageLibraryAsync:()=>{picks++;return new Promise(done=>finish=done);}},createAssetUploadId:()=> 'synthetic-upload',uploadCmsAsset:async value=>{uploads.push(value);return 'asset-id';},setImage:(image,target)=>applied.push({image,target}),loadAssets:async()=>{}};
 const upload=extract(editor,'uploadHomeImage',context);const first=upload('photos'),second=upload('photos');assert.equal(picks,1);context.selection={kind:'promo',id:'different',field:'art'};finish({canceled:false,assets:[{uri:'file:fixture',mimeType:'image/png',fileName:'fixture.png',fileSize:10}]});await Promise.all([first,second]);assert.equal(applied.length,1);assert.equal(applied[0].target.id,'original');assert.equal(applied[0].target.kind,'category');assert.match(uploads[0].key,/category\.original/);assert.equal(context.assetLock.current,false);
});
test('delayed edits preserve the latest draft instead of overwriting intervening changes',()=>{
 let value={labels:[],newField:'keep this change'};const edit=extract(editor,'edit',{draft:{labels:[]},editMode:true,clone:structuredClone,setDraft:update=>{value=update(value);},setNotice(){},setConfirmPublish(){}});edit(next=>{next.labels.push({id:'new'});});assert.equal(value.newField,'keep this change');assert.equal(value.labels[0].id,'new');
});
test('builders with the same store-scoped ID resolve to the intended merchant and save original protocol IDs',async()=>{
 const id=extract('lib/goodiesBuilderSelection.ts','goodiesBuilderPreviewId'),pick=extract('lib/goodiesBuilderSelection.ts','selectedGoodiesBuilder',{goodiesBuilderPreviewId:id});
 const rows=[{business_id:'merchant-a',builder_id:'pizza|special',config:{id:'pizza|special',name:'First pizza',groups:[]},enabled:true},{business_id:'merchant-b',builder_id:'pizza|special',config:{id:'pizza|special',name:'Second pizza',groups:[]},enabled:true}];
 const configs=extract(editor,'previewBuilderConfigs',{byoRows:rows,byoDraft:null,byoUrls:{},goodiesBuilderPreviewId:id});assert.notEqual(configs[0].id,configs[1].id);assert.ok(!configs[1].id.includes('|'),'Admin identity must survive existing route parameter separation');assert.equal(pick(rows,configs[1].id).business_id,'merchant-b');assert.equal(pick(rows,'pizza|special'),undefined);
 const chosen=structuredClone(pick(rows,configs[1].id));chosen.config.name='Updated intended merchant';const calls=[];const persist=extract(builder,'persist',{canEdit:true,saveLock:{current:false},setSaving(){},setError(){},setNotice(){},setSelected(){},load:async()=>{},supabase:{rpc:async(name,args)=>{calls.push({name,args});return{};}}});assert.equal(await persist(chosen),true);assert.equal(calls[0].args.p_business_id,'merchant-b');assert.equal(calls[0].args.p_builder_id,'pizza|special');assert.equal(calls[0].args.p_config.id,'pizza|special');assert.equal(rows[0].config.name,'First pizza');
});
function backend(response){
 const filename=path.join(base,'lib/adminBackend.ts'),module={exports:{}};const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports:module.exports,module,require:name=>{if(name==='./supabase')return{supabase:{rpc:async()=>{if(response instanceof Error)throw response;return response;}}};if(name==='./cmsAssetPagination')return{};throw Error('Unexpected import '+name);}});return module.exports;
}
const rpcCases=[['listApplicationBusinesses',['application']],['assignApplicationBusiness',['application','business']],['reviewBusinessApplication',['application','approved','verified reason']],['setBusinessApplicationDocumentStatus',['document','verified','verified reason']],['setBusinessVerification',['business','restricted','verified reason']],['saveCmsVersion',[{key:'goodies.content',locale:'en',payload:{}}]],['publishCmsVersion',['content']],['archiveCmsVersion',['content']],['publishCmsAsset',['asset']],['archiveCmsAsset',['asset']],['applyAccountRestriction',[{userId:'customer',kind:'Suspension',scope:'GoodiesCustomer',reason:'verified reason',startsAt:'2026-11-18',notifyUser:false}]],['liftAccountRestriction',['restriction','verified reason']],['updateAccountRestriction',['restriction',null,'verified reason']],['recordRestrictionAppeal',['restriction','receive','verified reason']]];
test('shared Goodies onboarding, restriction and CMS RPCs hide returned and thrown server details',async()=>{
 for(const response of [{error:{message:'private SQL token finance schema'}},new Error('private upstream session token')]){const api=backend(response);for(const [name,args]of rpcCases)await assert.rejects(api[name](...args),error=>{assert.doesNotMatch(error.message,/private|SQL|token|schema/);assert.match(error.message,/could not|couldn't/i);return true;},name);}
 const denied=backend({error:{code:'42501',message:'private authorization function'}});for(const [name,args]of rpcCases)await assert.rejects(denied[name](...args),error=>{assert.doesNotMatch(error.message,/private/);assert.match(error.message,/permission|requires|required/i);return true;},name);
});
test('courier removal with a picked-up delivery shows the owned action message',async()=>{
 const notices=[];const run=extract('screens/goodies/GoodiesAdminScreen.tsx','setCourierAccess',{...mutationFixture(),canOperate:true,setBusy(){},goodiesRequest:async()=>({error:{code:'P4213',message:'private SQL assignment lock'}}),toast:value=>notices.push(value),loadCouriers:async()=>{throw Error('must not reload after denial');}});await run({courier_id:'courier'},false);assert.equal(notices.at(-1),'Resolve the courier delivery before removing access.');
});

function hydrationFixture(loadDomain,loadRestrictions=async()=>[]){
 const db={},status={operations:'idle',ecosystem:'idle',restrictions:'idle'},session={userId:'synthetic-admin'},modes=[];
 const filename=path.join(base,'lib/hydrateAdminState.ts'),module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>{
  if(name==='./adminBackend')return{loadAdminDomain:loadDomain,listStaff:async()=>[],listAccountRestrictions:loadRestrictions};
  if(name==='./supabase')return{supabase:{rpc:async()=>({data:[]})}};
  if(name==='../state/db')return{db,adminSnapshotStatus:status,bump(){},setDataMode:value=>modes.push(value)};
  if(name==='../state/access')return{session};
  if(name==='../state/grants')return{GRANTS:[],REQUESTS:[]};
  throw Error('Unexpected hydrate dependency '+name);
 }});return{db,status,session,modes,load:module.exports.hydrateAdminState};
}
function boundary(fixture,domain,children='successful-empty-list'){
 return extract('ui/AdminSnapshotBoundary.tsx','AdminSnapshotBoundary',{useDb(){},useState:()=>[false,()=>{}],adminSnapshotStatus:fixture.status,bump(){},hydrateAdminState:fixture.load,names:{operations:'Applications',ecosystem:'Business records',restrictions:'Account restrictions'},Card:'Card',View:'View',Txt:'Txt',OutlineBtn:'OutlineBtn',React:{Fragment:'Fragment',createElement:(type,props,...children)=>({type,props:props||{},children})}})({domain,children});
}
test('failed operations, business and restriction RPCs render an honest retry state instead of empty success',async()=>{
 for(const domain of ['operations','ecosystem','restrictions']){
  const fixture=hydrationFixture(async next=>{if(next===domain)throw Error('private server relation');return[];},async()=>{if(domain==='restrictions')throw Error('private policy detail');return[];});await fixture.load();assert.equal(fixture.status[domain],'error');const rendered=JSON.stringify(boundary(fixture,domain));assert.match(rendered,/could not be loaded/);assert.match(rendered,/Try again/);assert.doesNotMatch(rendered,/successful-empty-list|private/);
 }
});
test('retrying the real snapshot boundary recovers the successful list after a failed load',async()=>{
 let failing=true;const fixture=hydrationFixture(async domain=>{if(domain==='operations'&&failing)throw Error('private network detail');return[];});await fixture.load();const tree=boundary(fixture,'operations');let retry;function visit(node){if(!node||typeof node!=='object')return;if(node.type==='OutlineBtn')retry=node.props.onPress;for(const child of node.children||[])visit(child);}visit(tree);assert.equal(typeof retry,'function');failing=false;retry();await new Promise(setImmediate);assert.equal(fixture.status.operations,'ready');assert.match(JSON.stringify(boundary(fixture,'operations')),/successful-empty-list/);
});
test('late snapshot responses cannot overwrite a newer load or a different admin session',async()=>{
 let first=true,finish;const fixture=hydrationFixture(async domain=>{if(first&&domain==='operations')return new Promise(done=>finish=done);return domain==='ecosystem'?[{id:first?'old-business':'new-business',name:'Synthetic store'}]:[];});const older=fixture.load();first=false;await fixture.load();finish([]);await older;assert.equal(fixture.db.BIZ[0].id,'new-business');assert.equal(fixture.status.operations,'ready');
 let release;const other=hydrationFixture(async domain=>domain==='operations'?new Promise(done=>release=done):domain==='ecosystem'?[{id:'private-old-owner'}]:[]);const pending=other.load();other.session.userId='different-admin';release([]);await pending;assert.equal(other.db.BIZ.length,0);
});
test('operational and financial handlers reject insufficient grants before alerts or writes',async()=>{
 const file='screens/goodies/GoodiesAdminScreen.tsx';let requests=0;const context={canOperate:false,canFinance:false,Alert:{alert(){requests++;}},goodiesRequest:async()=>{requests++;},toast(){}};
 for(const [name,args]of [['setMerchant',[{}]],['setCourierAccess',[{},false]],['cancelOrder',[{}]],['reviewProduct',[{},'approved']],['saveFees',[]],['saveDeliverySurcharge',[]],['resolveReport',[{},'refund']]])await extract(file,name,context)(...args);assert.equal(requests,0);
 for(const name of ['saveFees','saveDeliverySurcharge','resolveReport'])await extract(file,name,{...context,canOperate:true})(...(name==='resolveReport'?[{},'release']:[]));assert.equal(requests,0);
});
test('fee inputs reject malformed tip presets and fractional stop limits without publishing a different policy',async()=>{
 let writes=0;const messages=[],context={canOperate:true,canFinance:true,feesLoaded:true,loading:false,busy:'',fee:'3',tips:'0,broken,2',toast:value=>messages.push(value),goodiesRequest:async()=>{writes++;},setBusy(){}};await extract('screens/goodies/GoodiesAdminScreen.tsx','saveFees',context)();assert.equal(writes,0);assert.match(messages.at(-1),/tip amounts/);
 for(const value of ['0,,2','0,NaN,2']){context.tips=value;await extract('screens/goodies/GoodiesAdminScreen.tsx','saveFees',context)();}assert.equal(writes,0);
 context.tips='0,1';context.fee=' ';await extract('screens/goodies/GoodiesAdminScreen.tsx','saveFees',context)();assert.equal(writes,0);assert.match(messages.at(-1),/service fee/);
 await extract('screens/goodies/GoodiesAdminScreen.tsx','saveDeliverySurcharge',{...context,additionalStoreFee:'2',extraDistancePerKm:'1',maxStops:'2.8'})();assert.equal(writes,0);assert.match(messages.at(-1),/number of stores/);
 await extract('screens/goodies/GoodiesAdminScreen.tsx','saveDeliverySurcharge',{...context,additionalStoreFee:' ',extraDistancePerKm:'1',maxStops:'3'})();assert.equal(writes,0);assert.match(messages.at(-1),/surcharge amounts/);
});
test('a late operational page cannot replace a newer page or data for a new admin',async()=>{
 const reads={current:{}},mounted={current:true},session={userId:'first-admin'},updates=[],pending=[];const beginRead=extract('screens/goodies/GoodiesAdminScreen.tsx','beginRead',{reads,mounted,session});
 const load=extract('screens/goodies/GoodiesAdminScreen.tsx','loadOrderPage',{beginRead,setOrderRows:value=>updates.push(value),setBusy(){},setSectionErrors(){},orderPage:0,goodiesRequest:()=>new Promise(done=>pending.push(done))});const first=load(),second=load();pending[1]({data:[{id:'new-page'}]});await second;pending[0]({data:[{id:'old-page'}]});await first;assert.equal(updates.at(-1)[0].id,'new-page');
 const next=load();session.userId='another-admin';pending[2]({data:[{id:'private-other-admin'}]});await next;assert.equal(updates.at(-1).length,0);
});
test('invalid financial responses never become a displayed zero or settlement amount',()=>{
 const money=extract('screens/goodies/GoodiesAdminScreen.tsx','money');for(const value of [null,undefined,'',NaN,Infinity,{},-1])assert.equal(money(value),'Unavailable');assert.match(money(0),/0\.00/);
 const parse=extract('screens/goodies/GoodiesSettlementAdmin.tsx','parseGoodiesSettlementQueue'),valid={channels:[{method:'bank',enabled:false}],destinations:[],payouts:[{id:'payout',amount:5,payout_amount:'650.00',currency:'USD',payout_currency:'HTG',eta_from:'2026-11-18',eta_to:'2026-11-19'}],cash_remittances:[]};assert.equal(parse(valid).payouts[0].amount,5);
 for(const value of [null,'',NaN,Infinity,'private',-1,0])assert.throws(()=>parse({...valid,payouts:[{...valid.payouts[0],amount:value}]}));assert.throws(()=>parse({...valid,cash_remittances:[{id:'cash',total:null}]}));
});
test('same-tick operational taps dispatch once and late responses do not update a different admin',async()=>{
 let complete,writes=0;const notices=[],fixture=mutationFixture();
 const run=extract('screens/goodies/GoodiesAdminScreen.tsx','setCourierAccess',{...fixture,canOperate:true,goodiesRequest:()=>{writes++;return new Promise(done=>complete=done);},toast:value=>notices.push(value),loadCouriers:async()=>{throw Error('A different admin must not be refreshed');}});
 const first=run({courier_id:'courier'},true),duplicate=run({courier_id:'courier'},true);assert.equal(writes,1);
 fixture.session.userId='different-admin';complete({});await Promise.all([first,duplicate]);assert.equal(notices.length,0);assert.equal(fixture.mutationLock.current,false);
 await assert.rejects(fixture.runMutation('test',async()=>{throw Error('Synthetic transport error');}));assert.equal(fixture.mutationLock.current,false);
});
test('saved confirmation dialogs cannot mutate after switching admin accounts',()=>{
 const fixture=mutationFixture(),dialogs=[];let writes=0;
 const context={...fixture,canOperate:true,canFinance:true,money:()=>'$3.00',Alert:{alert:(title,body,buttons)=>dialogs.push(buttons)},goodiesRequest:async()=>{writes++;},toast(){},loadReports:async()=>[],reload:async()=>{},loadOrderPage:async()=>{}};
 extract('screens/goodies/GoodiesAdminScreen.tsx','cancelOrder',context)({id:'order',order_code:'TEST'});
 extract('screens/goodies/GoodiesAdminScreen.tsx','resolveReport',context)({order_id:'order',order_code:'TEST',total:3},'refund');
 fixture.session.userId='different-admin';for(const buttons of dialogs)buttons.at(-1).onPress();assert.equal(writes,0);
});
test('malformed review pages show an error and late pages do not replace current account data',async()=>{
 const reads={current:{}},mounted={current:true},session={userId:'first-admin'},rows=[],errors=[],pending=[];
 const beginRead=extract('screens/goodies/GoodiesAdminScreen.tsx','beginRead',{reads,mounted,session});
 const context={beginRead,reviewsPage:0,setCustomerReviews:value=>rows.push(value),setReviewsLoading(){},setReviewsError:value=>errors.push(value),goodiesRequest:async()=>({data:{unexpected:'shape'}})};
 await extract('screens/goodies/GoodiesAdminScreen.tsx','loadCustomerReviews',context)();assert.equal(errors.at(-1),true);assert.equal(rows.at(-1).length,0);
 context.goodiesRequest=()=>new Promise(done=>pending.push(done));const load=extract('screens/goodies/GoodiesAdminScreen.tsx','loadCustomerReviews',context),first=load(),second=load();pending[1]({data:[{id:'new-review'}]});await second;pending[0]({data:[{id:'old-review'}]});await first;assert.equal(rows.at(-1)[0].id,'new-review');
 const next=load();session.userId='different-admin';pending[2]({data:[{id:'private-review'}]});await next;assert.equal(rows.at(-1).length,0);
});
test('an uncertain CMS asset-record response preserves the successfully uploaded object',async()=>{
 for(const result of [{error:{message:'Synthetic lost metadata response'}},{data:null}]){
  let uploaded=0,removed=0;const cmsImageType=extract('lib/adminBackend.ts','cmsImageType');
  const upload=extract('lib/adminBackend.ts','uploadCmsAsset',{cmsImageType,createAssetUploadId:()=> 'synthetic-upload',fetch:async()=>({ok:true,arrayBuffer:async()=>new Uint8Array([0x89,0x50,0x4e,0x47]).buffer}),supabase:{auth:{getUser:async()=>({data:{user:{id:'synthetic-admin'}}})},storage:{from:()=>({upload:async()=>{uploaded++;return{};},remove:async()=>{removed++;return{};}})},rpc:async()=>result}});
  await assert.rejects(upload({key:'test-art',uri:'fixture',fileName:'art.png',contentType:'image/png',byteSize:4}),/asset record could not be confirmed/);assert.equal(uploaded,1);assert.equal(removed,0);
 }
});
test('a builder image picker runs once and keeps the selected merchant scope',async()=>{
 let finish,picks=0,selected={business_id:'merchant-a',builder_id:'pizza',config:{groups:[{id:'toppings',items:[{id:'cheese',name:'Cheese'}]}]}};
 const context={canEdit:true,busy:'',uploadLock:{current:false},selected,part:{groupId:'toppings',itemId:'cheese'},setBusy(){},setError(){},setNotice(){},setSelected:update=>{selected=update(selected);},chooseAndUploadIngredientImage:()=>{picks++;return new Promise(done=>finish=done);}};
 const upload=extract(builder,'upload',context),first=upload('photos'),duplicate=upload('photos');assert.equal(picks,1);selected={business_id:'merchant-b',builder_id:'pizza',config:{groups:[{id:'toppings',items:[{id:'cheese',name:'Different cheese'}]}]}};
 finish('synthetic-image');await Promise.all([first,duplicate]);assert.equal(selected.config.groups[0].items[0].name,'Different cheese');assert.equal(selected.config.groups[0].items[0].img,undefined);assert.equal(context.uploadLock.current,false);
});
test('settlement reads and destination responses cannot expose the previous admin session',async()=>{
 const session={userId:'first-admin'},updates=[],details=[];let finish;
 const load=extract('screens/goodies/GoodiesSettlementAdmin.tsx','load',{session,generation:{current:0},active:{current:true},page:0,refresh:0,setLoading(){},setError(){},setData:value=>updates.push(value),parseGoodiesSettlementQueue:extract('screens/goodies/GoodiesSettlementAdmin.tsx','parseGoodiesSettlementQueue'),supabase:{rpc:()=>new Promise(done=>finish=done)}});
 const pending=load();session.userId='other-admin';finish({data:{channels:[],destinations:[],payouts:[],cash_remittances:[]}});await pending;assert.deepEqual(updates,[null]);
 session.userId='first-admin';const submit=extract('screens/goodies/GoodiesSettlementAdmin.tsx','submit',{session,action:{kind:'details',id:'destination'},valid:true,lock:{current:false},active:{current:true},setBusy(){},setError(){},setDetails:value=>details.push(value),reason:'Synthetic verified review',supabase:{rpc:()=>new Promise(done=>finish=done)}});
 const reading=submit();session.userId='other-admin';finish({data:{holder:'Private fixture holder',details:{account:'Synthetic private fixture'}}});await reading;assert.equal(details.length,0);
});
test('ingredient asset IDs do not require a native global Web Crypto API',async()=>{
 const calls=[],store=extract('screens/content/GoodiesIngredientRequests.tsx','storeAsset',{slug:()=> 'cheese',createAssetUploadId:()=> 'synthetic-upload',uploadCmsAsset:async value=>{calls.push(value);return 'synthetic-asset-id';},publishCmsAsset:async id=>calls.push(id)});
 const key=await store('Cheese',{uri:'fixture',fileName:'image.png',contentType:'image/png',byteSize:4});assert.equal(key,'wantiss.goodies.ingredient.cheese.synthetic-upload');assert.equal(calls[1],'synthetic-asset-id');
});
test('ingredient decisions require an explanatory note and asset permission where needed',async()=>{
 const messages=[],calls=[],context={notes:{},canPublishAssets:true,setMsg:value=>messages.push(value),run:(id,work)=>work(),urls:{},supabase:{rpc:async(name,args)=>{calls.push({name,args});return{};}}};
 const file='screens/content/GoodiesIngredientRequests.tsx';await extract(file,'review',context)({id:'request'},'denied');await extract(file,'review',context)({id:'request'},'needs_info');assert.equal(calls.length,0);assert.match(messages.at(-1),/note/);
 context.notes.request='Please supply a clear ingredient photo';await extract(file,'review',context)({id:'request'},'needs_info');assert.equal(calls.length,1);assert.equal(calls[0].args.p_review_note,context.notes.request);
 context.canPublishAssets=false;await extract(file,'review',context)({id:'request'},'approved');assert.equal(calls.length,1);
});
test('ingredient photo actions lock the whole picker and preserve the submitted name',async()=>{
 let finish,picks=0;const saved=[],context={canEdit:true,loading:false,loadFailed:false,busy:'',lock:{current:false},canPublishAssets:true,setBusy(){},setMsg(){},load:async()=>{},pickImage:()=>{picks++;return new Promise(done=>finish=done);},persistLibrary:async(row,file)=>saved.push({row,file})};
 context.run=extract('screens/content/GoodiesIngredientRequests.tsx','run',context);
 const save=extract('screens/content/GoodiesIngredientRequests.tsx','saveLibWithPhoto',context),first=save({name:'Original ingredient',builder:'pizza'}),duplicate=save({name:'Different later name',builder:'burger'});assert.equal(picks,1);finish({uri:'fixture'});await Promise.all([first,duplicate]);assert.equal(saved.length,1);assert.equal(saved[0].row.name,'Original ingredient');assert.equal(context.lock.current,false);
 for(const invalid of [{canEdit:false},{loading:true},{loadFailed:true}]){let writes=0;await extract('screens/content/GoodiesIngredientRequests.tsx','run',{...context,...invalid})('invalid',async()=>{writes++;});assert.equal(writes,0);}
});
test('builder ingredient choices load requests beyond the old cap and reject overlapping pages',async()=>{
 const rows=Array.from({length:211},(_,index)=>({id:'synthetic-request-'+index})),calls=[];
 const load=extract('lib/goodiesIngredientRequests.ts','loadAllGoodiesIngredientRequests');
 const all=await load({rpc:async(name,args)=>{calls.push({name,args});return{data:rows.slice(args.p_offset,args.p_offset+args.p_limit)};}});assert.equal(all.length,211);assert.equal(calls.length,5);assert.equal(calls.at(-1).args.p_offset,200);assert.equal(calls[0].args.p_waiting,false);
 await assert.rejects(load({rpc:async()=>({data:rows.slice(0,50)})}),/changed while loading/);
 await assert.rejects(load({rpc:async()=>({error:{message:'private SQL detail'}})}),error=>{assert.doesNotMatch(error.message,/private|SQL/);return true;});
});
test('ingredient request filtering is applied by the backend before paging and stale responses are ignored',async()=>{
 const responses=[],pending=[],updates=[],generation={current:0},mounted={current:true},session={userId:'synthetic-admin'},context={generation,mounted,session,requestPage:3,showAll:false,setLoading(){},setLoadFailed(){},setRequests:value=>updates.push(value),setLibrary(){},setRules(){},setUrls(){},setMsg(){},supabase:{rpc:(name,args)=>{responses.push({name,args});return new Promise(done=>pending.push(done));}}};
 const loading=extract('screens/content/GoodiesIngredientRequests.tsx','load',context)();assert.equal(responses[0].name,'wantiss_admin_list_ingredient_requests_page');assert.equal(responses[0].args.p_offset,150);assert.equal(responses[0].args.p_waiting,true);assert.equal(updates[0].length,0);
 session.userId='different-admin';pending[0]({data:[{id:'private-old-request'}]});pending[1]({data:[]});pending[2]({data:''});await loading;assert.equal(updates.length,1);assert.equal(updates.at(-1).length,0);
});
test('every advertised Goodies hub module opens its connected destination rather than a stale or placeholder tab',()=>{
 const ui={},calls=[],nav={go:(...args)=>calls.push(args)},open=extract('screens/ecosystem/useOpenModule.ts','useOpenModule',{ui,db:{POTMAP:{Kitchen:'Live kitchen'}},useNav:()=>nav,useOverlay:()=>({closeAll(){}})})();
 const expected={Overview:['goodies','Overview'],'Goodies assets':['goodies','Goodies assets'],Categories:['goodies','Content editor'],Merchants:['goodies','Merchants'],'Product review':['goodies','Product review'],Orders:['goodies','Orders'],Promotions:['goodies','Content editor'],Support:['goodies','Support'],Analytics:['goodies','Analytics'],Settings:['goodies','Fees']};
 for(const [name,[screen,selection]]of Object.entries(expected)){open('Goodies',name);const last=calls.at(-1);assert.equal(last[0],screen,name);assert.equal(ui.goodiesModule,selection,name);}
 open('Potssy','Kitchen');assert.equal(calls.at(-1)[0],'potssy');assert.equal(ui.pt,'Live kitchen');
 open('Unrelated service','Configuration');assert.equal(calls.at(-1)[0],'workspace');assert.equal(ui.wsvc,'Unrelated service');assert.equal(ui.wmod,'Configuration');
 const setModule=extract('screens/workspace/ServiceWorkspaceScreen.tsx','setModule',{serviceName:'Goodies',openModule:open,ui,bump(){}});setModule('Orders');assert.equal(calls.at(-1)[0],'goodies');assert.equal(ui.goodiesModule,'Orders');
});
test('Goodies support pages use the shared real inbox and ignore stale page or account responses',async()=>{
 const reads={current:{}},mounted={current:true},session={userId:'first-admin'},pending=[],ranges=[],rows=[],errors=[];
 const beginRead=extract('screens/goodies/GoodiesAdminScreen.tsx','beginRead',{reads,mounted,session});
 const chain={select(){return this;},ilike(field,value){assert.equal(field,'subject');assert.equal(value,'Goodies · %');return this;},order(){return this;},range(start,end){ranges.push([start,end]);return new Promise(done=>pending.push(done));}};
 const context={beginRead,supportCanRead:true,supportPage:0,setSupportRows:value=>rows.push(value),setSupportLoaded(){},setSupportError:value=>errors.push(value),supabase:{from:name=>{assert.equal(name,'settings_support_requests');return chain;}}};
 const first=extract('screens/goodies/GoodiesAdminScreen.tsx','loadSupportTickets',context)();context.supportPage=1;const second=extract('screens/goodies/GoodiesAdminScreen.tsx','loadSupportTickets',context)();assert.deepEqual(ranges,[[0,49],[50,99]]);
 pending[1]({data:[{id:'new-page-ticket'}]});await second;pending[0]({data:[{id:'older-page-ticket'}]});await first;assert.equal(rows.at(-1)[0].id,'new-page-ticket');
 const switched=extract('screens/goodies/GoodiesAdminScreen.tsx','loadSupportTickets',context)();session.userId='different-admin';pending[2]({data:[{id:'private-old-ticket'}]});await switched;assert.equal(rows.at(-1).length,0);
 const failing=extract('screens/goodies/GoodiesAdminScreen.tsx','loadSupportTickets',context)();pending[3]({error:{message:'private SQL policy detail'}});await failing;assert.equal(errors.at(-1),'Could not load Goodies support tickets. Please retry.');assert.doesNotMatch(errors.at(-1),/SQL|private/);
});
test('support status writes lock duplicate taps and require one confirmed Goodies ticket',async()=>{
 const fixture=mutationFixture(),notices=[];let finish,writes=0,loads=0;
 const chain={update(value){assert.equal(value.status,'resolved');return this;},eq(field,value){assert.equal(field,'id');assert.equal(value,'ticket');return this;},ilike(field,value){assert.equal(value,'Goodies · %');return this;},select(){return this;},single(){writes++;return new Promise(done=>finish=done);}};
 const context={...fixture,supportCanEdit:true,supabase:{from:name=>{assert.equal(name,'settings_support_requests');return chain;}},toast:value=>notices.push(value),loadSupportTickets:async()=>{loads++;}};
 const update=extract('screens/goodies/GoodiesAdminScreen.tsx','updateSupportTicket',context),first=update('ticket','resolved'),second=update('ticket','resolved');assert.equal(writes,1);finish({data:{id:'ticket'}});await Promise.all([first,second]);assert.equal(loads,1);assert.match(notices.at(-1),/resolved/);
 await extract('screens/goodies/GoodiesAdminScreen.tsx','updateSupportTicket',{...context,supportCanEdit:false})('ticket','resolved');assert.equal(writes,1);
 const uncertain=update('ticket','resolved');finish({data:null});await uncertain;assert.match(notices.at(-1),/Could not confirm/);assert.equal(loads,1);
});
