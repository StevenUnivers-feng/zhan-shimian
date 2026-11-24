/* 程序化像素画：网格笔刷绘制 -> 离屏 canvas，整数倍放大保持像素颗粒。
   精度原则（03 §8.3）：像素块 ≤4 屏px，与背景颗粒同级；轮廓自动描边 + 高光/阴影/纹理分层 */
(function () {
  window.ZSM = window.ZSM || {};

  function build(rows, mapper) {
    var h = rows.length, w = 0, i, j;
    for (i = 0; i < h; i++) w = Math.max(w, rows[i].length);
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    for (i = 0; i < h; i++) {
      for (j = 0; j < rows[i].length; j++) {
        var ch = rows[i][j];
        if (ch === '.' || ch === ' ') continue;
        var col = mapper(ch, i, j);
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(j, i, 1, 1);
      }
    }
    c._gw = w; c._gh = h;
    return c;
  }

  /* ---- 网格笔刷 ---- */
  function G(w, h) { var d = new Array(w * h); for (var i = 0; i < w * h; i++) d[i] = '.'; return { w: w, h: h, d: d }; }
  function P(g, x, y, ch) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = ch; }
  function R(g, x, y, w, h, ch) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) P(g, i, j, ch); }
  function E(g, cx, cy, rx, ry, ch) {
    for (var y = Math.floor(cy - ry); y <= cy + ry; y++) for (var x = Math.floor(cx - rx); x <= cx + rx; x++) {
      var dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) P(g, x, y, ch);
    }
  }
  function RE(g, cx, cy, rx, ry, ang, ch) {
    var ca = Math.cos(ang), sa = Math.sin(ang), r = Math.max(rx, ry);
    for (var y = Math.floor(cy - r); y <= cy + r; y++) for (var x = Math.floor(cx - r); x <= cx + r; x++) {
      var dx = x - cx, dy = y - cy;
      var ux = (dx * ca + dy * sa) / rx, uy = (-dx * sa + dy * ca) / ry;
      if (ux * ux + uy * uy <= 1) P(g, x, y, ch);
    }
  }
  function L(g, x0, y0, x1, y1, ch) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
    for (;;) {
      P(g, x0, y0, ch);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
  function OL(g, ch) {   // 自动轮廓：空格四邻有实体则描边
    var out = g.d.slice();
    for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) {
      if (g.d[y * g.w + x] !== '.') continue;
      if ((x > 0 && g.d[y * g.w + x - 1] !== '.') || (x < g.w - 1 && g.d[y * g.w + x + 1] !== '.') ||
        (y > 0 && g.d[(y - 1) * g.w + x] !== '.') || (y < g.h - 1 && g.d[(y + 1) * g.w + x] !== '.')) out[y * g.w + x] = ch;
    }
    g.d = out;
  }
  function CV(g, pal) {
    var rows = [];
    for (var y = 0; y < g.h; y++) rows.push(g.d.slice(y * g.w, y * g.w + g.w).join(''));
    return build(rows, function (ch) { return pal[ch]; });
  }
  function CV2(g, palL, palR, split) {   // 左右不同调色（半心/切半）
    var rows = [];
    for (var y = 0; y < g.h; y++) rows.push(g.d.slice(y * g.w, y * g.w + g.w).join(''));
    return build(rows, function (ch, i, j) { return (j < split ? palL : palR)[ch]; });
  }

  var S = {};

  /* 四芒星 9×9：十字+斜角+白芯 */
  (function () {
    var g = G(9, 9);
    L(g, 4, 0, 4, 8, 'Y'); L(g, 0, 4, 8, 4, 'Y');
    P(g, 3, 3, 'Y'); P(g, 5, 3, 'Y'); P(g, 3, 5, 'Y'); P(g, 5, 5, 'Y');
    P(g, 4, 4, 'W');
    S.star4 = CV(g, { Y: '#FFF3B0', W: '#FFFFFF' });
  })();

  /* 戴睡帽的月亮 16×16（进度滑标） */
  (function () {
    var g = G(16, 16);
    E(g, 7, 9, 6, 6, 'L');
    P(g, 5, 8, 'l'); P(g, 6, 8, 'l'); P(g, 9, 11, 'l'); P(g, 10, 11, 'l'); P(g, 6, 12, 'l');
    P(g, 4, 9, 'W'); P(g, 5, 8, 'W'); P(g, 4, 10, 'W');
    for (var i = 0; i < 6; i++) { P(g, 9 + i, 5 - i, 'C'); P(g, 10 + i, 5 - i, 'C'); P(g, 9 + i, 6 - i, 'C'); }
    E(g, 15, 1, 1.4, 1.4, 'o');
    OL(g, 'k');
    S.mooncap = CV(g, { L: '#FFF3B0', l: '#E8D48A', W: '#FFFBE0', C: '#8A4FFF', o: '#F5F2FF', k: '#14101F' });
  })();

  /* 心形网格生成器（生命心 24 / 欲望心 32） */
  function heartG(n) {
    var g = G(n, n), c = n / 2, r = n * 0.24;
    E(g, c - r * 0.62, n * 0.30, r, r, 'R'); E(g, c + r * 0.62, n * 0.30, r, r, 'R');
    for (var y = Math.floor(n * 0.30); y < n - 1; y++) {
      var t = (y - n * 0.30) / (n * 0.70);
      var hw = Math.max(1, Math.round((1 - t * t) * (n * 0.46)));
      R(g, c - hw, y, hw * 2 + 1, 1, 'R');
    }
    return g;
  }
  (function () {
    var g = heartG(24);
    E(g, 8, 7, 2.5, 1.6, 'W'); P(g, 6, 9, 'W');
    OL(g, 'o');
    var FULL = { R: '#FF4D4D', W: '#FF8A8A', o: '#8A2A2A' };
    var EMPTY = { R: '#5A4A66', W: '#6B5A7A', o: '#3A2A46' };
    S.heartFull = CV(g, FULL);
    S.heartEmpty = CV(g, EMPTY);
    S.heartHalf = CV2(g, FULL, EMPTY, 12);
  })();
  (function () {
    var g = heartG(32);
    E(g, 11, 9, 3.2, 2.1, 'W'); P(g, 8, 12, 'W'); P(g, 9, 11, 'W');
    P(g, 21, 12, 'd'); P(g, 22, 14, 'd'); P(g, 21, 16, 'd');   // 右缘反光前暗部
    OL(g, 'o');
    var PINK = { R: '#FF7AB0', W: '#FFA8CB', d: '#E05A92', o: '#8A3A5A' };
    S.desire = CV(g, PINK);
    S.desireL = CV2(g, PINK, { R: null, W: null, d: null, o: null }, 16);
    S.desireR = CV2(g, { R: null, W: null, d: null, o: null }, PINK, 16);
  })();

  /* 想法 · 发光灯泡 32×32：玻璃反光+螺口螺纹+灯丝 */
  (function () {
    var g = G(32, 32);
    E(g, 15, 12, 10, 10, 'Y');
    E(g, 11, 8, 3, 2, 'W'); P(g, 9, 10, 'W'); P(g, 8, 12, 'W');
    L(g, 13, 15, 15, 17, 'W'); L(g, 15, 17, 17, 15, 'W');      // 灯丝
    P(g, 20, 16, 'y'); P(g, 21, 14, 'y'); P(g, 20, 18, 'y');   // 右下暗部
    R(g, 11, 22, 9, 2, 'B'); R(g, 12, 24, 7, 1, 'D'); R(g, 11, 25, 9, 1, 'B'); R(g, 12, 26, 7, 1, 'D');
    R(g, 13, 27, 5, 2, 'B');
    OL(g, 'o');
    S.bulb = CV(g, { Y: '#FFD75E', W: '#FFF3B0', y: '#E8B84A', B: '#9AA0B0', D: '#6B7080', o: '#5A4A1F' });
  })();

  /* 压力 · 黑石 48×48：多棱面+裂缝+顶光 */
  (function () {
    var g = G(48, 48);
    E(g, 24, 26, 19, 16, 'K');
    E(g, 7, 12, 6, 5, '.'); E(g, 41, 14, 5, 4, '.'); E(g, 10, 40, 5, 4, '.'); E(g, 39, 39, 5, 4, '.');
    L(g, 11, 17, 22, 11, 'L'); L(g, 22, 11, 33, 15, 'L');      // 顶棱受光
    L(g, 13, 21, 21, 27, 'L'); L(g, 21, 27, 19, 35, 'l');
    L(g, 27, 18, 25, 26, 'k'); L(g, 25, 26, 29, 32, 'k'); L(g, 29, 32, 28, 37, 'k');   // 裂缝
    P(g, 16, 14, 'H'); P(g, 18, 13, 'H'); P(g, 20, 12, 'H');
    OL(g, 'o');
    S.pressure = CV(g, { K: '#2B2B33', L: '#4A4A55', l: '#3A3A44', k: '#1B1B21', H: '#6A6A78', o: '#0E0E12' });
  })();

  /* 睡觉小人+竖床 64×64 俯视：床头木纹/枕头阴影/发丝腮红/被褥褶纹+月纹 */
  function makeSleeper(inhale) {
    var g = G(64, 64);
    R(g, 6, 2, 52, 60, 'W');
    R(g, 10, 10, 44, 44, '.');
    L(g, 8, 5, 55, 5, 'w'); L(g, 8, 7, 55, 7, 'w');            // 床头木纹
    R(g, 6, 54, 52, 8, 'W'); L(g, 8, 57, 55, 57, 'w');         // 床尾
    E(g, 8, 4, 3, 3, 'w'); E(g, 55, 4, 3, 3, 'w'); E(g, 8, 58, 3, 3, 'w'); E(g, 55, 58, 3, 3, 'w');
    R(g, 11, 11, 42, 13, 'P');
    P(g, 11, 11, '.'); P(g, 52, 11, '.'); P(g, 11, 23, '.'); P(g, 52, 23, '.');
    R(g, 12, 22, 40, 2, 'p');                                  // 枕头投影
    var dy = inhale ? 2 : 0;
    E(g, 32, 19 + dy, 13, 8, 'H');
    E(g, 32, 22 + dy, 10, 6, 'S');
    E(g, 32, 17 + dy, 11, 4, 'H');                             // 刘海
    L(g, 24, 16 + dy, 26, 18 + dy, 'H'); L(g, 39, 16 + dy, 37, 18 + dy, 'H');   // 发丝
    L(g, 26, 23 + dy, 29, 23 + dy, 'e'); L(g, 35, 23 + dy, 38, 23 + dy, 'e');
    P(g, 25, 26 + dy, 'm'); P(g, 39, 26 + dy, 'm'); P(g, 32, 27 + dy, 'm');
    var qy = 28 + (inhale ? 1 : 0);
    R(g, 10, qy, 44, 53 - qy, 'Q');
    P(g, 10, 52, '.'); P(g, 53, 52, '.');
    R(g, 11, qy, 42, 1, 'M');                                  // 被褥顶缘受光
    for (var x = 16; x < 52; x += 8) L(g, x, qy + 3, x, 50, 'q');               // 褶纹
    var moons = [[18, 34], [30, 40], [42, 33], [24, 46], [38, 47]];
    for (var i = 0; i < moons.length; i++) {
      var mx = moons[i][0], my = moons[i][1];
      P(g, mx, my, 'M'); P(g, mx + 1, my, 'M'); P(g, mx, my + 1, 'M'); P(g, mx - 1, my + 1, 'M');
    }
    if (inhale) { E(g, 46, 18, 2.5, 2.5, 'o'); P(g, 46, 18, 'O'); }             // 瞌睡泡
    OL(g, 'k');
    return CV(g, {
      W: '#7A4A2B', w: '#5A3620', P: '#EFE6FF', p: '#D8CCF0', H: '#6B4A2F', S: '#FFD9B8',
      e: '#5A3A2A', m: '#E89AA6', Q: '#8A63D2', q: '#7549B8', M: '#C9B6F0', o: '#BFE8F9', O: '#E8F8FF', k: '#1A1016'
    });
  }
  S.sleeper = makeSleeper(false);
  S.sleeperB = makeSleeper(true);

  /* 绘制：center 锚点，worldH 为期望世界高度(像素)，整数像素块放大 */
  function draw(ctx, name, cx, cy, worldH, rot) {
    var sp = S[name];
    if (!sp) return;
    var px = Math.max(1, Math.round(worldH / sp._gh));
    var dw = sp._gw * px, dh = sp._gh * px;
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(sp, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    return { w: dw, h: dh };
  }

  function size(name, worldH) {
    var sp = S[name];
    var px = Math.max(1, Math.round(worldH / sp._gh));
    return { w: sp._gw * px, h: sp._gh * px };
  }

  /* 光晕（想法灯泡外发光） */
  function glow(ctx, cx, cy, r, color, alpha) {
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  ZSM.pixelart = { sprites: S, draw: draw, size: size, glow: glow, build: build };
})();
