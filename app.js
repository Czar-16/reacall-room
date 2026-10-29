/* Dependency-free renderer. Mount once; controls update attributes and state in place. */
'use strict';
const $ = s => document.querySelector(s);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const projectLessons = window.LESSONS;
const skills = window.SKILLS;
const lessons = [...projectLessons, ...skills];
const categories = [...new Set(skills.map(s => s.category))];
const categoryId = name => 'skills-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
const qid = (l, i) => l.id.startsWith('skill-') ? `${l.id}-q${i+1}` : `${l.id}-${i}`;
function confidence(id) {
  return `<label class="confidence" for="confidence-${id}">Your confidence<select id="confidence-${id}" data-confidence="${id}"><option value="">Not studied</option><option value="revision">Needs revision</option><option value="confident">Confident</option></select></label>`;
}
function mountSkills() {
  $('#skills').innerHTML = `<header><div class="eyebrow">41 ENTRIES / 205 BILINGUAL ANSWERS</div><h2>Skills &amp; Tools</h2><p>Read the explanation, practise aloud, then open each answer. Project evidence is distinguished from illustrative examples and sample responses.</p><progress id="progress-skills" value="0" max="41" aria-label="Completed skills"></progress> <small id="count-skills"></small></header><nav class="category-index" aria-label="Skill categories">${categories.map(c => `<a href="#${categoryId(c)}">${esc(c)}</a>`).join('')}</nav>` + categories.map(c => `<section class="skill-category" id="${categoryId(c)}"><h2>${esc(c)}</h2>${skills.filter(s => s.category === c).map(s => `<article class="lesson skill" id="${s.id}" aria-labelledby="${s.id}-title"><header class="lesson-head"><div class="eyebrow">${esc(c)}</div><h2 id="${s.id}-title">${esc(s.name)}</h2><label class="complete-label"><input type="checkbox" data-complete="${s.id}">Mark skill complete</label></header><p class="evidence-note">${esc(s.evidence)}</p><div class="language-block english" lang="en"><h4>EN / Explanation</h4>${s.english.map(t => `<p>${esc(t)}</p>`).join('')}</div><div class="language-block hinglish" lang="hi-Latn"><h4>HI / Hinglish · Roman script</h4>${s.hinglish.map(t => `<p>${esc(t)}</p>`).join('')}</div><p class="skill-references">Official reference: <a href="${esc(s.reference)}">${esc(s.name)} documentation</a>. References are optional; all study content is bundled offline.</p>${s.questions.map((q,i) => `<details class="question" id="${qid(s,i)}"><summary><span class="question-number">Q${i+1}</span><span class="question-title">${esc(q.question)}<span class="difficulty">${['Fundamentals','Mechanism','Practical application','Tradeoffs','Troubleshooting'][i]}</span></span></summary><div class="answer-panel"><div class="answer-label">${s.category === 'Soft Skills' ? 'Sample answer · illustrative, not personal experience' : 'Bilingual answer · illustrative application'}</div><p lang="en">${esc(q.english)}</p><p lang="hi-Latn">${esc(q.hinglish)}</p>${confidence(qid(s,i))}</div></details>`).join('')}</article>`).join('')}</section>`).join('');
}
function sourceLanguage(path) {
  return /\.tsx$/.test(path) ? 'tsx' : /\.jsx$/.test(path) ? 'jsx' : /\.[cm]?ts$/.test(path) ? 'typescript' : /\.[cm]?js$/.test(path) ? 'javascript' : 'plain';
}
function sourcePanel(path, code, lesson, i) {
  const lang = sourceLanguage(path);
  return `<details class="source" data-source-lesson="${lesson}" data-source-index="${i}"><summary>${esc(path)}</summary><div class="code-toolbar"><span class="editor-dots" aria-hidden="true">● ● ●</span><span>${lang.toUpperCase()}</span><button class="copy-code" type="button">Copy code</button><span class="copy-status sr-only" role="status" aria-live="polite"></span></div><pre tabindex="0" aria-label="Source code; scroll for more lines"><code class="language-${lang}">${esc(code)}</code></pre></details>`;
}
const storageKey = 'fieldnotes-v1';
const lessonIds = new Set(lessons.map(l => l.id));
const questionIds = new Set(lessons.flatMap(l => l.questions.map((_, i) => qid(l, i))));
const projects = ['MailLoop', 'PurePin', 'BuzzLine'];
const desktop = matchMedia('(min-width: 781px)');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let state = {version: 1, done: {}, questions: {}, theme: 'system', last: ''};
function cleanProgress(s) {
  if (!s || s.version !== 1 || !s.done || !s.questions || typeof s.done !== 'object' || typeof s.questions !== 'object' || Array.isArray(s.done) || Array.isArray(s.questions)) throw Error('Invalid progress');
  return {
    done: Object.fromEntries(Object.entries(s.done).filter(([k,v]) => lessonIds.has(k) && typeof v === 'boolean')),
    questions: Object.fromEntries(Object.entries(s.questions).filter(([k,v]) => questionIds.has(k) && ['', 'revision', 'confident'].includes(v)))
  };
}
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved) {
    Object.assign(state, cleanProgress(saved));
    if (['light', 'dark', 'system'].includes(saved.theme)) state.theme = saved.theme;
    else if (typeof saved.theme === 'boolean') state.theme = saved.theme ? 'dark' : 'light';
    if (lessonIds.has(saved.last)) state.last = saved.last;
  }
} catch { /* Keep a usable guide even if storage is unavailable or malformed. */ }
function notice(message) { $('#notice').textContent = message; $('#notice').classList.toggle('error', /invalid|unavailable/i.test(message)); }
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { notice('Browser storage unavailable. Export progress to keep this session.'); }
}
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.querySelectorAll('[data-theme]').forEach(b => {
    if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.dataset.theme === state.theme));
  });
}
// The CSS media query reacts immediately when System is selected; this also keeps controls in sync.
systemTheme.addEventListener('change', applyTheme);
function language(l, key, label) {
  return `<section id="${l.id}-${key}" class="language-block ${key}" lang="${key === 'hinglish' ? 'hi-Latn' : 'en'}" aria-labelledby="${l.id}-${key}-title"><h4 id="${l.id}-${key}-title">${label}</h4>${l[key].map((s,i) => `<section class="language-section ${i === 3 ? 'example' : i === 4 ? 'caution' : ''}"><h5>${esc(s.title)}</h5><p>${esc(s.text)}</p></section>`).join('')}</section>`;
}
function walkthrough(l, key, label) {
  return `<div class="language-block walkthrough ${key}" lang="${key === 'hinglish' ? 'hi-Latn' : 'en'}"><h4>${label}</h4><ol>${l.diagram[key].map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>`;
}
function mount() {
  $('#cards').innerHTML = projects.map((p,i) => `<div class="project-card"><div class="eyebrow">PROJECT 0${i+1}</div><h2>${p}</h2><progress id="progress-${p}" aria-label="${p} completed lessons" value="0" max="4"></progress><small id="count-${p}"></small></div>`).join('');
  $('#nav').innerHTML = `<section class="nav-group nav-skills"><h2><a href="#skills">Skills &amp; Tools</a></h2>${categories.map(c => `<details><summary>${esc(c)}</summary>${skills.filter(s => s.category === c).map(s => `<a class="nav-link" data-lesson="${s.id}" href="#${s.id}"><span class="nav-number">◇</span><span>${esc(s.name)}</span></a>`).join('')}</details>`).join('')}</section>` + projects.map(p => `<section class="nav-group" data-project="${p}"><h2>${p}</h2>${lessons.filter(l => l.project === p).map((l,i) => `<a href="#${l.id}" class="nav-link" data-lesson="${l.id}"><span class="nav-number">0${i+1}</span><span>${esc(l.title)}</span></a>`).join('')}</section>`).join('');
  $('#lessons').innerHTML = projectLessons.map((l,n) => `<article class="lesson" id="${l.id}" aria-labelledby="${l.id}-title"><header class="lesson-head"><div class="eyebrow">${l.project} / LESSON ${String(n+1).padStart(2,'0')} / SOURCE-BACKED FIELDNOTES</div><h2 id="${l.id}-title">${esc(l.title)}</h2><label class="complete-label"><input type="checkbox" data-complete="${l.id}">Mark lesson complete</label></header><nav class="section-nav" aria-label="${esc(l.title)} sections"><a href="#${l.id}-english">English</a><a href="#${l.id}-hinglish">Hinglish</a><a href="#${l.id}-flow">Diagram</a><a href="#${l.id}-practice">10 questions</a><a href="#${l.id}-sources">Source excerpts</a></nav><section class="lesson-section" aria-labelledby="${l.id}-understand"><div class="section-top"><h3 id="${l.id}-understand">Understand the idea</h3><span class="pill english">English + Hinglish</span></div><details class="original"><summary>Original English explanation · retained</summary><p>${esc(l.explanation)}</p></details>${language(l,'english','EN / Detailed English')}${language(l,'hinglish','HI / Hinglish · Roman script')}</section><section class="lesson-section" id="${l.id}-flow" aria-labelledby="${l.id}-flow-title"><div class="section-top"><h3 id="${l.id}-flow-title">Trace the flow</h3><button class="enlarge" data-enlarge="${l.id}" aria-haspopup="dialog">Enlarge diagram ↗</button></div><div class="legend" aria-label="Diagram legend"><span>Current behavior</span><span class="response">Response</span><span class="success">Success / accepted</span><span class="failure">Failure / caution</span><span class="proposed">Proposed safeguard</span></div><div class="diagram" tabindex="0" role="region" aria-label="${esc(l.title)} diagram; scroll horizontally">${l.diagram.svg}</div><p class="diagram-note">${esc(l.diagram.description)} Scroll to follow the diagram on smaller screens. Numbered walkthroughs explain every branch below.</p>${walkthrough(l,'english','EN / Diagram walkthrough')}${walkthrough(l,'hinglish','HI / Diagram samjho')}<div class="example-card"><h4>Original worked example · illustrative</h4><p>${esc(l.example)}</p></div></section><section class="lesson-section" id="${l.id}-practice" aria-labelledby="${l.id}-practice-title"><div class="section-top"><h3 id="${l.id}-practice-title">Say it in an interview</h3><span class="pill answer">10 answered questions</span></div><p class="practice-intro">Try answering aloud first. Open the explanation, then record your confidence. Difficulty labels are study guidance.</p>${l.questions.map(([q,a],i) => `<details class="question" id="${l.id}-${i}"><summary><span class="question-number">Q${String(i+1).padStart(2,'0')}</span><span class="question-title">${esc(q)}<span class="difficulty">${i < 3 ? 'Foundation' : i < 7 ? 'Applied' : 'Deep dive'}</span></span></summary><div class="answer-panel"><div class="answer-label">Answer / source-informed explanation</div><p>${esc(a)}</p><label class="confidence" for="confidence-${l.id}-${i}">Your confidence<select id="confidence-${l.id}-${i}" data-confidence="${l.id}-${i}"><option value="">Not studied</option><option value="revision">Needs revision</option><option value="confident">Confident</option></select></label></div></details>`).join('')}</section><section class="lesson-section" id="${l.id}-sources" aria-labelledby="${l.id}-sources-title"><div class="section-top"><h3 id="${l.id}-sources-title">Read the implementation</h3><span class="pill">Code / selected excerpts</span></div><p class="practice-intro">These are bundled source snapshots, sometimes truncated. Follow the named implementation files for the mechanism; tests illustrate expectations. Proposed safeguards in the lessons are separate from current code.</p>${l.sources.map(([p,c],i) => sourcePanel(p,c,l.id,i)).join('')}</section></article>`).join('');
}
const searchIndex = new Map(lessons.map(l => [l.id, JSON.stringify(l).toLowerCase()]));
let active = '';
let pendingRevisionLesson = null;
function activate(id) {
  if (!lessonIds.has(id)) return;
  active = id;
  document.querySelectorAll('.nav-link').forEach(a => {
    if (a.dataset.lesson === id) { a.setAttribute('aria-current','true'); if (a.closest('details')) a.closest('details').open = true; }
    else a.removeAttribute('aria-current');
  });
}
function refreshProgress() {
  for (const p of projects) {
    const group = lessons.filter(l => l.project === p);
    const done = group.filter(l => state.done[l.id]).length;
    $(`#progress-${p}`).value = done;
    $(`#count-${p}`).textContent = `${done} / ${group.length} lessons complete`;
  }
  const completedSkills = skills.filter(s => state.done[s.id]).length;
  $('#progress-skills').value = completedSkills;
  $('#count-skills').textContent = `${completedSkills} / 41 skills complete`;
  document.querySelectorAll('[data-complete]').forEach(input => { input.checked = !!state.done[input.dataset.complete]; });
  document.querySelectorAll('[data-confidence]').forEach(select => { select.value = state.questions[select.dataset.confidence] || ''; });
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('is-done', !!state.done[a.dataset.lesson]));
}
function applyFilters() {
  const query = $('#search').value.trim().toLowerCase();
  const revision = $('#filter').value === 'revision';
  let visible = [];
  for (const l of lessons) {
    const matches = searchIndex.get(l.id).includes(query) && (!revision || l.questions.some((_,i) => state.questions[qid(l,i)] === 'revision'));
    document.getElementById(l.id).hidden = !matches;
    document.querySelector(`.nav-link[data-lesson="${l.id}"]`).hidden = !matches;
    if (matches) visible.push(l.id);
  }
  document.querySelectorAll('.nav-group').forEach(group => { group.hidden = ![...group.querySelectorAll('.nav-link')].some(a => !a.hidden); });
  document.querySelectorAll('.skill-category').forEach(c => { c.hidden = ![...c.querySelectorAll('article')].some(a => !a.hidden); });
  document.querySelectorAll('#nav details').forEach(d => { d.hidden = ![...d.querySelectorAll('.nav-link')].some(a => !a.hidden); });
  $('#empty').hidden = visible.length > 0;
  $('#result-count').textContent = `${visible.filter(id => !id.startsWith('skill-')).length} of 12 lessons · ${visible.filter(id => id.startsWith('skill-')).length} of 41 skills${revision ? ' · needs revision' : ''}${query ? ' · matching your search' : ' · ready to explore'}`;
  if (!visible.includes(active)) {
    document.querySelectorAll('.nav-link').forEach(a => a.removeAttribute('aria-current'));
    active = '';
    if (visible.length) activate(visible[0]);
  }
}
function go(id) {
  if (!lessonIds.has(id)) return;
  if (document.getElementById(id).hidden) { $('#search').value = ''; $('#filter').value = 'all'; applyFilters(); }
  state.last = id; save(); activate(id); setDrawer(false);
  history.replaceState(null, '', `#${id}`);
  document.getElementById(id).scrollIntoView();
  const title = document.getElementById(`${id}-title`); title.tabIndex = -1; title.focus({preventScroll: true});
}
function setDrawer(open) {
  const show = open && !desktop.matches;
  document.body.classList.toggle('nav-open', show);
  $('#menu').setAttribute('aria-expanded', String(show));
  $('#scrim').hidden = !show;
  $('#sidebar').inert = !desktop.matches && !show;
  $('main').inert = show;
  if (show) $('#search').focus();
}
desktop.addEventListener('change', () => setDrawer(false));
$('#menu').onclick = () => setDrawer(!document.body.classList.contains('nav-open'));
$('#scrim').onclick = () => { setDrawer(false); $('#menu').focus(); };
document.addEventListener('keydown', e => {
  if (!document.body.classList.contains('nav-open')) return;
  if (e.key === 'Escape') { setDrawer(false); $('#menu').focus(); }
  if (e.key === 'Tab') {
    const focusable = [...$('#sidebar').querySelectorAll('a,button,input')].filter(el => !el.closest('[hidden]'));
    const first = focusable[0], last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
$('#sidebar').addEventListener('click', e => {
  const link = e.target.closest('.nav-link');
  if (link) { e.preventDefault(); go(link.dataset.lesson); }
  const destination = e.target.closest('a[href="#skills"]');
  if (destination) setDrawer(false);
  const button = e.target.closest('button[data-theme]');
  if (button) { state.theme = button.dataset.theme; applyTheme(); save(); }
});
$('main').addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.complete) { state.done[el.dataset.complete] = el.checked; refreshProgress(); save(); }
  if (el.dataset.confidence) {
    state.questions[el.dataset.confidence] = el.value; save();
    // Keep the focused answer visible until the user leaves the lesson during revision.
    // Filtering is applied when the filter/search changes, without removing this control.
    if ($('#filter').value === 'revision') { pendingRevisionLesson = el.closest('article'); notice('Confidence saved. The revision list refreshes when you leave this lesson.'); }
  }
});
document.addEventListener('focusin', e => {
  if (pendingRevisionLesson && !pendingRevisionLesson.contains(e.target)) { pendingRevisionLesson = null; applyFilters(); }
});
let dialogOpener;
$('#lessons').addEventListener('click', e => {
  const button = e.target.closest('[data-enlarge]');
  if (!button) return;
  const l = lessons.find(l => l.id === button.dataset.enlarge); dialogOpener = button;
  $('#diagram-title').textContent = l.diagram.title;
  // Prefix the enlarged SVG's IDs so the two copies never share marker/title IDs.
  $('#diagram-large').innerHTML = l.diagram.svg.replaceAll(l.id + '-', 'enlarged-' + l.id + '-');
  $('#diagram-description').textContent = l.diagram.description;
  $('#diagram-dialog').showModal();
});
$('#close-diagram').onclick = () => $('#diagram-dialog').close();
$('#diagram-dialog').addEventListener('close', () => { $('#diagram-large').replaceChildren(); dialogOpener?.focus(); });
$('#search').oninput = applyFilters;
$('#filter').onchange = applyFilters;
$('#continue').onclick = () => go(state.last || lessons.find(l => !state.done[l.id])?.id || lessons[0].id);
$('#reset').onclick = () => {
  if (!confirm('Reset lesson completion and question confidence?')) return;
  state.done = {}; state.questions = {}; state.last = ''; save(); refreshProgress(); applyFilters(); notice('Study progress reset.');
};
$('#export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state,null,2)], {type:'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'study-progress.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); notice('Progress exported.');
};
$('#import').onchange = async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()); const progress = cleanProgress(parsed);
    Object.assign(state, progress);
    state.last = lessonIds.has(parsed.last) ? parsed.last : '';
    save(); refreshProgress(); applyFilters(); notice('Progress imported.');
  } catch { notice('Invalid progress file; progress unchanged.'); }
  e.target.value = '';
};
let closedForPrint = [];
window.addEventListener('beforeprint', () => {
  closedForPrint = [...document.querySelectorAll('article:not([hidden]) details:not([open])')];
  closedForPrint.forEach(d => { d.open = true; });
});
window.addEventListener('afterprint', () => { closedForPrint.forEach(d => { d.open = false; }); closedForPrint = []; });
$('#print').onclick = () => window.print();
mount(); mountSkills(); applyTheme(); refreshProgress(); applyFilters(); setDrawer(false);
if (typeof IntersectionObserver !== 'undefined') {
  const observer = new IntersectionObserver(entries => {
    if ($('#diagram-dialog').open || document.body.classList.contains('nav-open')) return;
    const readingLine = 120;
    const candidates = [...document.querySelectorAll('article.lesson:not([hidden])')].map(target => ({target, rect: target.getBoundingClientRect()}));
    const current = candidates.find(e => e.rect.top <= readingLine && e.rect.bottom > readingLine) || candidates.find(e => e.rect.top > readingLine && e.rect.top < innerHeight * .35);
    if (current) { const id = current.target.id; activate(id); if (state.last !== id) { state.last = id; save(); } }
  }, {rootMargin:'0px 0px -65% 0px', threshold:0});
  document.querySelectorAll('article.lesson').forEach(el => observer.observe(el));
}
// Migration is saved without changing progress/question IDs.
save();
if (location.hash) {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) { target.closest('details')?.setAttribute('open',''); requestAnimationFrame(() => target.scrollIntoView()); }
}

