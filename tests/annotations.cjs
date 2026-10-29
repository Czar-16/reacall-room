/* Optional development check; the site itself has no dependencies. */
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome', headless:true, args:['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:950}, reducedMotion:'reduce', hasTouch:true});
    const page = await context.newPage(), errors = [], remote = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (/^https?:/.test(r.url())) remote.push(r.url()); });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    assert.equal(await page.locator('#annotation-ink').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
    await page.locator('#pen-panel-toggle').click();
    assert.equal(await page.locator('#pen-enabled').getAttribute('aria-pressed'), 'false');
    assert(await page.locator('#pen-undo').isDisabled());
    const target = page.locator('#mailloop-0 .language-section p').first();
    async function draw() {
      await target.scrollIntoViewIfNeeded();
      const b = await target.boundingBox();
      await page.mouse.move(b.x+15,b.y+20); await page.mouse.down();
      await page.mouse.move(b.x+140,b.y+35,{steps:12}); await page.mouse.up();
      await page.waitForTimeout(40);
    }
    await page.locator('#pen-enabled').click();
    // Cursor outline follows the surface; its hotspot stays at the pencil tip.
    for (const [theme,scheme,outline] of [['light','light','#182a44'],['dark','light','#ffffff'],['system','dark','#ffffff'],['system','light','#182a44']]) {
      await page.emulateMedia({colorScheme:scheme});
      await page.evaluate(t=>document.querySelector(`button[data-theme="${t}"]`).click(),theme);
      const cursor=await target.evaluate(e=>getComputedStyle(e).cursor);
      assert(cursor.includes('3 29'),cursor);
      const svg=decodeURIComponent(cursor.match(/data:image\/svg\+xml,([^"\s]+)/)[1]);
      assert(svg.includes(`stroke="${outline}"`),svg);
      assert(svg.includes('M3 29'),svg);
      assert.equal(await page.locator('#mailloop-0 .complete-label input').evaluate(e=>getComputedStyle(e).cursor),'auto');
      assert.equal(await page.locator('#mailloop-0 .section-nav a').first().evaluate(e=>getComputedStyle(e).cursor),'pointer');
      assert.equal(await page.locator('#pen-enabled').evaluate(e=>getComputedStyle(e).cursor),'pointer');
      assert.equal(await page.locator('.hero').evaluate(e=>getComputedStyle(e).animationName),'none');
      assert.equal(await page.locator('#pen-panel').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
    }
    await draw();
    assert.equal(await page.locator('#annotation-ink path').count(),1);
    assert.equal(await page.locator('#annotation-ink path').getAttribute('stroke'),'#dc2626');
    const anchorTransform = await page.locator('#annotation-ink path').getAttribute('transform');
    await page.evaluate(() => { document.querySelector('#mailloop-0 .original').open = true; });
    await page.waitForTimeout(60);
    assert.notEqual(await page.locator('#annotation-ink path').getAttribute('transform'),anchorTransform);
    await page.locator('[data-pen-color="#2563eb"]').click();
    await page.locator('#pen-width').fill('12'); await page.locator('#pen-opacity').fill('35');
    await draw();
    const last = page.locator('#annotation-ink path').last();
    assert.equal(await last.getAttribute('stroke'),'#2563eb');
    assert.equal(await last.getAttribute('stroke-width'),'12');
    assert.equal(await last.getAttribute('stroke-opacity'),'0.35');
    await page.locator('#pen-color').fill('#aabbcc'); await draw();
    assert.equal(await page.locator('#annotation-ink path').last().getAttribute('stroke'),'#aabbcc');
    await page.locator('#pen-undo').click(); await page.waitForTimeout(60); assert.equal(await page.locator('#annotation-ink path').count(),2);
    page.once('dialog', d => d.dismiss()); await page.locator('#pen-clear').click();
    assert.equal(await page.locator('#annotation-ink path').count(),2);
    // Filtering hides ink without discarding it.
    await page.locator('#search').fill('naye pixels'); await page.waitForTimeout(100);
    assert.equal(await page.locator('#annotation-ink path').count(),0);
    await page.locator('#search').fill(''); await target.scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
    assert.equal(await page.locator('#annotation-ink path').count(),2);
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#pen-enabled').getAttribute('aria-pressed'),'false');
    await page.locator('#mailloop-0-0 summary').click(); assert(await page.locator('#mailloop-0-0').evaluate(e=>e.open));
    const warning = page.waitForEvent('dialog');
    const canceledReload = page.reload().catch(()=>{});
    const dialog = await warning; assert.equal(dialog.type(),'beforeunload'); await dialog.dismiss(); await canceledReload;
    assert.equal(await page.locator('#annotation-ink path').count(),2);
    // Progress contains only existing study fields.
    assert(!await page.evaluate(() => /stroke|annotation|penColor/.test(localStorage.getItem('fieldnotes-v1') || '')));
    page.once('dialog', d => d.accept()); await page.locator('#pen-clear').click();
    assert(await page.locator('#pen-undo').isDisabled()); await page.reload();
    assert.equal(await page.locator('#annotation-ink path').count(),0);
    await page.locator('#pen-panel-toggle').click();
    assert.equal(await page.locator('#pen-width').inputValue(),'3');
    await page.locator('#pen-enabled').click();
    // Exercise real browser-dispatched touch and pen pointers through CDP.
    await target.scrollIntoViewIfNeeded();
    let b = await target.boundingBox(); const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+30,y:b.y+20}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+90,y:b.y+30}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:b.x+30,y:b.y+35,button:'left',clickCount:1,pointerType:'pen'});
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:b.x+110,y:b.y+40,button:'left',buttons:1,pointerType:'pen'});
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:b.x+110,y:b.y+40,button:'left',clickCount:1,pointerType:'pen'});
    await page.waitForTimeout(60); assert.equal(await page.locator('#annotation-ink path').count(),2);
    // Scroll offsets inside source blocks move the ink with source content.
    await page.keyboard.press('Escape');
    const source = page.locator('.source').first(); await source.locator('summary').click();
    const pre = source.locator('pre'); await pre.scrollIntoViewIfNeeded();
    await page.locator('#pen-enabled').click(); b = await pre.boundingBox();
    await page.mouse.move(b.x+25,b.y+40); await page.mouse.down(); await page.mouse.move(b.x+90,b.y+50); await page.mouse.up();
    await page.waitForTimeout(60);
    const before = await page.locator('#annotation-ink path').last().getAttribute('transform');
    await pre.evaluate(e => { e.scrollLeft=40; e.scrollTop=60; }); await page.waitForTimeout(60);
    assert.notEqual(await page.locator('#annotation-ink path').last().getAttribute('transform'),before);
    await page.keyboard.press('Escape'); await page.locator('.enlarge').first().click();
    await page.evaluate(()=>document.getElementById('pen-enabled').click());
    assert(!await page.locator('body').evaluate(e=>e.classList.contains('pen-drawing')));
    await page.keyboard.press('Escape');
    await page.setViewportSize({width:375,height:812}); await page.locator('#pen-enabled').click();
    await page.locator('#menu').click();
    assert(!await page.locator('body').evaluate(e=>e.classList.contains('pen-drawing')));
    await page.keyboard.press('Escape');
    for (const theme of ['light','dark','system']) {
      await page.evaluate(theme=>document.querySelector(`[data-theme="${theme}"]`).click(),theme);
      for (const w of [320,375,780,1440]) {
        await page.setViewportSize({width:w,height:812});
        const box = await page.locator('#annotation-tools').boundingBox();
        assert(box.x >= 0 && box.x+box.width <= w+1);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      }
    }
    await page.emulateMedia({media:'print'});
    assert(!await page.locator('#annotation-ink').isVisible()); assert(!await page.locator('#annotation-tools').isVisible());
    await page.emulateMedia({media:'screen'});
    // pagehide clears memory even when a document is retained in the back/forward cache.
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
    assert.equal(await page.locator('#annotation-ink path').count(),0); assert(await page.locator('#pen-clear').isDisabled());
    await page.reload(); assert.equal(await page.locator('#annotation-ink path').count(),0);
    await page.locator('#pen-panel-toggle').click(); await page.locator('#pen-enabled').click(); await draw();
    page.once('dialog', d => d.accept());
    await page.goto(pathToFileURL(path.resolve(__dirname, '../PROJECTS_INTERVIEW_GUIDE.md')).href);
    await page.goBack();
    assert.equal(await page.locator('#annotation-ink path').count(),0);
    const reopened = await context.newPage(); await reopened.goto(page.url());
    assert.equal(await reopened.locator('#annotation-ink path').count(),0); await reopened.close();
    await page.setViewportSize({width:375,height:812});
    await page.locator('#pen-panel-toggle').click(); await page.locator('#pen-enabled').click();
    await target.scrollIntoViewIfNeeded(); b = await target.boundingBox();
    const touchX = b.x+20, touchY = Math.min(650,b.y+40);
    const yBefore = await page.evaluate(()=>scrollY);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchX,y:touchY}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchX+40,y:touchY-90}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(100);
    assert(Math.abs(await page.evaluate(()=>scrollY)-yBefore)<2);
    await page.keyboard.press('Escape');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchX,y:touchY}]});
    for (let i=1;i<=5;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchX,y:touchY-i*30}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(150);
    assert(await page.evaluate(()=>scrollY)>yBefore+10);
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
    await page.locator('#pen-panel-toggle').focus();
    assert(await page.locator('#pen-panel-toggle').evaluate(e=>e===document.activeElement));
    await page.screenshot({path:'/tmp/fieldnotes-pen-mobile.png'});
    assert.deepEqual(errors,[]); assert.deepEqual(remote,[]);
    console.log('Temporary pen checks passed: drawing, controls, anchoring, touch/pen, leave warning, lifecycle, themes, print and offline.');
    await context.close();
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
