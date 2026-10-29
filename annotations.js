/* Temporary freehand ink. Nothing in this module is persisted or exported. */
(() => {
  'use strict';
  const find = id => document.getElementById(id);
  const main = find('main'), ink = find('annotation-ink'), tools = find('annotation-tools');
  const panel = find('pen-panel'), toggle = find('pen-panel-toggle');
  const ns = 'http://www.w3.org/2000/svg';
  const strokes = [];
  let enabled = false, color = '#dc2626', width = 3, opacity = 1;
  let current = null, frame = 0, warning = false;
  const suspended = () => document.body.classList.contains('nav-open') || find('diagram-dialog').open;
  const leaveWarning = event => { event.preventDefault(); event.returnValue = ''; };
  function update() {
    const hasInk = strokes.length > 0;
    if (hasInk !== warning) {
      window[hasInk ? 'addEventListener' : 'removeEventListener']('beforeunload', leaveWarning);
      warning = hasInk;
    }
    find('pen-undo').disabled = find('pen-clear').disabled = !hasInk;
    const paused = suspended();
    document.body.classList.toggle('pen-drawing', enabled && !paused);
    tools.dataset.enabled = String(enabled);
    find('pen-enabled').setAttribute('aria-pressed', String(enabled));
    find('pen-enabled').textContent = enabled ? 'Pen on' : 'Pen off';
    find('pen-button-label').textContent = `Pen · ${enabled ? paused ? 'Paused' : 'On' : 'Off'}`;
    find('pen-status').textContent = `${enabled ? paused ? 'Pen paused while navigation or diagram is open.' : 'Pen on. Draw on lessons and skills.' : 'Pen off.'} ${strokes.length} stroke${strokes.length === 1 ? '' : 's'}. Ink disappears when you leave or refresh.`;
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; render(); });
  }
  function geometry(anchor) {
    let clip = {left:0, top:0, right:innerWidth, bottom:innerHeight};
    let dx = 0, dy = 0;
    const bounds = anchor.getBoundingClientRect();
    for (let el = anchor; el; el = el.parentElement) {
      if (el.hidden || getComputedStyle(el).display === 'none') return null;
      if (el.tagName === 'DETAILS' && !el.open && !el.querySelector('summary')?.contains(anchor)) return null;
      const rect = el.getBoundingClientRect(), css = getComputedStyle(el);
      if (el === main || /(auto|scroll|hidden|clip)/.test(css.overflowX)) {
        clip.left = Math.max(clip.left, rect.left + el.clientLeft);
        clip.right = Math.min(clip.right, rect.left + el.clientLeft + el.clientWidth);
      }
      if (el === main || /(auto|scroll|hidden|clip)/.test(css.overflowY)) {
        clip.top = Math.max(clip.top, rect.top + el.clientTop);
        clip.bottom = Math.min(clip.bottom, rect.top + el.clientTop + el.clientHeight);
      }
      // The anchor's own scroll does not affect its bounding rect (e.g. <pre>).
      if (el === anchor) { dx = el.scrollLeft; dy = el.scrollTop; }
    }
    if (!anchor.getClientRects().length || clip.right <= clip.left || clip.bottom <= clip.top) return null;
    return {x:bounds.left - dx, y:bounds.top - dy, clip};
  }
  function pathData(points) {
    const [first] = points;
    if (points.length === 1) return `M${first.x},${first.y}l0.01,0`;
    let d = `M${first.x},${first.y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      d += `Q${a.x},${a.y} ${(a.x + b.x)/2},${(a.y + b.y)/2}`;
    }
    const last = points[points.length - 1];
    return d + `L${last.x},${last.y}`;
  }
  function svg(tag, attrs, parent) {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    parent.append(el); return el;
  }
  function render() {
    ink.replaceChildren();
    const defs = svg('defs', {}, ink);
    strokes.forEach((stroke, i) => {
      const geo = geometry(stroke.anchor);
      if (!geo) return;
      const {clip} = geo, id = `pen-clip-${i}`;
      const mask = svg('clipPath', {id, clipPathUnits:'userSpaceOnUse'}, defs);
      svg('rect', {x:clip.left, y:clip.top, width:clip.right-clip.left, height:clip.bottom-clip.top}, mask);
      const group = svg('g', {'clip-path':`url(#${id})`}, ink);
      svg('path', {d:pathData(stroke.points), transform:`translate(${geo.x} ${geo.y})`, fill:'none', stroke:stroke.color, 'stroke-width':stroke.width, 'stroke-opacity':stroke.opacity, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, group);
    });
  }
  function finish() {
    if (!current) return;
    const id = current.pointer;
    current = null;
    if (main.hasPointerCapture(id)) main.releasePointerCapture(id);
    schedule();
  }
  function addPoint(event) {
    const geo = geometry(current.anchor);
    if (!geo) return;
    current.points.push({x:event.clientX-geo.x, y:event.clientY-geo.y});
  }
  main.addEventListener('pointerdown', event => {
    if (!enabled || suspended() || current || !event.isPrimary || event.button !== 0) return;
    if (!event.target.closest('#lessons, #skills') || event.target.closest('.section-nav, .category-index, button, input, select, label, a')) return;
    // Prefer a small stable block so preceding disclosures move the whole mark.
    const anchor = event.target.closest('pre, .diagram') || event.target.closest('p, li, summary, h2, h3, h4, h5, .language-section, .language-block, .lesson-section, article, #skills');
    if (!anchor) return;
    event.preventDefault(); event.stopImmediatePropagation();
    current = {anchor, color, width, opacity, pointer:event.pointerId, points:[]};
    strokes.push(current); addPoint(event);
    main.setPointerCapture(event.pointerId);
    update(); schedule();
  }, true);
  main.addEventListener('pointermove', event => {
    if (!current || event.pointerId !== current.pointer) return;
    event.preventDefault();
    const samples = event.getCoalescedEvents?.() || [];
    for (const sample of samples.length ? samples : [event]) addPoint(sample);
    schedule();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) main.addEventListener(type, event => {
    if (current && event.pointerId === current.pointer) { event.preventDefault(); finish(); }
  });
  // Suppress the compatibility click on a summary after drawing over it.
  main.addEventListener('click', event => {
    if (enabled && !suspended() && event.detail && event.target.closest('#lessons, #skills') && !event.target.closest('.section-nav, .category-index, button, input, select, label, a')) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden; toggle.setAttribute('aria-expanded', String(!panel.hidden));
  });
  find('pen-enabled').addEventListener('click', () => { finish(); enabled = !enabled; update(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { finish(); enabled = false; update(); }
  });
  function chooseColor(value) {
    color = value; tools.style.setProperty('--pen-color', color); find('pen-color').value = color;
    tools.querySelectorAll('[data-pen-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.penColor === color)));
  }
  tools.querySelectorAll('[data-pen-color]').forEach(button => button.addEventListener('click', () => chooseColor(button.dataset.penColor)));
  find('pen-color').addEventListener('input', event => chooseColor(event.target.value));
  find('pen-width').addEventListener('input', event => { width = +event.target.value; find('pen-width-value').textContent = `${width} px`; });
  find('pen-opacity').addEventListener('input', event => { opacity = +event.target.value/100; find('pen-opacity-value').textContent = `${event.target.value}%`; });
  find('pen-undo').addEventListener('click', () => { finish(); strokes.pop(); update(); schedule(); });
  function clear() { finish(); strokes.length = 0; update(); ink.replaceChildren(); }
  find('pen-clear').addEventListener('click', () => { if (confirm('Clear all temporary pen strokes?')) clear(); });
  window.addEventListener('pagehide', () => { clear(); enabled = false; update(); });
  window.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(main);
  new MutationObserver(schedule).observe(main, {subtree:true, childList:true, attributes:true, attributeFilter:['hidden', 'open', 'class']});
  const suspensionChanged = () => { if (suspended()) finish(); update(); schedule(); };
  new MutationObserver(suspensionChanged).observe(document.body, {attributes:true, attributeFilter:['class']});
  new MutationObserver(suspensionChanged).observe(find('diagram-dialog'), {attributes:true, attributeFilter:['open']});
  update();
})();
