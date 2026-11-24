# Per My Last Email

A satirical office survival game. Survive 12 weeks under a workplace bully at Celestial Pte Ltd, keep receipts, and decide whether to speak up.

**Play it:** https://per-my-last-email-sigma.vercel.app (desktop or phone, about 15 minutes per run)

All characters and companies are fictional.

## What's in it (v1)
- 49 story events across 4 acts, with 8 endings and an endings gallery
- Stats (sanity, performance, reputation, allies), an evidence log, and a hidden "Marcus's strikes" meter
- Escape to Nebula: a top-down stealth minigame
- Hand-written SVG art, no image assets or APIs

## How it's built
- `src/engine.js`: pure game logic, no DOM, shared by the browser and the Node tools
- `src/ui.js`, `src/styles.css`: vanilla JS UI, no framework
- `src/minigames/`: plug-in minigames (`play(root) -> Promise<{ won }>`)
- `data/`: all content as JSON (events, endings, cast, balance)
- `tools/validate.mjs`: content checks (runs before every build)
- `tools/simulate.mjs`: plays thousands of runs per playstyle to tune balance
- `tools/build_single.py`: inlines everything into one offline HTML file

```sh
python3 -m http.server 8765        # play from source at http://127.0.0.1:8765
node tools/validate.mjs            # check content
node tools/simulate.mjs 2000       # balance report
python3 tools/build_single.py      # build dist/
```

Design notes, story structure and roadmap: [GAME.md](GAME.md).

Built with Claude Code.
