// Pure game logic. No DOM. Shared by the browser UI and tools/simulate.mjs (Node).
// All functions mutate and/or return the plain-object game state, so it can be
// saved to localStorage as JSON.
//
// Phases: week -> (case, opened mid-week by a choice with opensCase) -> week ... ->
// after week 12: epilogue (only if exposed) -> ending.

export const STATS = ['sanity', 'performance', 'reputation', 'allies'];

export function newGame(balance) {
  return {
    week: 1,
    phase: 'week', // week | case | epilogue | ending
    stats: { ...balance.start },
    evidence: [],
    flags: [],
    seen: [],
    queue: [], // event ids forced into next draw (choice.next)
    hand: null, // event ids drawn for the current week; null = not drawn yet
    handIndex: 0,
    history: [],
    pending: null, // { event, choice } waiting on the case picker
    notice: null, // one-off message for the UI (e.g. Marcus resigned)
    score: null, // case score, set when you tell Derek (or at season end)
    outcome: null,
    ending: null,
  };
}

const weightOf = (ev) => ev.weight ?? 1;
const hasAll = (s, flags = []) => flags.every((f) => s.flags.includes(f));

// Event text, overridden by the first variant whose flags all match.
export function eventText(ev, s) {
  for (const v of ev.variants || []) if (hasAll(s, v.if?.flags)) return v.text;
  return ev.text;
}

export function isEligible(ev, s) {
  const [lo, hi] = ev.weeks || [1, Infinity];
  if (s.week < lo || s.week > hi) return false;
  if (ev.once !== false && s.seen.includes(ev.id)) return false;
  const r = ev.requires || {};
  if (!hasAll(s, r.flags)) return false;
  if (r.notFlags && r.notFlags.some((f) => s.flags.includes(f))) return false;
  // Once Marcus resigns, nothing that needs him can happen.
  if (s.flags.includes('marcus-resigned') && (r.flags || []).includes('marcus-joined')) return false;
  if (r.stats) {
    for (const [k, [min, max]] of Object.entries(r.stats)) {
      if (s.stats[k] < min || s.stats[k] > max) return false;
    }
  }
  return true;
}

// Draw this week's cards: queued follow-ups first, then story beats, then weighted picks.
export function drawWeek(s, events, balance, rng = Math.random) {
  if (s.phase === 'epilogue') {
    s.hand = events.filter((e) => e.epilogue && isEligible(e, s)).map((e) => e.id);
    s.handIndex = 0;
    return s.hand;
  }
  const byId = new Map(events.map((e) => [e.id, e]));
  const [minN, maxN] = balance.eventsPerWeek;
  const n = minN + Math.floor(rng() * (maxN - minN + 1));
  const hand = [];
  const leftover = [];
  for (const id of s.queue) {
    const ev = byId.get(id);
    if (!ev || (ev.once !== false && s.seen.includes(id)) || hand.includes(id)) continue;
    if (hand.length < n) hand.push(id);
    else leftover.push(id);
  }
  // weight 0 = only reachable via choice.next (story chain), never drawn randomly.
  const pool = events.filter(
    (e) => !e.epilogue && !hand.includes(e.id) && isEligible(e, s) && (e.always || weightOf(e) > 0),
  );
  // Story beats (always: true) jump the queue whenever eligible.
  for (const ev of pool.filter((e) => e.always).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    hand.push(ev.id);
    pool.splice(pool.indexOf(ev), 1);
  }
  while (hand.length < n && pool.length) {
    let r = rng() * pool.reduce((t, e) => t + weightOf(e), 0);
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= weightOf(pool[i]);
      if (r < 0) break;
    }
    hand.push(pool[i].id);
    pool.splice(i, 1);
  }
  s.queue = leftover;
  s.hand = hand;
  s.handIndex = 0;
  return hand;
}

// A minigame choice: base choice merged with its win or lose branch.
export function resolveChoice(c, won) {
  if (!c.minigame) return c;
  const branch = won ? c.minigame.win : c.minigame.lose;
  const effects = { ...(c.effects || {}) };
  for (const [k, d] of Object.entries(branch.effects || {})) effects[k] = (effects[k] || 0) + d;
  return { ...c, ...branch, label: c.label, effects, minigame: undefined };
}

