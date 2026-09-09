(() => {
  'use strict';
  const aliases = new Map(Object.entries({chuncheon:'춘천',wonju:'원주',gangneung:'강릉',sokcho:'속초',cheorwon:'철원',yeongwol:'영월'}));
  const regions = [...document.querySelectorAll('#regions .index-list > li')];
  const find = key => regions.find((row,index) => row.querySelector('b')?.textContent === (aliases.get(key) || key) || `region-${index}` === key);
  function thumbnail(key, className = '') {
    const source = find(key)?.querySelector('.region-photo img');
    if (!source) return '';
    const image = source.cloneNode();
    image.className = `workspace-thumbnail ${className}`;
    image.alt = '';
    return image.outerHTML;
  }
  function figure(key, className = '') {
    const row = find(key);
    const source = row?.querySelector('.region-photo');
    if (!source) return '';
    const photo = source.cloneNode(true);
    photo.className = `workspace-photo ${className}`;
    photo.querySelector('figcaption strong').prepend(`${row.querySelector('b').textContent} · `);
    return photo.outerHTML;
  }
  function sourceLink(key) {
    const source = find(key)?.querySelector('.region-photo-credit a');
    if (!source) return '';
    const link = source.cloneNode(false);
    link.className = 'workspace-photo-source';
    link.textContent = '사진 출처 ↗';
    return link.outerHTML;
  }
  window.MA_WORKSPACE_PHOTOS = Object.freeze({thumbnail,figure,sourceLink});
})();
