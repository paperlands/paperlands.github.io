(function () {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ---------------- shared helpers ---------------- */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* value noise, cheap & smooth */
  function hash2(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function smooth(t) {
    return t * t * (3 - 2 * t);
  }
  function vnoise(x, y) {
    var xi = Math.floor(x),
      yi = Math.floor(y);
    var xf = x - xi,
      yf = y - yi;
    var a = hash2(xi, yi),
      b = hash2(xi + 1, yi);
    var c = hash2(xi, yi + 1),
      d = hash2(xi + 1, yi + 1);
    var u = smooth(xf),
      v = smooth(yf);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }
  function fbm(x, y) {
    return (
      vnoise(x, y) * 0.6 +
      vnoise(x * 2.1, y * 2.1) * 0.28 +
      vnoise(x * 4.3, y * 4.3) * 0.12
    );
  }

  /* ================= MAIN SKY ================= */
  var sky = document.getElementById("sky");
  if (!sky) return;
  var ctx = sky.getContext("2d");
  var W = 0,
    H = 0,
    DPR = 1;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.6);
    W = window.innerWidth;
    H = window.innerHeight;
    sky.width = Math.floor(W * DPR);
    sky.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  var PHOS = "240,168,61";
  var EMBER = "217,111,55";
  var GOLD = "241,219,164";

  /* ---------------- terrain (amber wireframe horizon) ---------------- */
  var ROWS = 26,
    COLS = 56;
  function terrainY(c, r, t) {
    /* world coords */
    var nx = c * 0.16,
      ny = r * 0.22 + t * 0.05;
    var h = fbm(nx, ny);
    /* ridge accent */
    h += Math.max(0, Math.sin(c * 0.35 + r * 0.5 + t * 0.2)) * 0.18;
    return h;
  }
  function drawTerrain(t) {
    var horizon = H * 0.6;
    var depth = H * 0.46;
    ctx.lineWidth = 1;
    var r, c;
    for (r = 0; r < ROWS; r++) {
      var fz = r / (ROWS - 1); /* 0 far, 1 near */
      var y0 = horizon + Math.pow(fz, 1.6) * depth;
      var amp = lerp(6, 60, Math.pow(fz, 1.4));
      var spread = lerp(0.62, 1.25, fz); /* perspective widening */
      var alpha = lerp(0.05, 0.34, Math.pow(fz, 1.2));
      ctx.strokeStyle = "rgba(" + PHOS + "," + alpha.toFixed(3) + ")";
      ctx.beginPath();
      for (c = 0; c <= COLS; c++) {
        var u = c / COLS - 0.5;
        var x = W * 0.5 + u * W * spread;
        var y = y0 - terrainY(c, r, t) * amp;
        if (c === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    /* sparse verticals for the mesh feel */
    ctx.strokeStyle = "rgba(" + PHOS + ",0.07)";
    for (c = 0; c <= COLS; c += 4) {
      ctx.beginPath();
      for (r = 0; r < ROWS; r++) {
        var fz2 = r / (ROWS - 1);
        var y02 = horizon + Math.pow(fz2, 1.6) * depth;
        var amp2 = lerp(6, 60, Math.pow(fz2, 1.4));
        var spread2 = lerp(0.62, 1.25, fz2);
        var u2 = c / COLS - 0.5;
        var x2 = W * 0.5 + u2 * W * spread2;
        var y2 = y02 - terrainY(c, r, t) * amp2;
        if (r === 0) ctx.moveTo(x2, y2);
        else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }
    /* horizon glow */
    var g = ctx.createLinearGradient(0, horizon - 70, 0, horizon + 90);
    g.addColorStop(0, "rgba(" + EMBER + ",0)");
    g.addColorStop(0.55, "rgba(" + EMBER + ",0.06)");
    g.addColorStop(1, "rgba(" + EMBER + ",0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon - 70, W, 160);
  }

  /* ---------------- arcing trace lines (chart-sky, image 1) ---------------- */
  function drawTraces(t) {
    ctx.strokeStyle = "rgba(" + GOLD + ",0.13)";
    ctx.lineWidth = 1;
    var i;
    for (i = 0; i < 3; i++) {
      var ph = t * 0.04 + i * 2.1;
      ctx.beginPath();
      var s;
      for (s = 0; s <= 80; s++) {
        var u = s / 80;
        var x = u * W;
        var y =
          H * 0.22 +
          i * H * 0.07 +
          Math.sin(u * 3.0 + ph) * H * 0.035 +
          fbm(u * 3 + i * 7, t * 0.03) * H * 0.05;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  /* ---------------- fireflies ---------------- */
  var flies = [];
  var NFLIES = 34;
  (function () {
    for (var i = 0; i < NFLIES; i++) {
      flies.push({
        x: Math.random(),
        y: 0.25 + Math.random() * 0.7,
        ph: Math.random() * Math.PI * 2,
        sp: 0.4 + Math.random() * 0.8,
        r: 1 + Math.random() * 1.8,
      });
    }
  })();
  function drawFlies(t) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      var x = (f.x + Math.sin(t * 0.05 * f.sp + f.ph) * 0.012) * W;
      var y = (f.y + Math.cos(t * 0.04 * f.sp + f.ph * 1.3) * 0.015) * H;
      var blink = 0.5 + 0.5 * Math.sin(t * 1.4 * f.sp + f.ph * 3);
      blink = Math.pow(blink, 3);
      if (blink < 0.04) continue;
      var rad = f.r * (2.2 + blink * 3.2);
      var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(" + GOLD + "," + (0.55 * blink).toFixed(3) + ")");
      g.addColorStop(
        0.4,
        "rgba(" + PHOS + "," + (0.22 * blink).toFixed(3) + ")",
      );
      g.addColorStop(1, "rgba(" + PHOS + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------------- one pair, in fellowship ----------------
     The swarm is gone. A single ember-dim couple remains,
     drawn from multi-line character frames (a zoetrope of
     three wing states), drifting low across the screen —
     and only when the footer, their field, has come into
     view. Frames are pre-rendered once; flight is two
     drawImage calls and a thread.                          */

  var FRAMES_A = [
    ["(  \\,/  )", " \\_ | _/ ", " (_/ \\_) "],
    [" ( \\Y/ ) ", " \\_+|+_/ ", "  {_/\\_} "],
    ["  )\\|/(  ", "  \\_|_/  ", "  {/'\\}  "],
  ];
  var FRAMES_B = [
    ["( o \\,/ o )", " \\__ | __/ ", "  {_/'\\_}  "],
    ["  ( \\Y/ )  ", "  \\_<|>_/  ", "   (_/\\_)  "],
    ["   )\\|/(   ", "   \\_I_/   ", "    (/\\)   "],
  ];
  var FLAP_SEQ = [0, 1, 2, 1]; /* ping-pong zoetrope */
  var SPR = 2;

  function makeSpriteML(linesArr, px, color, glowAlpha) {
    var cv = document.createElement("canvas");
    var c = cv.getContext("2d");
    c.font = px + 'px "IBM Plex Mono", monospace';
    var maxw = 0;
    for (var i = 0; i < linesArr.length; i++) {
      maxw = Math.max(maxw, c.measureText(linesArr[i]).width);
    }
    var lh = px * 1.1;
    var w = Math.ceil(maxw) + 12;
    var h = Math.ceil(lh * linesArr.length) + 12;
    cv.width = w * SPR;
    cv.height = h * SPR;
    c.setTransform(SPR, 0, 0, SPR, 0, 0);
    c.font = px + 'px "IBM Plex Mono", monospace';
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.shadowColor = "rgba(" + EMBER + "," + glowAlpha + ")";
    c.shadowBlur = px * 0.35;
    c.fillStyle = color;
    for (var j = 0; j < linesArr.length; j++) {
      c.fillText(linesArr[j], w / 2, 6 + lh * (j + 0.5));
    }
    return { cv: cv, w: w, h: h };
  }

  /* ---------------- the path, and the projection ----------------
     Simplicity: the leader flies one smooth analytic curve —
     a steady drift across the screen, a gentle breathing in y,
     a slow sine in z (depth). The companion flies the *same
     path, a few seconds behind*. Fellowship as a shared road.

     Depth is pure projection: z scales the sprite and its
     brightness. No steering noise, no shear, no banking —
     nothing that can jitter. Every coordinate is a smooth
     function of time.                                          */

  var DRIFT = 0.013; /* screen-widths per second */
  var LAG = 3.4; /* seconds the companion is behind */
  var SIZE_A = 9,
    SIZE_B = 8;

  function pathPoint(tt) {
    return {
      x: ((tt * DRIFT) % 1.2) - 0.1,
      y: 0.87 + 0.03 * Math.sin(tt * 0.23) + 0.012 * Math.sin(tt * 0.61),
      z: Math.sin(tt * 0.17) /* -1 far .. +1 near */,
    };
  }
  function persp(z) {
    return lerp(0.78, 1.22, (z + 1) / 2);
  }
  function depthAlpha(z) {
    return lerp(0.6, 1, (z + 1) / 2);
  }

  var fellowship = {
    flapSp: 2.6,
    framesA: null,
    framesB: null,
    trailA: [],
    trailB: [],
    trailT: 0,
    lastAx: -1,
    lastBx: -1,
  };
  var TRAIL_LEN = 7;

  function buildSprites() {
    fellowship.framesA = [];
    fellowship.framesB = [];
    for (var f = 0; f < 3; f++) {
      fellowship.framesA.push(
        makeSpriteML(FRAMES_A[f], SIZE_A, "rgba(" + EMBER + ",0.55)", "0.5"),
      );
      fellowship.framesB.push(
        makeSpriteML(FRAMES_B[f], SIZE_B, "rgba(" + EMBER + ",0.45)", "0.4"),
      );
    }
  }
  buildSprites();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(buildSprites);
  }

  /* they appear only when the footer is in view */
  var footerVisible = false;
  (function () {
    var foot = document.getElementById("page-foot");
    if (foot && "IntersectionObserver" in window) {
      new IntersectionObserver(
        function (es) {
          footerVisible = es[0].isIntersecting;
        },
        { rootMargin: "120px" },
      ).observe(foot);
    } else {
      footerVisible = true;
    }
  })();

  var lastHeadingDeg = 0;

  function frameAt(tt) {
    var n = Math.floor(tt * fellowship.flapSp);
    return FLAP_SEQ[((n % 4) + 4) % 4];
  }

  function drawFellowship(t, dt) {
    if (!footerVisible || !fellowship.framesA) return;
    var p = fellowship;

    var A = pathPoint(t);
    var B = pathPoint(t - LAG);

    /* trails reset when a member wraps, so nothing tears across */
    if (A.x < p.lastAx - 0.5) p.trailA.length = 0;
    if (B.x < p.lastBx - 0.5) p.trailB.length = 0;
    p.lastAx = A.x;
    p.lastBx = B.x;

    p.trailT += dt;
    if (p.trailT > 0.18) {
      p.trailT = 0;
      p.trailA.push(A.x, A.y, A.z);
      p.trailB.push(B.x, B.y, B.z);
      if (p.trailA.length > TRAIL_LEN * 3) p.trailA.splice(0, 3);
      if (p.trailB.length > TRAIL_LEN * 3) p.trailB.splice(0, 3);
    }

    var pA = persp(A.z),
      pB = persp(B.z);
    var aA = depthAlpha(A.z),
      aB = depthAlpha(B.z);
    var ax = A.x * W,
      ay = A.y * H - A.z * 5; /* near drifts a touch lower */
    var bx = B.x * W,
      by = B.y * H - B.z * 5;

    /* the bond — only while both are on the same crossing */
    if (Math.abs(A.x - B.x) < 0.5) {
      ctx.strokeStyle = "rgba(" + EMBER + ",0.05)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    /* trails: ember middots, sized by their own depth */
    function drawTrail(arr, base) {
      var n = arr.length / 3;
      for (var k = 0; k < n; k++) {
        var fade = (k + 1) / n;
        var s = 1.4 * persp(arr[k * 3 + 2]);
        ctx.fillStyle =
          "rgba(" + EMBER + "," + (base * fade * fade).toFixed(3) + ")";
        ctx.fillRect(
          arr[k * 3] * W - s / 2,
          arr[k * 3 + 1] * H - arr[k * 3 + 2] * 5 - s / 2,
          s,
          s,
        );
      }
    }
    drawTrail(p.trailA, 0.1);
    drawTrail(p.trailB, 0.08);

    /* the same wingbeats, seconds later */
    var fi = frameAt(t);
    var fj = frameAt(t - LAG);

    var farFirst = B.z <= A.z;
    function blit(sp, x, y, sc, alpha) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        sp.cv,
        x - (sp.w * sc) / 2,
        y - (sp.h * sc) / 2,
        sp.w * sc,
        sp.h * sc,
      );
    }
    if (farFirst) {
      blit(p.framesB[fj], bx, by, pB, 0.5 * aB);
      blit(p.framesA[fi], ax, ay, pA, 0.6 * aA);
    } else {
      blit(p.framesA[fi], ax, ay, pA, 0.6 * aA);
      blit(p.framesB[fj], bx, by, pB, 0.5 * aB);
    }
    ctx.globalAlpha = 1;

    /* heading from the analytic velocity */
    var vy =
      0.03 * 0.23 * Math.cos(t * 0.23) + 0.012 * 0.61 * Math.cos(t * 0.61);
    lastHeadingDeg = Math.round(
      ((((Math.atan2(vy, DRIFT) * 180) / Math.PI) % 360) + 360) % 360,
    );
  }
  /* ================= FIVE WORLD WINDOWS =================
     Each window animates the rule of its world. Panes only
     render while visible (IntersectionObserver).            */

  function setupThumb(canvas) {
    var w = canvas.parentElement.clientWidth || 320;
    var h = canvas.parentElement.clientHeight || 180;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    var c = canvas.getContext("2d");
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { c: c, w: w, h: h };
  }

  /* [1] loops -> nested hexagons, counter-rotating, with a
         refraction glint sweeping across the facets */
  function worldGemstone(c, w, h, t) {
    c.clearRect(0, 0, w, h);
    var cx = w / 2,
      cy = h / 2,
      n = 6,
      layers = 9;
    var glintA = t * 0.75;
    for (var k = 0; k < layers; k++) {
      var rr = Math.min(w, h) * 0.42 * (1 - k / layers);
      var rot = k * 0.35 + t * 0.1 * (k % 2 ? 1 : -1);
      var base = lerp(0.4, 0.08, k / layers);
      for (var i = 0; i < n; i++) {
        var a0 = rot + (i / n) * Math.PI * 2;
        var a1 = rot + ((i + 1) / n) * Math.PI * 2;
        var mid = (a0 + a1) / 2;
        var face = Math.cos(mid - glintA); /* facets facing the light flare */
        var alpha = base + Math.max(0, face) * Math.max(0, face) * 0.45;
        c.strokeStyle = "rgba(" + PHOS + "," + alpha.toFixed(3) + ")";
        c.lineWidth = 1 + Math.max(0, face) * 0.6;
        c.beginPath();
        c.moveTo(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr);
        c.lineTo(cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr);
        c.stroke();
      }
    }
  }

  /* [2] variables -> arcs whose sweep and radius breathe,
         each with a traveller riding its curve */
  function worldArcs(c, w, h, t) {
    c.clearRect(0, 0, w, h);
    var cx = w * 0.5,
      cy = h * 0.95;
    for (var k = 0; k < 8; k++) {
      var rr =
        lerp(h * 0.15, h * 0.95, k / 7) * (1 + 0.03 * Math.sin(t * 0.7 + k));
      var sweep =
        lerp(0.4, 1, hash2(k, 7)) *
        Math.PI *
        (0.7 + 0.3 * Math.sin(t * 0.5 + k * 1.7));
      var start =
        Math.PI + (Math.PI - sweep) / 2 + Math.sin(t * 0.2 + k) * 0.25;
      c.strokeStyle =
        "rgba(" + PHOS + "," + lerp(0.4, 0.1, k / 7).toFixed(3) + ")";
      c.lineWidth = 1;
      if (k % 3 === 2) c.setLineDash([3, 5]);
      else c.setLineDash([]);
      c.beginPath();
      c.arc(cx, cy, rr, start, start + sweep);
      c.stroke();
      var ta = start + sweep * ((t * 0.12 + k * 0.13) % 1);
      c.fillStyle = "rgba(" + GOLD + ",0.8)";
      c.fillRect(cx + Math.cos(ta) * rr - 1, cy + Math.sin(ta) * rr - 1, 2, 2);
    }
    c.setLineDash([]);
  }

  /* [3] recursion -> branches branching: staggered growth from
         trunk to twig, buds glowing at the growing tips */
  function worldRecursion(c, w, h, t) {
    c.clearRect(0, 0, w, h);
    var cycle = (t * 0.14) % 1.3;
    var grow = Math.min(1, cycle);
    var sway = Math.sin(t * 0.6) * 0.04;
    function branch(x, y, len, ang, depth) {
      if (depth === 0 || len < 3) return;
      var level = 6 - depth;
      var g = Math.max(0, Math.min(1, grow * 7 - level));
      if (g <= 0) return;
      var x2 = x + Math.cos(ang) * len * g;
      var y2 = y + Math.sin(ang) * len * g;
      c.strokeStyle =
        "rgba(" + PHOS + "," + lerp(0.08, 0.45, depth / 6).toFixed(3) + ")";
      c.lineWidth = depth * 0.35;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x2, y2);
      c.stroke();
      if (g >= 1) {
        branch(x2, y2, len * 0.68, ang - 0.55 + sway, depth - 1);
        branch(x2, y2, len * 0.68, ang + 0.45 + sway, depth - 1);
      } else if (depth > 1) {
        c.fillStyle = "rgba(" + GOLD + ",0.7)";
        c.fillRect(x2 - 1, y2 - 1, 2, 2);
      }
    }
    branch(w * 0.5, h * 0.98, h * 0.34, -Math.PI / 2, 6);
  }

  /* [4] periodic motion -> the waveform scrolls, the pane
         pulses each time a beat crosses center */
  function worldHeartbeat(c, w, h, t) {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = "rgba(" + PHOS + ",0.07)";
    c.lineWidth = 1;
    for (var gx = 0; gx <= w; gx += w / 12) {
      c.beginPath();
      c.moveTo(gx, 0);
      c.lineTo(gx, h);
      c.stroke();
    }
    for (var gy = 0; gy <= h; gy += h / 6) {
      c.beginPath();
      c.moveTo(0, gy);
      c.lineTo(w, gy);
      c.stroke();
    }
    var phase = t * 0.35;
    var beatAtCenter = Math.exp(
      -Math.pow(((((0.5 + phase) * 3) % 1) - 0.25) * 9, 2),
    );
    c.strokeStyle =
      "rgba(" + PHOS + "," + (0.4 + 0.35 * beatAtCenter).toFixed(3) + ")";
    c.lineWidth = 1 + beatAtCenter;
    c.beginPath();
    for (var i = 0; i <= 160; i++) {
      var u = i / 160,
        x = u * w;
      var uu = u + phase;
      var beat = Math.exp(-Math.pow((((uu * 3) % 1) - 0.25) * 9, 2));
      var y = h * 0.55 - Math.sin(uu * 28) * h * 0.06 - beat * h * 0.3;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  }

  /* [5] the lordless flock -> leaderless coordination, live */
  var boids = [];
  var NBOIDS = 30;
  function ensureBoids(w, h) {
    if (boids.length) return;
    for (var i = 0; i < NBOIDS; i++) {
      var a = Math.random() * Math.PI * 2;
      boids.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(a) * 22,
        vy: Math.sin(a) * 22,
      });
    }
  }
  function worldFlock(c, w, h, t, dt) {
    ensureBoids(w, h);
    var i, j;
    for (i = 0; i < boids.length; i++) {
      var b = boids[i];
      var ax = 0,
        ay = 0,
        cxn = 0,
        cyn = 0,
        sx = 0,
        sy = 0,
        n = 0;
      for (j = 0; j < boids.length; j++) {
        if (j === i) continue;
        var o = boids[j];
        var dx = o.x - b.x,
          dy = o.y - b.y,
          d2 = dx * dx + dy * dy;
        if (d2 < 60 * 60) {
          n++;
          ax += o.vx;
          ay += o.vy; /* alignment */
          cxn += o.x;
          cyn += o.y; /* cohesion  */
          if (d2 < 18 * 18 && d2 > 0.01) {
            sx -= (dx / d2) * 220;
            sy -= (dy / d2) * 220;
          } /* separation */
        }
      }
      if (n > 0) {
        b.vx += ((ax / n - b.vx) * 0.9 + (cxn / n - b.x) * 0.35 + sx) * dt;
        b.vy += ((ay / n - b.vy) * 0.9 + (cyn / n - b.y) * 0.35 + sy) * dt;
      }
      b.vx += (vnoise(b.x * 0.02, b.y * 0.02 + 9) - 0.5) * 40 * dt;
      b.vy += (vnoise(b.x * 0.02 + 5, b.y * 0.02) - 0.5) * 40 * dt;
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
      var want = 34;
      b.vx = (b.vx / sp) * lerp(sp, want, 0.06);
      b.vy = (b.vy / sp) * lerp(sp, want, 0.06);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -6) b.x = w + 6;
      if (b.x > w + 6) b.x = -6;
      if (b.y < -6) b.y = h + 6;
      if (b.y > h + 6) b.y = -6;
    }
    c.clearRect(0, 0, w, h);
    for (i = 0; i < boids.length; i++) {
      var b2 = boids[i];
      var sp2 = Math.sqrt(b2.vx * b2.vx + b2.vy * b2.vy) || 1;
      var ux = b2.vx / sp2,
        uy = b2.vy / sp2;
      c.strokeStyle = "rgba(" + PHOS + ",0.55)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(b2.x - ux * 4, b2.y - uy * 4);
      c.lineTo(b2.x + ux * 4, b2.y + uy * 4);
      c.stroke();
      c.fillStyle = "rgba(" + GOLD + ",0.8)";
      c.fillRect(b2.x + ux * 4 - 0.8, b2.y + uy * 4 - 0.8, 1.6, 1.6);
    }
  }

  /* registry: id -> draw(c,w,h,t,dt); offscreen panes are culled */
  var WORLD_DRAWS = {
    1: worldGemstone,
    2: worldArcs,
    3: worldRecursion,
    4: worldHeartbeat,
    5: worldFlock,
  };
  var panes = [];

  function setupPanes() {
    panes.length = 0;
    var cs = document.querySelectorAll("canvas[data-world]");
    for (var i = 0; i < cs.length; i++) {
      var id = cs[i].getAttribute("data-world");
      var draw = WORLD_DRAWS[id];
      if (!draw) continue;
      var s = setupThumb(cs[i]);
      panes.push({
        el: cs[i],
        c: s.c,
        w: s.w,
        h: s.h,
        draw: draw,
        visible: true,
      });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          for (var e = 0; e < entries.length; e++) {
            for (var p = 0; p < panes.length; p++) {
              if (panes[p].el === entries[e].target) {
                panes[p].visible = entries[e].isIntersecting;
              }
            }
          }
        },
        { rootMargin: "80px" },
      );
      for (var k = 0; k < panes.length; k++) io.observe(panes[k].el);
    }
  }
  function drawPanes(t, dt) {
    for (var i = 0; i < panes.length; i++) {
      var p = panes[i];
      if (!p.visible) continue;
      p.draw(p.c, p.w, p.h, t, dt);
    }
  }
  setupPanes();
  window.addEventListener("resize", setupPanes);
  /* ---------------- frame loop ---------------- */
  var stHeading = document.getElementById("st-heading");
  var stPairs = document.getElementById("st-pairs");
  if (stPairs) stPairs.textContent = "1";

  var prev = performance.now();
  var statusTick = 0;
  var running = true;

  function frame(now) {
    var dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    var t = now / 1000;

    ctx.clearRect(0, 0, W, H);
    drawTraces(t);
    drawTerrain(t);
    drawFlies(t);
    drawFellowship(t, dt);
    drawPanes(t, dt);

    statusTick += dt;
    if (statusTick > 0.5) {
      statusTick = 0;
      if (stHeading) stHeading.textContent = String(lastHeadingDeg);
    }
    if (running && !reduceMotion) requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      running = false;
    } else if (!reduceMotion) {
      running = true;
      prev = performance.now();
      requestAnimationFrame(frame);
    }
  });

  if (reduceMotion) {
    /* single still frame */
    frame(performance.now());
  } else {
    requestAnimationFrame(frame);
  }

  /* ================= PANORAMA PLACEHOLDER (static mini-render) ================= */
  var pano = document.getElementById("pano");
  if (pano) {
    var pctx = pano.getContext("2d");
    function renderPano() {
      var pw = pano.clientWidth || pano.parentElement.clientWidth;
      var ph = pano.clientHeight || pano.parentElement.clientHeight;
      pano.width = Math.floor(pw * DPR);
      pano.height = Math.floor(ph * DPR);
      pctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      pctx.clearRect(0, 0, pw, ph);
      var rows = 16,
        cols = 48;
      for (var r = 0; r < rows; r++) {
        var fz = r / (rows - 1);
        var y0 = ph * 0.3 + Math.pow(fz, 1.5) * ph * 0.62;
        var amp = lerp(4, 30, fz);
        var alpha = lerp(0.06, 0.3, fz);
        pctx.strokeStyle = "rgba(" + PHOS + "," + alpha.toFixed(3) + ")";
        pctx.lineWidth = 1;
        pctx.beginPath();
        for (var c = 0; c <= cols; c++) {
          var x = (c / cols) * pw;
          var y = y0 - fbm(c * 0.2, r * 0.3 + 40) * amp;
          if (c === 0) pctx.moveTo(x, y);
          else pctx.lineTo(x, y);
        }
        pctx.stroke();
      }
    }
    renderPano();
    window.addEventListener("resize", renderPano);
  }
})();
