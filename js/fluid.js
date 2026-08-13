// ==========================================================================
// fluid.js — Apple의 Designing Fluid Interfaces를 웹으로 옮긴 최소 구현
// 외부 라이브러리 없이 스프링, 속도 인계, 모멘텀 투영, 러버밴딩을 제공한다.
//
// 원칙
// - 모든 애니메이션은 언제든 붙잡아 되돌릴 수 있어야 한다(interruptible).
// - 새 애니메이션은 목표값이 아니라 지금 화면에 보이는 값에서 시작한다.
// - 제스처가 끝나면 손가락의 속도를 그대로 물려받는다.
// ==========================================================================

/** 감쇠비(damping)와 반응시간(response)으로 정의하는 스프링.
 *  Apple이 mass/stiffness/damping 대신 쓰는 두 파라미터를 그대로 따른다.
 *  damping 1.0 = 오버슈트 없음(기본), 0.8 = 살짝 튐(모멘텀이 있었을 때만). */
export class Spring {
  constructor({ damping = 1, response = 0.4, value = 0, velocity = 0, onUpdate, onRest } = {}) {
    this.damping = damping;
    this.response = response;
    this.value = value;
    this.velocity = velocity;
    this.target = value;
    this.onUpdate = onUpdate;
    this.onRest = onRest;
    this._raf = null;
    this._last = 0;
  }

  /** 목표를 바꾼다. 진행 중이면 현재 값과 속도를 유지한 채 방향만 튼다.
   *  이것이 반전 시 "벽에 부딪히는" 느낌을 없애는 핵심이다. */
  setTarget(target, velocity) {
    this.target = target;
    if (typeof velocity === 'number') this.velocity = velocity;
    this._start();
  }

  /** 제스처 중에는 스프링을 멈추고 손가락을 1:1로 따라간다. */
  setValue(value, velocity = 0) {
    this.stop();
    this.value = value;
    this.velocity = velocity;
    this.onUpdate?.(this.value, this.velocity);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  /** 목표값으로 즉시 끝낸다. 탭이 숨겨져 rAF가 멈추면 애니메이션이 영영
   *  끝나지 않으므로(그리고 onRest도 안 불리므로) 그때 이걸 쓴다. */
  finish() {
    if (this.value === this.target && this.velocity === 0) return;
    this.stop();
    this.value = this.target;
    this.velocity = 0;
    this.onUpdate?.(this.value, 0);
    this.onRest?.();
  }

  _start() {
    if (this._raf) return;
    // 숨겨진 탭에서는 rAF가 오지 않는다 — 붙잡힌 채로 남지 않도록 즉시 끝낸다
    if (document.hidden) {
      this.finish();
      return;
    }
    this._last = performance.now();
    const step = (now) => {
      // 탭 전환 등으로 프레임이 크게 튀면 물리가 폭발하므로 상한을 둔다
      const dt = Math.min((now - this._last) / 1000, 1 / 30);
      this._last = now;

      const omega = (2 * Math.PI) / this.response;   // 고유 진동수
      const zeta = this.damping;
      const x = this.value - this.target;

      // 감쇠 조화 진동자의 반음시적(semi-implicit) 적분
      const accel = -omega * omega * x - 2 * zeta * omega * this.velocity;
      this.velocity += accel * dt;
      this.value += this.velocity * dt;

      this.onUpdate?.(this.value, this.velocity);

      if (Math.abs(this.value - this.target) < 0.05 && Math.abs(this.velocity) < 0.05) {
        this.value = this.target;
        this.velocity = 0;
        this.onUpdate?.(this.value, 0);
        this._raf = null;
        this.onRest?.();
        return;
      }
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }
}

/** 모멘텀 투영 — 놓은 지점이 아니라 "가고 있던 곳"을 계산한다.
 *  Apple 샘플 코드의 지수 감쇠 형태. 교과서의 v²/2a가 아니다. */
export function project(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** 경계 너머로는 점점 덜 따라간다 — 딱 멈추면 고장 난 것처럼 보인다. */
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** 최근 포인터 이동에서 속도(px/s)를 뽑는다. 마지막 한 점만 쓰면 튄다. */
export class VelocityTracker {
  constructor(historyMs = 100) {
    this.historyMs = historyMs;
    this.samples = [];
  }

  add(position) {
    const now = performance.now();
    this.samples.push({ position, time: now });
    while (this.samples.length > 2 && now - this.samples[0].time > this.historyMs) {
      this.samples.shift();
    }
  }

  get velocity() {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const dt = (last.time - first.time) / 1000;
    if (dt <= 0) return 0;
    return (last.position - first.position) / dt;
  }

  reset() {
    this.samples = [];
  }
}

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
