const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

// Exercise the real authorization module with only its UI snapshot/transport
// dependencies replaced. No duplicate permission evaluator is implemented here.
function accessFixture() {
  const db = {SEC: ['Overview','Operations','Ecosystem','Content'], RIGHTS: ['Publish content','Pause accounts','Ban accounts','Manage permissions'], STAFF: [], ROLES: {}, RR: {}};
  const cache = {};
  function load(filename) {
    if(cache[filename]) return cache[filename].exports;
    const module={exports:{}};cache[filename]=module;
    const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const requireLocal=(name)=>{
      if(name==='./db')return {db,TODAY:'2026-11-06',aud:()=>{},bump:()=>{}};
      if(name==='./grantStore')return {GRANTS:[],liveGrantsFor:()=>[]};
      if(name==='./permissionKeys')return load(path.resolve(path.dirname(filename),'permissionKeys.ts'));
      throw new Error('Unexpected authorization dependency: '+name);
    };
    vm.runInNewContext(source,{exports:module.exports,require:requireLocal,module,Date,console},{filename});
    return module.exports;
  }
  return load(path.resolve(__dirname,'../src/features/admin/state/access.ts'));
}
const grant=(key,level,extra={})=>({permission_key:key,access_level:level,expires_at:null,revoked_at:null,...extra});
test('signed-out and revoked sessions never inherit prototype permissions',()=>{
  const a=accessFixture();
  assert.equal(a.hasRight('Publish content'),false);assert.equal(a.secLv(3),0);
  Object.assign(a.session,{userId:'synthetic-super',role:'super_admin',status:'revoked'});
  assert.equal(a.hasRight('Publish content'),false);assert.equal(a.rightLevel('Manage permissions'),0);
});
test('CMS and account controls use canonical server keys and required manage level',()=>{
  const a=accessFixture();Object.assign(a.session,{userId:'synthetic-staff',role:'staff',status:'active'});
  a.setServerGrants([grant('content.manage','edit'),grant('content.publish','view'),grant('accounts.restrict','edit')]);
  assert.equal(a.secLv(3),2);assert.equal(a.hasRight('Publish content'),false);assert.equal(a.hasRight('Pause accounts'),false);
  a.setServerGrants([grant('content.publish','manage'),grant('accounts.restrict','manage'),grant('staff.manage','manage')]);
  assert.equal(a.hasRight('Publish content'),true);assert.equal(a.hasRight('Pause accounts'),true);assert.equal(a.hasRight('Manage permissions'),true);
});
test('expired and revoked grants cannot authorize controls',()=>{
  const a=accessFixture();Object.assign(a.session,{userId:'synthetic-staff',role:'staff',status:'active'});
  a.setServerGrants([grant('content.publish','manage',{expires_at:new Date(Date.now()-1000).toISOString()}),grant('accounts.restrict','manage',{revoked_at:new Date().toISOString()})]);
  assert.equal(a.hasRight('Publish content'),false);assert.equal(a.hasRight('Pause accounts'),false);
});
test('permanent bans remain Super Admin only despite arbitrary granted labels',()=>{
  const a=accessFixture();Object.assign(a.session,{userId:'synthetic-staff',role:'staff',status:'active'});
  a.setServerGrants([grant('ban.accounts','manage'),grant('accounts.restrict','manage')]);
  assert.equal(a.hasRight('Ban accounts'),false);
  Object.assign(a.session,{role:'super_admin'});assert.equal(a.hasRight('Ban accounts'),true);
});

test('admin invocation hides transport, exception and backend response details',async()=>{
 const filename=path.resolve(__dirname,'../src/features/admin/lib/adminBackend.ts'),source=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),99,true);
 const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='invoke');
 const code=ts.transpileModule(fn.getText(source)+'\nmodule.exports=invoke;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 for(const response of [{error:{message:'private SQLSTATE 42501'}},{data:{error:'secret upstream response'}},new Error('private connection token')]){
  const module={exports:{}};vm.runInNewContext(code,{module,supabase:{functions:{invoke:async()=>{if(response instanceof Error)throw response;return response;}}}});
  await assert.rejects(module.exports('test',{}),{message:'Could not complete this admin request. Please try again.'});
 }
 const module={exports:{}};vm.runInNewContext(code,{module,supabase:{functions:{invoke:async()=>({data:{ok:true}})}}});assert.equal((await module.exports('test',{})).ok,true);
});