export function applyChoice(s, ev, idx, balance, opts = {}) {
  const c = resolveChoice(ev.choices[idx], opts.won);
  for (const [k, d] of Object.entries(c.effects || {})) {
    const v = (s.stats[k] ?? 0) + d;
    s.stats[k] = k === 'allies' || k === 'strikes' ? Math.max(0, v) : Math.max(0, Math.min(100, v));
  }
  if (c.addEvidence && !s.evidence.some((e) => e.id === c.addEvidence.id)) {
    s.evidence.push({ ...c.addEvidence, week: s.week });
  }
  if (c.removeEvidence) s.evidence = s.evidence.filter((e) => !c.removeEvidence.includes(e.id));
  for (const f of c.setFlags || []) if (!s.flags.includes(f)) s.flags.push(f);
  if (c.clearFlags) s.flags = s.flags.filter((f) => !c.clearFlags.includes(f));
  if (c.next) s.queue.push(c.next);
  if (!s.seen.includes(ev.id)) s.seen.push(ev.id);
  s.history.push({ week: s.week, event: ev.id, choice: idx });
  s.handIndex++;

  const limit = balance?.marcus?.strikeLimit;
  if (limit && (s.stats.strikes ?? 0) >= limit && !s.flags.includes('marcus-resigned')) {
    s.flags.push('marcus-resigned');
    s.notice = 'marcusResigned';
  }
  if (c.opensCase) {
    s.phase = 'case';
    s.pending = { event: ev.id, choice: idx };
  }
  if (c.endsGame) end(s, c.endsGame);
  else if (s.stats.sanity <= 0) end(s, 'burnout');
  else if (s.stats.performance <= 0) end(s, 'managedOut');
  return c;
}

function end(s, ending) {
  s.phase = 'ending';
  s.ending = ending;
}

export function caseScore(s, pickedIds, balance) {
  const hr = balance.hr;
  const picked = s.evidence.filter((e) => pickedIds.includes(e.id)).slice(0, hr.maxEvidence);
  const evidence = picked.reduce((t, e) => t + e.strength, 0);
  const allies = s.stats.allies * hr.allyWeight;
  const reputation = s.stats.reputation >= hr.reputationBonus.above ? hr.reputationBonus.bonus : 0;
  // Derek thought you were close to her, so your account carries extra weight.
  const favourite = s.flags.includes('favourite') && s.flags.includes('testified') ? hr.favouriteBonus || 0 : 0;
  return { evidence, allies, reputation, favourite, total: evidence + allies + reputation + favourite };
}

// The call with Derek: what you tell him is stored; the outcome lands after week 12.
export function submitCase(s, pickedIds, balance) {
  s.score = caseScore(s, pickedIds, balance);
  s.phase = 'week';
  s.pending = null;
  return s.score;
}

export function outcomeFor(total, balance) {
  const t = balance.hr.thresholds;
  return total >= t.exposed ? 'exposed' : total >= t.gracefulExit ? 'gracefulExit' : 'failingUpward';
}

function finishSeason(s, balance) {
  if (s.flags.includes('marcus-resigned')) return end(s, 'marcusResigned');
  if (!s.score) s.score = caseScore(s, [], balance); // you never told Derek anything
  s.outcome = outcomeFor(s.score.total, balance);
  // You tipped her off at the sinks: she resigns before Monday's meeting can happen.
  if (s.outcome !== 'failingUpward' && s.flags.includes('leaked')) s.outcome = 'sheResigned';
  if (s.outcome !== 'exposed') return end(s, s.outcome);
  s.flags.push('exposed');
  s.phase = 'epilogue';
  s.hand = null;
  s.handIndex = 0;
}

export function endWeek(s, balance) {
  if (s.phase === 'ending') return;
  if (s.phase === 'epilogue') return end(s, s.outcome);
  s.week++;
  s.hand = null;
  s.handIndex = 0;
  if (s.week > balance.weeks) finishSeason(s, balance);
}

// Extra ending sentences that depend on what happened (endings._lines).
export function endingLines(s, lines = []) {
  return lines
    .filter((l) => hasAll(s, l.if?.flags))
    .filter((l) => !(l.notFlags || []).some((f) => s.flags.includes(f)))
    .filter((l) => !l.onlyEndings || l.onlyEndings.includes(s.ending))
    .map((l) => l.text);
}

// Strongest evidence ids, for simulations and as a UI hint.
export function bestPick(s, balance) {
  return [...s.evidence]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, balance.hr.maxEvidence)
    .map((e) => e.id);
}
