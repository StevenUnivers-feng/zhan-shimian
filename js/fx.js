/* 爽快感(Juice)系统：粒子/刀光拖尾/闪白/残影/hitstop/震屏 */
(function () {
  window.ZSM = window.ZSM || {};
  var parts = [], ghosts = [], flashes = [], trail = [];
  var hitstopLeft = 0, shakeAmp = 0, absorb = [], sparks = [];

  function reset() { parts.length = 0; ghosts.length = 0; flashes.length = 0; trail.length = 0; absorb.length = 0; sparks.length = 0; hitstopLeft = 0; shakeAmp = 0; }

  function burst(x, y, color, n, speed, size) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.3, t: 0, color: color, size: size || 3 });
    }
    if (parts.length > 600) parts.splice(0, parts.length - 600);   // 狂切保护：粒子总量封顶
  }
  function flash(x, y, r) { flashes.push({ x: x, y: y, r: r, t: 0, life: 0.16 }); }
  function ghost(name, x, y, rot, worldH, vx, vy, vrot, life, at) { ghosts.push({ name: name, x: x, y: y, rot: rot || 0, worldH: worldH, vx: vx || 0, vy: vy || 0, vrot: vrot || 0, t: 0, life: life || 0.5, at: at || 0 }); }
  function sparkle(x, y, color, n) { burst(x, y, color, n || 8, 120, 2); }
  function hitstop(sec) { hitstopLeft = Math.max(hitstopLeft, sec); }
  function shake(amp) { shakeAmp = Math.max(shakeAmp, amp); }
  function pushTrail(x, y) { trail.push({ x: x, y: y, t: 0, life: 0.16 }); if (trail.length > 40) trail.shift(); }
  function clearTrail() { trail.length = 0; }
  function suck(x, y, color) { absorb.push({ x: x, y: y, t: 0, life: 0.28, color: color }); }

  // 撞击小火花：短放射线段，快闪快灭
  function spark(x, y, color, n) {
    n = n || 7;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = (90 + Math.random() * 130) * ZSM.view.u;
      sparks.push({ x: x, y: y, a: a, v: v, len: (5 + Math.random() * 5) * ZSM.view.u, t: 0, life: 0.22 + Math.random() * 0.1, color: color || '#FFF3B0' });
    }
    if (sparks.length > 120) sparks.splice(0, sparks.length - 120);
  }

  function update(dt) {
    var i;
    if (hitstopLeft > 0) hitstopLeft -= dt;
    shakeAmp *= Math.pow(0.001, dt); if (shakeAmp < 0.1) shakeAmp = 0;
    for (i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.t += dt; if (p.t >= p.life) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.vx *= 0.98; }
    for (i = ghosts.length - 1; i >= 0; i--) { var g = ghosts[i]; g.t += dt; if (g.t >= g.life) { ghosts.splice(i, 1); continue; } g.x += g.vx * dt; g.y += g.vy * dt; g.rot += g.vrot * dt; }
    for (i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t >= flashes[i].life) flashes.splice(i, 1); }
    for (i = trail.length - 1; i >= 0; i--) { trail[i].t += dt; if (trail[i].t >= trail[i].life) trail.splice(i, 1); }
    for (i = absorb.length - 1; i >= 0; i--) { absorb[i].t += dt; if (absorb[i].t >= absorb[i].life) absorb.splice(i, 1); }
    for (i = sparks.length - 1; i >= 0; i--) {
      var sk = sparks[i]; sk.t += dt;
      if (sk.t >= sk.life) { sparks.splice(i, 1); continue; }
      sk.x += Math.cos(sk.a) * sk.v * dt; sk.y += Math.sin(sk.a) * sk.v * dt;
    }
  }

  /* 残影走抠像表；名字带 L/R 后缀的是切裂半块，裁主体中线（06 §4）。表未就绪回退程序化精灵 */
  function drawGhost(ctx, g) {
    var m = /^(\w+?)([LR])$/.exec(g.name);
    var base = m ? m[1] : g.name;
    if (ZSM.sheets.draw(ctx, base, g.x, g.y, g.worldH, g.rot, g.at, m ? m[2] : null)) return;
    ZSM.pixelart.draw(ctx, g.name, g.x, g.y, g.worldH, g.rot);
  }

  function render(ctx) {
    var i, u = ZSM.view.u;
    // 刀光拖尾
    if (trail.length > 1) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'lighter';
      for (i = 1; i < trail.length; i++) {
        var a = trail[i - 1], b = trail[i];
        var k = 1 - b.t / b.life;
        ctx.strokeStyle = 'rgba(79,216,210,' + (0.55 * k).toFixed(3) + ')';
        ctx.lineWidth = Math.max(1, 10 * u * k);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.restore();
    }
    // 残影/飞散半块
    for (i = 0; i < ghosts.length; i++) {
      var g = ghosts[i];
      ctx.save(); ctx.globalAlpha = 1 - g.t / g.life;
      drawGhost(ctx, g);
      ctx.restore();
    }
    // 粒子
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      ctx.save(); ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.color;
      var s = Math.max(1, p.size * u);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      ctx.restore();
    }
    // 闪白
    for (i = 0; i < flashes.length; i++) {
      var f = flashes[i];
      var k2 = 1 - f.t / f.life;
      ZSM.pixelart.glow(ctx, f.x, f.y, f.r * (0.6 + 0.6 * (1 - k2)), '#FFFFFF', 0.8 * k2);
    }
    // 收藏吸入环
    for (i = 0; i < absorb.length; i++) {
      var ab = absorb[i];
      var k3 = ab.t / ab.life;
      ctx.save(); ctx.globalAlpha = 1 - k3; ctx.strokeStyle = ab.color; ctx.lineWidth = Math.max(1, 3 * u);
      ctx.beginPath(); ctx.arc(ab.x, ab.y, (6 + 26 * k3) * u, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    // 撞击小火花
    for (i = 0; i < sparks.length; i++) {
      var sk2 = sparks[i];
      var k4 = 1 - sk2.t / sk2.life;
      ctx.save(); ctx.globalAlpha = k4; ctx.strokeStyle = sk2.color; ctx.lineWidth = Math.max(1, 2 * u);
      ctx.beginPath();
      ctx.moveTo(sk2.x, sk2.y);
      ctx.lineTo(sk2.x - Math.cos(sk2.a) * sk2.len * k4, sk2.y - Math.sin(sk2.a) * sk2.len * k4);
      ctx.stroke(); ctx.restore();
    }
  }

  ZSM.fx = {
    reset: reset, update: update, render: render,
    burst: burst, flash: flash, ghost: ghost, sparkle: sparkle, spark: spark,
    hitstop: hitstop, shake: shake, pushTrail: pushTrail, clearTrail: clearTrail, suck: suck,
    get hitstopLeft() { return hitstopLeft; },
    get shakeAmp() { return shakeAmp; },
    get counts() { return { parts: parts.length, ghosts: ghosts.length, flashes: flashes.length, trail: trail.length, absorb: absorb.length, sparks: sparks.length }; }
  };
})();