// Capture non-bubbling details toggles; each source is highlighted only once.
document.addEventListener('toggle', e => {
  const panel = e.target;
  if (!panel.matches?.('.source') || !panel.open || panel.dataset.highlighted) return;
  panel.dataset.highlighted = 'true';
  const code = panel.querySelector('code');
  const raw = projectLessons.find(l => l.id === panel.dataset.sourceLesson).sources[Number(panel.dataset.sourceIndex)][1];
  try { if (window.Prism) Prism.highlightElement(code); }
  catch { code.textContent = raw; }
}, true);
document.addEventListener('click', async e => {
  const button = e.target.closest('.copy-code');
  if (!button) return;
  const panel = button.closest('.source');
  const raw = projectLessons.find(l => l.id === panel.dataset.sourceLesson).sources[Number(panel.dataset.sourceIndex)][1];
  const status = panel.querySelector('.copy-status');
  let copied = false;
  try { await navigator.clipboard.writeText(raw); copied = true; } catch { /* Try browser selection fallback. */ }
  if (!copied) {
    const field = document.createElement('textarea'); field.value = raw;
    field.className = 'copy-fallback'; field.setAttribute('aria-label','Code to copy');
    panel.append(field);
    const oldFocus = document.activeElement;
    const x = scrollX, y = scrollY;
    field.focus({preventScroll:true}); field.select();
    try { copied = document.execCommand('copy'); } catch { /* Manual copy below. */ }
    field.remove(); oldFocus?.focus({preventScroll:true}); window.scrollTo(x,y);
  }
  clearTimeout(button.copyTimer);
  if (copied) {
    panel.querySelector('.manual-copy')?.remove();
    button.textContent = 'Copied!'; status.textContent = 'Code copied to clipboard.';
    button.copyTimer = setTimeout(() => { button.textContent = 'Copy code'; status.textContent = ''; }, 2000);
  } else {
    button.textContent = 'Copy code'; status.textContent = 'Automatic copying unavailable. Select the plain text below and copy manually.';
    let manual = panel.querySelector('.manual-copy');
    if (!manual) {
      manual = document.createElement('label'); manual.className = 'manual-copy';
      manual.textContent = 'Select all and copy manually:';
      const field = document.createElement('textarea'); field.readOnly = true; field.value = raw;
      field.setAttribute('aria-label','Plain source for manual copying'); manual.append(field); panel.append(manual);
    }
    manual.querySelector('textarea').focus({preventScroll:true}); manual.querySelector('textarea').select();
  }
});
