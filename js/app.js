/* ==========================================================================
   app.js — маршрутизация, отрисовка, состояние (галочки, лог подходов,
   таймер отдыха, тема). Без библиотек и без сборки.
   ========================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const KEY = 'fit-workout-a1';

/* ---------------- состояние ---------------- */
const DEF = { theme: 'dark', done: {}, log: {}, ts: null };
let S = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return Object.assign({}, DEF, raw, { done: raw.done || {}, log: raw.log || {} });
  } catch (e) { return Object.assign({}, DEF); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

function logOf(id) {
  if (!S.log[id]) S.log[id] = { w: '', s: ['', '', ''], rir: '', note: '' };
  return S.log[id];
}

/* ---------------- утилиты ---------------- */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ex = (id) => WORKOUT.exercises.find((e) => e.id === id);
const EX_IDS = WORKOUT.exercises.map((e) => e.id);
const ALL_STEPS = ['warmup'].concat(EX_IDS, ['cooldown']);
const li = (a) => a.map((x) => `<li>${x}</li>`).join('');
const fig = (name) => FIG[name] || '';

const ICON = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>',
};

/* ---------------- тема ---------------- */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', S.theme);
  const b = $('#themeBtn');
  if (b) b.innerHTML = S.theme === 'dark' ? ICON.sun : ICON.moon;
}

/* ---------------- таймер отдыха ---------------- */
let timer = { id: null, left: 0, total: 0, label: '' };

function startTimer(sec, label) {
  stopTimer(true);
  timer.left = sec; timer.total = sec; timer.label = label || 'Отдых';
  $('#timerbar').classList.add('on');
  document.body.classList.add('pad-timer');
  paintTimer();
  timer.id = setInterval(() => {
    timer.left--;
    paintTimer();
    if (timer.left <= 0) { clearInterval(timer.id); timer.id = null; ding(); }
  }, 1000);
}
function stopTimer(silent) {
  if (timer.id) clearInterval(timer.id);
  timer.id = null;
  if (!silent) {
    $('#timerbar').classList.remove('on');
    document.body.classList.remove('pad-timer');
  }
}
function paintTimer() {
  const m = Math.floor(Math.max(0, timer.left) / 60);
  const s = Math.max(0, timer.left) % 60;
  const v = $('#tval');
  v.textContent = m + ':' + String(s).padStart(2, '0');
  v.classList.toggle('done', timer.left <= 0);
  $('#tinfo').textContent = timer.left <= 0
    ? 'Отдых окончен — следующий подход'
    : timer.label + ' · всего ' + Math.round(timer.total / 60 * 10) / 10 + ' мин';
}
function ding() {
  try {
    if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.22].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.type = 'sine';
      g.gain.setValueAtTime(0.001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
    setTimeout(() => ctx.close(), 900);
  } catch (e) {}
}

/* ---------------- общие куски разметки ---------------- */
function checkRow(id, title, sub) {
  const on = !!S.done[id];
  return `<div class="check${on ? ' on' : ''}" data-act="toggle" data-id="${id}">
    <div class="box">${ICON.check}</div>
    <div class="ctitle">${title}</div>
    <div class="csub">${sub || ''}</div>
  </div>`;
}

function musclesCard(m) {
  return `<div class="card"><h3>Какие мышцы работают</h3>
    <div class="muscles">
      ${muscleMap(m.primary, m.secondary)}
      <div class="mlist">
        <div class="p"><em>Основные</em>${m.p}</div>
        <div class="s"><em>Помогают</em>${m.s}</div>
      </div>
    </div></div>`;
}

function figures(list, extra) {
  const cells = list.map((f) => `<figure class="fig${f.bad ? ' bad' : ''}">${fig(f.fig)}
    <figcaption><b>${f.t}</b>${f.c}</figcaption></figure>`).join('');
  const one = list.length === 1 || list[0].wide;
  let html = `<div class="figs${one ? ' one' : ''}">${cells}</div>`;
  if (extra) html += `<figure class="fig">${fig(extra.fig)}</figure>
    <p class="fignote">${extra.note}</p>`;
  return html;
}

