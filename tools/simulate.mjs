// Balance simulator. Plays N runs per policy through the real engine.
// Usage: node tools/simulate.mjs [runs=2000]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = await import(path.join(ROOT, 'src/engine.js'));
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', p), 'utf8'));
const balance = rd('balance.json');
const events = rd('events/index.json').files.flatMap((f) => rd(`events/${f}`));
const byId = new Map(events.map((e) => [e.id, e]));
const RUNS = Number(process.argv[2] || 2000);

const score = (c, w) =>
  (c.addEvidence?.strength ?? 0) * w.ev +
  (c.effects?.allies ?? 0) * w.allies -
  (c.effects?.strikes ?? 0) * w.strikes +
  (c.effects?.sanity ?? 0) * w.sanity +
  (c.effects?.performance ?? 0) * w.perf +
  (c.opensCase ? 50 : 0) * w.speak;
const greedy = (w) => (ev) => {
  let best = 0, top = -Infinity;
  ev.choices.forEach((c, i) => { const v = score(c, w); if (v > top) { top = v; best = i; } });
  return best;
};
const POLICIES = {
  random: (ev) => Math.floor(Math.random() * ev.choices.length),
  smart: greedy({ ev: 2, allies: 3, strikes: 2, sanity: 0.1, perf: 0.05, speak: 1 }),
  selfCare: greedy({ ev: 0, allies: 0, strikes: 0, sanity: 1, perf: 0.5, speak: 0 }),
};

for (const [name, policy] of Object.entries(POLICIES)) {
  const endings = {}; let cards = 0, strikes = 0, totals = [];
  for (let r = 0; r < RUNS; r++) {
    const s = E.newGame(balance);
    while (s.phase !== 'ending') {
      if (s.hand === null) E.drawWeek(s, events, balance);
      while (s.handIndex < s.hand.length && s.phase !== 'ending') {
        const ev = byId.get(s.hand[s.handIndex]);
        E.applyChoice(s, ev, policy(ev), balance, { won: Math.random() < 0.5 });
        cards++;
        if (s.phase === 'case') E.submitCase(s, E.bestPick(s, balance), balance);
      }
      E.endWeek(s, balance);
    }
    endings[s.ending] = (endings[s.ending] || 0) + 1;
    strikes += s.stats.strikes ?? 0;
    if (s.score) totals.push(s.score.total);
  }
  const pct = Object.fromEntries(Object.entries(endings).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, `${Math.round((v / RUNS) * 100)}%`]));
  totals.sort((a, b) => a - b);
  console.log(name.padEnd(9), JSON.stringify(pct), `| cards ${(cards / RUNS).toFixed(1)} | strikes ${(strikes / RUNS).toFixed(1)} | case median ${totals[totals.length >> 1] ?? '-'}`);
}
