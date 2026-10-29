// Apply the saved appearance before first paint. A boolean is the legacy setting.
(() => {
  let preference = 'system';
  try {
    const saved = JSON.parse(localStorage.getItem('fieldnotes-v1') || '{}');
    if (['light', 'dark', 'system'].includes(saved.theme)) preference = saved.theme;
    else if (typeof saved.theme === 'boolean') preference = saved.theme ? 'dark' : 'light';
  } catch { /* Storage may be disabled for local files. */ }
  document.documentElement.dataset.theme = preference;
})();