/* анимированная схема движения; если её нет — обычные стоп-кадры */
function movement(e) {
  const a = typeof ANIM !== 'undefined' ? ANIM[e.id] : null;
  if (!a) return figures(e.figures, e.extraFig);
  const s = e.figures[0], f = e.figures[1] || e.figures[0];
  return `<figure class="fig anim">
    <div class="fighead">
      <b>Движение целиком</b>
      <button class="btn ghost sm" data-act="anim">Пауза</button>
    </div>
    ${a}
    <figcaption class="two">
      <span><b>${s.t}</b> ${s.c}</span>
      <span><b>${f.t}</b> ${f.c}</span>
    </figcaption>
  </figure>
  ${e.extraFig ? `<figure class="fig">${fig(e.extraFig.fig)}</figure>
    <p class="fignote">${e.extraFig.note}</p>` : ''}`;
}

/* видео с техникой: плеер грузится только по нажатию */
function videoBlock(id) {
  const v = (WORKOUT.videos || {})[id];
  if (!v) return '';
  return `<div class="card"><h3>Видео с техникой</h3>
    <button class="yt" data-act="yt" data-id="${v.id}" aria-label="Смотреть видео: ${esc(v.t)}">
      <img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy"
        onerror="this.closest('.yt').classList.add('noimg')">
      <span class="ytp" aria-hidden="true"></span>
    </button>
    <div class="ytmeta"><b>${v.t}</b><span>${v.a}</span></div>
    <div class="ytlinks">
      <a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">Открыть на YouTube ↗</a>
      <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(v.q)}" target="_blank" rel="noopener">Другие видео ↗</a>
    </div>
  </div>`;
}

/* ---------------- экран: главная ---------------- */
function viewHome() {
  const doneCount = ALL_STEPS.filter((k) => S.done[k]).length;
  const pct = Math.round(doneCount / ALL_STEPS.length * 100);

  const cards = WORKOUT.exercises.map((e, i) => `
    <a class="excard${S.done[e.id] ? ' done' : ''}" href="#/ex/${e.id}">
      <div class="exnum">${S.done[e.id] ? '✓' : i + 1}</div>
      <div>
        <div class="exname">${e.name}</div>
        <div class="exmeta">${e.plan} · отдых ${e.rest} · ${e.target}</div>
      </div>
      <div class="exgo">${ICON.chev}</div>
    </a>`).join('');

  return `
  <div class="hero">
    <div class="kicker">${WORKOUT.title} · день ${WORKOUT.day}</div>
    <h1>Верх тела<br>и пресс</h1>
    <p class="lead">${WORKOUT.lead}</p>
    <div class="chips">${WORKOUT.chips.map((c, i) => `<span class="chip${i === 3 ? ' on' : ''}">${c}</span>`).join('')}</div>
  </div>

  <div class="progress-card">
    <div class="progress-head"><b>Прогресс тренировки</b><span>${doneCount} из ${ALL_STEPS.length}</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
  </div>

  <div class="section">
    <h2>Перед началом</h2>
    <a class="excard" href="#/safety">
      <div class="exnum">!</div>
      <div><div class="exname">Правила безопасности</div>
        <div class="exmeta">Прочитай один раз перед первым подходом</div></div>
      <div class="exgo">${ICON.chev}</div>
    </a>
    <div style="height:10px"></div>
    <a class="excard${S.done.warmup ? ' done' : ''}" href="#/warmup">
      <div class="exnum">${S.done.warmup ? '✓' : '0'}</div>
      <div><div class="exname">Разминка</div>
        <div class="exmeta">${WORKOUT.warmup.total} · кардио + плечи и лопатки</div></div>
      <div class="exgo">${ICON.chev}</div>
    </a>
  </div>

  <div class="section">
    <h2>Упражнения</h2>
    <div class="exlist">${cards}</div>
  </div>

  <div class="section">
    <a class="excard${S.done.cooldown ? ' done' : ''}" href="#/cooldown">
      <div class="exnum">${S.done.cooldown ? '✓' : '8'}</div>
      <div><div class="exname">Заминка и растяжка</div>
        <div class="exmeta">${WORKOUT.cooldown.total} · спокойно, без боли</div></div>
      <div class="exgo">${ICON.chev}</div>
    </a>
  </div>

  <div class="section">
    <h2>Справочник</h2>
    <div class="tiles">
      <a class="tile" href="#/rir"><span class="ti">⚖️</span><b>Выбор веса</b><span>Правило RIR 2–3 и как понять, что вес не тот</span></a>
      <a class="tile" href="#/progression"><span class="ti">📈</span><b>Прогрессия</b><span>Когда и на сколько добавлять вес</span></a>
      <a class="tile" href="#/swaps"><span class="ti">🔁</span><b>Если занято</b><span>Замена для каждого упражнения</span></a>
      <a class="tile" href="#/tracker"><span class="ti">📝</span><b>Трекер</b><span>Записать веса и повторения</span></a>
      <a class="tile" href="#/quick"><span class="ti">⚡️</span><b>Просто следуй</b><span>Вся тренировка на одном экране</span></a>
      <a class="tile" href="#/about"><span class="ti">👤</span><b>Мои вводные</b><span>Контекст, цели и ограничения</span></a>
    </div>
  </div>

  <div class="footer">
    <p>Тренировка A · день 1. Все схемы техники нарисованы специально для этого руководства.</p>
    <p>Это тренировочная инструкция, а не медицинская рекомендация.</p>
  </div>`;
}

