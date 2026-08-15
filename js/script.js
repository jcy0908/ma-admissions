// MA — 강원 영서의 풍경을 화면으로 옮기는 법
//
// 이 페이지는 읽는 페이지입니다. 그래서 움직임은 두 곳에만 있습니다.
//   1. 누르는 순간의 반응 (click을 기다리면 죽은 것처럼 느껴진다)
//   2. 좁은 화면에서 색 견본을 옆으로 끄는 것 (일곱 개가 한 줄에 안 들어간다)
// 나머지는 정지해 있습니다.

import {
  Spring,
  project,
  rubberband,
  VelocityTracker,
  prefersReducedMotion,
} from './fluid.js';

// ==========================================================================
// 1. 즉각 반응 — 반응은 click이 아니라 pointerdown에서
// ==========================================================================

document.querySelectorAll('.header-cta, .hero-links a, .wordmark').forEach((el) => {
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
  strip.setAttribute('aria-label', '영서에서 채집한 색 — 좌우 방향키로 이동');
  strip.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    index = Math.max(0, Math.min(snapPoints.length - 1, index + (e.key === 'ArrowRight' ? 1 : -1)));
    if (prefersReducedMotion()) trackSpring.setValue(snapPoints[index]);
    else trackSpring.setTarget(snapPoints[index]);
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
if (header) {
  let ticking = false;
  const sync = () => {
    header.classList.toggle('is-overlapping', window.scrollY > 4);
    ticking = false;
  };
  addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    },
    { passive: true }
  );
  sync();
}
