// MA — 강원도의 풍경을 화면으로 옮기는 법
//
// 이 페이지는 읽는 페이지입니다. 움직임은 설명을 검증하는 곳에만 둡니다.
//   1. 누르는 순간의 반응
//   2. 좁은 화면의 색 견본 드래그
//   3. 풍경의 성질을 수치로 바꾸는 번역 실험
//   4. 열여덟 지역을 다시 읽는 디자인 렌즈

import {
  Spring,
  project,
  rubberband,
  VelocityTracker,
  prefersReducedMotion,
} from './fluid.js';

// HTML은 완성된 본문을 먼저 제공한다. 동작 코드가 실제로 도착한 뒤에만
// 실험·필터처럼 JavaScript가 필요한 조작부를 노출한다.
document.documentElement.classList.add('enhanced');

// ==========================================================================
// 1. 즉각 반응 — 반응은 click이 아니라 pointerdown에서
// ==========================================================================

document.querySelectorAll(
  '.header-cta, .hero-scroll, .plate-credit, .wordmark, .site-nav a, .lens-filter button, .lab-reset'
).forEach((el) => {
  el.addEventListener('pointerdown', () => el.classList.add('is-pressed'));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((evt) =>
    el.addEventListener(evt, () => el.classList.remove('is-pressed'))
  );
});

// ==========================================================================
// 2. 색 견본 — 좁은 화면에서 옆으로 끈다
//    제스처가 걸린 요소이므로 CSS transition을 쓰지 않는다. 도중에 붙잡을
//    수 없기 때문이다. 스프링이 움직이고, 언제든 되돌릴 수 있다.
// ==========================================================================

const strip = document.getElementById('swatch-strip');
const track = document.getElementById('swatch-track');

if (strip && track) {
  const items = [...track.children];
  const HYSTERESIS = 10; // 탭과 드래그를 가르는 최소 이동(px)

  let snapPoints = [0];
  let index = 0;

  function measure() {
    if (!items.length) {
      snapPoints = [0];
      return;
    }
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
    const step = items[0].offsetWidth + gap;
    const maxScroll = Math.max(0, track.scrollWidth - strip.clientWidth);
    // 끝에서는 여러 항목이 같은 자리에 머무르므로 중복을 없앤다
    snapPoints = [...new Set(items.map((_, i) => -Math.min(i * step, maxScroll)))];
    index = Math.min(index, snapPoints.length - 1);
  }

  const trackSpring = new Spring({
    damping: 1,
    response: 0.4,
    value: 0,
    onUpdate: (x) => {
      track.style.transform = `translate3d(${x}px, 0, 0)`;
    },
  });

  const tracker = new VelocityTracker();
  let dragging = false;
  let committed = false;
  let grabOffset = 0; // 잡은 지점을 기억한다 — 중앙으로 튀면 환상이 깨진다

  track.addEventListener('pointerdown', (e) => {
    if (prefersReducedMotion()) return;
    if (snapPoints.length < 2) return; // 다 보이면 끌 이유가 없다

    dragging = true;
    committed = false;
    trackSpring.stop(); // 진행 중이어도 즉시 손가락에 넘긴다
    grabOffset = e.clientX - trackSpring.value;
    tracker.reset();
    tracker.add(e.clientX);
    track.setPointerCapture?.(e.pointerId);
  });

  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const raw = e.clientX - grabOffset;
    if (!committed && Math.abs(raw - trackSpring.value) < HYSTERESIS) return;
    committed = true;
    tracker.add(e.clientX);

    const max = snapPoints[0];
    const min = snapPoints[snapPoints.length - 1];
    let x = raw;
    // 양 끝에서는 딱 멈추지 않고 저항이 커진다
    if (x > max) x = max + rubberband(x - max, strip.clientWidth);
    else if (x < min) x = min - rubberband(min - x, strip.clientWidth);

    trackSpring.setValue(x, tracker.velocity);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    track.releasePointerCapture?.(e.pointerId);
    if (!committed) return;

    const velocity = tracker.velocity;
    // 놓은 자리가 아니라 '가고 있던 곳'으로 판단한다
    const projected = trackSpring.value + project(velocity);
    const target = snapPoints.reduce((best, p) =>
      Math.abs(p - projected) < Math.abs(best - projected) ? p : best
    );
    index = Math.max(0, snapPoints.indexOf(target));

    trackSpring.damping = 0.85; // 던졌으니 약간의 탄성
    trackSpring.setTarget(target, velocity);
    setTimeout(() => {
      trackSpring.damping = 1;
    }, 700);
  }

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  // 제스처만으로 갇히지 않도록 키보드로도 넘길 수 있어야 한다
  strip.setAttribute('tabindex', '0');
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', '강원도 공개 자료에서 번역한 색 — 좌우 방향키로 이동');
  strip.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    index = Math.max(0, Math.min(snapPoints.length - 1, index + (e.key === 'ArrowRight' ? 1 : -1)));
    if (prefersReducedMotion()) {
      trackSpring.setValue(0);
      strip.scrollTo({ left: Math.abs(snapPoints[index]), behavior: 'auto' });
    } else {
      trackSpring.setTarget(snapPoints[index]);
    }
  });

  measure();
  addEventListener('resize', () => {
    measure();
    trackSpring.setValue(snapPoints[index] ?? 0);
  });

  // 탭이 숨겨지면 rAF가 멈춰 모션이 얼어붙는다 — 즉시 목표로 끝낸다
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) trackSpring.finish();
  });
}