/* ---------------- экран: упражнение ---------------- */
function viewExercise(id) {
  const e = ex(id);
  if (!e) return viewHome();
  const i = EX_IDS.indexOf(id);
  const prev = i > 0 ? WORKOUT.exercises[i - 1] : null;
  const next = i < EX_IDS.length - 1 ? WORKOUT.exercises[i + 1] : null;
  const L = logOf(id);
  const setsN = e.isTime ? 2 : 3;

  const setInputs = Array.from({ length: setsN }, (_, k) => `
    <div class="setrow">
      <span>Подход ${k + 1}</span>
      <input type="text" inputmode="numeric" placeholder="${e.isTime ? 'сек' : 'повт.'}"
        value="${esc(L.s[k] || '')}" data-act="set" data-id="${id}" data-i="${k}">
      <input type="text" inputmode="decimal" placeholder="${e.isTime ? '—' : 'вес, кг'}"
        value="${esc((L.wArr && L.wArr[k]) || '')}" data-act="setw" data-id="${id}" data-i="${k}"
        ${e.isTime ? 'disabled' : ''}>
    </div>`).join('');

  return `
  <div class="exhead">
    <div class="kicker">Упражнение ${i + 1} из ${EX_IDS.length} · ${e.target}</div>
    <h1>${e.name}</h1>
  </div>

  <div class="plangrid">
    <div class="plancell hi"><span>План</span><b>${e.plan}</b></div>
    <div class="plancell"><span>Отдых</span><b>${e.rest}</b></div>
    <div class="plancell"><span>Темп</span><b>${e.tempo}</b></div>
  </div>

  <button class="btn block" style="margin:12px 0 4px" data-act="rest" data-sec="${e.restSec}" data-label="${esc(e.name)}">
    ⏱ Запустить отдых ${e.rest}
  </button>

  ${movement(e)}

  ${videoBlock(e.id)}

  <div class="card accent"><h3>Задача подхода</h3><p>${e.goal}</p></div>

  ${musclesCard(e.muscles)}

  <div class="card"><h3>Исходное положение</h3><ul class="ticks">${li(e.setup)}</ul></div>

  <div class="card"><h3>Пошаговое выполнение</h3><ol class="steps">${li(e.steps)}</ol></div>

  <div class="card info"><h3>На что обратить внимание</h3><ul class="ticks">${li(e.focus)}</ul></div>

  <div class="card warn"><h3>Частые ошибки</h3><ul class="crosses">${li(e.mistakes)}</ul></div>

  <div class="card"><h3>Как понять, что вес слишком тяжёлый</h3><ul class="crosses">${li(e.heavy)}</ul></div>

  ${e.badFigures ? figures(e.badFigures.map((f) => Object.assign({ bad: true }, f))) : ''}

  <div class="kv">
    <div><em>Дыхание</em><b>${e.breath}</b></div>
    <div><em>Темп движения</em><b>${e.tempoText}</b></div>
    <div><em>Отдых между подходами</em><b>${e.restText}</b></div>
    <div><em>Вес</em><b>${e.weightLabel}${e.isTime ? '' : ' · RIR 2–3'}</b></div>
  </div>

  <div class="card"><h3>Если оборудование занято</h3>
    ${e.swaps.map((s) => `<div class="swap">
      <div class="sfig">${fig(s.fig)}</div>
      <div><b>${s.name}</b><span>${s.note}</span></div>
    </div>`).join('')}
    ${e.swapExtra ? `<p style="margin-top:12px;font-size:13.5px;color:var(--tx-2)">${e.swapExtra}</p>` : ''}
  </div>

  <div class="think"><b>Думай о…</b><p>${e.think}</p></div>

  <div class="card"><h3>Записать подходы</h3>
    <div class="sets">${setInputs}</div>
    <div style="margin-top:12px">
      <label class="inline-lbl" for="note-${id}">Комментарий</label>
      <input id="note-${id}" type="text" placeholder="ощущения, техника, что поправить"
        value="${esc(L.note || '')}" data-act="note" data-id="${id}">
    </div>
  </div>

  ${checkRow(id, 'Упражнение выполнено', e.plan)}

  <div class="exnav">
    ${prev ? `<a href="#/ex/${prev.id}"><span>Назад</span>${prev.name}</a>` : `<a class="empty">.</a>`}
    ${next ? `<a class="next" href="#/ex/${next.id}"><span>Дальше</span>${next.name}</a>`
           : `<a class="next" href="#/cooldown"><span>Дальше</span>Заминка</a>`}
  </div>
  <div style="height:24px"></div>`;
}

