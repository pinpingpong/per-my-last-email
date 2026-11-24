# Per My Last Email (working title)

Satirical office survival sim. Survive 12 weeks under a workplace bully, build a paper trail, and get her exposed at the HR investigation.

## Privacy rule (read first)
Inspired by real events, but **everything in this repo is fiction**. No real names, company, industry, team, job titles or memorable incidents. Every agent writes generic, archetypal office situations only. The owner may add details later, only where they identify no one.

## Pillars
1. **Satire.** Dry corporate absurdity: jargon, calendar invites, "circling back", mandatory fun, town halls. Funny first.
2. **Real advice underneath.** Choices that work in-game work in real life: dated written follow-ups, saving threads, witnesses, HR process.
3. **Short runs.** About 15 min per run, replayable for different endings.
4. **Game first, reality second.** Real events are inspiration, not a script. Compress timelines, merge people, exaggerate and invent freely when it makes a better beat. Only the privacy rule is fixed.
5. **Any player.** Player is a nameless "you", second person, no gender or role specifics.

## Setting
- Company: **Celestial Pte Ltd** (fictional), floor 23, open plan. Tagline: "Reaching for the stars, one escalation at a time." Keep it a generic tech company, never banking/fintech.
- Bully: **Veronica Sharpe**, "Head of Strategic Alignment". Takes credit, cuts people out, gaslights in 1:1s, rewrites history in meetings.
- Team: Data & Analytics (you are a junior analyst).
- Cast (archetypes): the manager who avoids conflict, the ally who whispers support but won't go on record, the intern who sees everything, the HRBP who says "let's take this offline", the IT guy who knows where the logs are.

## Story structure (bystander arc)
You are a junior analyst in the **Data & Analytics** team at Celestial. Veronica controls *you* (9:47pm calls, dinners and drives home, 'come, toilet', hourly status trackers) and bullies **Marcus**, a new Lead who reports to Derek like she does. The core question: do you stay a bystander or become a witness?

Fixed spine (`always: true`, one week each; satire events fill the gaps at random):
- **Act 1 · The Favourite (W1-3):** W1 onboarding. W2 Marcus joins, stakeholder screaming call. W3 WFH jibe, stats ritual.
- **Act 2 · The Target (W4-6):** W4 leave escalation, Veronica promoted. W5 Gordon's reply (chain), clear-the-air, divide-and-conquer. W6 Derek draws the line, stats handover to Marcus.
- **Act 3 · The Meeting (W7-9):** W7 the scolding (late 6pm update). W8 guilt pact. W9 Jordan's dinner with Derek.
- **Act 4 · The Call (W10-12):** W10 Derek's confirmation call (climax). W11 the dig. Monday epilogue if exposed.
Marcus-support events (lobby warning, secret vent, review buddy) are random within W5-11.

True ending: Veronica on garden leave, then out. Marcus becomes your manager and the best-liked lead on the floor.

Running gags: everyone misnames the company (Celestia, Celestical); Gordon's "What is the bigger problem?"; the CEO's "the lift goes down as well as up".

