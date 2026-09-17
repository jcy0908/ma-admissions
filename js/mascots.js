/* Original municipal artwork, shown with attribution and without recoloring/cropping. */
(() => {
  'use strict';
  const mascots = [
    {region:'횡성', name:'한우리', owner:'횡성군', image:'assets/mascots/hanuri.png', source:'https://www.hsg.go.kr/www/contents.do?key=727'},
    {region:'동해', name:'파도동자', owner:'동해시', image:'assets/mascots/padodongja.png', source:'https://www.dh.go.kr/www/contents.do?key=507'},
    {region:'삼척', name:'삼척동자', owner:'삼척시', image:'assets/mascots/samcheokdongja.png', source:'https://www.samcheok.go.kr/intro/00362/01448.web'},
    {region:'고성', name:'금강누리', owner:'고성군', image:'assets/mascots/geumgangnuri.jpg', source:'https://www.gwgs.go.kr/kor/sub04_050306.do'}
  ];
  const rows = [...document.querySelectorAll('#regions .index-list li')];
  const rowByName = new Map(rows.map(row => {
    const label = row.querySelector('b');
    return [(row.dataset.regionName || window.MA_I18N?.sourceText(label) || label.textContent).trim(), row];
  }));
  function artwork(mascot, lazy = true) {
    const img = document.createElement('img');
    img.src = mascot.image; img.alt = `${mascot.region} · ${mascot.name}`;
    img.decoding = 'async'; img.loading = lazy ? 'lazy' : 'eager';
    img.width = 120; img.height = 120;
    return img;
  }
  function sourceLink(mascot) {
    const link = document.createElement('a');
    link.href = mascot.source; link.target = '_blank'; link.rel = 'noopener';
    link.textContent = `${mascot.owner} 공식 캐릭터 ↗`;
    return link;
  }
  const companion = document.getElementById('local-companion');
  if (companion) {
    const mascot = mascots[0];
    const copy = document.createElement('div'); copy.className = 'local-companion-copy';
    const title = document.createElement('strong'); title.textContent = `${mascot.region} · ${mascot.name}`;
    const line = document.createElement('p'); line.textContent = '횡성의 한우를 닮은 반가운 얼굴.';
    copy.append(title,line,sourceLink(mascot));
    companion.append(artwork(mascot,false),copy);
  }
  const list = document.getElementById('local-friends-list');
  mascots.forEach(mascot => {
    const row = rowByName.get(mascot.region);
    if (!row) return;
    if (!row.id) row.id = `region-${mascot.region}`;
    const card = document.createElement('div'); card.className = 'local-friend';
    const visit = document.createElement('a'); visit.className = 'local-friend-visit';
    visit.href = `#${row.id}`; visit.setAttribute('aria-label', `${mascot.region} 둘러보기`);
    const name = document.createElement('span'); name.textContent = `${mascot.region} · ${mascot.name}`;
    visit.append(artwork(mascot),name); card.append(visit,sourceLink(mascot)); list?.append(card);
    const badge = sourceLink(mascot); badge.className = 'region-mascot';
    const label = document.createElement('span'); label.textContent = `${mascot.region} · ${mascot.name}`;
    badge.replaceChildren(artwork(mascot),label); row.append(badge);
  });
  const section = document.getElementById('local-friends');
  if (section && list?.children.length) section.hidden = false;
  window.MA_I18N?.refresh();
})();
