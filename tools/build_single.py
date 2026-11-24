"""Build dist/per-my-last-email.html: one self-contained file (data, art, JS, CSS inlined).
Opens by double-click (file://), no server needed. Run: python3 tools/build_single.py
"""
import base64, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
if subprocess.run(["node", str(ROOT / "tools/validate.mjs")]).returncode:
    sys.exit("Validation failed, build aborted.")
read = lambda p: (ROOT / p).read_text(encoding="utf-8")
load = lambda p: json.loads(read(p))

events = []
for f in load("data/events/index.json")["files"]:
    events += load(f"data/events/{f}")
data = {k: load(f"data/{k}.json") for k in ["balance", "endings", "flavor", "cast"]}
data["events"] = events

assets = {}
for svg in sorted((ROOT / "assets").rglob("*.svg")):
    rel = svg.relative_to(ROOT).as_posix()
    assets[rel] = "data:image/svg+xml;base64," + base64.b64encode(svg.read_bytes()).decode()

engine = read("src/engine.js")
names = re.findall(r"^export (?:function|const) (\w+)", engine, flags=re.M)
engine = re.sub(r"^export ", "", engine, flags=re.M)
# Plain modules (minigames): strip import lines and export keywords, inline in order.
MODULES = ["src/minigames/toilet-dodge.js", "src/minigames/index.js"]
strip = lambda src: re.sub(r"^export ", "", re.sub(r"^import .*?;\n", "", src, flags=re.M), flags=re.M)
modules = "\n".join(strip(read(m)) for m in MODULES)
ui = read("src/ui.js").replace("import * as E from './engine.js';", "const E = { " + ", ".join(names) + " };")
ui = re.sub(r"^import .*?;\n", "", ui, flags=re.M)

html = read("index.html")
html = html.replace('<link rel="stylesheet" href="src/styles.css">', "<style>\n" + read("src/styles.css") + "\n</style>")
boot = (
    "<script>window.__GAME_DATA__ = " + json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    + ";\nwindow.__ASSETS__ = " + json.dumps(assets) + ";</script>\n"
    + '<script type="module">\n' + engine + "\n" + modules + "\n" + ui.replace("</script", "<\\/script") + "\n</script>"
)
html = html.replace('<script type="module" src="src/ui.js"></script>', boot)

out = ROOT / "dist" / "per-my-last-email.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"{out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB, {len(events)} events, {len(assets)} images")