/* ---------------- экран: разминка ---------------- */
function viewWarmup() {
  const w = WORKOUT.warmup;
  return `
  <div class="exhead"><div class="kicker">Шаг 0 · ${w.total}</div><h1>Разминка</h1></div>

  <div class="card"><h3>${w.cardio.title}</h3>
    <figure class="fig" style="margin-bottom:12px">${fig(w.cardio.fig)}</figure>
    <p>${w.cardio.text}</p>
  </div>

  <div class="figs">
    ${w.blocks.map((b) => `<figure class="fig">${fig(b.fig)}
      <figcaption><b>${b.title}</b>${b.text}</figcaption></figure>`).join('')}
  </div>

  <div class="card"><h3>Дополнительно</h3><ul class="ticks">${li(w.extra)}</ul></div>

  <div class="card warn"><h3>Важно</h3><ul class="crosses">${li(w.warn)}</ul></div>

  ${checkRow('warmup', 'Разминка сделана', w.total)}

  <div class="exnav">
    <a href="#/safety"><span>Назад</span>Безопасность</a>
    <a class="next" href="#/ex/pullups"><span>Дальше</span>Подтягивания</a>
  </div>
  <div style="height:24px"></div>`;
}

/* ---------------- экран: заминка ---------------- */
function viewCooldown() {
  const c = WORKOUT.cooldown;
  return `
  <div class="exhead"><div class="kicker">Финал · ${c.total}</div><h1>Заминка и растяжка</h1></div>
  <div class="card accent"><p>${c.text}</p></div>
  <div class="card"><h3>Что растянуть</h3>
    ${c.items.map(([t, d]) => `<div style="margin-bottom:12px"><b>${t}</b><br><span style="color:var(--tx-2);font-size:14.5px">${d}</span></div>`).join('')}
  </div>
  <div class="card warn"><h3>Важно</h3><p>${c.warn}</p></div>
  ${checkRow('cooldown', 'Заминка сделана', c.total)}
  <div class="card ok" style="margin-top:16px"><h3>Тренировка закончена</h3>
    <p>Занеси веса и повторения в трекер, пока помнишь ощущения — на следующей тренировке это твоя отправная точка.</p>
    <a class="btn block" href="#/tracker" style="margin-top:12px">Открыть трекер</a>
  </div>
  <div style="height:24px"></div>`;
}

