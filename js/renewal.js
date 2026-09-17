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
    ridge: ['01 / 03', '산이 남긴 여백', '풍경 사이에,', '잠시 머무르다.'],
    forest: ['02 / 03', '숲을 걷는 시간', '숲에 들고,', '숨을 고르다.'],
    sea: ['03 / 03', '바다가 놓인 자리', '파도를 따라,', '마음이 흐르다.']
  };
  const t = value => window.MA_I18N?.t(value) || value;
  const photographs = {
    ridge: {src:'assets/seoraksan-ridge.webp',place:'설악산 · 공룡능선',credit:'Taewangkorea · CC BY-SA 4.0 ↗',url:'https://commons.wikimedia.org/wiki/File:Dinosaur_Ridge_of_Seoraksan.jpg'},
    forest: {src:'img/wonju-chiaksan.jpg',place:'원주 · 치악산',credit:'gary4now · CC BY 3.0 ↗',url:'https://commons.wikimedia.org/wiki/File:Chiaksan_National_Park,_Korea.jpg'},
    sea: {src:'img/samcheok-coast.jpg',place:'삼척 · 해안',credit:'pcamp · CC BY 2.0 ↗',url:'https://commons.wikimedia.org/wiki/File:Korea-Samcheok-Beach-01.jpg'}
  };
  let scene = 'ridge';
  let stopped = true;
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
    const landscape = photographs[scene];
    if (photo.getAttribute('src') !== landscape.src) photo.src = landscape.src;
    document.getElementById('landscape-place').textContent = t(landscape.place);
    const credit = document.getElementById('landscape-credit');
    credit.href = landscape.url; credit.textContent = landscape.credit;
    stage.querySelector('.scene-number').textContent = copy[0];
    ['scene-eyebrow', 'scene-title', 'scene-emphasis'].forEach((id, i) => {
      document.getElementById(id).textContent = t(copy[i + 1]);
    });
    stage.querySelectorAll('[data-scene-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.sceneChoice === scene));
    });
    if (digital) scheduleDraw();
    photo.alt = t(landscape.place);
  }
  function drawLandscape() {
    queuedDraw = 0;
    if (!digital || !inView || !photo.complete || !photo.naturalWidth) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.parentElement.clientWidth;
    const height = canvas.parentElement.clientHeight;
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
    const x = scene === 'sea' ? (width < 760 ? .9 : .6) : width < 760 ? .4 : .5;
    const y = scene === 'ridge' ? .4 : .55;
    sampleCtx.drawImage(photo, (photo.naturalWidth - cropWidth) * x, (photo.naturalHeight - cropHeight) * y,
      cropWidth, cropHeight, 0, 0, columns, rows);
    let pixels;
    try { pixels = sampleCtx.getImageData(0, 0, columns, rows).data; } catch { return; }
    // Cap backing resolution: crisp enough for type, inexpensive on mobile.
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#f0ede5'; ctx.fillRect(0, 0, width, height);
    ctx.font = `${cell}px ui-monospace, monospace`; ctx.textBaseline = 'top';
    const glyphs = ' .·:+=*#%@';
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const i = (row * columns + col) * 4;
        const light = (pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722) / 255;
        const ink = Math.round(65 + light * 80);
        ctx.fillStyle = `rgb(${ink},${ink},${Math.max(0,ink-8)})`;
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
