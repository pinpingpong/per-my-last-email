// Minigame: Escape to Nebula.
// Veronica is coming to collect you for a toilet trip. Reach meeting room Nebula
// (top left) before she sees you. Her sight cone is blocked by desks and pillars.
// Contract shared by all minigames: play(root) -> Promise<{ won: boolean }>.

export function toiletDodge(root) {
  return new Promise((resolve) => {
    const W = 360, H = 480, TIME = 30;
    root.innerHTML = `
      <div class="mg">
        <p class="card-meta">Minigame · Escape to Nebula</p>
        <p class="mg-help">Reach <b>Nebula</b> (top left) before Veronica sees you. Hide behind desks and pillars. Arrow keys / WASD, or the pad.</p>
        <canvas class="mg-canvas" width="${W}" height="${H}"></canvas>
        <div class="mg-pad">
          <button data-k="up" aria-label="Up">▲</button>
          <button data-k="left" aria-label="Left">◀</button>
          <button data-k="down" aria-label="Down">▼</button>
          <button data-k="right" aria-label="Right">▶</button>
        </div>
        <p class="mg-status" aria-live="polite"></p>
        <button class="btn" id="mg-skip">Skip (she finds you)</button>
      </div>`;
    const cv = root.querySelector('canvas');
    const g = cv.getContext('2d');
    const status = root.querySelector('.mg-status');

    const goal = { x: 0, y: 0, w: 110, h: 84 };
    const walls = [
      { x: 150, y: 50, w: 150, h: 24, kind: 'desk' },
      { x: 40, y: 150, w: 110, h: 24, kind: 'desk' }, { x: 210, y: 150, w: 110, h: 24, kind: 'desk' },
      { x: 40, y: 240, w: 110, h: 24, kind: 'desk' }, { x: 210, y: 240, w: 110, h: 24, kind: 'desk' },
      { x: 40, y: 330, w: 110, h: 24, kind: 'desk' }, { x: 210, y: 330, w: 110, h: 24, kind: 'desk' },
      { x: 166, y: 196, w: 26, h: 26, kind: 'pillar' }, { x: 166, y: 286, w: 26, h: 26, kind: 'pillar' },
      { x: 320, y: 410, w: 26, h: 26, kind: 'plant' }, { x: 120, y: 0, w: 14, h: 84, kind: 'wall' },
    ];
    const path = [[180, 207], [340, 207], [340, 120], [180, 120], [180, 207], [180, 297], [180, 387], [340, 387], [340, 297], [180, 297]];
    const P = { x: 300, y: 455, r: 9 };
    const V = { x: 180, y: 207, r: 11, dir: 0, i: 1, speed: 1.05, range: 135, fov: Math.PI / 2.6 };
    const keys = {};
    const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    const start = performance.now();
    let raf = 0, done = false;

    const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    const blocked = (x, y) => x < 0 || y < 0 || x > W || y > H || walls.some((w) => inRect(x, y, w));
    const hitsWall = (x, y, r) => walls.some((w) => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) || x < r || y < r || x > W - r || y > H - r;
    const castRay = (a) => {
      for (let d = 0; d < V.range; d += 4) if (blocked(V.x + Math.cos(a) * d, V.y + Math.sin(a) * d)) return d;
      return V.range;
    };
    const sees = () => {
      const dx = P.x - V.x, dy = P.y - V.y, dist = Math.hypot(dx, dy);
      if (dist > V.range) return false;
      let diff = Math.atan2(dy, dx) - V.dir;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) > V.fov / 2) return false;
      return castRay(Math.atan2(dy, dx)) >= dist - P.r;
    };

    const onKey = (down) => (e) => { const k = KEYMAP[e.code]; if (k) { keys[k] = down; e.preventDefault(); } };
    const kd = onKey(true), ku = onKey(false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    root.querySelectorAll('.mg-pad button').forEach((b) => {
      const k = b.dataset.k;
      const on = (e) => { keys[k] = true; e.preventDefault(); };
      const off = () => { keys[k] = false; };
      b.addEventListener('pointerdown', on);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, off));
    });

    function finish(won, msg) {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      status.textContent = msg;
      status.className = `mg-status ${won ? 'won' : 'lost'}`;
      draw(won ? null : true);
      setTimeout(() => resolve({ won }), 1400);
    }
    root.querySelector('#mg-skip').onclick = () => finish(false, 'You stay at your desk. "Come, toilet."');

    function step() {
      const sp = 2.1;
      const mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const my = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      const norm = mx && my ? Math.SQRT1_2 : 1;
      if (!hitsWall(P.x + mx * sp * norm, P.y, P.r)) P.x += mx * sp * norm;
      if (!hitsWall(P.x, P.y + my * sp * norm, P.r)) P.y += my * sp * norm;

      const [tx, ty] = path[V.i];
      const dx = tx - V.x, dy = ty - V.y, d = Math.hypot(dx, dy);
      if (d < 2) V.i = (V.i + 1) % path.length;
      else {
        const want = Math.atan2(dy, dx);
        let diff = Math.atan2(Math.sin(want - V.dir), Math.cos(want - V.dir));
        V.dir += Math.max(-0.12, Math.min(0.12, diff));
        V.x += (dx / d) * V.speed;
        V.y += (dy / d) * V.speed;
      }
    }

    function draw(caught) {
      g.fillStyle = '#e9e2d4'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#a5d8ff'; g.fillRect(goal.x, goal.y, goal.w, goal.h);
      g.fillStyle = '#1864ab'; g.font = 'bold 13px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText('NEBULA', goal.x + goal.w / 2, goal.y + goal.h / 2 + 4);
      // sight cone, clipped by obstacles
      g.beginPath(); g.moveTo(V.x, V.y);
      for (let i = 0; i <= 24; i++) {
        const a = V.dir - V.fov / 2 + (V.fov * i) / 24, r = castRay(a);
        g.lineTo(V.x + Math.cos(a) * r, V.y + Math.sin(a) * r);
      }
      g.closePath(); g.fillStyle = caught ? 'rgba(224,49,49,0.45)' : 'rgba(224,49,49,0.22)'; g.fill();
      for (const w of walls) {
        g.fillStyle = { desk: '#a07850', pillar: '#868e96', plant: '#40c057', wall: '#495057' }[w.kind];
        g.fillRect(w.x, w.y, w.w, w.h);
      }
      g.fillStyle = '#3b5bdb'; g.beginPath(); g.arc(P.x, P.y, P.r, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 9px system-ui'; g.fillText('YOU', P.x, P.y + 3);
      g.fillStyle = '#c92a2a'; g.beginPath(); g.arc(V.x, V.y, V.r, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.fillText('V', V.x, V.y + 3);
      const left = Math.max(0, TIME - (performance.now() - start) / 1000);
      g.fillStyle = '#212529'; g.font = 'bold 14px ui-monospace, monospace'; g.textAlign = 'right';
      g.fillText(`${left.toFixed(1)}s`, W - 8, 20);
    }

    function loop() {
      step();
      draw(false);
      if (inRect(P.x, P.y, goal)) return finish(true, 'You slip into Nebula and lock the door. She walks right past. Freedom (for 30 minutes).');
      if (sees()) return finish(false, '"THERE you are. Come, toilet."');
      if ((performance.now() - start) / 1000 > TIME) return finish(false, 'Too slow. She finds you hiding behind the printer.');
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  });
}
