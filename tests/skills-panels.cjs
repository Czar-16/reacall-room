/* Optional development check; no browser dependency is shipped with the site. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const page=await context.newPage();const errors=[],remote=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
 assert.equal(await page.locator('article.skill').count(),41);
 assert.equal(await page.locator('article.skill .question').count(),205);
 const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id));assert.equal(new Set(ids).size,ids.length);
 assert.equal(await page.locator('.source[data-highlighted]').count(),0);
 // Exercise all bundled snapshots, including every offscreen line and whitespace.
 await page.evaluate(()=>{
   window.copies=[];
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copies.push(text);}}});
   document.querySelectorAll('.source').forEach(d=>d.open=true);
 });
 await page.waitForFunction(()=>[...document.querySelectorAll('.source')].every(d=>d.dataset.highlighted));
 assert(await page.evaluate(()=>[...document.querySelectorAll('.source')].every(d=>{
   const raw=window.LESSONS.find(l=>l.id===d.dataset.sourceLesson).sources[+d.dataset.sourceIndex][1];
   return d.querySelector('code').textContent===raw;
 })));
 assert(await page.locator('.source .token.keyword').count()>0);
 for(const language of ['javascript','typescript','tsx']) assert(await page.locator(`.source code.language-${language} .token`).count()>0,language);
 const count=await page.locator('.copy-code').count();
 for(let i=0;i<count;i++) await page.locator('.copy-code').nth(i).evaluate(b=>b.click());
 await page.waitForFunction(n=>window.copies.length===n,count);
 assert(await page.evaluate(()=>window.copies.every((raw,i)=>{
   const d=document.querySelectorAll('.source')[i];return raw===window.LESSONS.find(l=>l.id===d.dataset.sourceLesson).sources[+d.dataset.sourceIndex][1];
 })));
 const first=page.locator('.source').first();
 await first.locator('.copy-code').scrollIntoViewIfNeeded();
 await first.locator('.copy-code').click();assert.equal(await first.locator('.copy-code').textContent(),'Copied!');
 await page.waitForTimeout(2100);assert.equal(await first.locator('.copy-code').textContent(),'Copy code');
 assert(await first.evaluate(d=>{window.tokenNode=d.querySelector('.token');d.open=false;d.open=true;return true;}));
 await page.waitForTimeout(40);assert(await first.evaluate(d=>window.tokenNode===d.querySelector('.token')));
 // Explicit JS, TS and TSX probes include strings, comments, types, JSX and HTML-like text.
 const probes=await page.evaluate(()=>{
  return [
   ['javascript','// comment\nconst value = "<b>&amp;</b>"; function double(n) { return n * 2; }'],
   ['typescript','// comment\nclass User {}\nfunction greet(user: User): string { return "<hello>&"; }'],
   ['tsx','// comment\nconst View = () => <div title="<hello>">{"&"}</div>;']
  ].map(([language,raw])=>{const c=document.createElement('code');c.className='language-'+language;c.textContent=raw;Prism.highlightElement(c);return {language,same:c.textContent===raw,keyword:!!c.querySelector('.keyword'),string:!!c.querySelector('.string,.attr-value'),comment:!!c.querySelector('.comment'),tag:!!c.querySelector('.tag')};});
 });
 for(const p of probes){assert(p.same&&p.keyword&&p.string&&p.comment,p.language);if(p.language==='tsx')assert(p.tag);}
 // Clipboard denial invokes real selection-based fallback, recording the selected raw value.
 await page.evaluate(()=>{
  navigator.clipboard.writeText=async()=>{throw Error('blocked')};
  window.nativeExec=document.execCommand.bind(document);
  document.execCommand=cmd=>{window.fallbackRaw=document.activeElement.value;window.fallbackResult=window.nativeExec(cmd);return window.fallbackResult;};
 });
 await first.locator('.copy-code').click();
 assert(await page.evaluate(()=>window.fallbackResult));
 assert(await first.evaluate(d=>window.fallbackRaw===window.LESSONS.find(l=>l.id===d.dataset.sourceLesson).sources[+d.dataset.sourceIndex][1]));
 await page.evaluate(()=>document.execCommand=()=>false);
 await first.locator('.copy-code').click();await first.locator('.manual-copy textarea').waitFor();
 assert(await first.evaluate(d=>{
  const t=d.querySelector('.manual-copy textarea');return t.value===window.LESSONS.find(l=>l.id===d.dataset.sourceLesson).sources[+d.dataset.sourceIndex][1]&&t.selectionStart===0&&t.selectionEnd===t.value.length;
 }));
 assert.match(await first.locator('.copy-status').textContent(),/manually/);
 // Themes preserve panel identity and keep the same readable dark editor surface.
 for(const theme of ['light','dark','system']){
  await page.evaluate(t=>document.querySelector(`[data-theme="${t}"]`).click(),theme);
  assert.equal(await first.locator('pre').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(40, 44, 52)');
 }
 const colors=await page.locator('.source').evaluateAll(ds=>{
  const result={};for(const token of ['keyword','string','comment','function','class-name','number','punctuation']){
   const el=document.querySelector('.source .token.'+token);result[token]=el&&getComputedStyle(el).color;
  }return result;
 });assert(Object.values(colors).every(Boolean));assert.equal(new Set(Object.values(colors)).size,7);
 // Skill search indexes names, Roman-script explanations and answer-only troubleshooting text.
 for(const [query,id] of [['Zod','skill-zod'],['purana reference','skill-cpp'],['rolled-back transaction','skill-postgresql']]){
  await page.locator('#search').fill(query);assert(await page.locator('#'+id).isVisible());
 }
 await page.locator('#search').fill('');
 const skill=page.locator('#skill-zod'),question=page.locator('#skill-zod-q2');
 await question.locator('summary').click();await question.locator('select').selectOption('revision');
 await skill.locator('[data-complete]').check();
 assert.equal(await page.locator('#progress-skills').getAttribute('value'),'1');
 for(const project of ['MailLoop','PurePin','BuzzLine']){
  assert.equal(await page.locator('#progress-'+project).getAttribute('max'),'4');
  assert.equal(await page.locator('#progress-'+project).getAttribute('value'),'0');
 }
 await page.locator('#filter').selectOption('revision');assert.equal(await page.locator('article.lesson:visible').count(),1);
 await question.locator('select').focus();
 await page.evaluate(()=>{window.skillNode=document.getElementById('skill-zod-q2');window.oldY=scrollY;document.querySelector('[data-theme="dark"]').click();});
 assert(await page.evaluate(()=>window.skillNode===document.getElementById('skill-zod-q2')&&window.skillNode.open&&document.activeElement.id==='confidence-skill-zod-q2'&&Math.abs(scrollY-window.oldY)<2));
 await question.locator('select').selectOption('confident');assert(await skill.isVisible());
 await page.locator('#filter').focus();assert(await skill.isHidden());
 await page.locator('#filter').selectOption('all');
 await page.locator('.nav-link[data-lesson="skill-zod"]').evaluate(el=>el.click());
 await page.evaluate(()=>scrollTo(0,0));await page.locator('#continue').click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'skill-zod-title');
 await page.reload();assert(await page.locator('#skill-zod [data-complete]').isChecked());
 assert.equal(await page.locator('#confidence-skill-zod-q2').inputValue(),'confident');
 // New export round trip and old format import compatibility.
 await page.locator('.progress-tools summary').click();
 const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;
 let raw='';for await(const b of await download.createReadStream())raw+=b;
 const saved=JSON.parse(raw);assert.equal(saved.version,1);assert(saved.done['skill-zod']);assert.equal(saved.questions['skill-zod-q2'],'confident');
 await page.locator('#import').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 assert(await page.locator('#skill-zod [data-complete]').isChecked());
 await page.locator('#import').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,done:{'mailloop-0':true},questions:{'mailloop-0-0':'revision'}}))});
 assert(await page.locator('[data-complete="mailloop-0"]').isChecked());assert.equal(await page.locator('#progress-skills').getAttribute('value'),'0');
 // Highlight failure retains escaped plain text and does not retry on reopen.
 await page.evaluate(()=>{window.nativeHighlight=Prism.highlightElement;Prism.highlightElement=()=>{throw Error('simulated')};document.querySelector('.source').open=true;});
 await page.waitForFunction(()=>document.querySelector('.source').dataset.highlighted);
 assert(await first.evaluate(d=>d.querySelector('code').textContent===window.LESSONS[0].sources[0][1]));
 // Mobile toolbars stay inside the viewport in each theme and System responds to OS appearance.
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  for(const theme of ['light','dark','system']){
   await page.evaluate(t=>document.querySelector(`[data-theme="${t}"]`).click(),theme);
   await first.scrollIntoViewIfNeeded();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}/${theme}`);
   assert(await first.locator('.copy-code').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('#menu').click();await page.locator('#sidebar a[href="#skills"]').click();
 assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'false');
 await page.waitForTimeout(220);await page.locator('#skills').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/fieldnotes-skills-mobile.png'});
 await page.evaluate(()=>{Prism.highlightElement=window.nativeHighlight;const c=document.querySelector('.source code');Prism.highlightElement(c);});
 await first.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/fieldnotes-code-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});
 await page.emulateMedia({reducedMotion:'reduce'});await first.hover();
 assert.equal(await first.evaluate(e=>getComputedStyle(e).transform),'none');
 await first.locator('summary').focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert(await first.locator('summary').evaluate(e=>getComputedStyle(e).outlineStyle!=='none'));
 await page.emulateMedia({reducedMotion:'no-preference'});await first.hover();await page.waitForTimeout(220);
 assert.equal(await first.evaluate(e=>getComputedStyle(e).transform),'none');
 assert.equal(await first.evaluate(e=>getComputedStyle(e).borderTopColor),await first.evaluate(e=>getComputedStyle(e).getPropertyValue('--blue').trim()).then(hex=>{const n=parseInt(hex.slice(1),16);return `rgb(${n>>16}, ${(n>>8)&255}, ${n&255})`;}));
 await first.locator('.copy-code').hover();await page.waitForTimeout(220);
 assert.equal(await first.locator('.copy-code').evaluate(e=>getComputedStyle(e).transform),'none');
 await page.evaluate(()=>dispatchEvent(new Event('beforeprint')));
 await page.emulateMedia({media:'print'});
 assert.equal(await first.locator('pre').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
 assert(await first.locator('.code-toolbar').isHidden());
 assert.equal(await first.locator('pre').evaluate(e=>getComputedStyle(e).maxHeight),'none');
 await page.pdf({path:'/tmp/fieldnotes-print.pdf',pageRanges:'1-3'});
 await page.emulateMedia({media:'screen'});await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 await browser.close();
 console.log('PASS: 41 skills / 205 bilingual Q&A; exact source text, Prism JS/TS/TSX, lazy highlighting and failure, clipboard API/selection/manual paths, search, progress, revision, Continue, round-trip/legacy import, DOM/focus, 320–1440px themes, hover/reduced motion, focus, print and zero network requests.');
})().catch(e=>{console.error(e);process.exit(1);});