// ==========================================================================
// 3. 스크롤 엣지 — 항상 그어진 줄은 서리가 아니라 페인트다.
//    내용이 유리 밑으로 들어갈 때만 경계가 나타난다.
// ==========================================================================

const header = document.getElementById('site-header');
const hero = document.querySelector('.hero');
const scrollStory = document.querySelector('[data-scroll-story]');
const storyTurns = scrollStory ? [...scrollStory.querySelectorAll('.turn')] : [];
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let storyInView = !('IntersectionObserver' in window);
let pageMotionTicking = false;
let heroMotionSettled = false;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const syncPageMotion = () => {
  header?.classList.toggle('is-overlapping', window.scrollY > 4);

  if (reducedMotionQuery.matches) {
    hero?.style.removeProperty('--hero-shift');
    hero?.style.removeProperty('--hero-opacity');
    storyTurns.forEach((turn) => {
      turn.style.removeProperty('--turn-focus');
      turn.style.removeProperty('--turn-shift');
      turn.style.removeProperty('--turn-opacity');
      turn.style.removeProperty('--turn-body-opacity');
    });
    pageMotionTicking = false;
    return;
  }

  if (hero) {
    const heroHeight = Math.max(hero.offsetHeight, 1);
    if (window.scrollY <= heroHeight || !heroMotionSettled) {
      const progress = clamp(window.scrollY / heroHeight, 0, 1);
      hero.style.setProperty('--hero-shift', `${(progress * 28).toFixed(2)}px`);
      hero.style.setProperty('--hero-opacity', (1 - progress * 0.34).toFixed(3));
      heroMotionSettled = progress === 1;
    }
  }

  if (storyInView && storyTurns.length) {
    const viewportAnchor = window.innerHeight * 0.42;
    storyTurns.forEach((turn) => {
      const rect = turn.getBoundingClientRect();
      const turnAnchor = rect.top + Math.min(rect.height * 0.32, window.innerHeight * 0.32);
      const focus = clamp(1 - Math.abs(turnAnchor - viewportAnchor) / (window.innerHeight * 0.82), 0, 1);
      turn.style.setProperty('--turn-focus', focus.toFixed(3));
      turn.style.setProperty('--turn-shift', `${((1 - focus) * 12).toFixed(2)}px`);
      turn.style.setProperty('--turn-opacity', (0.82 + focus * 0.18).toFixed(3));
      turn.style.setProperty('--turn-body-opacity', '1');
    });
  }

  pageMotionTicking = false;
};

const requestPageMotion = () => {
  if (pageMotionTicking) return;
  pageMotionTicking = true;
  requestAnimationFrame(syncPageMotion);
};

addEventListener('scroll', requestPageMotion, { passive: true });
addEventListener('resize', requestPageMotion, { passive: true });
reducedMotionQuery.addEventListener?.('change', requestPageMotion);

if (scrollStory && 'IntersectionObserver' in window) {
  new IntersectionObserver(
    ([entry]) => {
      storyInView = entry.isIntersecting;
      if (storyInView) requestPageMotion();
    },
    { rootMargin: '35% 0px' }
  ).observe(scrollStory);
}

requestPageMotion();

// 현재 읽는 장을 내비게이션에 조용히 표시한다. 본문 구조 자체는 바꾸지 않는다.
if ('IntersectionObserver' in window) {
  const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
  const navSections = navLinks
    .map((link) => ({ link, section: document.querySelector(link.getAttribute('href')) }))
    .filter(({ section }) => section);
  const visibleSections = new Set();

  const syncCurrentSection = () => {
    const current = navSections
      .filter(({ section }) => visibleSections.has(section))
      .sort((a, b) =>
        Math.abs(a.section.getBoundingClientRect().top - window.innerHeight * 0.28)
        - Math.abs(b.section.getBoundingClientRect().top - window.innerHeight * 0.28)
      )[0];

    if (!current) return;
    navLinks.forEach((link) => {
      if (link === current.link) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleSections.add(entry.target);
        else visibleSections.delete(entry.target);
      });
      syncCurrentSection();
    },
    { rootMargin: '-18% 0px -62% 0px', threshold: 0 }
  );

  navSections.forEach(({ section }) => sectionObserver.observe(section));
}