/* ---------------- экран: безопасность ---------------- */
function viewSafety() {
  const s = WORKOUT.safety;
  return `
  <div class="exhead"><div class="kicker">Прочитай до первого подхода</div><h1>Безопасность</h1></div>
  <div class="card accent"><h3>Правила сегодняшнего дня</h3><ul class="ticks">${li(s.rules)}</ul></div>
  <div class="card warn"><h3>Прекращаем тренировку, если появилось</h3><ul class="crosses">${li(s.stop)}</ul></div>
  <div class="card info"><h3>Про хруст в шее и пояснице</h3><p>${s.doctor}</p></div>
  <div class="exnav">
    <a href="#/"><span>Назад</span>Главная</a>
    <a class="next" href="#/warmup"><span>Дальше</span>Разминка</a>
  </div>
  <div style="height:24px"></div>`;
}

/* ---------------- экран: RIR ---------------- */
function viewRir() {
  const r = WORKOUT.rir;
  const cls = { ok: 'ok', bad: 'warn', info: 'info' };
  return `
  <div class="exhead"><div class="kicker">Система выбора веса</div><h1>Правило RIR</h1></div>
  <div class="think"><b>Главное правило дня</b><p>${r.rule}</p></div>
  <p style="color:var(--tx-2);margin:14px 0">RIR (reps in reserve) — сколько чистых повторений ты мог бы сделать
  сверх подхода. Сегодня почти во всех упражнениях остаток должен быть 2–3 повторения.</p>
  ${r.examples.map((e) => `<div class="card ${cls[e.icon]}"><h3>${e.t}</h3><p>${e.d}</p></div>`).join('')}
  <div class="card"><h3>Что ещё держать в голове</h3><ul class="ticks">${li(r.notes)}</ul></div>
  <div class="exnav"><a href="#/"><span>Назад</span>Главная</a>
    <a class="next" href="#/progression"><span>Дальше</span>Прогрессия</a></div>
  <div style="height:24px"></div>`;
}

/* ---------------- экран: прогрессия ---------------- */
function viewProgression() {
  const p = WORKOUT.progression;
  return `
  <div class="exhead"><div class="kicker">Как расти дальше</div><h1>Прогрессия</h1></div>
  <p style="color:var(--tx-2);margin-bottom:14px">${p.intro}</p>
  ${p.stages.map((s) => `<div class="card ${s.tone === 'up' ? 'ok' : ''}">
      <h3>${s.w}</h3>
      <p style="font-size:19px;font-weight:800;letter-spacing:-.02em;margin-bottom:6px">${s.reps}</p>
      <p style="color:${s.tone === 'up' ? 'var(--ok)' : 'var(--tx-2)'};font-weight:700">→ ${s.verdict}</p>
    </div>`).join('')}
  <div class="card accent"><p>${p.after}</p></div>
  <div class="card"><h3>Шаг прибавки</h3>
    <table class="compact"><tbody>
      ${p.steps.map(([a, b]) => `<tr><td><b>${a}</b></td><td style="color:var(--tx-2)">${b}</td></tr>`).join('')}
    </tbody></table>
  </div>
  <div class="exnav"><a href="#/rir"><span>Назад</span>Выбор веса</a>
    <a class="next" href="#/swaps"><span>Дальше</span>Если занято</a></div>
  <div style="height:24px"></div>`;
}

