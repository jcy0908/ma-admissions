// MA Institute of Design — 지원 폼 데모
// 3단계 이동, 글자 수 카운터, PDF 검증, localStorage 자동 저장/복원, 제출 다이얼로그

import { Spring, project, rubberband, VelocityTracker, prefersReducedMotion } from './fluid.js';

(function () {
  'use strict';

  const STORAGE_KEY = 'ma-admissions-draft';
  const ESSAY_MIN = 500;
  const PDF_MAX_BYTES = 200 * 1024 * 1024; // 200MB
  const TOTAL_STEPS = 3;

  const form = document.getElementById('apply-form');
  const steps = Array.from(form.querySelectorAll('.form-step'));
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-btn');
  const progressStep = document.getElementById('progress-step');
  const progressFill = document.getElementById('progress-fill');
  const formError = document.getElementById('form-error');

  const saveBanner = document.getElementById('save-banner');
  const saveBannerText = document.getElementById('save-banner-text');

  const fileInput = document.getElementById('work-pdf');
  const fileName = document.getElementById('file-name');
  const fileError = document.getElementById('file-error');

  const doneDialog = document.getElementById('done-dialog');
  const doneClose = document.getElementById('done-close');

  const savedFields = ['motivation', 'job', 'career', 'channel', 'work-url', 'essay', 'ai-usage'];

  let currentStep = 1;
  let saveTimer = null;

  // 진행 바 — CSS transition은 도중에 붙잡을 수 없으므로 스프링으로 바꾼다
  const progressSpring = new Spring({
    damping: 1, response: 0.4, value: 33.3,
    onUpdate: (v) => { progressFill.style.width = v + '%'; },
  });

  // ---------- 단계 이동 ----------

  function showStep(step, scroll) {
    currentStep = step;
    steps.forEach((fs) => {
      fs.hidden = Number(fs.dataset.step) !== step;
    });
    prevBtn.hidden = step === 1;
    nextBtn.hidden = step === TOTAL_STEPS;
    submitBtn.hidden = step !== TOTAL_STEPS;
    progressStep.textContent = step + '/' + TOTAL_STEPS;
    const pct = (step / TOTAL_STEPS) * 100;
    if (prefersReducedMotion()) {
      progressSpring.setValue(pct);
    } else {
      progressSpring.setTarget(pct);
    }
    hideError();
    if (step === TOTAL_STEPS) renderSummary();
    if (scroll) {
      document.getElementById('apply').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function showError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  function hideError() {
    formError.hidden = true;
  }

  function validateStep(step) {
    if (step === 1) {
      if (!document.getElementById('motivation').value.trim()) {
        return '지원 동기를 작성해 주세요.';
      }
      for (const id of ['job', 'career', 'channel']) {
        if (!document.getElementById(id).value) {
          const label = form.querySelector('label[for="' + id + '"]').textContent;
          return '"' + label + '" 항목을 선택해 주세요.';
        }
      }
    }

    if (step === 2) {
      const url = document.getElementById('work-url').value.trim();
      const hasFile = fileInput.files.length > 0 && fileError.hidden;
      if (!url && !hasFile) {
        return '작업물 URL 혹은 PDF 파일 중 하나는 필수입니다.';
      }
      if (url && !/^https?:\/\//i.test(url)) {
        return '작업물 URL은 http 또는 https로 시작해야 합니다.';
      }
      const essayLen = document.getElementById('essay').value.trim().length;
      if (essayLen < ESSAY_MIN) {
        return '에세이를 최소 ' + ESSAY_MIN + '자 이상 작성해 주세요. (현재 ' + essayLen + '자)';
      }
    }

    return null;
  }

  nextBtn.addEventListener('click', () => {
    const message = validateStep(currentStep);
    if (message) {
      showError(message);
      return;
    }
    showStep(currentStep + 1, true);
  });

  prevBtn.addEventListener('click', () => {
    showStep(currentStep - 1, true);
  });

  // ---------- 글자 수 카운터 ----------

  function bindCounter(id, counterId, max, min) {
    const el = document.getElementById(id);
    const counter = document.getElementById(counterId);

    function update() {
      const len = el.value.length;
      counter.textContent = len + '/' + max;
      counter.classList.toggle('is-warning', (min && len > 0 && len < min) || len >= max);
    }

    el.addEventListener('input', update);
    update();
  }

  bindCounter('motivation', 'motivation-counter', 300);
  bindCounter('essay', 'essay-counter', 2000, ESSAY_MIN);

  // ---------- PDF 파일 검증 ----------

  fileInput.addEventListener('change', () => {
    fileError.hidden = true;
    fileName.classList.remove('has-file');

    const file = fileInput.files[0];
    if (!file) {
      fileName.textContent = '파일을 업로드해 주세요';
      return;
    }

    if (!/\.pdf$/i.test(file.name)) {
      fileError.textContent = 'PDF 파일만 업로드할 수 있습니다.';
      fileError.hidden = false;
      fileInput.value = '';
      fileName.textContent = '파일을 업로드해 주세요';
      return;
    }

    if (file.size > PDF_MAX_BYTES) {
      fileError.textContent = '파일이 200MB를 넘습니다. (현재 ' + formatBytes(file.size) + ')';
      fileError.hidden = false;
      fileInput.value = '';
      fileName.textContent = '파일을 업로드해 주세요';
      return;
    }

    fileName.textContent = file.name + ' (' + formatBytes(file.size) + ')';
    fileName.classList.add('has-file');
    scheduleSave();
  });

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  }

  // ---------- localStorage 자동 저장 / 복원 ----------

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function timestamp() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function saveDraft() {
    const draft = { savedAt: timestamp() };
    for (const id of savedFields) {
      draft[id] = document.getElementById(id).value;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      saveBannerText.textContent = '현재 상태까지 저장되었습니다. (' + draft.savedAt + ')';
      saveBanner.hidden = false;
    } catch (e) {
      /* 저장 공간 부족 등은 조용히 무시 */
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 600);
  }

  function restoreDraft() {
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return;
    }
    if (!draft) return;

    for (const id of savedFields) {
      if (typeof draft[id] === 'string') {
        document.getElementById(id).value = draft[id];
        document.getElementById(id).dispatchEvent(new Event('input'));
      }
    }
    if (draft.savedAt) {
      saveBannerText.textContent = '저장된 초안을 불러왔습니다. (' + draft.savedAt + ')';
      saveBanner.hidden = false;
    }
  }

  form.addEventListener('input', scheduleSave);
  restoreDraft();

  // ---------- 요약 ----------

  function summaryRow(label, value) {
    const div = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    if (value) {
      dd.textContent = value;
    } else {
      dd.textContent = '(작성하지 않음)';
      dd.className = 'empty';
    }
    div.append(dt, dd);
    return div;
  }

  function truncate(text, max) {
    const t = text.trim();
    return t.length > max ? t.slice(0, max) + '…' : t;
  }

  function renderSummary() {
    const summary = document.getElementById('summary');
    summary.replaceChildren(
      summaryRow('지원 동기', truncate(document.getElementById('motivation').value, 120)),
      summaryRow('직업 / 직군', document.getElementById('job').value),
      summaryRow('경력 연차', document.getElementById('career').value),
      summaryRow('알게 된 경로', document.getElementById('channel').value),
      summaryRow('작업물 URL', document.getElementById('work-url').value.trim()),
      summaryRow('작업물 PDF', fileInput.files[0] ? fileInput.files[0].name : ''),
      summaryRow('에세이', document.getElementById('essay').value.trim().length + '자 작성됨'),
      summaryRow('AI 도구 사용', truncate(document.getElementById('ai-usage').value, 120))
    );
  }

  // ---------- 제출 ----------

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    for (let step = 1; step < TOTAL_STEPS; step += 1) {
      const message = validateStep(step);
      if (message) {
        showStep(step, true);
        showError(message);
        return;
      }
    }
    saveDraft();
    openSheet();
  });

  doneClose.addEventListener('click', () => closeSheet());

  // ------------------------------------------------------------------
  // 제출 시트 — 손가락으로 잡아 내릴 수 있고, 언제든 되돌릴 수 있다
  // ------------------------------------------------------------------

  let sheetClosing = false;

  const sheetSpring = new Spring({
    damping: 1,
    response: 0.35,
    value: 0,
    onUpdate: (y) => {
      doneDialog.style.transform = 'translateY(' + y + 'px)';
      const h = doneDialog.offsetHeight || 1;
      // 내려갈수록 배경 스크림도 함께 옅어진다 — 진행 상황이 계속 보여야 한다
      doneDialog.style.setProperty('--sheet-progress', String(Math.max(0, 1 - y / h)));
    },
    onRest: () => {
      // 목표값 비교는 취약하다 — 닫으려는 '의도'를 명시적으로 본다
      if (!sheetClosing) return;
      sheetClosing = false;
      doneDialog.close();
      doneDialog.style.transform = '';
      doneDialog.style.removeProperty('--sheet-progress');
    },
  });

  function openSheet() {
    sheetClosing = false;
    doneDialog.showModal();
    if (prefersReducedMotion()) {
      sheetSpring.setValue(0);
      return;
    }
    // 아래에서 올라오고, 닫힐 때도 같은 길로 내려간다 (경로 대칭)
    sheetSpring.setValue(doneDialog.offsetHeight || 400);
    sheetSpring.setTarget(0);
  }

  function closeSheet() {
    if (prefersReducedMotion()) {
      doneDialog.close();
      return;
    }
    sheetClosing = true;
    sheetSpring.setTarget(doneDialog.offsetHeight || 400);
  }

  // Esc 등 브라우저 기본 닫기와 상태를 맞춘다
  doneDialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeSheet();
  });

  const tracker = new VelocityTracker();
  let dragging = false;
  let startY = 0;
  let startValue = 0;
  let committed = false;

  doneDialog.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;      // 버튼 누르는 건 드래그가 아니다
    if (prefersReducedMotion()) return;
    dragging = true;
    committed = false;
    startY = e.clientY;
    startValue = sheetSpring.value;
    sheetSpring.stop();                           // 진행 중이어도 즉시 손가락에 넘긴다
    tracker.reset();
    tracker.add(e.clientY);
    doneDialog.setPointerCapture(e.pointerId);
  });

  doneDialog.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    if (!committed && Math.abs(dy) < 10) return;  // 10px 히스테리시스: 탭과 드래그를 가른다
    committed = true;
    tracker.add(e.clientY);

    let y = startValue + dy;
    // 위로는 거의 안 따라간다 — 딱 멈추면 고장 난 것처럼 보이므로 저항만 준다
    if (y < 0) y = -rubberband(-y, doneDialog.offsetHeight || 400);
    sheetSpring.setValue(y, tracker.velocity);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    doneDialog.releasePointerCapture?.(e.pointerId);
    if (!committed) return;

    const velocity = tracker.velocity;
    const height = doneDialog.offsetHeight || 400;
    // 놓은 지점이 아니라 "가고 있던 곳"으로 판단한다
    const projected = sheetSpring.value + project(velocity);
    const shouldClose = projected > height * 0.4;
    sheetClosing = shouldClose;
    // 던진 동작이었으니 약간의 탄성을 허용한다
    sheetSpring.damping = 0.85;
    sheetSpring.setTarget(shouldClose ? height : 0, velocity);
    setTimeout(() => { sheetSpring.damping = 1; }, 600);
  }

  doneDialog.addEventListener('pointerup', endDrag);
  doneDialog.addEventListener('pointercancel', endDrag);

  // ------------------------------------------------------------------
  // 누르는 즉시 반응한다 — click을 기다리면 죽은 것처럼 느껴진다
  // ------------------------------------------------------------------
  document.querySelectorAll('.btn, .file-btn, .header-cta, .hero-links a').forEach((el) => {
    el.addEventListener('pointerdown', () => el.classList.add('is-pressed'));
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((evt) =>
      el.addEventListener(evt, () => el.classList.remove('is-pressed'))
    );
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      sheetSpring.finish();
      progressSpring.finish();
    }
  });

  showStep(1, false);
})();
