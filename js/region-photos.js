(() => {
  'use strict';
  const dialog = document.getElementById('region-photo-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const photo = document.getElementById('region-photo-large');
  const title = document.getElementById('region-photo-title');
  const caption = document.getElementById('region-photo-caption');
  let trigger = null;
  let previousOverflow = '';

  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-photo-view]');
    if (!link || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const image = link.querySelector('img');
    trigger = link;
    photo.src = link.href;
    photo.alt = image.dataset.originalAlt || image.alt;
    photo.width = Number(image.getAttribute('width'));
    photo.height = Number(image.getAttribute('height'));
    title.textContent = image.dataset.originalAlt || image.alt;
    const credit = link.closest('figure').querySelector('.region-photo-credit');
    caption.replaceChildren(window.MA_I18N?.cloneSource(credit) || credit.cloneNode(true));
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
  });

  dialog.querySelector('[data-photo-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    photo.removeAttribute('src');
    trigger?.focus({ preventScroll: true });
  });
})();