## Roadmap (future expansions)
- **Current public build = "v1 · Early Access"** (keep the v1 label; it's on the live site and portfolio).
- **v2 = "proper game" release (agreed 2026-11-25).** Done when:
  1. First-run tutorial; 'Come, toilet' fixed in week 1 so every player meets Escape to Nebula.
  2. 2-3 minigames (Lift Escape, Evidence Snap) + Minigames button on the title screen.
  3. Real trade-offs: helping Marcus costs you sanity/performance; smart policy Exposed < ~70%.
  4. Game feel: sound effects, card animations, Veronica portrait reactions.
  5. 5-10 human playtesters + feedback pass.
  6. Portfolio upgrade: "Balancing with simulation" section + ending-distribution chart (before/after tuning), "Game" type label, "Play the game" button, "How I built it with AI" section.
- **v3 "RPG-lite" (idea 2026-11-25):** one walkable top-down map of floor 23 (desk, pantry, Nebula, toilets, lift) between events; walk to an NPC to trigger their card, cards become dialogue. Seed: `src/minigames/toilet-dodge.js` (movement, collision, sight cone). Likely move to Phaser 3 + Tiled maps; art via Kenney / paid pixel packs. Reuse all story data, flags, endings, validator, simulator.
- **v4 full RPG (only if v3 is fun):** day cycle 9am-6pm (+9:47pm calls), Veronica roams with a live sight cone, evidence as inventory items, per-character trust instead of one allies number.
- **Season 2: "After Veronica"** (`data/events/season2.json`, not in `index.json` yet): Marcus is the manager, the team thrives, and company-level absurdity takes over: return-to-office mandate ('Have you considered living closer?'), reorg, layoffs, resignations, the group chat outliving the company.
- Office politics: alliances, credit wars, skip-level lunches.
- Performance review season: calibration meetings, bell curve, rating negotiations.
- Reorg: new org chart every quarter, team renamed, reporting lines shuffled.
- Layoffs: town hall bombshell, survivor guilt, "right-sizing" bingo.
- **Playable roles (v2):** pick who you play at the start. Same 12 weeks, different event pool and win conditions:
  - Bystander (v1, current): stay silent or become the witness.
  - Marcus (the target): survive, protect your family arrangement, keep your job.
  - Jordan (the peer): the dinner with Derek is your big choice.
  - Derek (the boss): spot the pattern early or wait for the dinner. Decide when to act.
  - Melissa (HR): run a fair investigation under politics and pressure.
  - Veronica (villain run, satire): keep control without getting caught. Spoiler: you get caught.
  Engine change needed: `role` chosen on the title screen; events get an optional `roles` array; `isEligible` filters on it; endings per role.
Each expansion = new event file in `data/events/` + optional new scenes. No engine change needed unless a new mechanic is added.

## Core loop
- 12 in-game weeks. Each week: 2-3 event cards drawn from the pool (weighted, filtered by week and conditions).
- Each card: situation text + 2-4 choices. A choice changes stats, may add evidence, allies or flags, and may queue a follow-up card.
- End of each week: short summary (stats + 1 sarcastic Slack-style message).
- Week 12 (or earlier on trigger): HR investigation meeting, then ending.

## Stats (0-100, start values in `data/balance.json`)
| Stat | Meaning | Fail state |
|---|---|---|
| sanity | Mental health | 0 = Burnout ending |
| performance | How your work is rated | 0 = Managed Out ending |
| reputation | How the team sees you | Affects ally recruitment and HR credibility |
| allies | Count of colleagues willing to go on record | No fail, feeds HR case |

| strikes (hidden) | Marcus's patience. Veronica's attacks on him add, your support removes | 10 = Marcus resigns, true ending lost (engine TODO) |

Evidence is not a number. It is a list of items (see below).

## Evidence log (core mechanic)
Each item: `{ id, label, type, strength }`.
- `written` (strength 3): dated email, saved Slack thread, meeting notes sent after the meeting.
- `witnessed` (strength 2): something a named ally saw.
- `recalled` (strength 1): "I remember she said...".
Some choices downgrade or destroy evidence (e.g. deleting angry drafts is fine, ranting on a public channel costs reputation and taints evidence).

## Climax: Sunday night + Monday meeting
You are not in the room, and you send nothing. The climax is Derek's confirmation call: you tell him your point of view. The evidence log = what you can tell him with confidence (written = exact dates and words, recalled = 'I think she said...'). If `favourite`, Derek thought you were close to her, so your account gets `hr.favouriteBonus`. Monday: Derek, Gordon and HR meet Veronica; the outcome is decided by your account. Exposed -> week 13 epilogue cards (`epilogue: true`): smear campaign, farewell 1:1 (if favourite), then ending.

## HR scoring
- Player picks up to 5 evidence items to present.
- `case = sum(strength of picked items) + allies * ally_weight + reputation_bonus`.
- Thresholds in `data/balance.json` decide the ending.

## Endings
1. **Exposed** (true ending): garden leave Monday, Marcus becomes manager. Week-13 epilogue first.
2. **Pre-emptive Strike**: you leaked to her at the sinks and the case is decent: she resigns Friday and spins it on LinkedIn.
3. **The Graceful Exit**: case too weak for action, you resign with sanity intact.
4. **Failing Upward**: case weak, she gets promoted.
5. **Strike Ten**: Marcus hits 10 strikes and resigns.
6. **The Lift Goes Down**: you accept an outside offer mid-season (`endsGame`).
7. **Burnout** / **Managed Out**: sanity or performance hits 0.
Every ending gets extra lines from `endings._lines` by flags (Kai left/stayed, testified as favourite, denied, group chat, Marcus's strikes).

## Tech
- Vanilla JS + Canvas/DOM, no framework, no backend. Static deploy on Vercel.
- Save in localStorage (try/catch, game works without it).
- Mobile first, works at 320px.
- Art: flat SVG drawn in code. Portraits 120x120 circle (`assets/portraits/`), scenes 600x240 (`assets/scenes/`), title skyline `assets/title.svg`. No emoji inside SVG text.

## Folder ownership (for parallel agents)
| Owner | Path | Rule |
|---|---|---|
| Main (engine + UI) | `src/`, `index.html` | Only owner of code |
| Writer agent | `data/events/*.json`, `data/cast.json`, `data/endings.json`, `data/flavor.json` | Data only, must match schema below. Register new event files in `data/events/index.json` |
| Systems agent | `data/balance.json`, `tools/simulate.js` | Balance numbers + simulation script |
| Art agent | `assets/` | SVG only |

## Event schema
See `data/events/_example.json` (reference only, not loaded). Engine: `src/engine.js` (pure, importable from Node). Fields:
- `id` string, unique, kebab-case.
- `weeks` [min, max] when it can appear.
- `weight` number, draw probability.
- `once` bool, default true.
- `requires` optional: `{ "flags": [], "notFlags": [], "stats": { "sanity": [min, max] } }`.
- `speaker` optional cast id (portrait at `assets/portraits/<id>.svg`).
- `scene` optional backdrop id (`assets/scenes/<id>.svg`), default `office`. Available: office, townhall, nebula, pantry, escape, garden.
- `text` string, second person, max ~60 words.
- `choices` 2-4 items:
  - `label` max ~8 words.
  - `result` text shown after picking, max ~40 words, the joke usually lands here.
  - `effects` `{ sanity, performance, reputation, allies }` deltas (omit zeros).
  - `addEvidence` optional `{ id, label, type, strength }`.
  - `removeEvidence` optional array of evidence ids (tainted or deleted evidence).
  - `setFlags` / `clearFlags` optional string arrays.
  - `next` optional event id to queue next week.

## Writer agent brief
Write about 40 events across 12 weeks in `data/events/week-XX.json` (array per file). Mix: ~60% bully incidents, ~20% general office satire, ~20% ally/evidence opportunities. Every incident needs at least one "smart" choice (document, follow up in writing, get a witness) and one "satisfying but bad" choice. Fiction only, see privacy rule.

## Systems agent brief
Set start stats, ally_weight, thresholds in `data/balance.json`. Write `tools/simulate.js` (Node) that plays 1,000 runs with random and "smart" policies. Targets: random policy reaches Exposed <15% of runs; smart policy >60%; Burnout reachable but not common (<25% random).

## Build status
Playtest loop 2026-11-24 (5 rounds): fixed spine with `order`, secret-vent (10 strikes reveal) moved to W5, Friday kaya-toast beat W12, PIP event makes Managed Out reachable, Marcus strike meter (shown once `knows-strikes`), endings gallery on title screen, `tools/validate.mjs` (runs automatically before every build), minigame system + first minigame `toilet-dodge` (choice 4 on toilet-buddy).

## Scaling a proper game: how to add things
- **Event:** add to a file in `data/events/`, run `node tools/validate.mjs`.
- **Season/expansion:** new file in `data/events/`, add to `index.json`. Acts in `flavor.acts`.
- **Minigame:** `src/minigames/<name>.js` exporting `play(root) -> Promise<{won}>`, register in `src/minigames/index.js`, add to `MODULES` in `tools/build_single.py`, attach to a choice with `minigame: {id, win:{result, effects}, lose:{...}}`.
- **Ending:** add to `data/endings.json` (+ `endsGame` on a choice or logic in `finishSeason`). Extra flavour via `_lines`.
- **Balance:** `node tools/simulate.mjs 2000` (random / smart / selfCare policies).
- **Ship:** `python3 tools/build_single.py` -> `dist/per-my-last-email.html` (offline file) + `dist/web/index.html`; deploy: `cd dist/web && vercel deploy --prod` -> https://per-my-last-email-sigma.vercel.app

Done 2026-11-24: strikes + Strike Ten, epilogue phase, call-as-climax (`opensCase`), `variants`, favourite bonus, `endsGame`, ending lines, `tools/simulate.mjs`.
Open: conditional result text (4), minigames (5), Managed Out never reached in sims (performance never hits 0).

## Build phase TODO (original list)
1. `strikes` >= `balance.marcus.strikeLimit` -> Marcus resigns -> `marcusResigned` ending (or Exposed variant without Marcus).
2. Epilogue phase: after resolveHR, if exposed set flag `exposed`, play week-13 `epilogue` events, then ending.
3. Climax flow: choice with `opensCase: true` (confirmation-call) opens the evidence picker as 'what you tell Derek' and stores the score; outcome resolves after week 12. UI copy: meta line -> 'Phone call · Derek', button -> 'Tell Derek'. Add `favouriteBonus` to caseScore.
3b. Event `variants`: [{if: {flags}, text}] overrides text when flags match (used by confirmation-call).
4. Conditional result text (e.g. `favourite` makes confirmation call and the-dig harder).
5. Minigames: toilet-dodge, lift-escape (hooks: toilet-buddy, lift-callback, lobby-warning).
6. Balance pass (smart policy too strong).
