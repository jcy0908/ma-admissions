/* A small, dependency-free landscape viewer. The existing workspace owns navigation. */
(() => {
  'use strict';
  const stage = document.getElementById('expedition');
  if (!stage) return;
  const photo = document.getElementById('landscape-image');
  const canvas = document.getElementById('landscape-code');
  const texture = document.getElementById('landscape-texture');
  const pause = document.getElementById('landscape-pause');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = {
    ridge: ['01 / 03', '능선 너머, 새로운 시선', '산을 넘고,', '바다에 닿다.'],
    forest: ['02 / 03', '초록 사이, 느린 걸음', '숲에 들고,', '숨을 고르다.'],
    sea: ['03 / 03', '동쪽 끝, 가장 푸른 순간', '파도를 따라,', '마음이 흐르다.']
  };
  const t = value => window.MA_I18N?.t(value) || value;
  let scene = 'ridge';
  let stopped = reducedMotion.matches;
  let digital = false;
  let inView = true;
  let queuedDraw = 0;
  function syncMotion() {
    stage.classList.toggle('is-paused', stopped || !inView || document.hidden);
    pause.setAttribute('aria-pressed', String(stopped));
    pause.setAttribute('aria-label', t(stopped ? '풍경 움직임 재생하기' : '풍경 움직임 멈추기'));
    pause.firstElementChild.textContent = stopped ? '▷' : 'Ⅱ';
  }
  function showScene() {
    const copy = scenes[scene];
    stage.dataset.scene = scene;
    stage.querySelector('.scene-number').textContent = copy[0];
    ['scene-eyebrow', 'scene-title', 'scene-emphasis'].forEach((id, i) => {
      document.getElementById(id).textContent = t(copy[i + 1]);
    });
    stage.querySelectorAll('[data-scene-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.sceneChoice === scene));
    });
    if (digital) scheduleDraw();
  }
  function drawLandscape() {
    queuedDraw = 0;
    if (!digital || !inView || !photo.complete || !photo.naturalWidth) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    const cell = width < 760 ? 7 : 9;
    const columns = Math.ceil(width / cell);
    const rows = Math.ceil(height / (cell * 1.35));
    const sample = document.createElement('canvas');
    sample.width = columns; sample.height = rows;
    const sampleCtx = sample.getContext('2d', { willReadFrequently:true });
    if (!sampleCtx) return;
    // Match object-fit: cover, including the selected scene's crop.
    const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight);
    const cropWidth = width / scale;
    const cropHeight = height / scale;
    const x = scene === 'sea' ? .9 : scene === 'forest' ? .3 : width < 760 ? .4 : .5;
    const y = scene === 'forest' ? .8 : .4;
    sampleCtx.drawImage(photo, (photo.naturalWidth - cropWidth) * x, (photo.naturalHeight - cropHeight) * y,
      cropWidth, cropHeight, 0, 0, columns, rows);
    let pixels;
    try { pixels = sampleCtx.getImageData(0, 0, columns, rows).data; } catch { return; }
    // Cap backing resolution: crisp enough for type, inexpensive on mobile.
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#061c22'; ctx.fillRect(0, 0, width, height);
    ctx.font = `${cell}px ui-monospace, monospace`; ctx.textBaseline = 'top';
    const glyphs = ' .·:+=*#%@';
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const i = (row * columns + col) * 4;
        const light = (pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722) / 255;
        ctx.fillStyle = `rgb(${Math.min(255,pixels[i]*1.5+28)},${Math.min(255,pixels[i+1]*1.5+34)},${Math.min(255,pixels[i+2]*1.5+30)})`;
        ctx.fillText(glyphs[Math.min(glyphs.length-1,Math.floor(Math.sqrt(light)*glyphs.length))], col*cell,row*cell*1.35);
      }
    }
  }
  function scheduleDraw() { if (!queuedDraw) queuedDraw = requestAnimationFrame(drawLandscape); }
  stage.querySelectorAll('[data-scene-choice]').forEach(button => {
    button.addEventListener('click', () => { scene = button.dataset.sceneChoice; showScene(); });
  });
  texture.addEventListener('click', () => {
    digital = !digital;
    texture.setAttribute('aria-pressed', String(digital));
    stage.classList.toggle('is-digital', digital);
    scheduleDraw();
  });
  pause.addEventListener('click', () => { stopped = !stopped; syncMotion(); });
  reducedMotion.addEventListener('change', event => { stopped = event.matches; syncMotion(); });
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('ma:language-change', () => { showScene(); syncMotion(); });
  photo.addEventListener('load', scheduleDraw);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleDraw).observe(stage);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting; syncMotion(); if (inView && digital) scheduleDraw();
  }).observe(stage);
  syncMotion();
})();
