const path=require('path'),os=require('os');
const {chromium}=require('playwright'),fs=require('fs');const pages=require(path.resolve(__dirname,'../../../../src/features/admin/goodiesConsumer/customerPageCatalog.json'));
let liveBrowser;
(async()=>{const b=liveBrowser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),p=await b.newPage({viewport:{width:1200,height:1100}}),results=[];let exceptions=[];p.on('pageerror',e=>exceptions.push(String(e.stack)));await p.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8063')?route.continue():route.abort());
for(const key of pages.flatMap(p=>p.routes)){
 exceptions=[];await p.goto('http://127.0.0.1:8063');await p.getByRole('button',{name:'Preview screen: home',exact:true}).waitFor();await p.waitForTimeout(100);
 if(key==='byo'){await p.getByRole('button',{name:'Build Your Own ▾',exact:true}).click();await p.getByRole('button',{name:/Pizza builder/}).first().click()}
 else await p.getByRole('button',{name:'Preview screen: '+key,exact:true}).click();
 await p.waitForTimeout(250);let fail=await p.evaluate(()=>document.querySelector('#failure')?.textContent||null),route=await p.evaluate(()=>window.cms.S.stack.at(-1).r);let pass=!fail&&exceptions.length===0&&route===key;results.push({route:key,status:pass?'PASS':'FAIL',actualRoute:route,...(fail?{failure:fail}:{}),...(exceptions.length?{exceptions}:{}),text:(await p.locator('body').innerText()).slice(-900)});console.log(key,pass?'PASS':fail||exceptions||route);
}
fs.writeFileSync(path.join(os.tmpdir(),'goodies-preview-routes.json'),JSON.stringify({scope:'Local React Native web draft preview; fonts/gradient/safe area/icons adapted; network blocked; no hosted publishing/native-device validation',results},null,2));await b.close();process.exitCode=results.some(r=>r.status==='FAIL')?1:0})().catch(async e=>{console.error(e);await liveBrowser?.close();process.exitCode=1});