/* ---------------- экран: замены ---------------- */
function viewSwaps() {
  return `
  <div class="exhead"><div class="kicker">Тренажёр занят?</div><h1>Замены</h1></div>
  <div class="card accent"><p>${WORKOUT.swapNote}</p></div>
  <div class="tablewrap"><table>
    <thead><tr><th>Основной вариант</th><th>Замена №1</th><th>Замена №2</th></tr></thead>
    <tbody>${WORKOUT.swapTable.map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody>
  </table></div>
  <div class="section"><h2>Техника замен</h2>
    <div class="anchor-list">
      ${WORKOUT.exercises.map((e) => `<a href="#/ex/${e.id}">${e.name}<i>${e.swaps.length} замены</i></a>`).join('')}
    </div>
  </div>
  <div class="exnav"><a href="#/progression"><span>Назад</span>Прогрессия</a>
    <a class="next" href="#/tracker"><span>Дальше</span>Трекер</a></div>
  <div style="height:24px"></div>`;
}

/* ---------------- экран: трекер ---------------- */
function viewTracker() {
  const rows = WORKOUT.exercises.map((e) => {
    const L = logOf(e.id);
    const n = e.isTime ? 2 : 3;
    const cells = Array.from({ length: 3 }, (_, k) => k < n
      ? `<td><input type="text" inputmode="numeric" style="min-width:64px" value="${esc(L.s[k] || '')}"
           data-act="set" data-id="${e.id}" data-i="${k}" placeholder="${e.isTime ? 'сек' : '—'}"></td>`
      : '<td style="color:var(--tx-3)">—</td>').join('');
    return `<tr>
      <td><b>${e.name}</b></td>
      <td><input type="text" inputmode="decimal" style="min-width:70px" value="${esc(L.w || '')}"
        data-act="weight" data-id="${e.id}" placeholder="${e.isTime ? '—' : 'кг'}" ${e.isTime ? 'disabled' : ''}></td>
      ${cells}
      <td><input type="text" inputmode="numeric" style="min-width:52px" value="${esc(L.rir || '')}"
        data-act="rir" data-id="${e.id}" placeholder="2–3"></td>
    </tr>`;
  }).join('');

  return `
  <div class="exhead"><div class="kicker">Дневник</div><h1>Трекер тренировки</h1></div>
  <p style="color:var(--tx-2);margin-bottom:12px">Записывай сразу после подхода. Всё сохраняется в этом браузере —
  на следующей тренировке будет с чего начать.</p>
  <div class="tablewrap"><table>
    <thead><tr><th>Упражнение</th><th>Вес</th><th>П1</th><th>П2</th><th>П3</th><th>RIR</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  <div class="card"><h3>Комментарии по упражнениям</h3>
    ${WORKOUT.exercises.map((e) => `<div style="margin-bottom:10px">
      <label class="inline-lbl">${e.name}</label>
      <input type="text" value="${esc(logOf(e.id).note || '')}" data-act="note" data-id="${e.id}"
        placeholder="что чувствовал, что поправить">
    </div>`).join('')}
  </div>
  <button class="btn block" data-act="copy" style="margin-bottom:10px">Скопировать отчёт текстом</button>
  <button class="btn ghost block" data-act="reset">Очистить все записи</button>
  <div style="height:24px"></div>`;
}

