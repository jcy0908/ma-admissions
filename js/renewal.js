/* A small, dependency-free landscape viewer. The existing workspace owns navigation. */
(() => {
  'use strict';
  const stage = document.getElementById('expedition');
  if (!stage) return;
  const photo = document.getElementById('landscape-image');
  const canvas = document.getElementById('landscape-code');
  const texture = document.getElementById('landscape-texture');
  const pause = document.getElementById('landscape-pause');
  const guide = document.getElementById('goral-button');
  const guideLine = document.getElementById('guide-line');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = {
    ridge: ['01 / 03', '능선 너머, 새로운 시선', '산을 넘고,', '바다에 닿다.'],
    forest: ['02 / 03', '초록 사이, 느린 걸음', '숲에 들고,', '숨을 고르다.'],
    sea: ['03 / 03', '동쪽 끝, 가장 푸른 순간', '파도를 따라,', '마음이 흐르다.']
  };
  const t = value => window.MA_I18N?.t(value) || value;
  const photographs = {
    ridge: {src:'assets/seoraksan-ridge.webp',place:'설악산 · 공룡능선',credit:'Taewangkorea · CC BY-SA 4.0 ↗',url:'https://commons.wikimedia.org/wiki/File:Dinosaur_Ridge_of_Seoraksan.jpg'},
    forest: {src:'img/wonju-chiaksan.jpg',place:'원주 · 치악산',credit:'gary4now · CC BY 3.0 ↗',url:'https://commons.wikimedia.org/wiki/File:Chiaksan_National_Park,_Korea.jpg'},
    sea: {src:'img/samcheok-coast.jpg',place:'삼척 · 해안',credit:'pcamp · CC BY 2.0 ↗',url:'https://commons.wikimedia.org/wiki/File:Korea-Samcheok-Beach-01.jpg'}
  };
  const guideMessages = {
    ridge:['안녕, 난 산이야. 오늘은 어디로 가볼까?','급할 거 없어. 능선 하나씩 천천히 만나보자.','마음에 드는 곳이 있으면 보관함에 담아둬!'],
    forest:['잠깐, 숲의 소리에 귀를 기울여봐.','여기서는 조금 느리게 걸어도 괜찮아.','숲에서 쉬었다가, 우리 다음 풍경도 만나볼까?'],
    sea:['파도 소리 들으러 갈래? 바다 쪽으로 가보자.','카메라도 좋지만, 눈으로 오래 담아둬.','바다 보고 나면 뭐 할까? 같이 여행을 짜보자.']
  };
  let scene = 'ridge';
  let stopped = reducedMotion.matches;
  let digital = false;
  let inView = true;
  let queuedDraw = 0;
  let messageIndex = 0;
  let greetingTimer;
  function showGuide() { guideLine.textContent = t(guideMessages[scene][messageIndex]); }
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
    showGuide();
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
    button.addEventListener('click', () => { scene = button.dataset.sceneChoice; messageIndex = 0; showScene(); });
  });
  texture.addEventListener('click', () => {
    digital = !digital;
    texture.setAttribute('aria-pressed', String(digital));
    stage.classList.toggle('is-digital', digital);
    scheduleDraw();
  });
  pause.addEventListener('click', () => { stopped = !stopped; syncMotion(); });
  guide.addEventListener('click', () => {
    messageIndex = (messageIndex + 1) % guideMessages[scene].length; showGuide();
    guide.classList.remove('is-greeting');
    requestAnimationFrame(() => guide.classList.add('is-greeting'));
    clearTimeout(greetingTimer); greetingTimer = setTimeout(() => guide.classList.remove('is-greeting'),700);
  });
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
