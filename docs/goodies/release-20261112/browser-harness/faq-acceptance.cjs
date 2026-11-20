/* Actual customer Help screen inside the existing isolated CMS preview. No publishing or external requests. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const payload=require(path.resolve(__dirname,'../../../../../tiss_tiss_beta/docs/goodies/content-acceptance-release/publish-payload.json'));
const out=process.env.GOODIES_PREVIEW_RECEIPT_DIR?path.resolve(process.env.GOODIES_PREVIEW_RECEIPT_DIR):path.resolve(__dirname,'../../acceptance-20261117');
const {sha}=require(path.resolve(__dirname,'../../../../../tiss_tiss_beta/scripts/prepare-goodies-translations.cjs'));
const text=(value,locale)=>value[locale]?.s==='reviewed'&&value[locale]?.v?value[locale].v:value.en.v;
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1200,height:1100}}),errors=[],results=[];
 page.on('pageerror',error=>errors.push(String(error)));await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8063/')?route.continue():route.abort());
 await page.goto('http://127.0.0.1:8063/');await page.getByRole('button',{name:'Preview screen: help',exact:true}).waitFor();
 await page.evaluate(value=>window.cms.setDraft(value),payload);await page.getByRole('button',{name:'Preview screen: help',exact:true}).click();
 for(const locale of ['en','fr','es','zh-Hans','ht']){
  await page.evaluate(locale=>{window.cms.setLocale(locale);window.cms.S.lang=locale;window.cms.emit();},locale);
  for(const [index,row]of payload.faq.entries()){
   const question=text(row.q,locale),answer=text(row.a,locale);await page.getByText(question,{exact:true}).click();await page.getByText(answer,{exact:true}).waitFor();results.push({locale,index,status:'PASS',englishFallback:locale==='ht'&&row.a.ht?.s!=='reviewed'});
  }
 }
 assert.deepEqual(errors,[]);assert.equal(await page.getByText('Answer coming soon.',{exact:true}).count(),0);
 assert.equal(await page.evaluate(()=>window.cms.previewRequests.some(x=>!x.blocked&&/publish|checkout|charge|refund/.test(x.name))),false);
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'faq-preview.json'),JSON.stringify({scope:'Actual Help/FAQ rendering in the local isolated CMS preview; no hosted publication or native device. Five FAQs in four approved locales plus reviewed-English fallback for unfinished Creole.',status:'PASS',payloadSha256:sha(payload),results},null,2)+'\n');
 console.log('PASS: 25 FAQ/locale renders, zero browser errors, unfinished Creole uses English, no publication/payment writes.');await browser.close();
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;});
