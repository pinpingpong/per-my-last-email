import * as E from './engine.js';
import { MINIGAMES } from './minigames/index.js';

const SAVE_KEY = 'celestial-save-v2';
const STAT_LABEL = { sanity: 'Sanity', performance: 'Performance', reputation: 'Reputation', allies: 'Allies', strikes: 'Marcus strikes' };
const ENDINGS_KEY = 'celestial-endings-v1';
const TYPE_LABEL = { written: 'Written · strong', witnessed: 'Witnessed · medium', recalled: 'Recalled · weak' };

let D; // loaded data
let S; // game state

const $ = (sel) => document.querySelector(sel);
const esc = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function getJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

// Single-file build (tools/build_single.py) injects window.__GAME_DATA__ and window.__ASSETS__.
const asset = (path) => (window.__ASSETS__ && window.__ASSETS__[path]) || path;

async function loadData() {
  if (window.__GAME_DATA__) {
    const g = window.__GAME_DATA__;
    D = { ...g, byId: new Map(g.events.map((e) => [e.id, e])) };
    return;
  }
  const [balance, endings, flavor, cast, index] = await Promise.all(
    ['balance', 'endings', 'flavor', 'cast', 'events/index'].map((p) => getJSON(`data/${p}.json`)),
  );
  const events = (await Promise.all(index.files.map((f) => getJSON(`data/events/${f}`)))).flat();
  D = { balance, endings, flavor, cast, events, byId: new Map(events.map((e) => [e.id, e])) };
}

// ---------- save ----------
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {}
}
function readSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}
function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

function foundEndings() {
  try { return JSON.parse(localStorage.getItem(ENDINGS_KEY)) || []; } catch { return []; }
}
function recordEnding(id) {
  try {
    const found = foundEndings();
    if (!found.includes(id)) localStorage.setItem(ENDINGS_KEY, JSON.stringify([...found, id]));
  } catch {}
}

// ---------- rendering helpers ----------
function screen(html) {
  const app = $('#app');
  app.innerHTML = html;
  app.focus();
  window.scrollTo(0, 0);
}

function renderHud() {
  const hud = $('#hud');
  if (!S) { hud.hidden = true; return; }
  hud.hidden = false;
  const bar = (k) => `
    <div class="stat stat-${k}">
      <span class="stat-label">${STAT_LABEL[k]}</span>
      <span class="meter"><span style="width:${S.stats[k]}%"></span></span>
      <span class="stat-val">${S.stats[k]}</span>
    </div>`;
  const act = (D.flavor.acts || []).find((a) => S.week >= a.from && S.week <= a.to);
  const week = {
    week: `Week ${S.week} / ${D.balance.weeks}${act ? ` · ${act.title.split(' · ')[1]}` : ''}`,
    case: 'Phone call · Derek',
    epilogue: 'Monday',
    ending: 'The end',
  }[S.phase];
  hud.innerHTML = `
    <div class="hud-top">
      <span class="week">${week}</span>
      <span class="allies">Allies: <b>${S.stats.allies}</b></span>
      <button class="link" id="open-evidence">Evidence (${S.evidence.length})</button>
    </div>
    <div class="stats">${bar('sanity')}${bar('performance')}${bar('reputation')}</div>
    ${S.flags.includes('knows-strikes') && !S.flags.includes('marcus-resigned') ? strikeMeter() : ''}`;
  $('#open-evidence').onclick = openEvidence;
}

function strikeMeter() {
  const limit = D.balance.marcus.strikeLimit;
  const n = Math.min(S.stats.strikes ?? 0, limit);
  const dots = Array.from({ length: limit }, (_, i) => `<span class="strike ${i < n ? 'on' : ''}"></span>`).join('');
  return `<div class="strikes" title="At ${limit}, Marcus resigns"><span class="stat-label">Marcus's strikes</span><span class="strike-dots">${dots}</span><span class="stat-val">${n}/${limit}</span></div>`;
}

function evidenceItem(e) {
  return `<span class="ev-label">${esc(e.label)}</span>
    <span class="ev-meta ev-${esc(e.type)}">${TYPE_LABEL[e.type] || esc(e.type)} · week ${e.week}</span>`;
}

function openEvidence() {
  const dlg = $('#evidence');
  const list = S.evidence.length
    ? `<ul class="ev-list">${S.evidence.map((e) => `<li>${evidenceItem(e)}</li>`).join('')}</ul>`
    : `<p class="muted">Empty. Your case is currently "trust me".</p>`;
  dlg.innerHTML = `<h2>Evidence log</h2>${list}
    <p class="muted small">Written beats witnessed beats recalled. When it counts, you'll only have time to tell ${D.balance.hr.maxEvidence} things.</p>
    <button class="btn" id="close-evidence">Close</button>`;
  $('#close-evidence').onclick = () => dlg.close();
  dlg.showModal();
}