function reportText() {
  const lines = [WORKOUT.title + ' · день ' + WORKOUT.day, ''];
  WORKOUT.exercises.forEach((e) => {
    const L = logOf(e.id);
    const sets = L.s.filter(Boolean).join(' / ') || '—';
    lines.push(`${e.name}: ${L.w ? L.w + ' кг · ' : ''}${sets}${L.rir ? ' · RIR ' + L.rir : ''}${L.note ? ' · ' + L.note : ''}`);
  });
  return lines.join('\n');
}

/* ---------------- экран: просто следуй ---------------- */
function viewQuick() {
  return `
  <div class="exhead"><div class="kicker">Один экран на всю тренировку</div><h1>Сегодня в зале — просто следуй этому</h1></div>
  <div class="checklist" style="margin-top:16px">
    ${WORKOUT.quick.map((q, i) => {
      const key = i === 0 ? 'warmup' : (i === WORKOUT.quick.length - 1 ? 'cooldown' : EX_IDS[i - 1]);
      return `<div class="check${S.done[key] ? ' on' : ''}" data-act="toggle" data-id="${key}">
        <div class="box">${ICON.check}</div>
        <div><div class="ctitle">${q[0]}</div>
          <div class="csub" style="margin-top:2px">${q[2]}</div></div>
        <div class="csub"><b style="color:var(--tx)">${q[1]}</b></div>
      </div>`;
    }).join('')}
  </div>
  <div class="card accent" style="margin-top:16px"><h3>Правило дня</h3>
    <p>Оставляй 2–3 повторения в запасе, не работай до отказа, не тестируй максимумы.
    Занято оборудование — сразу берёшь замену и идёшь дальше.</p>
  </div>
  <div class="exnav"><a href="#/"><span>Назад</span>Главная</a>
    <a class="next" href="#/tracker"><span>Дальше</span>Трекер</a></div>
  <div style="height:24px"></div>`;
}

/* ---------------- экран: вводные ---------------- */
function viewAbout() {
  return `
  <div class="exhead"><div class="kicker">Под кого составлена тренировка</div><h1>Мои вводные</h1></div>
  <div class="card"><table class="compact"><tbody>
    ${WORKOUT.athlete.map(([a, b]) => `<tr><td style="color:var(--tx-3);width:38%">${a}</td><td><b>${b}</b></td></tr>`).join('')}
  </tbody></table></div>
  <div class="card info"><h3>Почему план именно такой</h3>
    <ul class="ticks">${li([
      'Спина и плечи получают больше объёма — это работает на широкие плечи, сильную спину и подтягивания.',
      'Подтягивания стоят первыми и с малым числом повторений: свежими мышцами техника чище, а прогресс быстрее.',
      'Пресс и планка в конце — на плоский живот работает связка «нагрузка + питание», а не только скручивания.',
      'После недельной паузы объём умеренный, отказа нет: цель — вернуться в ритм без лишней болезненности.',
      'Face Pull и тяги уравновешивают жимы и поддерживают осанку.',
    ])}</ul>
  </div>
  <div class="exnav"><a href="#/"><span>Назад</span>Главная</a>
    <a class="next" href="#/safety"><span>Дальше</span>Безопасность</a></div>
  <div style="height:24px"></div>`;
}

/* ---------------- роутер ---------------- */
const TITLES = {
  '': ['Тренировка A', 'День 1'],
  'safety': ['Безопасность', 'Перед началом'],
  'warmup': ['Разминка', '8–10 минут'],
  'cooldown': ['Заминка', '5 минут'],
  'rir': ['Выбор веса', 'RIR 2–3'],
  'progression': ['Прогрессия', 'Как расти'],
  'swaps': ['Замены', 'Если занято'],
  'tracker': ['Трекер', 'Дневник'],
  'quick': ['Просто следуй', 'Вся тренировка'],
  'about': ['Мои вводные', 'Контекст'],
};

