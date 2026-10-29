/* Optional verification dependency: npm install playwright-core outside the static site. */
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light',reducedMotion:'reduce',acceptDownloads:true});
  const page = await context.newPage(); const errors = [], remote=[];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', req => { if (/^https?:/.test(req.url())) remote.push(req.url()); });
  const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
  await page.goto(url);await page.waitForSelector('article.lesson');
  assert.equal(await page.locator('article.lesson').count(),53);
  assert.equal(await page.locator('details.question').count(),325);
  assert.equal(await page.locator('.answer-panel').count(),325);
  assert.equal(await page.locator('.language-block.english').count(),65);
  assert.equal(await page.locator('.language-block.hinglish').count(),65);
  assert.equal(await page.locator('.diagram svg').count(),12);
  assert.equal(await page.locator('html').getAttribute('data-theme'),'system');
  assert.equal(await page.locator('.theme-controls svg').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
  const q=page.locator('#mailloop-0-0');
  await q.locator('summary').click();
  await q.locator('select').selectOption('revision');
  await page.locator('[data-complete="mailloop-0"]').check();
  await page.locator('[data-theme="dark"]').click();
  assert(await q.evaluate(el=>el.open));
  assert.equal(await page.locator('#progress-MailLoop').getAttribute('value'),'1');
  const dark=await page.locator('.diagram svg').first().evaluate(el=>({ink:getComputedStyle(el).getPropertyValue('--ink').trim(),bg:getComputedStyle(el).getPropertyValue('--paper').trim()}));
  assert.equal(dark.ink,'#ededed');assert.equal(dark.bg,'#0a0a0a');
  await page.reload();await page.waitForSelector('article.lesson');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  assert(await page.locator('[data-complete="mailloop-0"]').isChecked());
  await page.locator('[data-theme="system"]').click();
  await page.emulateMedia({colorScheme:'dark'});
  assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)');
  await page.emulateMedia({colorScheme:'light'});
  assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(244, 246, 251)');
  await page.locator('#search').fill('naye pixels');
  assert.equal(await page.locator('article.lesson:visible').count(),1);
  await page.locator('#search').fill('setTimeout(searchUsers, 500)');
  assert.equal(await page.locator('article.lesson:visible').count(),1);
  assert.equal(await page.locator('article.lesson:visible').getAttribute('id'),'BuzzLine-2');
  await page.locator('#search').fill('');
  await page.locator('#filter').selectOption('revision');
  assert.equal(await page.locator('article.lesson:visible').count(),1);
  await page.locator('#filter').selectOption('all');
  await q.locator('summary').click();
  // Existing node identity, expansion, focus and viewport survive appearance changes.
  await q.locator('select').focus();
  const oldY=await page.evaluate(()=>scrollY);
  await page.evaluate(()=>{window.testNode=document.getElementById('mailloop-0-0');document.querySelector('[data-theme="dark"]').click();});
  assert(await page.evaluate(()=>window.testNode===document.getElementById('mailloop-0-0')&&window.testNode.open));
  assert.equal(await page.evaluate(()=>document.activeElement.id),'confidence-mailloop-0-0');
  assert(Math.abs(await page.evaluate(()=>scrollY)-oldY)<2);
  await page.locator('.enlarge').first().click();
  assert(await page.locator('#diagram-dialog').evaluate(el=>el.open));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#diagram-dialog').evaluate(el=>el.open),false);
  assert.equal(await page.locator('.enlarge').first().evaluate(el=>el===document.activeElement),true);
  await page.locator('.progress-tools summary').click();
  const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;
  const stream=await download.createReadStream();let exported='';for await(const part of stream)exported+=part;
  const saved=JSON.parse(exported);assert.equal(saved.done['mailloop-0'],true);assert.equal(saved.questions['mailloop-0-0'],'revision');
  const imported={version:1,done:{'purepin-1':true,unknown:true},questions:{'BuzzLine-2-3':'revision',bad:'confident'},last:'BuzzLine-2'};
  await page.locator('#import').setInputFiles({name:'progress.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});
  await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Progress imported.');
  assert(await page.locator('[data-complete="purepin-1"]').isChecked());
  assert.equal(await page.locator('[data-complete="mailloop-0"]').isChecked(),false);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldnotes-v1')));assert(!('unknown' in stored.done));assert(!('bad' in stored.questions));
  await page.locator('#import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":1,"done":[],"questions":{}}')});
  await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Invalid progress'));
  assert(await page.locator('[data-complete="purepin-1"]').isChecked());
  await page.locator('#filter').selectOption('revision');assert.equal(await page.locator('article.lesson:visible').getAttribute('id'),'BuzzLine-2');
  await page.locator('#filter').selectOption('all');
  // Keyboard expansion and print preparation restore the original answer state.
  await q.locator('summary').focus();const wasOpen=await q.evaluate(el=>el.open);await page.keyboard.press('Enter');assert.equal(await q.evaluate(el=>el.open),!wasOpen);
  await page.evaluate(()=>dispatchEvent(new Event('beforeprint')));assert.equal(await page.locator('article details:not([open])').count(),0);
  await page.evaluate(()=>dispatchEvent(new Event('afterprint')));assert.equal(await q.evaluate(el=>el.open),!wasOpen);
  await page.locator('[data-theme="light"]').click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/fieldnotes-desktop-light.png'});
  await page.locator('.nav-link[data-lesson="mailloop-1"]').click();
  await page.waitForTimeout(100);assert.equal(await page.locator('.nav-link[aria-current=true]').getAttribute('data-lesson'),'mailloop-1');
  await page.locator('[data-theme="dark"]').click();await page.locator('#mailloop-1-flow').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/fieldnotes-diagram-dark.png'});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
  assert.equal(await page.locator('#sidebar').evaluate(el=>el.inert),true);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#menu').click();assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'false');
  await page.locator('#menu').click();await page.locator('.nav-link[data-lesson="purepin-2"]').click();assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'false');
  await page.locator('#purepin-2-flow').scrollIntoViewIfNeeded();
  const scroll=await page.locator('#purepin-2-flow .diagram').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));assert(scroll.scroll>scroll.width);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'/tmp/fieldnotes-mobile-dark.png'});
  await page.locator('#purepin-2-flow .enlarge').click();await page.keyboard.press('Escape');
  // Legacy theme booleans migrate without losing existing progress keys.
  for(const legacy of [true,false]) {
    await page.evaluate(v=>localStorage.setItem('fieldnotes-v1',JSON.stringify({version:1,theme:v,done:{'mailloop-0':true},questions:{'mailloop-0-0':'confident'}})),legacy);
    await page.reload();await page.waitForSelector('article.lesson');
    assert.equal(await page.locator('html').getAttribute('data-theme'),legacy?'dark':'light');
    assert(await page.locator('[data-complete="mailloop-0"]').isChecked());
    assert.equal(await page.locator('#confidence-mailloop-0-0').inputValue(),'confident');
  }
  // The icon group stays beside the tagline and supports keyboard selection in the drawer.
  for (const width of [320,375,780,1024,1440]) {
    await page.setViewportSize({width,height:950});
    if (width<=780) await page.locator('#menu').click();
    assert(await page.locator('.sidebar-heading').evaluate(row=>{
      const text=row.querySelector('p').getBoundingClientRect(), group=row.querySelector('fieldset').getBoundingClientRect(), bounds=row.getBoundingClientRect();
      return text.right<=group.left && group.right<=bounds.right+1 && row.scrollWidth<=row.clientWidth;
    }), `appearance group at ${width}px`);
    for (const theme of ['light','dark','system']) {
      await page.locator(`button[data-theme="${theme}"]`).focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator(`button[data-theme="${theme}"]`).getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
    }
    await page.locator('button[data-theme="light"]').focus();await page.keyboard.press('Tab');
    assert(await page.locator('button[data-theme="dark"]').evaluate(e=>e===document.activeElement));
    if (width<=780) await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log('PASS: file:// offline loading, 12 lessons / 120 original answers + 41 skills / 205 new answers, theme migration & system changes, retained DOM/focus/scroll, bilingual search, revision, import/export, keyboard, modal, print, mobile layout.');
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
