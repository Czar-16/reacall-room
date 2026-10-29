/* Offline motion enhancements; native disclosures remain usable without this file. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const disclosures = new Map(), effects = new Set();
  let printing = false;
  const allowed = () => !printing && !reduced.matches && !document.body.classList.contains('pen-drawing');
  const timing = {duration:220, easing:'cubic-bezier(.22, 1, .36, 1)'};

  function fade(element, duration = 280) {
    if (!allowed() || !element.animate) return;
    const effect = element.animate([{opacity:0}, {opacity:1}], {...timing, duration});
    effects.add(effect);
    const remove = () => effects.delete(effect);
    effect.onfinish = remove;
    effect.oncancel = remove;
  }
  function settle(panel) {
    const state = disclosures.get(panel);
    if (!state) return;
    disclosures.delete(panel);
    panel.open = state.expanded;
    state.animation.cancel();
    panel.style.overflow = state.overflow;
  }
  function stop() {
    for (const panel of disclosures.keys()) settle(panel);
    for (const effect of effects) effect.cancel();
    effects.clear();
  }

  // Click also handles Enter/Space activation of a native summary.
  document.addEventListener('click', event => {
    const summary = event.target.closest('summary');
    const panel = summary?.parentElement;
    if (event.defaultPrevented || !panel?.matches('details') || !allowed() || !panel.animate) return;
    if (event.target.closest('a,button,input,select,textarea,label')) return;
    event.preventDefault();
    const previous = disclosures.get(panel);
    const expanded = !(previous ? previous.expanded : panel.open);
    const start = panel.getBoundingClientRect().height;
    const overflow = previous ? previous.overflow : panel.style.overflow;
    if (previous) { previous.animation.cancel(); disclosures.delete(panel); }
    // Measure the native layout without inserting wrappers that could move ink anchors.
    panel.open = true;
    const finish = expanded ? panel.getBoundingClientRect().height : (() => {
      panel.open = false;
      const height = panel.getBoundingClientRect().height;
      panel.open = true;
      return height;
    })();
    panel.style.overflow = 'hidden';
    const animation = panel.animate([{height:`${start}px`}, {height:`${finish}px`}], {...timing, fill:'both'});
    disclosures.set(panel, {animation, expanded, overflow});
    // Lazy syntax highlighting can occupy the main thread before the next paint.
    // Start the clock on that paint so the first expansion still gets its full duration.
    animation.pause();
    animation.currentTime = 0;
    requestAnimationFrame(() => { if (disclosures.get(panel)?.animation === animation && animation.currentTime === 0) animation.play(); });
    animation.onfinish = () => settle(panel);
  });

  // Programmatic changes (bookmarks, search and print) keep their immediate behavior.
  document.addEventListener('toggle', event => {
    const panel = event.target;
    if (disclosures.has(panel) && !panel.open) settle(panel);
  }, true);
  reduced.addEventListener('change', () => { if (reduced.matches) stop(); });
  new MutationObserver(() => { if (!allowed()) stop(); }).observe(document.body, {attributes:true, attributeFilter:['class']});
  // Capture runs before the app expands disclosures for printing.
  window.addEventListener('beforeprint', () => { printing = true; stop(); }, true);
  window.addEventListener('afterprint', () => { printing = false; });
  window.addEventListener('resize', stop);
  window.addEventListener('pagehide', stop);

  // Reveal each reading card once, without changing its position or layout.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        fade(entry.target);
      }
    }, {threshold:0.08});
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.project-card,article.lesson,.example-card').forEach(card => observer.observe(card));
    }, {once:true});
  }
})();
