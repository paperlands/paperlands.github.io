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

  /* ============ THE SIXTH WORLD · WebGL capstone renderers ============
     The 2D worlds animate a *rule*; these animate the academy itself. Two
     variants share one tiny harness (makeGLPane): a full-screen fragment
     shader over a single triangle, straight-alpha so the twilight sky shows
     through, DPR-capped, and cached on the element so a resize or pane
     rebuild reuses the program and never leaks a GL context. They register as
     ordinary world panes — culled offscreen, stilled under reduced-motion —
     only the context and draw path differ.
       · forge   — the crucible the five worlds pour into (molten field)
       · academy — Raphael's School of Athens: a Parthenon raised from the
                   ground up on a loop (line-art over the open sky)           */

  var GL_VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}";
  var GL_HEAD = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform vec2 uResolution;",
    "uniform float uTime;",
    "float hash(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}"
  ].join("\n");

  function makeGLPane(canvas, fragSrc) {
    if (canvas.__glpane) {
      canvas.__glpane.resize();
      return canvas.__glpane;
    }
    var opts = { alpha: true, premultipliedAlpha: false, antialias: true, depth: false };
    var gl = canvas.getContext("webgl", opts) ||
             canvas.getContext("experimental-webgl", opts);
    if (!gl) return null;

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }
    var vs = compile(gl.VERTEX_SHADER, GL_VS);
    var fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aLoc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, "uResolution");
    var uTime = gl.getUniformLocation(prog, "uTime");

    var GLDPR = Math.min(window.devicePixelRatio || 1, 1.5);

    function resize() {
      var host = canvas.parentElement || canvas;
      var w = host.clientWidth || canvas.clientWidth || 640;
      var h = host.clientHeight || canvas.clientHeight || 268;
      var pw = Math.max(1, Math.floor(w * GLDPR));
      var ph = Math.max(1, Math.floor(h * GLDPR));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function draw(t) {
      if (gl.isContextLost && gl.isContextLost()) return;
      gl.useProgram(prog);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      canvas.__glpane = null;
    }, false);

    var R = { draw: draw, resize: resize };
    canvas.__glpane = R;
    resize();
    return R;
  }

  /* --- variant: the forge / crucible (molten field) --- */
  var FORGE_FS = [
    GL_HEAD,
    "float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);",
    " float a=hash(i),b=hash(i+vec2(1.0,0.0)),c=hash(i+vec2(0.0,1.0)),d=hash(i+vec2(1.0,1.0));",
    " return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}",
    "float fbm(vec2 p){float v=0.0,a=0.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);",
    " for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=0.5;}return v;}",
    "void main(){",
    " vec2 uv=gl_FragCoord.xy/uResolution;",
    " float asp=uResolution.x/uResolution.y;",
    " vec2 p=vec2(uv.x*asp,uv.y);",
    " vec3 twilight=vec3(0.086,0.059,0.106);",
    " vec3 ember=vec3(0.851,0.435,0.216);",
    " vec3 phosphor=vec3(0.941,0.659,0.239);",
    " vec3 gold=vec3(0.945,0.859,0.643);",
    " float t=uTime;",
    " float breath=0.82+0.12*sin(t*0.9)+0.06*sin(t*2.17+1.3);",
    " float ss=0.5+0.5*sin(t*0.31); float strike=ss*ss; strike*=strike; strike*=strike; strike*=strike;",
    " vec2 q=p*vec2(2.2,2.0);",
    " vec2 warp=vec2(fbm(q+vec2(0.0,-t*0.45)),fbm(q+vec2(5.2,-t*0.6+1.7)));",
    " float flow=fbm(q+warp*1.8+vec2(0.0,-t*0.5));",
    " float up=clamp(1.0-uv.y,0.0,1.0);",
    " float vbase=up*sqrt(up);",
    " float mx=(uv.x-0.5)*asp*1.5; float mouth=exp(-(mx*mx))*sqrt(up);",
    " float heat=(vbase*0.85+mouth*0.9)*(0.55+0.85*flow)*breath;",
    " heat+=strike*0.35*vbase;",
    " float shimmer=fbm(p*6.0+vec2(0.0,-t*1.4))-0.5;",
    " heat+=shimmer*0.18*heat;",
    " heat=clamp(heat,0.0,1.6);",
    " vec3 col=twilight;",
    " col=mix(col,ember,smoothstep(0.06,0.45,heat));",
    " col=mix(col,phosphor,smoothstep(0.40,0.85,heat));",
    " col=mix(col,gold,smoothstep(0.85,1.25,heat));",
    " float spark=0.0;",
    " for(int i=0;i<3;i++){float fi=float(i);",
    "  float sc=26.0+fi*22.0; float sp=0.30+fi*0.18;",
    "  vec2 gp=vec2(p.x*sc,p.y*sc+t*sp*sc);",
    "  vec2 cell=floor(gp); vec2 f=fract(gp)-0.5;",
    "  float r=hash(cell+vec2(fi*17.0));",
    "  float live=step(0.86,r);",
    "  float flick=0.5+0.5*sin(t*(3.0+6.0*r)+r*30.0);",
    "  spark+=smoothstep(0.16,0.0,length(f))*live*flick*up;",
    " }",
    " col+=gold*spark*0.9;",
    " float cxx=(uv.x-0.5)*asp*2.2; float core=exp(-(cxx*cxx))*smoothstep(0.0,0.22,up);",
    " col+=ember*core*0.25*breath;",
    " float a=clamp(heat*1.15+vbase*0.45+spark,0.0,1.0);",
    " a=max(a,vbase*0.5);",
    " a*=1.0-smoothstep(0.78,1.0,uv.y)*0.55;",
    " vec2 vv=(uv-0.5)*vec2(1.0,0.85); float vig=1.0-0.35*dot(vv,vv);",
    " col*=vig;",
    " gl_FragColor=vec4(col,a);",
    "}"
  ].join("\n");

  /* --- variant: Raphael's academy — a hall struck out toward the horizon ------
     Stand at the mouth of a colossal hall and look in: towering pillars in
     one-point perspective, arch beyond arch, the corridor running off to a great
     horizon of light. A hall the old dwarf-masons would have stopped to marvel
     at — Khazad-dûm scale, the viewer a mote beneath the vault.

     It is not loaded, it is *forged*: built one hammer blow at a time, from the
     outside in. On a slow, deliberate beat the next bay is struck into being —
     it does not fade up, it *lands*: full-size in an instant, oversized for a
     blink (the overshoot of the blow), a white flash on its stone, a burst of
     dust, and a ring that shivers through the whole standing hall. Then it
     settles to a steady glow while the corridor reaches one bay deeper toward the
     light. Unbuilt bays are simply not there yet — no blueprint, no ghost.

     And the dust does not all fall. Sparks struck from the stone settle as
     stardust and stay, so as the nave takes hold the vault fills with a starry
     heaven and the whole interior floats in celestial space — the feeling of a
     Cathedral of the Resurrection. Each blow throws up a fresh shower of light.

     Cheap geometry: each transverse bay lives on a plane at one depth, so its
     whole profile — two mighty piers, a round arch, a floor course — is the same
     drawing scaled about the vanishing point; eleven depths fall out of
     `s = F/Z`. When the last blow falls the horizon blazes; then it fades and
     begins again, for after this builder cometh another. */
  var ACADEMY_FS = [
    GL_HEAD,
    "float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);return length(pa-ba*h);}",
    "void main(){",
    " vec2 uv=gl_FragCoord.xy/uResolution;",
    " float asp=uResolution.x/uResolution.y;",
    " vec2 P=vec2(uv.x*asp,uv.y);",
    " vec3 phosphor=vec3(0.941,0.659,0.239);",
    " vec3 gold=vec3(0.945,0.859,0.643);",
    " vec3 ember=vec3(0.851,0.435,0.216);",
    " float t=uTime;",
    " float px=1.0/uResolution.y; float aa=1.2*px;",
    " float lwP=2.1*px; float lwA=1.25*px; float lwF=1.0*px;", /* pier / arch / floor weights */
    " float CYC=15.0; float cyc=mod(t,CYC);",
    " float fade=min(smoothstep(0.0,1.2,cyc),smoothstep(CYC,CYC-1.8,cyc));",
    " float T0=0.8; float STAG=0.85;",                          /* first blow, then seconds between blows */
    " float bp=clamp((cyc-T0)/(STAG*10.0),0.0,1.0);",           /* build progress 0..1 */
    " float camp=bp*bp*(3.0-2.0*bp);",                          /* eased, for the camera */
    /* the hall in world units on a transverse plane (vp = the horizon, y up).
       The camera rides the build: pulled back and level at first (open space for
       the first stars to be born in), it dollies in and tilts up as the nave
       rises, so the hall grows to fill the frame and the eye cranes into the
       vault by the time the last blow falls. */
    " float F=mix(0.66,0.90,camp);",                            /* dolly in: enlarges to fill as it is forged */
    " vec2 vp=vec2(0.5*asp,mix(0.40,0.30,camp)); vec2 v=P-vp;", /* pan up toward the ceiling as it fills */
    " float Wn=0.78;",           /* hall half-width */
    " float ImpY=0.46;",         /* springing line, high above vp */
    " float FlY=-0.52;",         /* floor, low below vp — falls past the frame */
    " float Z0=1.0; float Q=1.26;",
    " float breath=0.85+0.10*sin(t*0.8)+0.05*sin(t*1.9+1.1);",
    " float stone=0.0, pathLit=0.0, strikeGlow=0.0, ring=0.0;",
    " for(int i=0;i<11;i++){ float fi=float(i);",
    "  float Z=Z0*pow(Q,fi); float s=F/Z; vec2 p=v/s;",       /* into bay-plane coords */
    "  float age=cyc-(T0+STAG*fi); float built=step(0.0,age);", /* struck yet? */
    "  float x=age/0.16; float impact=exp(-x*x)*built;",       /* the blow, decaying */
    "  float swP=1.0+1.8*impact; float swA=1.0+1.4*impact;",   /* overshoot slam */
    "  float dP=min(sdSeg(p,vec2(-Wn,FlY),vec2(-Wn,ImpY)),sdSeg(p,vec2(Wn,FlY),vec2(Wn,ImpY)));", /* piers */
    "  float dA=1000.0; if(p.y>ImpY) dA=abs(length(p-vec2(0.0,ImpY))-Wn);", /* round arch */
    "  float dF=sdSeg(p,vec2(-Wn,FlY),vec2(Wn,FlY));",         /* floor course */
    "  float depthA=mix(1.0,0.5,fi/10.0);",                    /* far bays recede dimmer */
    "  float iP=smoothstep(lwP*swP+aa,lwP*swP,dP*s);",
    "  float iA=smoothstep(lwA*swA+aa,lwA*swA,dA*s);",
    "  float iF=smoothstep(lwF+aa,lwF,dF*s);",
    "  float line=max(max(iP,iA),iF)*built*depthA;",
    "  stone=max(stone,line);",
    "  strikeGlow=max(strikeGlow,max(iP,iA)*impact*depthA);",
    "  ring=max(ring,impact);",
    " }",
    /* the great horizon the hall drives toward — a beacon that blazes as it nears */
    " float gd=length(v); float prog=clamp((cyc-T0)/(STAG*10.0),0.0,1.0);",
    " float halo=exp(-gd*gd*60.0)*(0.30+0.70*prog)*breath;",
    " float dy=(uv.y-vp.y)/0.014; float dx=(P.x-vp.x)/0.55;",
    " float horizon=exp(-dy*dy)*exp(-dx*dx)*(0.25+0.75*prog);",
    /* compose, straight alpha over the twilight sky */
    " vec3 col=vec3(0.0); float a=0.0;",
    " vec3 stoneCol=mix(phosphor,gold,0.40); float life=0.88+0.12*breath;",
    " col+=stoneCol*stone*life; a=max(a,stone*0.95);",
    " col+=mix(gold,vec3(1.0,0.97,0.88),0.6)*strikeGlow; a=max(a,strikeGlow*0.8);",
    " col+=gold*ring*0.06; a=max(a,ring*0.04);",               /* the blow rings through the hall */
    /* stardust — sparks struck from the stone that settle and stay, so as the
       nave takes hold the vault fills with a starry heaven (Resurrection vault) */
    " float space=smoothstep(0.18,1.0,uv.y)*prog*0.20;",       /* deep-space veil in the vault */
    " col+=vec3(0.10,0.08,0.18)*space; a=max(a,space*0.5);",
    " float stars=0.0;",
    " for(int s=0;s<3;s++){ float fs=float(s); float sc=20.0+fs*30.0;",
    "  vec2 gp=vec2(P.x*sc,uv.y*sc); vec2 cell=floor(gp); vec2 f=fract(gp)-0.5;",
    "  float r=hash(cell+vec2(fs*41.0)); float live=step(0.90,r);",
    "  float bt=T0+hash(cell+vec2(fs*17.0,5.0))*8.6;",          /* each star is born at its own moment, scattered across the build */
    "  float age=cyc-bt; float born=smoothstep(0.0,0.5,age);",  /* it comes to life... */
    "  float q=age/0.26; float pop=exp(-q*q);",                 /* ...with a flash of birth, then settles to twinkle */
    "  vec2 base=(vec2(hash(cell+1.3),hash(cell+4.7))-0.5)*0.55;",
    "  vec2 drift=0.08*vec2(sin(t*0.3+r*20.0),cos(t*0.24+r*15.0));", /* and then it lives — a slow wander */
    "  float dd=length(f-base-drift);",
    "  float tw=0.5+0.5*sin(t*(0.8+2.4*hash(cell+9.0))+r*40.0);",
    "  stars+=smoothstep(0.07,0.0,dd)*live*born*(tw*0.7+pop*1.0); }",
    " stars*=(1.0-stone*0.9)*(1.0+0.4*ring);",                  /* dimmed behind stone, shivered by each blow */
    " vec3 starCol=mix(gold,vec3(1.0,0.97,0.90),0.4);",
    " col+=starCol*stars*0.8; a=max(a,stars*0.55);",
    " float dust=0.0; float dmask=smoothstep(0.72,0.2,uv.y);",
    " for(int m=0;m<2;m++){ float fm=float(m); float sc=64.0+fm*44.0;",
    "  vec2 gp=vec2(P.x*sc,uv.y*sc-t*(0.5+fm*0.3)*sc); vec2 cell=floor(gp); vec2 f=fract(gp)-0.5;",
    "  float r=hash(cell+vec2(fm*23.0)); dust+=smoothstep(0.24,0.0,length(f))*step(0.9,r); }",
    " dust*=ring*dmask; col+=gold*dust*0.7; a=max(a,dust*0.6);",
    " col+=mix(gold,vec3(1.0,0.95,0.85),0.5)*halo; a=max(a,halo);",
    " col+=gold*horizon; a=max(a,horizon*0.85);",
    " float hy=(uv.y-vp.y)/0.15; float haze=exp(-hy*hy)*0.10;",
    " col+=ember*haze; a=max(a,haze*0.4);",
    " a*=fade; col*=fade;",
    " gl_FragColor=vec4(col,clamp(a,0.0,1.0));",
    "}"
  ].join("\n");

  /* registry: id -> draw(c,w,h,t,dt); offscreen panes are culled */
  var WORLD_DRAWS = {
    1: worldGemstone,
    2: worldArcs,
    3: worldRecursion,
    4: worldHeartbeat,
    5: worldFlock,
  };
  /* WebGL world renderers: id -> factory(canvas) -> { draw(t), resize() } */
  var WORLD_GL = {
    forge: function (c) { return makeGLPane(c, FORGE_FS); },
    academy: function (c) { return makeGLPane(c, ACADEMY_FS); },
  };
  var panes = [];

  function setupPanes() {
    panes.length = 0;
    var cs = document.querySelectorAll("canvas[data-world]");
    for (var i = 0; i < cs.length; i++) {
      var id = cs[i].getAttribute("data-world");
      if (WORLD_GL[id]) {
        var glr = WORLD_GL[id](cs[i]);
        if (!glr) continue; // no WebGL: leave the CSS fallback glow in place
        panes.push({ el: cs[i], kind: "gl", glr: glr, visible: true });
        continue;
      }
      var draw = WORLD_DRAWS[id];
      if (!draw) continue;
      var s = setupThumb(cs[i]);
      panes.push({
        el: cs[i],
        kind: "2d",
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
      if (p.kind === "gl") p.glr.draw(t, dt);
      else p.draw(p.c, p.w, p.h, t, dt);
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
