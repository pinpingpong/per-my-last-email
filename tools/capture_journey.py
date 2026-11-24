"""Capture a fixed set of phone-size screenshots of the game for docs/journey/<label>/.
Run at every release so stages can be compared side by side.

Usage (needs Playwright + Pillow, e.g. the portfolio's .venv-capture):
  python3 -m http.server 8765 &                     # serve this folder
  <venv>/bin/python tools/capture_journey.py http://127.0.0.1:8765 v1

Shots (skipped if the build doesn't have that screen yet):
  1-title, 2-act, 3-first-card, 4-midgame, 5-call, 6-ending, 7-minigame
"""
import asyncio, io, pathlib, sys
from playwright.async_api import async_playwright
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE, LABEL = sys.argv[1].rstrip("/"), sys.argv[2]
OUT = ROOT / "docs" / "journey" / LABEL
OUT.mkdir(parents=True, exist_ok=True)

NEXT = "() => { const b = document.querySelector('.choice') || document.getElementById('next') || document.getElementById('present'); if (b) b.click(); return !!b; }"

async def shot(page, name):
    png = await page.screenshot()
    Image.open(io.BytesIO(png)).convert("RGB").save(OUT / f"{name}.webp", "WEBP", quality=80)
    print("saved", LABEL, name)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, color_scheme="light")
        await page.goto(f"{BASE}/index.html")
        await page.evaluate("localStorage.clear()")
        await page.reload(); await page.wait_for_selector("#new")
        await shot(page, "1-title")
        await page.click("#new"); await page.wait_for_timeout(300)
        if await page.query_selector(".act"):
            await shot(page, "2-act"); await page.click("#next"); await page.wait_for_timeout(300)
        await shot(page, "3-first-card")
        got = set()
        for _ in range(400):
            hud = (await page.text_content(".week")) or ""
            if "mid" not in got and ("Week 5" in hud or "Week 6" in hud) and await page.query_selector(".choice"):
                await shot(page, "4-midgame"); got.add("mid")
            if "call" not in got and await page.query_selector("#present"):
                await shot(page, "5-call"); got.add("call")
            if await page.query_selector("#again"):
                await page.wait_for_timeout(300); await shot(page, "6-ending"); break
            if not await page.evaluate(NEXT): break
            await page.wait_for_timeout(25)
        if (ROOT / "src" / "minigames").exists() and BASE.startswith("http://127.0.0.1:8765"):
            await page.evaluate("""async () => { const m = await import('/src/minigames/toilet-dodge.js');
              const a = document.getElementById('app'); document.getElementById('hud').hidden = true;
              a.innerHTML = '<article class="card mg-card"></article>'; m.toiletDodge(a.firstElementChild); window.scrollTo(0,0); }""")
            await page.wait_for_timeout(2200); await shot(page, "7-minigame")
        await b.close()

asyncio.run(main())