function effectChips(c) {
  const chips = Object.entries(c.effects || {})
    .filter(([k, d]) => d && (k !== 'strikes' || S.flags.includes('knows-strikes')))
    .map(([k, d]) => `<span class="chip ${(k === 'strikes' ? -d : d) > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d} ${STAT_LABEL[k]}</span>`);
  if (c.addEvidence) chips.push(`<span class="chip ev">Evidence: ${esc(c.addEvidence.label)}</span>`);
  return chips.join('');
}

// ---------- screens ----------
function showTitle() {
  S = null;
  renderHud();
  const saved = readSave();
  screen(`
    <section class="title">
      <img class="hero" src="${asset('assets/title.svg')}" alt="Night skyline with the Celestial Pte Ltd tower">
      <p class="company">${esc(D.flavor.company)}</p>
      <p class="tagline">${esc(D.flavor.tagline)}</p>
      <h1>Per My Last Email</h1>
      <p class="pitch">Survive ${D.balance.weeks} weeks under a workplace bully. Keep receipts. Decide whether to speak up.</p>
      <div class="actions">
        ${saved && saved.phase !== 'ending' ? `<button class="btn primary" id="continue">Continue (week ${saved.week})</button>` : ''}
        <button class="btn ${saved && saved.phase !== 'ending' ? '' : 'primary'}" id="new">New game</button>
      </div>
      ${gallery()}
      <p class="muted small">A work of satire. All characters and companies are fictional.</p>
    </section>`);
  $('#new').onclick = () => { S = E.newGame(D.balance); save(); route(); };
  if ($('#continue')) $('#continue').onclick = () => { S = saved; route(); };
}

function gallery() {
  const ids = Object.keys(D.endings).filter((k) => !k.startsWith('_'));
  const found = foundEndings();
  if (!found.length) return '';
  const items = ids.map((id) => `<li class="${found.includes(id) ? 'got' : ''}">${found.includes(id) ? esc(D.endings[id].title) : '???'}</li>`).join('');
  return `<div class="gallery"><p class="card-meta">Endings found: ${found.filter((f) => ids.includes(f)).length} / ${ids.length}</p><ul>${items}</ul></div>`;
}

function route() {
  renderHud();
  if (S.phase === 'ending') return showEnding();
  if (S.phase === 'case') return showCase();
  if (S.hand === null) {
    E.drawWeek(S, D.events, D.balance);
    save();
  }
  const act = (D.flavor.acts || []).find((a) => a.from === S.week);
  if (S.phase === 'week' && act && S.handIndex === 0 && S.actShown !== act.from) return showAct(act);
  if (S.hand.length === 0) return showQuietWeek();
  if (S.handIndex < S.hand.length) return showCard();
  return showWeekEnd();
}

function sceneBanner(scene = 'office', speakers = []) {
  const portraits = speakers
    .filter((id) => D.cast[id])
    .map((id) => `<img class="portrait" src="${asset(`assets/portraits/${id}.svg`)}" alt="${esc(D.cast[id].name)}">`)
    .join('');
  return `<div class="scene">
    <img class="scene-bg" src="${asset(`assets/scenes/${scene}.svg`)}" alt="">
    ${portraits ? `<div class="portraits">${portraits}</div>` : ''}
  </div>`;
}

function speakerLine(ev) {
  const p = ev.speaker && D.cast[ev.speaker];
  return p ? `<p class="from"><b>${esc(p.name)}</b> · ${esc(p.title)}</p>` : '';
}

function showCard() {
  const ev = D.byId.get(S.hand[S.handIndex]);
  screen(`
    <article class="card has-scene">
      ${sceneBanner(ev.scene, ev.speaker ? [ev.speaker] : [])}
      <p class="card-meta">${S.phase === 'epilogue' ? 'Monday' : `Week ${S.week}`} · ${S.handIndex + 1} of ${S.hand.length}</p>
      ${speakerLine(ev)}
      <p class="card-text">${esc(E.eventText(ev, S))}</p>
      <div class="choices">
        ${ev.choices.map((c, i) => `<button class="btn choice" data-i="${i}">${esc(c.label)}</button>`).join('')}
      </div>
    </article>`);
  document.querySelectorAll('.choice').forEach((b) => {
    b.onclick = async () => {
      const i = Number(b.dataset.i);
      const mg = ev.choices[i].minigame;
      let won;
      if (mg && MINIGAMES[mg.id]) {
        const app = $('#app');
        app.innerHTML = '<article class="card mg-card"></article>';
        ({ won } = await MINIGAMES[mg.id](app.firstElementChild));
      }
      const c = E.applyChoice(S, ev, i, D.balance, { won });
      save();
      renderHud();
      if (S.phase === 'case') showCase();
      else showResult(c);
    };
  });
}

function showResult(c) {
  const notice = S.notice === 'marcusResigned'
    ? `<p class="notice">${esc(D.flavor.marcusResignedNotice)}</p>`
    : '';
  S.notice = null;
  save();
  screen(`
    <article class="card result">
      <p class="card-meta">You chose: ${esc(c.label)}</p>
      <p class="card-text">${esc(c.result)}</p>
      <div class="chips">${effectChips(c)}</div>
      ${notice}
      <button class="btn primary" id="next">Continue</button>
    </article>`);
  $('#next').onclick = route;
}

