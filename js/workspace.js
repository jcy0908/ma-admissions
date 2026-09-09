(() => {
  'use strict';
  const views = [...document.querySelectorAll('[data-view]')];
  const links = [...document.querySelectorAll('[data-view-link]')];
  const archive = document.getElementById('archive');
  const content = document.getElementById('content');
  function show(view) {
    views.forEach(panel => { panel.hidden = panel.dataset.view !== view; });
    links.forEach(link => {
      if (link.dataset.viewLink === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  function route({ scroll = false, focus = false } = {}) {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { hash = ''; }
    let view = hash === 'content' ? (views.find(panel => !panel.hidden)?.dataset.view || 'regions') : 'regions';
    let target = null;
    if (hash.startsWith('trip=') || hash === 'journey') view = 'journey';
    else if (hash === 'saved' || hash === 'bc-studio') view = 'saved';
    else if (hash && hash !== 'top' && hash !== 'regions') {
      target = document.getElementById(hash);
      if (target?.closest('#plan-view')) view = 'journey';
      else if (target?.closest('#saved-view')) view = 'saved';
      else if (archive?.contains(target)) archive.open = true;
      if (target?.matches('#regions .index-list li')) {
        window.dispatchEvent(new CustomEvent('ma:reveal-region'));
        const detail = target.querySelector('details');
        if (detail) detail.open = true;
      }
    }
    show(view);
    if (focus) content.focus({ preventScroll: true });
    if (scroll) requestAnimationFrame(() => {
      if (target) target.scrollIntoView({ block: 'start', behavior: 'auto' });
      else window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    event.preventDefault();
    if (location.hash !== href) history.pushState(null, '', href);
    route({ scroll: true, focus: true });
  });
  window.addEventListener('hashchange', () => route({ scroll: true }));
  window.addEventListener('popstate', () => route({ scroll: true }));
  route({ scroll: Boolean(location.hash) });
})();
