(() => {
  'use strict';
  const study = document.getElementById('lab');
  const form = document.getElementById('translation-lab');
  if (!study || !form) return;
  const regions = [...document.querySelectorAll('#regions .index-list > li')];
  const presets = {
    water: { fog:46, spacing:48, rule:1, accent:1, note:'수면과 산 사이, 부드러운 경계에서 시작합니다.' },
    terrain: { fog:18, spacing:64, rule:1, accent:0, note:'높고 낮은 지형에서 넉넉한 여백을 떠올려 봅니다.' },
    material: { fog:10, spacing:32, rule:2, accent:2, note:'바위와 재료의 윤곽을 선의 두께로 옮겨 봅니다.' },
    boundary: { fog:20, spacing:56, rule:0.5, accent:1, note:'이어지는 곳과 나뉘는 곳의 경계를 다듬어 봅니다.' },
    rhythm: { fog:28, spacing:40, rule:1, accent:2, note:'반복되는 풍경에서 읽는 간격을 떠올려 봅니다.' }
  };
  function choose(name) {
    const row = regions.find(item => (item.dataset.regionName || item.querySelector('b')?.textContent) === name);
    const source = row?.querySelector('.region-photo');
    if (!source) return;
    const preset = presets[row.dataset.lenses.split(' ')[0]] || presets.water;
    const image = source.querySelector('img');
    const photo = document.getElementById('study-photo');
    photo.src = source.querySelector('[data-photo-view]').getAttribute('href');
    photo.alt = image.dataset.originalAlt || image.alt;
    photo.width = Number(image.getAttribute('width'));
    photo.height = Number(image.getAttribute('height'));
    const place = row.dataset.placeName || source.querySelector('figcaption strong').textContent;
    document.getElementById('study-region-label').textContent = name;
    document.getElementById('study-place-title').textContent = place;
    document.getElementById('study-context').textContent = `${name} · ${place} — ${preset.note}`;
    document.querySelector('.lab-preview-copy').textContent = row.dataset.regionDescription || row.querySelector('.region-detail > span').textContent;
    const credit = document.getElementById('study-credit');
    credit.replaceChildren(...[...source.querySelector('.region-photo-credit').childNodes].map(node => window.MA_I18N?.cloneSource(node) || node.cloneNode(true)));
    credit.append(' · 미리보기에서 밝기·흐림 조절');
    const back = document.getElementById('study-region-return');
    back.setAttribute('href', `#${row.id || `region-${regions.indexOf(row)}`}`);
    back.textContent = `${name}의 풍경으로 돌아가기 ↗`;
    study.querySelectorAll('button[data-study-region]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.studyRegion === name)));
    for (const key of ['fog','spacing','rule','accent']) {
      const input = form.querySelector(`[name="${key}"]`);
      input.defaultValue = String(preset[key]);
      input.setAttribute('value', String(preset[key]));
      input.value = String(preset[key]);
    }
    form.dispatchEvent(new Event('input', { bubbles:true }));
  }
  document.addEventListener('click', event => {
    const control = event.target.closest('[data-study-region]');
    if (!control || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    choose(control.dataset.studyRegion);
    study.open = true;
  }, true);
  choose('춘천');
})();
