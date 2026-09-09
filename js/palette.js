(() => {
  'use strict';
  const palettes = ['mono', 'green', 'blue', 'amber'];
  const labels = { mono: '기본', green: '초록', blue: '파랑', amber: '황토' };
  const root = document.documentElement;
  const dialog = document.getElementById('palette-dialog');
  const buttons = [...document.querySelectorAll('[data-palette-choice]')];
  const status = document.getElementById('palette-status');
  function select(palette, announce = true) {
    if (!palettes.includes(palette)) return;
    root.dataset.palette = palette;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.paletteChoice === palette)));
    try { localStorage.setItem('ma-accent-palette-v3', palette); } catch { /* Private browsing still permits in-page selection. */ }
    if (announce) status.textContent = `${labels[palette]} 색상을 적용했습니다.`;
  }
  let initial = 'mono';
  try { const saved = localStorage.getItem('ma-accent-palette-v3'); if (palettes.includes(saved)) initial = saved; } catch { /* Use default palette. */ }
  select(initial, false);
  document.getElementById('palette-button').addEventListener('click', () => dialog.showModal());
  document.getElementById('palette-close').addEventListener('click', () => dialog.close());
  buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.paletteChoice)));
  window.addEventListener('storage', event => {
    if (event.key === 'ma-accent-palette-v3' && palettes.includes(event.newValue)) select(event.newValue, false);
  });
})();
