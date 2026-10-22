// 공통: 회차 확인, 한 문항씩 진행하는 응답 화면, 순위·표시 도구
import { getSessionStatus, isConfigured, SESSION_RE } from './backend.js';

export const $ = (s, el = document) => el.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const CLOSED_MSG = '현재 운영 중인 워크숍에서만 사용할 수 있는 페이지입니다.';

export function showClosed(root, extra = '') {
  root.innerHTML = `<div class="closed"><p>${CLOSED_MSG}</p>${extra}</div>`;
}

// 같은 탭 안에서만 유지되는 임시 저장 (서버 전송 없음)
export const store = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { sessionStorage.removeItem(k); } catch {} }
};

// URL의 회차 ID를 확인하고, 해당 검사가 열려 있을 때만 sessionId를 돌려줌
export async function gate(root, flag) {
  const sid = new URLSearchParams(location.search).get('session') || '';
  if (!SESSION_RE.test(sid) || !isConfigured()) { showClosed(root); return null; }
  root.innerHTML = '<div class="closed"><p class="tiny">불러오는 중…</p></div>';
  try {
    const st = await getSessionStatus(sid);
    if (!st.exists || !st[flag]) { showClosed(root); return null; }
    return sid;
  } catch (e) {
    showClosed(root, '<p class="tiny" style="margin-top:14px">연결이 원활하지 않으면 잠시 후 <a href="" style="color:var(--wood)">다시 시도</a>해 주세요.</p>');
    return null;
  }
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// 같은 영역 문항이 연달아 나오지 않도록 섞기 (몇 번 시도 후 실패하면 일반 섞기)
export function spreadShuffle(items, groupOf) {
  for (let t = 0; t < 200; t++) {
    const a = shuffle(items);
    if (a.every((x, i) => i === 0 || groupOf(a[i - 1]) !== groupOf(x))) return a;
  }
  return shuffle(items);
}

export const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const EPS = 1e-9;
// 동점은 같은 순위 (1, 1, 3 …)
export function rankDesc(list, key = 'score') {
  const sorted = list.slice().sort((a, b) => b[key] - a[key]);
  sorted.forEach((x, i) => {
    x.rank = (i > 0 && Math.abs(sorted[i - 1][key] - x[key]) < EPS) ? sorted[i - 1].rank : i + 1;
  });
  return sorted;
}

export function fmt(n, d) { return (Math.round(n * 10 ** d) / 10 ** d).toFixed(d); }

/**
 * 한 문항씩 응답하는 화면
 * items: [{ id, text, options: [{ label, value }] }]  (표시 순서대로)
 */
export function runQuiz({ root, key, items, onDone }) {
  const saved = store.get(key) || {};
  const answers = saved.answers || {};
  let idx = Math.min(saved.idx ?? 0, items.length);
  let lock = false;
  const N = items.length;
  const save = () => store.set(key, { answers, idx });
  const answeredCount = () => items.filter(it => answers[it.id] !== undefined).length;

  function render() {
    save();
    const done = answeredCount();
    const pct = (done / N) * 100;
    const head = `
      <div class="progress-row">
        <span class="progress-count" aria-live="polite">${Math.min(idx + 1, N)} <span class="total">/ ${N}</span></span>
        <span class="tiny">응답 ${done}개</span>
      </div>
      <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${N}" aria-valuenow="${done}"><i style="width:${pct}%"></i></div>`;

    if (idx >= N) {
      const all = done === N;
      root.innerHTML = `<div class="card">${head}
        <p class="q-text" style="min-height:0">${all ? '모든 문항에 응답했습니다.' : '응답하지 않은 문항이 있습니다.'}</p>
        <button class="btn block" id="toResult" ${all ? '' : 'disabled'}>결과 보기</button>
        <div class="q-nav"><button class="btn text" id="prev">← 이전 문항</button><span></span></div></div>`;
      $('#toResult', root).onclick = () => { if (answeredCount() === N) onDone(answers); };
      $('#prev', root).onclick = () => { idx = N - 1; render(); };
      return;
    }

    const it = items[idx];
    const cur = answers[it.id];
    root.innerHTML = `<div class="card">${head}
      <p class="q-text" id="qtext">${esc(it.text)}</p>
      <div class="options" role="radiogroup" aria-labelledby="qtext">
        ${it.options.map((o, i) => `<button type="button" class="opt ${cur === o.value ? 'selected' : ''}" role="radio" aria-checked="${cur === o.value}" data-v="${o.value}"><span class="num">${i + 1}</span><span>${esc(o.label)}</span></button>`).join('')}
      </div>
      <div class="q-nav">
        <button class="btn text" id="prev" ${idx === 0 ? 'style="visibility:hidden"' : ''}>← 이전 문항</button>
        <button class="btn text" id="next" ${cur === undefined ? 'style="visibility:hidden"' : ''}>다음 →</button>
      </div></div>`;
    root.querySelectorAll('.opt').forEach(b => b.onclick = () => choose(it, Number(b.dataset.v), b));
    $('#prev', root).onclick = () => { if (idx > 0) { idx--; render(); } };
    $('#next', root).onclick = () => { if (answers[it.id] !== undefined) { idx++; render(); } };
  }

  function choose(it, v, btn) {
    if (lock) return;
    lock = true;
    answers[it.id] = v;
    root.querySelectorAll('.opt').forEach(b => { const on = b === btn; b.classList.toggle('selected', on); b.setAttribute('aria-checked', on); });
    save();
    setTimeout(() => { idx++; lock = false; render(); window.scrollTo({ top: 0 }); }, 230);
  }

  document.addEventListener('keydown', e => {
    if (idx >= N || e.target.closest('input,textarea') || !root.querySelector('.opt')) return;
    const n = Number(e.key);
    const btns = root.querySelectorAll('.opt');
    if (n >= 1 && n <= btns.length) btns[n - 1].click();
  });

  render();
  return { reset() { for (const k in answers) delete answers[k]; idx = 0; store.del(key); } };
}

export function barRow({ name, valueText, pct, desc = '', hi = false, badge = '' }) {
  return `<div class="bar-row ${hi ? 'hi' : ''}">
    <div class="bar-head"><span class="bar-name">${esc(name)}</span><span class="bar-val">${valueText}</span></div>
    <div class="track"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>
    ${badge ? `<span class="badge">${esc(badge)}</span>` : ''}
    ${desc ? `<p class="bar-desc">${esc(desc)}</p>` : ''}
  </div>`;
}
