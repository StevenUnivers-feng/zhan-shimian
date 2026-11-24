/* 视频抠像精灵表播放（03 §9 / 06 管线 v2）：四资产共用一套取帧+绘制。
   常量内联（不 fetch JSON，保 file:// 双击可玩）。body = 主体盒(格像素,不含外发光)，
   游戏内 worldH 映射到 body 高、body 中心锚到实体坐标；缩放口径同 06 §4：整数倍放大关平滑、其余开平滑。 */
(function () {
  window.ZSM = window.ZSM || {};
  var DEF = {
    sleeper: {
      src: 'assets/sleeper-loop.png', gw: 174, gh: 313, cols: 6, frames: 71, fps: 24, total: 124, fade: 6,
      body: [1.5, 1.5, 171.5, 311],
      holds: [1, 4, 1, 3, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 3, 3, 3, 1, 2, 2, 7, 3, 2, 7, 7, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 4, 1, 6]
    },
    desire: {
      src: 'assets/desire-loop.png', gw: 198, gh: 190, cols: 11, frames: 113, fps: 24, total: 124, fade: 0,
      body: [10.25, 10.25, 177.25, 171],
      holds: [1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 4, 3, 1, 1, 4]
    },
    idea: {
      src: 'assets/idea-loop.png', gw: 109, gh: 132, cols: 10, frames: 123, fps: 24, total: 124, fade: 6,
      body: [9, 6, 93.75, 117.5],
      holds: [1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    pressure: {
      src: 'assets/pressure-loop.png', gw: 84, gh: 134, cols: 7, frames: 83, fps: 24, total: 124, fade: 0,
      body: [0.5, 0.75, 83, 132.25],
      holds: [14, 8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 19]
    },
    menubg: {
      tile: [2, 5], gw: 1346, gh: 720, cols: 5, frames: 58, fps: 24, total: 124, fade: 0,
      body: [0, 0, 1346, 720],
      holds: [4, 2, 3, 2, 2, 2, 1, 2, 2, 2, 3, 2, 3, 3, 2, 2, 2, 2, 2, 3, 3, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1, 3, 2, 4, 3, 3, 2]
    },
    playbg: {
      tile: [2, 5], gw: 1346, gh: 720, cols: 8, frames: 47, fps: 24, total: 124, fade: 6,
      body: [0, 0, 1346, 720],
      holds: [5, 4, 2, 2, 3, 2, 2, 1, 2, 3, 3, 4, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 3, 3, 2, 1, 3, 2, 2, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 3, 3, 4, 5, 3]
    },
    // 剑气 P1 抠图（静态单帧，原生格 1070×786，泛洪去底保主体像素）；绘制一律 crisp 最近邻保硬边
    sword: {
      src: 'assets/sword-p1.png', gw: 1070, gh: 786, cols: 1, frames: 1, fps: 24, total: 124, fade: 0,
      body: [0, 0, 1070, 786],
      holds: [124]
    },
    // 大型剑气 8 帧 crescent 动画（原生格 151×250、4列×2行，已带 alpha）；斩5 爆发用，drawIdx + crisp
    swordqi: {
      src: 'assets/swordqi-loop.png', gw: 151, gh: 250, cols: 4, frames: 8, fps: 24, total: 124, fade: 0,
      body: [0, 0, 151, 250],
      holds: [16, 16, 16, 16, 16, 16, 16, 12]
    }
  };
  var ALIAS = { bulb: 'idea' };   // 程序化精灵名 -> 表键（灯泡想法沿用 pixelart 的 'bulb' 名）
  var imgs = {}, ends = {};
  Object.keys(DEF).forEach(function (k) {
    var d = DEF[k];
    if (d.tile) {
      // 大表切成 ≤4096 边的块图（手机单图解码上限）；块按原网格 2列×5行 裁切，帧序不变
      var rows = Math.ceil(d.frames / d.cols);
      d._ntc = Math.ceil(d.cols / d.tile[0]);
      var ntr = Math.ceil(rows / d.tile[1]), arr = [];
      for (var r = 0; r < ntr; r++) for (var c = 0; c < d._ntc; c++) {
        var tm = new Image();
        tm.src = 'assets/' + k + '-t' + r + c + '.png';
        arr.push(tm);
      }
      imgs[k] = arr;
    } else {
      var im = new Image();
      im.src = d.src;
      imgs[k] = im;
    }
    var a = 0;
    ends[k] = d.holds.map(function (h) { a += h; return a; });
  });

  function key(k) { return ALIAS[k] || k; }
  function ready(k) {
    k = key(k); var im = imgs[k];
    if (!im) return false;
    if (Array.isArray(im)) return im.every(function (m) { return m.complete && m.naturalWidth; });
    return !!(im.complete && im.naturalWidth);
  }
  function frameSrc(k, idx) {
    var d = DEF[k], c = idx % d.cols, r = Math.floor(idx / d.cols);
    if (!d.tile) return { im: imgs[k], sx: c * d.gw, sy: r * d.gh };
    var part = Math.floor(r / d.tile[1]) * d._ntc + Math.floor(c / d.tile[0]);
    return { im: imgs[k][part], sx: (c % d.tile[0]) * d.gw, sy: (r % d.tile[1]) * d.gh };
  }
  function period(k) { k = key(k); return DEF[k].total / DEF[k].fps; }

  function frameAt(k, at) {
    k = key(k);
    var d = DEF[k], ft = (at * d.fps) % d.total, i = 0;
    while (i < d.frames - 1 && ft >= ends[k][i]) i++;
    return { i: i, ft: ft };
  }

  /* half: 'L'|'R' 时只画主体左右半（切裂飞散用），裁剪在旋转空间内沿主体中线；
     crisp: 强制最近邻（全屏像素背景用，任何倍率都不许平滑——旧 CSS pixelated 口径） */
  function draw(ctx, k, cx, cy, worldH, rot, at, half, crisp) {
    k = key(k);
    var d = DEF[k];
    if (!ready(k)) return false;
    var f = frameAt(k, at);
    var sc = worldH / d.body[3];
    var dw = d.gw * sc, dh = d.gh * sc;
    var bcx = (d.body[0] + d.body[2] / 2) * sc, bcy = (d.body[1] + d.body[3] / 2) * sc;
    var w = d.fade > 0 && f.ft > d.total - d.fade ? (f.ft - (d.total - d.fade)) / d.fade : 0;
    var a0 = ctx.globalAlpha;                        // 叠加调用方透明度（残影淡出等）
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    if (half) { ctx.beginPath(); ctx.rect(half === 'L' ? -dw : 0, -dh, dw, dh * 2); ctx.clip(); }
    ctx.imageSmoothingEnabled = crisp ? false : (sc < 1 || Math.abs(sc - Math.round(sc)) > 0.02);   // 整数倍放大关平滑保颗粒（03 §4）
    var fr = function (idx, al) {
      var s = frameSrc(k, idx);
      ctx.globalAlpha = a0 * al;
      ctx.drawImage(s.im, s.sx, s.sy, d.gw, d.gh, -bcx, -bcy, dw, dh);
    };
    fr(f.i, 1 - w);
    if (w > 0) fr(0, w);
    ctx.restore();
    return true;
  }

  // 指定帧绘制（剑气生命周期/环绕 blade 用固定帧，不走时间轴）
  function drawIdx(ctx, k, idx, cx, cy, worldH, rot, crisp) {
    k = key(k);
    var d = DEF[k];
    if (!ready(k)) return false;
    var sc = worldH / d.body[3];
    var dw = d.gw * sc, dh = d.gh * sc;
    var bcx = (d.body[0] + d.body[2] / 2) * sc, bcy = (d.body[1] + d.body[3] / 2) * sc;
    var a0 = ctx.globalAlpha;
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    ctx.imageSmoothingEnabled = crisp ? false : (sc < 1 || Math.abs(sc - Math.round(sc)) > 0.02);
    var s = frameSrc(k, idx);
    ctx.drawImage(s.im, s.sx, s.sy, d.gw, d.gh, -bcx, -bcy, dw, dh);
    ctx.restore();
    ctx.globalAlpha = a0;
    return true;
  }

  ZSM.sheets = { def: DEF, ready: ready, draw: draw, drawIdx: drawIdx, period: period, frameAt: frameAt };
})();
