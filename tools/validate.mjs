// Content validator. Run before every build: node tools/validate.mjs
// Checks every event file in data/events/ (loaded or not) against the schema in GAME.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const cast = rd('data/cast.json');
const endings = rd('data/endings.json');
const balance = rd('data/balance.json');
const loaded = new Set(rd('data/events/index.json').files);
const files = fs.readdirSync(path.join(ROOT, 'data/events')).filter((f) => f.endsWith('.json') && f !== 'index.json' && !f.startsWith('_'));

const MINIGAME_IDS = new Set([...fs.readFileSync(path.join(ROOT, 'src/minigames/index.js'), 'utf8').matchAll(/'([a-z-]+)':/g)].map((m) => m[1]));
const STAT_KEYS = new Set(Object.keys(balance.start));
const EV_TYPES = new Set(['written', 'witnessed', 'recalled']);
const ENGINE_FLAGS = new Set(['exposed', 'marcus-resigned']); // set by the engine, not by choices
const errors = [], warnings = [];
const all = [];
for (const f of files) for (const e of rd(`data/events/${f}`)) all.push({ ...e, _file: f });

const ids = new Map();
const setFlags = new Set(ENGINE_FLAGS);
for (const e of all) for (const c of e.choices || []) (c.setFlags || []).forEach((x) => setFlags.add(x));

for (const e of all) {
  const at = `${e._file}:${e.id}`;
  if (ids.has(e.id)) errors.push(`${at} duplicate id (also in ${ids.get(e.id)})`);
  ids.set(e.id, e._file);
  if (!e.text) errors.push(`${at} missing text`);
  if (e.speaker && !cast[e.speaker]) errors.push(`${at} unknown speaker '${e.speaker}'`);
  if (e.speaker && !exists(`assets/portraits/${e.speaker}.svg`)) errors.push(`${at} no portrait for '${e.speaker}'`);
  if (!exists(`assets/scenes/${e.scene || 'office'}.svg`)) errors.push(`${at} unknown scene '${e.scene}'`);
  if (!Array.isArray(e.weeks) || e.weeks.length !== 2) errors.push(`${at} weeks must be [min, max]`);
  for (const fl of e.requires?.flags || []) if (!setFlags.has(fl)) errors.push(`${at} requires flag '${fl}' that nothing sets`);
  for (const v of e.variants || []) for (const fl of v.if?.flags || []) if (!setFlags.has(fl)) errors.push(`${at} variant flag '${fl}' that nothing sets`);
  const n = (e.choices || []).length;
  if (n < 1 || n > 4) errors.push(`${at} has ${n} choices (1-4 allowed)`);
  if (n === 1 && e.weight !== 0 && !e.always && !e.epilogue) warnings.push(`${at} single-choice card outside a story chain`);
  if (e.text && e.text.split(/\s+/).length > 80) warnings.push(`${at} text is ${e.text.split(/\s+/).length} words (aim <= 60)`);
  (e.choices || []).forEach((c, i) => {
    const ca = `${at}#${i}`;
    if (!c.label || (!c.result && !c.minigame)) errors.push(`${ca} needs label and result`);
    for (const k of Object.keys(c.effects || {})) if (!STAT_KEYS.has(k)) errors.push(`${ca} unknown effect '${k}'`);
    if (c.addEvidence && !EV_TYPES.has(c.addEvidence.type)) errors.push(`${ca} bad evidence type '${c.addEvidence.type}'`);
    if (c.endsGame && !endings[c.endsGame]) errors.push(`${ca} endsGame '${c.endsGame}' is not an ending`);
    if (c.minigame) {
      if (!MINIGAME_IDS.has(c.minigame.id)) errors.push(`${ca} unknown minigame '${c.minigame.id}'`);
      for (const b of ['win', 'lose']) if (!c.minigame[b]?.result) errors.push(`${ca} minigame.${b} needs a result`);
    }
    if (c.next && !all.some((x) => x.id === c.next)) errors.push(`${ca} next '${c.next}' does not exist`);
  });
}
for (const [k, v] of Object.entries(endings)) {
  if (k.startsWith('_')) continue;
  if (!v.title || !v.text) errors.push(`endings.${k} needs title and text`);
  if (v.scene && !exists(`assets/scenes/${v.scene}.svg`)) errors.push(`endings.${k} unknown scene '${v.scene}'`);
}
const unloaded = files.filter((f) => !loaded.has(f));
console.log(`${all.length} events in ${files.length} files (${unloaded.length ? 'not loaded: ' + unloaded.join(', ') : 'all loaded'})`);
warnings.forEach((w) => console.log('WARN ', w));
errors.forEach((e) => console.log('ERROR', e));
console.log(errors.length ? `${errors.length} error(s)` : 'OK');
process.exit(errors.length ? 1 : 0);