function showAct(act) {
  const [num, name] = act.title.split(' · ');
  screen(`
    <section class="act">
      <p class="card-meta">${esc(num)} · Weeks ${act.from}-${act.to}</p>
      <h2>${esc(name)}</h2>
      <button class="btn primary" id="next">Begin</button>
    </section>`);
  $('#next').onclick = () => { S.actShown = act.from; save(); route(); };
}

function showQuietWeek() {
  screen(`
    <article class="card">
      <p class="card-meta">Week ${S.week}</p>
      <p class="card-text">${esc(pick(D.flavor.quietWeek))}</p>
      <button class="btn primary" id="next">Next week</button>
    </article>`);
  $('#next').onclick = nextWeek;
}

function showWeekEnd() {
  if (S.phase === 'epilogue') {
    screen(`
      <article class="card">
        <p class="card-meta">Monday, 3:12pm</p>
        <p class="card-text">${esc(D.flavor.epilogueEnd)}</p>
        <button class="btn primary" id="next">See how it ends</button>
      </article>`);
    $('#next').onclick = nextWeek;
    return;
  }
  const msg = pick(D.flavor.slack);
  screen(`
    <article class="card weekend">
      <p class="card-meta">End of week ${S.week}</p>
      <div class="slack">
        <p class="slack-from"><b>${esc(msg.from)}</b> <span class="muted">in #${esc(msg.channel)}</span></p>
        <p>${esc(msg.text)}</p>
      </div>
      <button class="btn primary" id="next">${S.week >= D.balance.weeks ? 'Monday morning' : 'Next week'}</button>
    </article>`);
  $('#next').onclick = nextWeek;
}

function nextWeek() {
  E.endWeek(S, D.balance);
  save();
  route();
}

// The confirmation call: pick what you tell Derek. Opened by a choice with opensCase.
function showCase() {
  const max = D.balance.hr.maxEvidence;
  const best = new Set(E.bestPick(S, D.balance));
  const items = S.evidence.length
    ? S.evidence.map((e) => `
        <li><label class="ev-pick">
          <input type="checkbox" value="${esc(e.id)}" ${best.has(e.id) ? 'checked' : ''}>
          <span>${evidenceItem(e)}</span>
        </label></li>`).join('')
    : `<li class="muted">You kept nothing. No notes, no dates. Just "trust me".</li>`;
  const close = S.flags.includes('favourite')
    ? `<p class="muted small">Derek thinks you and Veronica are close. Coming from you, this will land hard.</p>`
    : '';
  screen(`
    <article class="card hr has-scene">
      ${sceneBanner('office', ['manager'])}
      <p class="card-meta">Phone call · Derek</p>
      <p class="card-text">${esc(D.flavor.hrIntro)}</p>
      <p><b>Pick up to ${max} things to tell him.</b> ${S.stats.allies} ${S.stats.allies === 1 ? 'colleague is' : 'colleagues are'} willing to back you up.</p>
      ${close}
      <ul class="ev-list">${items}</ul>
      <button class="btn primary" id="present">Tell Derek</button>
    </article>`);
  const boxes = [...document.querySelectorAll('.ev-pick input')];
  const sync = () => {
    const n = boxes.filter((b) => b.checked).length;
    boxes.forEach((b) => { b.disabled = !b.checked && n >= max; });
  };
  boxes.forEach((b) => (b.onchange = sync));
  sync();
  $('#present').onclick = () => {
    const { event, choice } = S.pending;
    E.submitCase(S, boxes.filter((b) => b.checked).map((b) => b.value), D.balance);
    save();
    renderHud();
    showResult(D.byId.get(event).choices[choice]);
  };
}

function showEnding() {
  const end = D.endings[S.ending];
  recordEnding(S.ending);
  const sc = S.score && S.ending !== 'marcusResigned'
    ? `<p class="score">Your account: evidence ${S.score.evidence} + allies ${S.score.allies} + reputation ${S.score.reputation}${S.score.favourite ? ` + "her favourite" ${S.score.favourite}` : ''} = <b>${S.score.total}</b></p>`
    : '';
  screen(`
    <article class="card ending ending-${esc(S.ending)} has-scene">
      ${sceneBanner(end.scene)}
      <p class="card-meta">Ending</p>
      <h2>${esc(end.title)}</h2>
      <p class="card-text">${esc(end.text)}</p>
      ${E.endingLines(S, D.endings._lines).map((t) => `<p class="card-text">${esc(t)}</p>`).join('')}
      ${sc}
      <button class="btn primary" id="again">Play again</button>
    </article>`);
  $('#again').onclick = () => { clearSave(); showTitle(); };
}

loadData()
  .then(showTitle)
  .catch((err) => {
    screen(`<p class="card">Could not load game data (${esc(err.message)}). Serve this folder over HTTP, e.g. <code>python3 -m http.server</code>.</p>`);
  });
