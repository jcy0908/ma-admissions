/* Local UI translation. No network translation; never changes form values or stored records. */
(() => {
  'use strict';
  const dictionary = window.MA_TRANSLATIONS || {};
  const locales = ['ko', 'en', 'ja'];
  const key = 'ma-language-v1';
  const textSources = new WeakMap();
  const attributeSources = new WeakMap();
  const attributes = ['placeholder', 'aria-label', 'aria-valuetext', 'title', 'alt'];
  const normal = value => String(value).replace(/\s+/g, ' ').trim();
  let language = 'ko';
  try { const saved = localStorage.getItem(key); if (locales.includes(saved)) language = saved; } catch { /* In-page switching still works. */ }

  function t(value, locale = language) {
    const raw = String(value ?? '');
    if (locale === 'ko' || !locales.includes(locale)) return raw;
    const s = normal(raw), column = locale === 'en' ? 0 : 1;
    const exact = dictionary[s]?.[column];
    if (exact !== undefined) return exact;
    const tr = part => t(part, locale);
    const pick = (en, ja) => locale === 'en' ? en : ja;
    let m;
    if ((m = s.match(/^(.+) \(이 기기\)$/))) return tr(m[1]) + pick(' (this device)', '（この端末）');
    if ((m = s.match(/^(\d+)개 지역 모두 표시 중$/))) return pick(`Showing all ${m[1]} regions`, `全${m[1]}地域を表示中`);
    if ((m = s.match(/^(\d+) \/ 18개 지역 · 검색 결과$/))) return pick(`${m[1]} / 18 regions · Search results`, `${m[1]} / 18地域 · 検索結果`);
    if ((m = s.match(/^(.+) 렌즈로 (\d+)개 지역 표시 중$/))) return pick(`${m[2]} regions · ${tr(m[1])}`, `${tr(m[1])}の視点で${m[2]}地域を表示中`);
    if ((m = s.match(/^(.+) 즐겨찾기 해제$/))) return pick(`Remove ${tr(m[1])} from collection`, `${tr(m[1])}をコレクションから解除`);
    if ((m = s.match(/^(.+) 즐겨찾기$/))) return pick(`Keep ${tr(m[1])}`, `${tr(m[1])}を保存`);
    if ((m = s.match(/^(.+)의 풍경으로 돌아가기 ↗$/))) return pick(`Back to ${tr(m[1])}’s landscape ↗`, `${tr(m[1])}の風景に戻る ↗`);
    if ((m = s.match(/^(.+)을 선택했습니다\. 일정 만들기를 눌러주세요\.$/))) return pick(`${tr(m[1])} selected. Choose Create my itinerary.`, `${tr(m[1])}を選びました。「日程をつくる」を押してください。`);
    if ((m = s.match(/^(.+) 관광 안내$/))) return pick(`${tr(m[1])} visitor information`, `${tr(m[1])}の観光案内`);
    if ((m = s.match(/^(.+) 취향과 맞아요\.$/))) return pick(`Matches your interests: ${tr(m[1])}.`, `${tr(m[1])}の好みに合います。`);
    if ((m = s.match(/^(.+) 색상을 적용했습니다\.$/))) return pick(`${tr(m[1])} accent applied.`, `${tr(m[1])}の色を適用しました。`);
    if ((m = s.match(/^(\d+)일차(.*)$/))) return pick(`Day ${m[1]}${tr(m[2])}`, `${m[1]}日目${tr(m[2])}`);
    if ((m = s.match(/^(\d+)명$/))) return pick(`${m[1]} traveler${m[1] === '1' ? '' : 's'}`, `${m[1]}人`);
    if ((m = s.match(/^(\d+)분$/))) return pick(`${m[1]} min`, `${m[1]}分`);
    if ((m = s.match(/^(\d+)\/(\d+) 완료$/))) return pick(`${m[1]}/${m[2]} visited`, `${m[1]}/${m[2]} 訪問済み`);
    if ((m = s.match(/^([\d,]+)원$/))) return pick(`₩${m[1]}`, `${m[1]}ウォン`);
    if ((m = s.match(/^1인 약 (.+)$/))) return pick(`About ${tr(m[1])} per person`, `1人あたり約${tr(m[1])}`);
    if ((m = s.match(/^장소·식사 (.+)$/))) return pick(`Visits & meals ${tr(m[1])}`, `観光・食事 ${tr(m[1])}`);
    if (s === '전체 인원 예상비용') return pick('Estimated cost for all travelers', '全員分の概算費用');
    if ((m = s.match(/^앞 일정 후 (\d+)분 여유$/))) return pick(`${m[1]} min buffer after the previous stop`, `前の予定から${m[1]}分の余裕`);
    if ((m = s.match(/^예산보다 (.+) 높습니다\.$/))) return pick(`${tr(m[1])} over budget.`, `予算を${tr(m[1])}超えています。`);
    if ((m = s.match(/^목표 예산까지 (.+) 남았습니다\.$/))) return pick(`${tr(m[1])} left in your budget.`, `目標予算まで残り${tr(m[1])}です。`);
    if ((m = s.match(/^(.+) (하루|\d+일)의 기록$/))) return pick(`${tr(m[1])} · ${m[2] === '하루' ? 'One day' : m[2].slice(0,-1) + ' days'}`, `${tr(m[1])} · ${m[2] === '하루' ? '1日' : m[2].slice(0,-1) + '日'}の記録`);
    if ((m = s.match(/^빛 ([\d.]+)%, 여백 ([\d.]+)px, 선 ([\d.]+)px, 포인트 (\d+)개$/))) return pick(`Light ${m[1]}%, space ${m[2]}px, line ${m[3]}px, accents ${m[4]}`, `光 ${m[1]}%、余白 ${m[2]}px、線 ${m[3]}px、アクセント ${m[4]}個`);
    if ((m = s.match(/^빛의 농도 ([\d.]+)퍼센트$/))) return pick(`Light intensity ${m[1]} percent`, `光の濃度 ${m[1]}パーセント`);
    if ((m = s.match(/^글 사이 여백 ([\d.]+)픽셀$/))) return pick(`Text spacing ${m[1]} pixels`, `文章の余白 ${m[1]}ピクセル`);
    if ((m = s.match(/^구분선 두께 ([\d.]+)픽셀$/))) return pick(`Divider ${m[1]} pixels`, `区切り線 ${m[1]}ピクセル`);
    if ((m = s.match(/^포인트 (\d+)개$/))) return pick(`${m[1]} accents`, `アクセント ${m[1]}個`);
    if ((m = s.match(/^([\d:]+) \(다음 날\)$/))) return pick(`${m[1]} (next day)`, `${m[1]}（翌日）`);
    // Separators only compose authored UI strings; user content is translate="no".
    for (const separator of [' — ', ' · ', ' / ']) {
      if (s.includes(separator)) return s.split(separator).map(tr).join(separator);
    }
    return raw;
  }

  function sourceText(node) {
    if (!node) return '';
    if (node.nodeType === 3) {
      const saved = textSources.get(node);
      return saved && node.textContent === saved.last ? saved.source : node.textContent;
    }
    return [...node.childNodes].map(sourceText).join('');
  }
  function cloneSource(node) {
    const copy = node.cloneNode(true);
    function restore(from, to) {
      if (from.nodeType === 3) { to.textContent = sourceText(from); return; }
      for (const [name, saved] of attributeSources.get(from) || []) {
        if (from.getAttribute(name) === saved.last) to.setAttribute(name, saved.source);
      }
      [...from.childNodes].forEach((child, index) => restore(child, to.childNodes[index]));
    }
    restore(node, copy);
    return copy;
  }
  // Stable data is independent of what the interface currently displays.
  document.querySelectorAll('#regions .index-list > li').forEach(row => {
    row.dataset.regionName = row.querySelector('b').textContent;
    row.dataset.regionDescription = row.querySelector('.region-detail > span').textContent;
    row.dataset.placeName = row.querySelector('.region-photo figcaption strong').textContent;
  });
  document.querySelectorAll('.region-photo img').forEach(img => { img.dataset.originalAlt = img.alt; });
  document.querySelectorAll('.lens-filter [data-lens]').forEach(button => { button.dataset.lensLabel = button.textContent.trim(); });

  function translateNode(node) {
    if (node.nodeType === 3) {
      if (node.parentElement?.closest('[translate="no"], script, style, code, textarea, noscript')) return;
      const source = sourceText(node), translated = t(source);
      const last = translated === source ? source : source.replace(/\S[\s\S]*\S|\S/, translated);
      textSources.set(node, {source, last});
      if (node.textContent !== last) node.textContent = last;
      return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 9) return;
    if (node.closest?.('[translate="no"], script, style, code, textarea, noscript')) return;
    let saved = attributeSources.get(node);
    if (!saved) { saved = new Map(); attributeSources.set(node, saved); }
    for (const name of attributes) {
      if (!node.hasAttribute?.(name)) continue;
      const current = node.getAttribute(name), previous = saved.get(name);
      const source = previous && current === previous.last ? previous.source : current;
      const last = t(source);
      saved.set(name, {source, last});
      if (current !== last) node.setAttribute(name, last);
    }
    [...node.childNodes].forEach(translateNode);
  }
  const observer = new MutationObserver(records => {
    observer.disconnect();
    const changed = new Set();
    for (const record of records) {
      if (record.type === 'childList') record.addedNodes.forEach(node => changed.add(node));
      else changed.add(record.target);
    }
    changed.forEach(translateNode);
    observe();
  });
  function observe() { observer.observe(document.documentElement, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:attributes}); }
  function refresh() {
    observer.takeRecords();
    observer.disconnect();
    translateNode(document.documentElement);
    observe();
  }
  const menu = document.getElementById('language-menu');
  function select(locale, remember = true) {
    if (!locales.includes(locale)) return;
    language = locale;
    document.documentElement.lang = locale;
    if (remember) { try { localStorage.setItem(key, locale); } catch { /* Optional persistence. */ } }
    document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === locale)));
    document.getElementById('language-current').textContent = {ko:'한국어', en:'English', ja:'日本語'}[locale];
    document.getElementById('language-current').lang = locale;
    refresh();
    window.dispatchEvent(new CustomEvent('ma:language-change', {detail:{language:locale}}));
  }
  window.MA_I18N = Object.freeze({t, sourceText, cloneSource, refresh, select, get language() { return language; }});
  menu.addEventListener('click', event => {
    const button = event.target.closest('[data-language]');
    if (!button) return;
    select(button.dataset.language);
    menu.open = false;
    menu.querySelector('summary').focus();
  });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) menu.open = false; });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); menu.open = false; menu.querySelector('summary').focus(); }
  });
  window.addEventListener('storage', event => { if (event.key === key) select(locales.includes(event.newValue) ? event.newValue : 'ko', false); });
  select(language, false);
  // Classic defer and module scripts may complete in different orders.
  document.addEventListener('DOMContentLoaded', refresh, {once:true});
})();
