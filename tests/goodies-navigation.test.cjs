const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../src/features/admin');
const source = fs.readFileSync(path.join(root, 'screens/ecosystem/useOpenModule.ts'), 'utf8');
const screen = fs.readFileSync(path.join(root, 'screens/goodies/GoodiesAdminScreen.tsx'), 'utf8');
const modules = fs.readFileSync(path.join(root, 'screens/goodies/modules.ts'), 'utf8');
const labels = text => {
  const match = text.match(/(?:const MODULES|const GOODIES_MODULES)\s*=\s*\[([^\]]+)\]/);
  assert.ok(match, 'Goodies screen/module catalog must declare a static list');
  return [...match[1].matchAll(/'([^']+)'/g)].map(item => item[1]);
};
const screenModules = new Set(labels(screen));
const workspaceModules = labels(modules);

function fixture() {
  const ui = {}, history = [];
  const db = {GMAP: {}};
  const module = {exports: {}};
  const context = {exports: module.exports, module, console,
    require(id) {
      if (id === 'react') return {useCallback: fn => fn};
      if (id === '../../state/db') return {ui, db};
      if (id === '../../shell/Nav') return {useNav: () => ({go: target => history.push(target)})};
      if (id === '../../ui/Overlay') return {useOverlay: () => ({closeAll: () => {}})};
      throw new Error('Unexpected routing dependency: ' + id);
    },
  };
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(compiled,context,{filename:'useOpenModule.js'});
  const open = context.module.exports.useOpenModule();
  return {open,ui,db,history};
}

test('every listed Goodies workspace section opens a supported live admin module', () => {
  const f = fixture();
  for (const label of workspaceModules) {
    f.open('Goodies',label);
    assert.equal(f.history.at(-1),'goodies','Wrong screen for '+label);
    assert.ok(screenModules.has(f.ui.goodiesModule),'Unimplemented destination for '+label+': '+f.ui.goodiesModule);
  }
});
test('Goodies support, categories, promotions and settings do not fall into the prototype workspace',()=>{
  const expected = {
    Support:'Support',
    Categories:'Content editor',
    Promotions:'Content editor',
    Settings:'Fees',
    'Products and catalog':'Product review',
  };
  const f = fixture();
  for (const [label,target] of Object.entries(expected)) {
    f.open('Goodies',label);
    assert.equal(f.ui.goodiesModule,target,'Misdirected '+label);
    assert.equal(f.history.at(-1),'goodies');
  }
  assert.match(screen,/module==='Support'/);
  assert.match(screen,/settings_support_requests/);
  assert.match(screen,/hasServerPermission\('operations','view'\)/);
});
test('an unknown Goodies module fails safely to Overview rather than another service',()=>{
  const f = fixture();
  f.open('Goodies','unknown future section');
  assert.equal(f.ui.goodiesModule,'Overview');
  assert.equal(f.history.at(-1),'goodies');
  assert.equal(f.ui.wsvc,'Goodies');
});
