/* Development-only verification of animated disclosures and interruption paths. */
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
    const errors=[],remote=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.waitForSelector('article.lesson');
    for(const selector of ['.question','.source','.original','.progress-tools','#nav details']) {
      const panel=page.locator(selector).first();
      await panel.evaluate(e=>{e.open=false;});
      const closed=await panel.evaluate(e=>e.getBoundingClientRect().height);
      await panel.locator('summary').evaluate(e=>{e.click();const a=e.parentElement.getAnimations().find(a=>a.effect.getKeyframes().some(k=>'height' in k));a.pause();a.currentTime=100;});
      const middle=await panel.evaluate(e=>e.getBoundingClientRect().height);
      await panel.evaluate(async e=>{const a=e.getAnimations().find(a=>a.effect.getKeyframes().some(k=>'height' in k));a.play();await a.finished;});
      const opened=await panel.evaluate(e=>e.getBoundingClientRect().height);
      assert(middle>closed && middle<opened,`${selector}: ${closed} < ${middle} < ${opened}`);
      assert(await panel.evaluate(e=>e.open));
      await panel.locator('summary').evaluate(e=>{e.click();const a=e.parentElement.getAnimations().find(a=>a.effect.getKeyframes().some(k=>'height' in k));a.pause();a.currentTime=100;});
      const closing=await panel.evaluate(e=>e.getBoundingClientRect().height);
      assert(closing>closed && closing<opened,`smooth close: ${selector}`);
      await panel.evaluate(async e=>{const a=e.getAnimations().find(a=>a.effect.getKeyframes().some(k=>'height' in k));a.play();await a.finished;});
      assert(!await panel.evaluate(e=>e.open));
      assert.equal(await panel.evaluate(e=>e.style.overflow),'');
    }
    const question=page.locator('.question').first();
    const summary=question.locator('summary');
    await summary.focus();await page.keyboard.press('Enter');await page.waitForTimeout(280);
    assert(await question.evaluate(e=>e.open));
    await summary.focus();await page.keyboard.press('Space');await page.waitForTimeout(280);
    assert(!await question.evaluate(e=>e.open));
    // Reversing direction midway must settle into the latest requested state.
    await summary.evaluate(e=>e.click());await page.waitForTimeout(45);
    await summary.evaluate(e=>e.click());await page.waitForTimeout(45);
    await summary.evaluate(e=>e.click());await page.waitForTimeout(280);
    assert(await question.evaluate(e=>e.open));
    await summary.evaluate(e=>e.click());await page.waitForTimeout(40);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert(!await question.evaluate(e=>e.open));
    await summary.evaluate(e=>e.click());
    assert(await question.evaluate(e=>e.open));
    assert.equal(await question.evaluate(e=>e.getAnimations().length),0);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await summary.evaluate(e=>e.click());await page.waitForTimeout(40);
    await page.evaluate(()=>dispatchEvent(new Event('beforeprint')));
    assert.equal(await page.locator('article details:not([open])').count(),0);
    assert.equal(await question.evaluate(e=>e.getAnimations().length),0);
    await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
    assert(!await question.evaluate(e=>e.open));
    await summary.evaluate(e=>e.click());await page.waitForTimeout(40);
    await page.locator('#pen-panel-toggle').click();await page.locator('#pen-enabled').click();
    assert.equal(await question.evaluate(e=>e.getAnimations().length),0);
    assert.equal(await question.evaluate(e=>e.style.overflow),'');
    await page.keyboard.press('Escape');
    await page.setViewportSize({width:320,height:850});await page.locator('#menu').click();
    const category=page.locator('#nav details').first();
    await category.locator('summary').click();await page.waitForTimeout(280);
    assert(await category.evaluate(e=>e.open));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
    console.log('PASS: smooth open/close for every disclosure type, keyboard, rapid reversal, reduced motion, print/drawing interruption, mobile and offline.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