// 사진은 HTML에서 즉시 존재한다. JS가 정상 동작하고 모션을 허용한 경우에만
// 한 번의 짧은 재료화(reveal)를 더한다.
if (!reducedMotionQuery.matches && 'IntersectionObserver' in window) {
  const media = [...document.querySelectorAll('.plate-media')];
  media.forEach((item) => {
    const rect = item.getBoundingClientRect();
    if (rect.top < window.innerHeight * 1.08 && rect.bottom > -window.innerHeight * 0.08) {
      item.classList.add('is-visible');
    }
  });
  document.documentElement.classList.add('motion-ready');

  const mediaObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '12% 0px', threshold: 0.08 }
  );

  media.filter((item) => !item.classList.contains('is-visible')).forEach((item) => mediaObserver.observe(item));
}

// ==========================================================================
// 4. 번역 실험 — 감각어를 조절 가능한 CSS 값으로 드러낸다
// ==========================================================================

const labForm = document.getElementById('translation-lab');
const labPreview = document.getElementById('lab-preview');
const labStatus = document.getElementById('lab-status');

if (labForm && labPreview && labStatus) {
  const controls = {
    fog: labForm.elements.namedItem('fog'),
    spacing: labForm.elements.namedItem('spacing'),
    rule: labForm.elements.namedItem('rule'),
    accent: labForm.elements.namedItem('accent'),
  };
  const outputs = {
    fog: document.getElementById('lab-fog-output'),
    spacing: document.getElementById('lab-spacing-output'),
    rule: document.getElementById('lab-rule-output'),
    accent: document.getElementById('lab-accent-output'),
  };
  const marks = [...labPreview.querySelectorAll('.lab-mark')];

  const readValue = (control, fallback) => {
    const value = Number.parseFloat(control?.value);
    return Number.isFinite(value) ? value : fallback;
  };

  const syncLab = () => {
    const fog = readValue(controls.fog, 46);
    const spacing = readValue(controls.spacing, 48);
    const rule = readValue(controls.rule, 1);
    const accent = Math.round(readValue(controls.accent, 1));
    const blur = Math.round((fog / 90) * 18);

    labPreview.style.setProperty('--lab-fog-alpha', String(fog / 100));
    labPreview.style.setProperty('--lab-blur', `${blur}px`);
    labPreview.style.setProperty('--lab-gap', `${spacing}px`);
    labPreview.style.setProperty('--lab-rule', `${rule}px`);

    marks.forEach((mark, index) => mark.classList.toggle('is-accent', index < accent));

    if (outputs.fog) outputs.fog.textContent = `${fog}%`;
    if (outputs.spacing) outputs.spacing.textContent = `${spacing}px`;
    if (outputs.rule) outputs.rule.textContent = `${rule}px`;
    if (outputs.accent) outputs.accent.textContent = `${accent} / ${marks.length}`;

    controls.fog?.setAttribute('aria-valuetext', `안개 농도 ${fog}퍼센트`);
    controls.spacing?.setAttribute('aria-valuetext', `능선 간격 ${spacing}픽셀`);
    controls.rule?.setAttribute('aria-valuetext', `서리 선 ${rule}픽셀`);
    controls.accent?.setAttribute('aria-valuetext', `이끼색 ${accent}개`);
    labStatus.textContent = `안개 ${fog}%, 간격 ${spacing}px, 선 ${rule}px, 이끼색 ${accent}개`;
  };

  labForm.addEventListener('input', syncLab);
  // reset 이벤트는 폼 컨트롤이 기본값으로 돌아가기 전에 발생한다.
  // 다음 태스크에서 읽어야 값과 표시가 항상 함께 초기화된다.
  labForm.addEventListener('reset', () => setTimeout(syncLab, 0));
  syncLab();
}

// ==========================================================================
// 5. 지역 디자인 렌즈 — 공인 분류가 아닌 프로젝트의 읽기 방식
// ==========================================================================

const lensButtons = [...document.querySelectorAll('.lens-filter [data-lens]')];
const regionRows = [...document.querySelectorAll('.index-list li[data-lenses]')];
const regionStatus = document.getElementById('region-filter-status');

if (lensButtons.length && regionRows.length && regionStatus) {
  const applyLens = (lens, label) => {
    let visibleCount = 0;

    regionRows.forEach((row) => {
      const lenses = (row.dataset.lenses || '').split(/\s+/).filter(Boolean);
      const visible = lens === 'all' || lenses.includes(lens);
      row.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    lensButtons.forEach((button) => {
      const active = button.dataset.lens === lens;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    regionStatus.textContent = lens === 'all'
      ? `${visibleCount}개 지역 모두 표시 중`
      : `${label} 렌즈로 ${visibleCount}개 지역 표시 중`;
  };

  lensButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyLens(button.dataset.lens || 'all', button.textContent.trim());
    });
  });
}