function route() {
  const h = (location.hash || '#/').replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  let html, title, sub;

  if (parts[0] === 'ex' && parts[1]) {
    const e = ex(parts[1]);
    html = viewExercise(parts[1]);
    title = e ? e.name : 'Упражнение';
    sub = e ? e.plan : '';
  } else {
    const k = parts[0] || '';
    const views = {
      '': viewHome, safety: viewSafety, warmup: viewWarmup, cooldown: viewCooldown,
      rir: viewRir, progression: viewProgression, swaps: viewSwaps,
      tracker: viewTracker, quick: viewQuick, about: viewAbout,
    };
    const v = views[k] || viewHome;
    html = v();
    const t = TITLES[k] || TITLES[''];
    title = t[0]; sub = t[1];
  }

  app.innerHTML = html;
  $('#tbTitle').innerHTML = `${title}<span class="tb-sub">${sub}</span>`;
  $('#backBtn').style.visibility = (parts.length ? 'visible' : 'hidden');
  window.scrollTo(0, 0);

  /* уважаем системную настройку «меньше движения» */
  const svg = $('.fig.anim svg'), btn = $('.fig.anim [data-act="anim"]');
  if (svg && svg.pauseAnimations && window.matchMedia &&
      matchMedia('(prefers-reduced-motion: reduce)').matches) {
    svg.pauseAnimations();
    if (btn) btn.textContent = 'Играть';
  }
}

/* ---------------- события ---------------- */
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;

  if (act === 'toggle') {
    S.done[t.dataset.id] = !S.done[t.dataset.id];
    save(); route();
  }
  if (act === 'rest') {
    startTimer(parseInt(t.dataset.sec, 10), t.dataset.label);
  }
  if (act === 'anim') {
    const svg = t.closest('figure').querySelector('svg');
    if (!svg || !svg.pauseAnimations) return;
    if (svg.animationsPaused()) { svg.unpauseAnimations(); t.textContent = 'Пауза'; }
    else { svg.pauseAnimations(); t.textContent = 'Играть'; }
  }
  if (act === 'yt') {
    const id = t.dataset.id;
    if (location.protocol === 'file:') {
      /* с локального файла YouTube отдаёт ошибку 153 — открываем в новой вкладке */
      window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener');
      return;
    }
    const box = document.createElement('div');
    box.className = 'ytframe';
    box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id +
      '?autoplay=1&rel=0&modestbranding=1" title="Видео с техникой" loading="lazy" ' +
      'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
      'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
    t.replaceWith(box);
  }
  if (act === 'timer-stop') stopTimer();
  if (act === 'timer-add') { timer.left += 30; timer.total += 30; if (!timer.id) startTimer(timer.left, timer.label); else paintTimer(); }
  if (act === 'theme') { S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); }
  if (act === 'back') { history.length > 1 ? history.back() : (location.hash = '#/'); }
  if (act === 'copy') {
    const txt = reportText();
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
      .then(() => { t.textContent = 'Скопировано ✓'; setTimeout(() => (t.textContent = 'Скопировать отчёт текстом'), 1600); })
      .catch(() => { window.prompt('Скопируй вручную:', txt); });
  }
  if (act === 'reset') {
    if (confirm('Очистить все записи и галочки?')) { S.log = {}; S.done = {}; save(); route(); }
  }
});

document.addEventListener('input', (ev) => {
  const t = ev.target.closest('[data-act]');
  if (!t) return;
  const id = t.dataset.id, L = logOf(id);
  switch (t.dataset.act) {
    case 'set': L.s[+t.dataset.i] = t.value; break;
    case 'setw': L.wArr = L.wArr || []; L.wArr[+t.dataset.i] = t.value; if (!L.w) L.w = t.value; break;
    case 'weight': L.w = t.value; break;
    case 'rir': L.rir = t.value; break;
    case 'note': L.note = t.value; break;
    default: return;
  }
  S.ts = new Date().toISOString();
  save();
});

window.addEventListener('hashchange', route);

/* ---------------- старт ---------------- */
applyTheme();
route();
