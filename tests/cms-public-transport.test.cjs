const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function service(invoke){
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/admin/lib/wantissCms.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>{assert.equal(name,'./supabase');return{supabase:{functions:{invoke}}};}});
 return module.exports;
}
test('Goodies editor receives the deployed published record and preserves server metadata',async()=>{
 const record={content_key:'goodies.content',locale:'en',version:5,payload:{v:5,labels:[]},updated_at:'2026-11-21T00:00:00Z'},calls=[];
 const api=service(async(name,args)=>{calls.push({name,args});return{data:{content:[record],assets:[],branding:{name:'Wantiss',logo_url:null,wordmark_url:null,updated_at:null}},error:null};});
 const result=await api.fetchPublishedWantissContent('en');assert.equal(result.content[0],record);assert.equal(calls[0].name,'wantiss-public-content');assert.equal(calls[0].args.body.locale,'en');assert.equal(result.content[0].status,undefined);
});
test('Goodies editor rejects malformed successful responses instead of presenting an empty published catalogue',async()=>{
 for(const data of [null,{},[],{content:{},assets:[]},{content:[],assets:null}])await assert.rejects(service(async()=>({data,error:null})).fetchPublishedWantissContent(),/Published content is unavailable right now/);
 const result=await service(async()=>({data:{content:[],assets:[]},error:null})).fetchPublishedWantissContent();assert.equal(result.content.length,0);assert.equal(result.branding.name,'Wantiss');
});
test('CMS transport failures reveal only the existing safe application message',async()=>{
 for(const invoke of [async()=>{throw Error('private SQL schema and token');},async()=>({data:null,error:Error('private database connection')})])await assert.rejects(service(invoke).fetchPublishedWantissContent(),error=>{assert.equal(error.message,'Published content is unavailable right now.');return true;});
});
