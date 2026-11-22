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
test('Konsoliss content editor uses yellow outlined editable copy and dedicated CMS key',()=>{
  const source=get('screens/content/KonsolissEditor.tsx');
  assert.match(source,/konsoliss\.content/);
  assert.match(source,/#FFD93D/);
  assert.match(source,/borderStyle:'dashed'/);
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
  assert.match(source,/can\(\.\.\.REQ\.content\)/);
  assert.match(source,/can\(\.\.\.REQ\.publish\)/);
});
