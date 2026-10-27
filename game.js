(function () {
  var cv = document.getElementById("tennis");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var W = 640, H = 320, GROUND = 270, NET_X = 320, NET_TOP = 190, G = 900, R = 10, WIN = 7;
  var scale = 1;

  function fit() {
    var r = cv.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.width * (H / W) * dpr);
    scale = cv.width / W;
  }
  window.addEventListener("resize", fit);
  fit();

  var heads = {};
  ["a", "b"].forEach(function (k) {
    var im = new Image();
    im.src = "img/head-" + k + ".jpg";
    heads[k] = im;
  });

  var el = {
    score: document.getElementById("tt-score"),
    touches: document.getElementById("tt-touches"),
    overlay: document.getElementById("tt-overlay"),
    title: document.getElementById("tt-title"),
    msg: document.getElementById("tt-msg"),
    picks: document.getElementById("tt-picks"),
    again: document.getElementById("tt-again"),
    join: document.getElementById("tt-join")
  };

  var me = { x: 150, side: 1, head: "a", kit: "mag", touches: 0, kick: 0 };
  var cpu = { x: 490, side: -1, head: null, kit: "kersh", touches: 0, kick: 0, react: 0, plan: null };
  var ball = { x: 150, y: 90, vx: 0, vy: 0, last: null, bounces: 0, side: 1 };
  var score = { me: 0, cpu: 0 };
  var state = "menu", pause = 0, keys = {}, running = false, lastT = 0;

  function sideOf(x) { return x < NET_X ? 1 : -1; }

  function serve(server) {
    ball.x = server === "me" ? me.x : cpu.x;
    ball.y = 90; ball.vx = 0; ball.vy = 0;
    ball.last = null; ball.bounces = 0; ball.side = sideOf(ball.x);
    me.touches = 0; cpu.touches = 0;
    updateHud();
  }

  function updateHud() {
    el.score.textContent = score.me + " : " + score.cpu;
    var t = ball.last === "me" ? me.touches : 0;
    el.touches.textContent = "Touches " + t + " of 3";
  }

  function point(winner, why) {
    if (winner === "me") score.me++; else score.cpu++;
    updateHud();
    if (score.me >= WIN || score.cpu >= WIN) {
      state = "over";
      var won = score.me >= WIN;
      el.title.textContent = won ? "Full time. You win." : "Kersh FC take this one.";
      el.msg.textContent = (won ? "Final score " : "Final score ") + score.me + " to " + score.cpu + ". " +
        (won ? "That's the Magnesium way. Come and do it on a Sunday." : "Run it back, or come and play us for real on a Sunday.");
      el.picks.hidden = true;
      el.again.hidden = false;
      el.join.hidden = false;
      el.overlay.hidden = false;
      return;
    }
    state = "pause"; pause = 0.9;
    el.touches.textContent = why;
    ball.freeze = true;
    ball.next = winner;
  }

  function hit(p) {
    var dir = p.side === 1 ? 1 : -1;
    var ahead = Math.max(-20, Math.min(40, (ball.x - p.x) * dir));
    ball.vy = -430 - Math.random() * 30;
    ball.vx = dir * (190 + ahead * 3.5);
    ball.last = p === me ? "me" : "cpu";
    ball.bounces = 0;
    p.touches++;
    p.kick = 0.18;
    if (p.touches > 3) point(p === me ? "cpu" : "me", p === me ? "Four touches. Point to Kersh FC" : "Kersh FC took four touches. Your point");
    else updateHud();
  }

  function reach(p) {
    var cx = p.x, cy = GROUND - 40;
    var dx = ball.x - cx, dy = ball.y - cy;
    return Math.abs(dx) < 46 && dy > -62 && dy < 48;
  }

  function landing(b) {
    var a = 0.5 * G, bb = b.vy, c = b.y - (GROUND - R);
    var disc = bb * bb - 4 * a * c;
    if (disc < 0) return b.x;
    var t = (-bb + Math.sqrt(disc)) / (2 * a);
    return b.x + b.vx * t;
  }

  function step(dt) {
    if (state === "pause") {
      pause -= dt;
      if (pause <= 0) { state = "play"; ball.freeze = false; serve(ball.next); }
      return;
    }
    if (state !== "play") return;

    var sp = 250;
    if (keys.left) me.x -= sp * dt;
    if (keys.right) me.x += sp * dt;
    me.x = Math.max(34, Math.min(NET_X - 34, me.x));
    if (keys.kick && me.kickLock <= 0 && reach(me)) { hit(me); me.kickLock = 0.25; }
    me.kickLock = Math.max(0, (me.kickLock || 0) - dt);
    if (keys.kick && !reach(me) && me.kick <= 0) me.kick = 0.18;

    if (state !== "play") return;

    var target = cpu.x;
    var onMine = ball.x > NET_X || (ball.vx > 0 && ball.last === "me");
    if (onMine) {
      var lx = landing(ball);
      target = Math.max(NET_X + 34, Math.min(W - 34, lx + 22));
    } else {
      target = 500;
    }
    var d = target - cpu.x, cs = 190;
    if (Math.abs(d) > 4) cpu.x += Math.sign(d) * Math.min(Math.abs(d), cs * dt);
    cpu.x = Math.max(NET_X + 34, Math.min(W - 34, cpu.x));
    cpu.react -= dt;
    if (cpu.react <= 0 && reach(cpu) && ball.vy > -50) {
      cpu.react = 0.3;
      if (Math.random() > 0.14) hit(cpu);
    }

    if (state !== "play") return;

    ball.vy += G * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    var s = sideOf(ball.x);
    if (s !== ball.side) { ball.side = s; ball.bounces = 0; me.touches = 0; cpu.touches = 0; updateHud(); }

    if (Math.abs(ball.x - NET_X) < R + 3 && ball.y > NET_TOP) {
      point(ball.last === "me" ? "cpu" : "me", "Into the net");
      return;
    }
    if (ball.x < R || ball.x > W - R) {
      var who = ball.last;
      if (who) point(who === "me" ? "cpu" : "me", "Out of bounds");
      else { ball.vx = -ball.vx; ball.x = Math.max(R, Math.min(W - R, ball.x)); }
      return;
    }
    if (ball.y >= GROUND - R) {
      ball.y = GROUND - R;
      ball.bounces++;
      if (ball.bounces >= 2 || !ball.last) {
        var loserIsMe = sideOf(ball.x) === 1;
        point(loserIsMe ? "cpu" : "me", loserIsMe ? "Two bounces. Point to Kersh FC" : "Two bounces. Your point");
        return;
      }
      ball.vy = -Math.abs(ball.vy) * 0.62;
      ball.vx *= 0.8;
    }
  }

  function body(p, mag) {
    var x = p.x, top = GROUND - 66;
    ctx.fillStyle = "rgba(0,0,0,.2)";
    ctx.beginPath(); ctx.ellipse(x, GROUND + 2, 24, 5, 0, 0, 7); ctx.fill();
    var legSwing = p.kick > 0 ? 14 : 0;
    ctx.fillStyle = "#e8d3bf";
    ctx.fillRect(x - 11, GROUND - 22, 7, 20);
    ctx.save();
    ctx.translate(x + 4, GROUND - 22);
    ctx.rotate((p.side === 1 ? -1 : 1) * legSwing * 0.07);
    ctx.fillRect(0, 0, 7, 20);
    ctx.restore();
    ctx.fillStyle = "#fff"; ctx.fillRect(x - 12, GROUND - 6, 9, 6); ctx.fillRect(x + 3, GROUND - 6, 9, 6);
    ctx.fillStyle = mag ? "#fff" : "#f2c14e"; ctx.fillRect(x - 13, GROUND - 32, 26, 12);
    if (mag) {
      ctx.fillStyle = "#c8102e"; ctx.fillRect(x - 13, top + 16, 26, 20);
      ctx.fillStyle = "#141414";
      ctx.fillRect(x - 8, top + 16, 5, 20); ctx.fillRect(x + 3, top + 16, 5, 20);
    } else {
      ctx.fillStyle = "#1f7a4d"; ctx.fillRect(x - 13, top + 16, 26, 20);
      ctx.fillStyle = "#f2c14e"; ctx.fillRect(x - 13, top + 24, 26, 4);
    }
  }

  function head(p) {
    var x = p.x, y = GROUND - 66 + 4, r = 15;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
    var im = p.head && heads[p.head];
    if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x - r, y - r, r * 2, r * 2);
    else { ctx.fillStyle = "#d9a27c"; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = "#2b2b2b"; ctx.fillRect(x - r, y - r, r * 2, 8); }
    ctx.restore();
    ctx.strokeStyle = "#141414"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  }

  function draw() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#8fc4ea"; ctx.fillRect(0, 0, W, GROUND);
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.beginPath(); ctx.ellipse(110, 60, 38, 10, 0, 0, 7); ctx.ellipse(130, 54, 26, 9, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(500, 90, 44, 11, 0, 0, 7); ctx.fill();
    for (var i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? "#459a51" : "#3f8f4a"; ctx.fillRect(i * 80, GROUND, 80, H - GROUND); }
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(0, GROUND, W, 2);

    ctx.fillStyle = "#141414"; ctx.fillRect(NET_X - 3, NET_TOP, 6, GROUND - NET_TOP);
    ctx.strokeStyle = "rgba(244,244,242,.75)"; ctx.lineWidth = 1;
    for (var y = NET_TOP + 12; y < GROUND; y += 14) { ctx.beginPath(); ctx.moveTo(NET_X - 10, y); ctx.lineTo(NET_X + 10, y); ctx.stroke(); }
    ctx.fillStyle = "#c8102e"; ctx.fillRect(NET_X - 12, NET_TOP - 4, 24, 6);

    body(cpu, false); head(cpu);
    body(me, true); head(me);

    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath(); ctx.ellipse(ball.x, GROUND + 1, R * (1 - Math.min(0.6, (GROUND - ball.y) / 500)), 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#141414"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#141414"; ctx.beginPath(); ctx.arc(ball.x, ball.y, 3.5, 0, 7); ctx.fill();

    if (state === "menu" || state === "over") { ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(0, 0, W, H); }
  }

  function loop(t) {
    if (!running) return;
    var dt = Math.min(0.033, (t - lastT) / 1000 || 0);
    lastT = t;
    me.kick = Math.max(0, me.kick - dt); cpu.kick = Math.max(0, cpu.kick - dt);
    step(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function startRun() { if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(loop); } }

  new IntersectionObserver(function (e) {
    if (e[0].isIntersecting) startRun(); else running = false;
  }, { threshold: 0.1 }).observe(cv);

  function begin(headKey) {
    me.head = headKey; me.x = 150; cpu.x = 490;
    score.me = 0; score.cpu = 0;
    me.kickLock = 0;
    el.overlay.hidden = true;
    state = "play";
    serve("me");
    cv.focus({ preventScroll: true });
  }

  el.picks.addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-head]");
    if (b) begin(b.getAttribute("data-head"));
  });
  el.again.addEventListener("click", function () { begin(me.head); });

  var map = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", " ": "kick", ArrowUp: "kick", w: "kick", W: "kick" };
  function inGame() { return state === "play" || state === "pause"; }
  window.addEventListener("keydown", function (e) {
    var k = map[e.key];
    if (k && inGame() && (document.activeElement === cv || document.activeElement === document.body)) { keys[k] = true; e.preventDefault(); }
  });
  window.addEventListener("keyup", function (e) { var k = map[e.key]; if (k) keys[k] = false; });

  document.querySelectorAll("[data-ctl]").forEach(function (b) {
    var k = b.getAttribute("data-ctl");
    function on(e) { e.preventDefault(); keys[k] = true; }
    function off() { keys[k] = false; }
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off);
    b.addEventListener("pointerleave", off);
    b.addEventListener("pointercancel", off);
  });

  serve("me");
  draw();
})();
