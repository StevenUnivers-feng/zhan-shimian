/* 场景状态机 + 对局逻辑 + HUD 绘制 */
(function () {
  window.ZSM = window.ZSM || {};
  ZSM.hud = {};
  var scenes = ZSM.scenes = { current: 'start', play: null };
  Object.defineProperty(ZSM, 'play', { get: function () { return scenes.play; } });
  var field = null;
  var menuT = 0;

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* 对局用夜空场（程序化，分辨率无关；进行页背景表就绪前的兜底） */
  function buildField() {
    var v = ZSM.view, i;
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(v.w * v.dpr)); c.height = Math.max(1, Math.round(v.h * v.dpr));
    var g = c.getContext('2d');
    g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    var grad = g.createLinearGradient(0, 0, 0, v.h);
    grad.addColorStop(0, '#1B1035'); grad.addColorStop(1, '#2A1A4D');
    g.fillStyle = grad; g.fillRect(0, 0, v.w, v.h);
    var rnd = mulberry(20261117);
    var n = Math.round(v.w * v.h / 16000);
    for (i = 0; i < n; i++) {
      var x = rnd() * v.w, y = rnd() * v.h * 0.85, s = rnd() < 0.85 ? 1.4 : 2.4, a = 0.22 + rnd() * 0.5;
      g.fillStyle = rnd() < 0.7 ? 'rgba(143,123,216,' + a.toFixed(2) + ')' : 'rgba(245,242,255,' + a.toFixed(2) + ')';
      g.fillRect(x, y, s, s);
    }
    var mr = Math.min(v.w, v.h) * 0.07, mx = v.w * 0.12, my = v.h * 0.16;
    var mg = g.createRadialGradient(mx, my, 0, mx, my, mr * 3);
    mg.addColorStop(0, 'rgba(245,233,200,0.35)'); mg.addColorStop(1, 'rgba(245,233,200,0)');
    g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr * 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#F5E9C8'; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(210,195,160,0.6)';
    g.beginPath(); g.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.18, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.13, 0, Math.PI * 2); g.fill();
    field = c;
  }

  function sleeperPos() {
    var v = ZSM.view;
    var worldH = 150 * v.u;
    return { x: v.w * 0.5, y: v.h * 0.58, worldH: worldH, r: worldH * 0.36 };
  }

  function buildQueue(level) {
    var q = [];
    level.spawns.forEach(function (ev) {
      if (ev.groups) {                                  // 分区出生波（02 权威表）：展开为带百分比坐标的队列项
        var ex = ZSM.levels.expand(ev);
        for (var g = 0; g < ex.length; g++) q.push(ex[g]);
        return;
      }
      ev.items.forEach(function (it) {
        var n = ZSM.levels.rndCount(it.count);
        if (it.pool) {
          for (var k = 0; k < n; k++) q.push({ t: ev.t, travel: ev.travel, xf: ev.xf, spread: ev.spread, type: it.pool[Math.floor(Math.random() * it.pool.length)] });
        } else {
          for (var j = 0; j < n; j++) q.push({ t: ev.t, travel: ev.travel, xf: ev.xf, spread: ev.spread, type: it.type });
        }
      });
    });
    q.sort(function (a, b) { return a.t - b.t; });
    return q;
  }

  function startLevel(id) {
    var level = ZSM.levels.get(id);
    if (!level) return;
    ZSM.fx.reset();
    ZSM.ui.closeAllModals();
    var th = document.getElementById('tut-hint'); if (th) th.classList.add('hidden');
    var endless = !!level.endless;
    scenes.play = {
      levelId: id, level: level, t: 0, duration: endless ? Infinity : level.duration,
      endless: endless, nextWaveT: 0, nextIdeaT: 12,
      entities: [], queue: buildQueue(level), qi: 0,
      hearts: 6, state: 'run', sleeper: sleeperPos(), hurtT: 0, animT: 0,
      cnt: { d: 0, i: 0 }, tornadoTrig: 0, tornado: null, bursts: [], lastKill: null,
      tut: (id === 1 && !parseInt(ZSM.storage.get('zsm_tut', 0), 10)) ? { stage: 0 } : null
    };
    scenes.current = 'play';
    ZSM.ui.showScreen('play');
    ZSM.ui.setPlaying(true);
  }

  /* 单个队列项落点投影 + 生成（正常波与无限波共用） */
  function spawnItem(p, s) {
    var v = ZSM.view, x, y;
    if (s.px !== undefined) {                         // 分区出生：框最近的游戏边界落点（levels.js expand 已投影）
      var jx = (Math.random() - 0.5) * (s.cl ? 6 : 1.6), jy = (Math.random() - 0.5) * (s.cl ? 6 : 1.6);
      x = v.w * (s.px + jx) / 100;
      y = v.h * (s.py + jy) / 100;
    } else {
      if (s.xf !== undefined) x = v.w * Math.min(0.9, Math.max(0.1, s.xf + (Math.random() - 0.5) * (s.spread || 0.1)));   // 簇出生
      else x = v.w * (0.10 + Math.random() * 0.80);
      y = -ZSM.entities.WORLD_H[s.type] * v.u;
    }
    if (p.levelId === 1 && s.px === undefined) {      // 教学关：每类首个固定出生点（重玩轨迹一致）
      p.firstOf = p.firstOf || {};
      if (!p.firstOf[s.type]) {
        p.firstOf[s.type] = 1;
        x = v.w * (s.type === 'desire' ? 0.72 : s.type === 'idea' ? 0.30 : 0.62);
      }
    }
    p.entities.push(ZSM.entities.make(s.type, x, y, s.travel, p.sleeper));
  }

  /* 无限关波次调度：先易后难——t<60 间隔 2.6→1.5s；t>=60 间隔 1.2→0.5s（比第三关更密）；每 18s 一波想法奖励 */
  function updateEndless(p) {
    while (p.t >= p.nextWaveT) {
      var items = ZSM.levels.endlessSpawns(p.nextWaveT);
      for (var i = 0; i < items.length; i++) spawnItem(p, items[i]);
      var t = p.nextWaveT;
      p.nextWaveT += t >= 60 ? Math.max(0.5, 1.2 - (t - 60) * 0.01) : Math.max(1.5, 2.6 - t * 0.018);
    }
    if (p.t >= p.nextIdeaT) {
      var iw = ZSM.levels.expand({ t: p.t, travel: 5, groups: [
        { at: [47, 12], type: 'idea', count: 3, shape: 'row' },
        { at: [6, 45], type: 'idea', count: 2, shape: 'col' },
        { at: [94, 45], type: 'idea', count: 2, shape: 'col' }
      ] });
      for (var k = 0; k < iw.length; k++) spawnItem(p, iw[k]);
      p.nextIdeaT += 18;
    }
  }

  function goSelect() { scenes.play = null; scenes.current = 'select'; ZSM.ui.closeAllModals(); var th = document.getElementById('tut-hint'); if (th) th.classList.add('hidden'); ZSM.ui.showScreen('select'); ZSM.ui.setPlaying(false); ZSM.fx.reset(); }
  function goStart() { scenes.play = null; scenes.current = 'start'; ZSM.ui.closeAllModals(); var th = document.getElementById('tut-hint'); if (th) th.classList.add('hidden'); ZSM.ui.showScreen('start'); ZSM.ui.setPlaying(false); ZSM.fx.reset(); }
  function restart() { var id = scenes.play ? scenes.play.levelId : 1; startLevel(id); }
  function nextLevel() { var id = scenes.play.levelId; if (id < ZSM.levels.MADE) startLevel(id + 1); else goSelect(); }
  function togglePause() { var p = scenes.play; if (!p) return; if (p.state === 'run') { p.state = 'pause'; ZSM.ui.openModal('mdl-pause'); } else if (p.state === 'pause') resume(); }
  function resume() { var p = scenes.play; if (!p) return; ZSM.ui.closeModal('mdl-pause'); if (p.state === 'pause') p.state = 'run'; }

  function win() {
    var p = scenes.play; p.state = 'win';
    var max = ZSM.ui.unlockedMax();
    if (p.levelId === max && p.levelId < ZSM.levels.MADE) { ZSM.storage.set('zsm_unlock', p.levelId + 1); ZSM.ui.refreshGrid(); }
    ZSM.audio.sfx('win');
    ZSM.ui.openModal('mdl-win');
  }
  function fail() {
    var p = scenes.play; p.state = 'fail';
    ZSM.audio.sfx('fail');
    ZSM.ui.openModal('mdl-fail');
  }

  function damage(p, e) {
    var u = ZSM.view.u;
    e.state = 'dead';
    p.hearts = Math.max(0, p.hearts - 1);
    p.hurtT = 0.35;
    ZSM.fx.burst(e.x, e.y, '#FF4D4D', 14, 240 * u, 3);
    ZSM.fx.flash(p.sleeper.x, p.sleeper.y, p.sleeper.worldH);
    ZSM.fx.hitstop(0.05); ZSM.fx.shake(4 * u);
    ZSM.audio.sfx('hurt');
  }

  /* 第一关教学（补充 docx：只第一次进入弹提示；重玩保留固定轨迹） */
  var TUT_TEXT = [
    '划过爱心，把它切碎',
    '点击灯泡，收集想法',
    '按住石头拖拽，甩出压力'
  ];
  var TUT_TYPE = ['desire', 'idea', 'pressure'];

  /* 手势小图标：实体精灵 + 手势overlay（划/点/拖），与背景资产同精度 */
  var tutIconCache = {};
  function tutIcon(type) {
    if (tutIconCache[type]) return tutIconCache[type];
    var c = document.createElement('canvas'); c.width = 32; c.height = 32;
    var g = c.getContext('2d');
    var key = type === 'desire' ? 'desire' : type === 'idea' ? 'bulb' : 'pressure';
    if (!ZSM.sheets.draw(g, key, 15, 17, 24, 0, 0)) ZSM.pixelart.draw(g, key, 15, 17, 22, 0);
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (type === 'desire') {                              // 划：白色斜切线 + 青色双向箭头
      g.strokeStyle = '#F5F2FF'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(5, 27); g.lineTo(27, 5); g.stroke();
      g.strokeStyle = '#4FD8D2'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(27, 5); g.lineTo(22, 6); g.moveTo(27, 5); g.lineTo(26, 10); g.stroke();
      g.beginPath(); g.moveTo(5, 27); g.lineTo(10, 26); g.moveTo(5, 27); g.lineTo(6, 22); g.stroke();
    } else if (type === 'idea') {                         // 点：暖黄点击环 + 中心点
      g.strokeStyle = '#FFF3B0'; g.lineWidth = 2;
      g.beginPath(); g.arc(16, 16, 12, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#FFF3B0'; g.fillRect(15, 15, 3, 3);
    } else {                                              // 拖：青色拖拽箭头（指向右上）
      g.strokeStyle = '#4FD8D2'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(10, 24); g.lineTo(24, 10); g.stroke();
      g.beginPath(); g.moveTo(24, 10); g.lineTo(18, 11); g.moveTo(24, 10); g.lineTo(23, 16); g.stroke();
    }
    var c2 = document.createElement('canvas'); c2.width = 96; c2.height = 96;
    var g2 = c2.getContext('2d'); g2.imageSmoothingEnabled = false;
    g2.drawImage(c, 0, 0, 96, 96);
    tutIconCache[type] = c2.toDataURL();
    return tutIconCache[type];
  }

  function buildTutHint(hint, stage) {
    hint.innerHTML = '';
    var head = document.createElement('div'); head.className = 'tut-head';
    for (var s = 0; s < TUT_TYPE.length; s++) {
      var d = document.createElement('img'); d.className = 'tut-dot'; d.alt = '';
      d.src = ZSM.pixeltext.star(s === stage ? '#FFF3B0' : '#5A4A66', 2);
      head.appendChild(d);
    }
    hint.appendChild(head);
    var row = document.createElement('div'); row.className = 'tut-row';
    var ic = document.createElement('img'); ic.className = 'tut-icon'; ic.alt = '';
    ic.src = tutIcon(TUT_TYPE[stage]);
    row.appendChild(ic);
    var tx = document.createElement('div'); tx.className = 'tut-text';
    tx.setAttribute('data-pt', TUT_TEXT[stage]);
    ZSM.pixeltext.apply(tx, { size: 16, k: 2, h: 22, color: '#F5F2FF', stroke: '#14101F' });
    row.appendChild(tx);
    var ar = document.createElement('img'); ar.className = 'tut-arrow'; ar.alt = '';
    ar.src = ZSM.pixeltext.raster('▶', { size: 12, k: 2, color: '#FFF3B0', stroke: '#14101F' });
    row.appendChild(ar);
    hint.appendChild(row);
    ZSM.uibtn.reg(hint);
  }

  function updateTut(p) {
    if (!p.tut) return false;
    var hint = document.getElementById('tut-hint');
    var type = TUT_TYPE[p.tut.stage];
    if (!p.firstOf || !p.firstOf[type]) {             // 本阶段目标尚未生成，世界照常
      if (hint) hint.classList.add('hidden');
      return false;
    }
    var target = null;
    for (var i = 0; i < p.entities.length; i++) {
      if (p.entities[i].type === type && p.entities[i].state === 'home') { target = p.entities[i]; break; }
    }
    if (!target) {                                    // 本阶段目标已处理，进入下一阶段
      p.tut.stage++;
      if (hint) hint.classList.add('hidden');
      if (p.tut.stage >= TUT_TYPE.length) { ZSM.storage.set('zsm_tut', 1); p.tut = null; }
      return false;
    }
    if (target.age < 2) { if (hint) hint.classList.add('hidden'); return false; }
    if (hint) {                                       // 定格世界，提示框贴在实体左侧
      var u = ZSM.view.u;
      var changed = hint.getAttribute('data-stage') !== String(p.tut.stage);
      if (changed) {
        hint.setAttribute('data-stage', String(p.tut.stage));
        try { buildTutHint(hint, p.tut.stage); }
        catch (err) {                                   // 兜底：图标/合成失败也保证教学文字可见（缺陷 21）
          console.error('[ZSM] tut hint error', err);
          hint.innerHTML = '';
          hint.setAttribute('data-pt', TUT_TEXT[p.tut.stage]);
          ZSM.pixeltext.apply(hint, { size: 16, k: 2, h: 22, color: '#F5F2FF', stroke: '#14101F' });
          ZSM.uibtn.reg(hint);
        }
      }
      hint.classList.remove('hidden');
      if (changed) { try { ZSM.uibtn.paint(hint); } catch (err) { console.error('[ZSM] tut paint error', err); } }
      hint.style.left = Math.max(8, target.x - 24 * u) + 'px';
      hint.style.top = target.y + 'px';
    }
    return true;
  }

  /* 升级特效：旋风 / 四向剑气爆发 / 环绕剑气（斩路线） */
  function triggerTornado(p) {
    var at = p.lastKill || { x: p.sleeper.x, y: p.sleeper.y - p.sleeper.worldH };
    p.tornado = { x: at.x, y: at.y, t: 0 };
    ZSM.audio.sfx('fling');
    if (ZSM.upg.lv('zhan') >= 5) {                    // 剑气爆发：切点四向放大剑气
      for (var i = 0; i < 4; i++) {
        p.bursts.push({ x: at.x, y: at.y, ang: i * Math.PI / 2 + Math.PI / 4, t: 0 });
      }
    }
  }

  function killSoft(p, e) {                           // 剑气/旋风接触处理：欲望切碎、想法收集、压力爆裂（被动，不计触发）
    if (e.type === 'desire') ZSM.input.sliceIt(e, e.x - 10, e.y, e.x + 10, e.y, true);
    else if (e.type === 'idea') ZSM.input.collect(e, true, true);
    else {
      e.state = 'dead';
      ZSM.fx.burst(e.x, e.y, '#4FD8D2', 10, 160, 3);
      ZSM.audio.sfx('pop');
    }
  }

  function updateUpgFx(p, dt) {
    var u = ZSM.view.u, i;
    // 触发判定：每满 15 计数触发一次（斩2 起把想法也计入）
    var total = ZSM.upg.lv('zhan') >= 2 ? p.cnt.d + p.cnt.i : p.cnt.d;
    var trig = Math.floor(total / 15);
    if (ZSM.upg.lv('zhan') >= 1 && trig > p.tornadoTrig) { p.tornadoTrig = trig; triggerTornado(p); }

    // 旋风：2.5 秒，吸入 180u 内的 home 欲望/想法，接触即处理
    if (p.tornado) {
      var tn = p.tornado; tn.t += dt;
      var rr = 180 * u;
      for (i = 0; i < p.entities.length; i++) {
        var e = p.entities[i];
        if (e.state !== 'home' || e.type === 'pressure') continue;
        var dx = tn.x - e.x, dy = tn.y - e.y, d = Math.hypot(dx, dy);
        if (d < e.r + 12 * u) { killSoft(p, e); continue; }
        if (d < rr) { e.x += dx / d * 340 * u * dt; e.y += dy / d * 340 * u * dt; }
      }
      if (tn.t >= 2.5) p.tornado = null;
    }

    // 四向剑气爆发：1.2 秒寿命，外飞，沿途切碎
    for (i = p.bursts.length - 1; i >= 0; i--) {
      var b = p.bursts[i]; b.t += dt;
      b.x += Math.cos(b.ang) * 420 * u * dt;
      b.y += Math.sin(b.ang) * 420 * u * dt;
      var br = 60 * u;
      for (var j = 0; j < p.entities.length; j++) {
        var e2 = p.entities[j];
        if (e2.state !== 'home') continue;
        if (Math.hypot(e2.x - b.x, e2.y - b.y) < br + e2.r) killSoft(p, e2);
      }
      if (b.t >= 1.2) p.bursts.splice(i, 1);
    }

    // 环绕剑气：斩3 一道，斩4 三道
    var zl = ZSM.upg.lv('zhan');
    if (zl >= 3) {
      var n = zl >= 4 ? 3 : 1;
      var rad = p.sleeper.worldH * 0.75;
      for (i = 0; i < n; i++) {
        var a = p.animT * 2.2 + i * Math.PI * 2 / n;
        var bx = p.sleeper.x + Math.cos(a) * rad * 1.6;
        var by = p.sleeper.y + Math.sin(a) * rad;
        p.orbit = p.orbit || [];
        p.orbit[i] = { x: bx, y: by, ang: a + Math.PI / 2, n: n };
        var or = 34 * u;
        for (var k = 0; k < p.entities.length; k++) {
          var e3 = p.entities[k];
          if (e3.state !== 'home' || e3.type === 'pressure') continue;
          if (Math.hypot(e3.x - bx, e3.y - by) < or + e3.r) killSoft(p, e3);
        }
      }
      p.orbit.length = n;
    }
  }

  function drawUpgFx(ctx, p) {
    var u = ZSM.view.u, i;
    if (p.tornado) {                                  // 旋风：旋转的三道弧 + 吸入粒子感
      var tn = p.tornado, k = 1 - tn.t / 2.5;
      ctx.save();
      ctx.translate(tn.x, tn.y);
      ctx.rotate(tn.t * 14);
      ctx.strokeStyle = 'rgba(205,163,252,' + (0.8 * k).toFixed(2) + ')';
      ctx.lineWidth = Math.max(2, 4 * u);
      for (i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, (26 + i * 26) * u * (0.6 + 0.4 * k), i * 2.1, i * 2.1 + 1.7);
        ctx.stroke();
      }
      ctx.restore();
    }
    var SB = Math.atan2(786, 1070);                   // P1 剑身固有斜角补偿（使剑尖指向运动方向）
    for (i = 0; i < p.bursts.length; i++) {           // 爆发剑气（斩5）：大型剑气 8 帧动画 + 反向渐隐拖尾
      var b = p.bursts[i];
      var idx = Math.min(7, Math.floor(b.t / 1.2 * 8));
      for (var tk = 2; tk >= 1; tk--) {
        ctx.globalAlpha = tk === 2 ? 0.14 : 0.3;
        ZSM.sheets.drawIdx(ctx, 'swordqi', idx, b.x - Math.cos(b.ang) * tk * 20 * u, b.y - Math.sin(b.ang) * tk * 20 * u, 150 * u * (1 - 0.12 * tk), b.ang + Math.PI / 2, true);
      }
      ctx.globalAlpha = 1;
      ZSM.sheets.drawIdx(ctx, 'swordqi', idx, b.x, b.y, 150 * u, b.ang + Math.PI / 2, true);
    }
    if (p.orbit) {                                    // 环绕剑气（斩3/4）：P1 剑 + 弧形渐隐拖尾
      var rad = p.sleeper.worldH * 0.75;
      for (i = 0; i < p.orbit.length; i++) {
        var o = p.orbit[i];
        var a0 = o.ang - Math.PI / 2;
        for (var ok = 2; ok >= 1; ok--) {
          var ak = a0 - ok * 0.22;
          ctx.globalAlpha = ok === 2 ? 0.14 : 0.3;
          ZSM.sheets.draw(ctx, 'sword', p.sleeper.x + Math.cos(ak) * rad * 1.6, p.sleeper.y + Math.sin(ak) * rad, 60 * u * (1 - 0.12 * ok), ak + Math.PI / 2 + SB, 0, null, true);
        }
        ctx.globalAlpha = 1;
        ZSM.sheets.draw(ctx, 'sword', o.x, o.y, 60 * u, o.ang + SB, 0, null, true);
      }
    }
  }

  function update(dt) {
    var p = scenes.play;
    if (scenes.current !== 'play' || !p) { menuT += dt; ZSM.fx.update(dt); return; }
    if (p.state === 'pause') return;                 // 真暂停：世界与特效全冻
    var heldE = ZSM.input.getHeld();
    if (heldE && ZSM.upg.lv('zhuai') >= 1) return;    // 时停（拽1）：拉弓瞄准时全世界停摆
    ZSM.fx.update(dt);
    if (p.state !== 'run') return;
    if (ZSM.fx.hitstopLeft > 0) return;               // hitstop：世界冻结但输入仍记录
    if (updateTut(p)) return;                         // 教学定格：世界冻结，仅提示框跟随
    p.animT += dt;                                    // 场景动画钟：暂停/时停时不走
    var u = ZSM.view.u, i, j;
    p.t += dt;
    if (p.hurtT > 0) p.hurtT -= dt;

    // 生成
    if (p.endless) updateEndless(p);
    while (p.qi < p.queue.length && p.queue[p.qi].t <= p.t) spawnItem(p, p.queue[p.qi++]);

    // 实体更新
    for (i = 0; i < p.entities.length; i++) ZSM.entities.update(p.entities[i], dt, p);

    // 升级特效（旋风/爆发剑气/环绕剑气 + 计数触发）
    updateUpgFx(p, dt);

    // 台球碰撞（运动方 vs 其余）；碾压（拽5）改为直接碎裂
    for (i = 0; i < p.entities.length; i++) {
      var a = p.entities[i];
      if (a.state !== 'flung' && a.state !== 'knocked') continue;
      for (j = 0; j < p.entities.length; j++) {
        if (i === j) continue;
        var b = p.entities[j];
        if (b.state === 'dead' || b.state === 'held') continue;
        if (ZSM.physics.resolveCollision(a, b)) {
          ZSM.fx.flash((a.x + b.x) / 2, (a.y + b.y) / 2, (a.r + b.r) * 0.8);
          ZSM.fx.burst((a.x + b.x) / 2, (a.y + b.y) / 2, '#F5F2FF', 10, 220 * u, 3);
          ZSM.fx.spark((a.x + b.x) / 2, (a.y + b.y) / 2, '#FFF3B0', 8);
          ZSM.fx.hitstop(0.02); ZSM.fx.shake(1.5 * u);
          ZSM.audio.sfx('collide');
        }
      }
    }

    // 命中小人
    for (i = 0; i < p.entities.length; i++) {
      var e = p.entities[i];
      if (e.state === 'dead' || e.state === 'held') continue;
      if (e.state === 'knocked' && ZSM.upg.lv('zhuai') >= 5) continue;   // 护眠（拽5）：被撞飞物不伤小人
      if (ZSM.entities.touchSleeper(e, p.sleeper)) damage(p, e);
    }

    // 清理
    p.entities = p.entities.filter(function (e) { return e.state !== 'dead'; });

    // 胜负
    if (p.hearts <= 0) fail();
    else if (p.t >= p.duration) win();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* HUD 像素字（无限关生存计时/计数）：raster dataURL 缓存为 Image，就绪后 nearest 绘制 */
  var hudImgCache = {};
  function drawHudText(ctx, str, cx, cy, hpx, color) {
    var key = str + '|' + color;
    var img = hudImgCache[key];
    if (!img) { img = new Image(); img.src = ZSM.pixeltext.raster(str, { size: 14, k: 2, color: color, stroke: '#14101F' }); hudImgCache[key] = img; }
    if (!img.complete || !img.naturalWidth) return;
    var ww = img.naturalWidth * (hpx / img.naturalHeight);
    ctx.drawImage(img, cx - ww / 2, cy - hpx / 2, ww, hpx);
  }

  function drawHUD(ctx, p) {
    var v = ZSM.view, u = v.u, w = v.w, h = v.h;
    // 进度条（像素四层：暗棕描边+黄铜环+深紫木纹槽+薰衣草梦光；色板承背景木棕/铜金/夜紫/星黄）
    var bw = w * 0.64, bx = w * 0.18, by = h * 0.045, bh = Math.max(8, h * 0.034);
    var endless = !!p.endless;
    var prog = endless ? 0 : Math.min(1, p.t / p.duration);
    var at = p.animT || 0;
    ctx.save();
    var o = Math.max(1, 1.5 * u), i2 = Math.max(2, 2.5 * u);
    ctx.fillStyle = '#442505'; roundRect(ctx, bx - o, by - o, bw + 2 * o, bh + 2 * o, bh / 2 + o); ctx.fill();   // 1 外描边
    ctx.fillStyle = '#EDD116'; roundRect(ctx, bx, by, bw, bh, bh / 2); ctx.fill();                              // 2 黄铜环
    ctx.save(); roundRect(ctx, bx, by, bw, bh, bh / 2); ctx.clip();
    ctx.fillStyle = '#FFE873'; ctx.fillRect(bx, by, bw, Math.max(1, bh * 0.18));                                // 环顶高光
    ctx.fillStyle = '#B89A0E'; ctx.fillRect(bx, by + bh - Math.max(1, bh * 0.2), bw, Math.max(1, bh * 0.2));    // 环底阴影
    ctx.restore();
    var tx = bx + i2, ty = by + i2, tw = bw - 2 * i2, th = bh - 2 * i2;
    ctx.fillStyle = '#2A1D45'; roundRect(ctx, tx, ty, tw, th, th / 2); ctx.fill();                              // 3 深紫槽
    ctx.save(); roundRect(ctx, tx, ty, tw, th, th / 2); ctx.clip();
    ctx.fillStyle = '#221737';
    for (var gy = ty + 2 * u; gy < ty + th; gy += 3 * u) ctx.fillRect(tx, gy, tw, Math.max(1, u));              // 木纹横纹
    ctx.fillStyle = '#1B1035';
    for (var k = 1; k < 10; k++) ctx.fillRect(tx + tw * k / 10, ty, Math.max(1, u), th);                        // 十分刻度
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(tx, ty, tw, Math.max(1, th * 0.25));                      // 槽顶内阴影
    if (!endless) {                                                                                            // 4 薰衣草梦光填充
      var pw = tw * prog;
      if (pw > th) {
        ctx.fillStyle = '#CDA3FC'; roundRect(ctx, tx, ty, pw, th, th / 2); ctx.fill();
        ctx.save(); roundRect(ctx, tx, ty, pw, th, th / 2); ctx.clip();
        ctx.fillStyle = 'rgba(228,185,255,0.75)'; ctx.fillRect(tx, ty, pw, th * 0.32);
        ctx.fillStyle = '#A87FE0'; ctx.fillRect(tx, ty + th - Math.max(1, th * 0.22), pw, Math.max(1, th * 0.22));
        ctx.restore();
      }
    } else {                                                                                                   // 无限关：循环梦波
      ctx.fillStyle = 'rgba(205,163,252,0.30)';
      for (var wx = tx; wx < tx + tw; wx += 2 * u) {
        var wy = ty + th * 0.5 + Math.sin(wx / (14 * u) + at * 2) * th * 0.22;
        ctx.fillRect(wx, wy, 2 * u, Math.max(1, th * 0.18));
      }
    }
    ctx.restore();
    var dx = endless ? tx + tw * ((at * 0.06) % 1) : bx + bw * prog;
    // 走过路径上的闪闪星星（暖黄+十字芒）
    var si = 0;
    for (var sx = bx + 12 * u; sx < dx - 8 * u; sx += 34 * u, si++) {
      ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(at * 3 + si * 1.7));
      ZSM.pixelart.draw(ctx, 'star4', sx, by + bh / 2 + (si % 2 ? -1 : 1) * bh * 1.05, bh * 1.15, 0);
      ctx.globalAlpha *= 0.55;                                       // 十字芒
      ZSM.pixelart.draw(ctx, 'star4', sx, by + bh / 2 + (si % 2 ? -1 : 1) * bh * 1.05, bh * 1.9, Math.PI / 4);
    }
    ctx.globalAlpha = 1;
    // 戴睡帽的月亮进度点 + 暖光晕
    ZSM.pixelart.glow(ctx, dx, by + bh / 2, bh * 2.2, '#FFF3B0', 0.30 + 0.12 * Math.sin(at * 2));
    ZSM.pixelart.draw(ctx, 'mooncap', dx, by + bh / 2, bh * 3.4, Math.sin(at * 2) * 0.16);
    if (endless) {
      drawHudText(ctx, '生存 ' + Math.floor(p.t) + 's', bx + bw / 2, by + bh / 2, bh * 1.1, '#F5F2FF');
      drawHudText(ctx, '斩 ' + p.cnt.d + '  想 ' + p.cnt.i, bx + bw / 2, by + bh + 12 * u, bh * 0.8, '#FFF3B0');
    }
    ctx.restore();
    ZSM.hud.barRect = { x: bx, y: by, w: bw, h: bh };

    // 暂停按钮（右上）
    var s = Math.min(w, h) * 0.075;
    var px = w - s - 24 * u, py = 20 * u;
    ctx.save();
    // 暂停钮（按钮语言缩微版：暗棕描边+金环+内暗线+薰衣草底，暗棕双竖）
    var g1 = Math.max(1, s * 0.07), g2 = Math.max(2, s * 0.14);
    ctx.fillStyle = '#442505'; roundRect(ctx, px - o, py - o, s + 2 * o, s + 2 * o, s * 0.22 + o); ctx.fill();
    ctx.fillStyle = '#EDD116'; roundRect(ctx, px, py, s, s, s * 0.22); ctx.fill();
    ctx.fillStyle = '#442505'; roundRect(ctx, px + g1, py + g1, s - 2 * g1, s - 2 * g1, (s - 2 * g1) * 0.2); ctx.fill();
    ctx.fillStyle = '#CDA3FC'; roundRect(ctx, px + g2, py + g2, s - 2 * g2, s - 2 * g2, (s - 2 * g2) * 0.18); ctx.fill();
    ctx.fillStyle = 'rgba(228,185,255,0.75)';
    ctx.fillRect(px + g2, py + g2, s - 2 * g2, (s - 2 * g2) * 0.22);
    ctx.fillStyle = '#442505';
    roundRect(ctx, px + s * 0.30, py + s * 0.26, s * 0.14, s * 0.48, s * 0.07); ctx.fill();
    roundRect(ctx, px + s * 0.56, py + s * 0.26, s * 0.14, s * 0.48, s * 0.07); ctx.fill();
    ctx.restore();
    ZSM.hud.pauseRect = { x: px, y: py, w: s, h: s };

    // 生命爱心（底部居中，满/半/空）
    var hh = 40 * u, gap = 62 * u, cx = w * 0.5, cy = h * 0.93;
    for (var i = 0; i < 3; i++) {
      var units = p.hearts - i * 2;                 // 该心剩余半心数 0/1/2
      var name = units >= 2 ? 'heartFull' : (units === 1 ? 'heartHalf' : 'heartEmpty');
      ZSM.pixelart.draw(ctx, name, cx + (i - 1) * gap, cy, hh, 0);
    }
  }

  function drawAim(ctx, p) {
    var held = ZSM.input.getHeld(), grab = ZSM.input.getGrab(), aim = ZSM.input.getAim();
    if (!held || !grab || !aim) return;
    var u = ZSM.view.u;
    var dx = aim.x - grab.x, dy = aim.y - grab.y;
    var md = ZSM.physics.maxDrag();
    var dl = Math.hypot(dx, dy);
    if (dl > md) { dx = dx / dl * md; dy = dy / dl * md; }   // 射程钳制：超过满弓不再增益
    var lv = ZSM.physics.launchVelocity(dx, dy);
    ctx.save();
    // 射程环（满弓半径，拉弓时常驻提示）
    ctx.strokeStyle = 'rgba(205,163,252,0.28)';
    ctx.lineWidth = Math.max(1, 2 * u);
    ctx.setLineDash([6 * u, 8 * u]);
    ctx.beginPath(); ctx.arc(grab.x, grab.y, md, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([8 * u, 6 * u]);
    ctx.strokeStyle = 'rgba(79,216,210,0.85)';
    ctx.lineWidth = Math.max(1, 3 * u);
    var len = (lv ? lv.power : 0.12) * Math.min(ZSM.view.w, ZSM.view.h) * 0.28;
    var l = Math.hypot(dx, dy) || 1;
    var nx = -dx / l, ny = -dy / l;
    ctx.beginPath(); ctx.moveTo(held.x, held.y); ctx.lineTo(held.x + nx * len, held.y + ny * len); ctx.stroke();
    ctx.setLineDash([]);
    // 拉满形变提示
    ctx.strokeStyle = 'rgba(245,242,255,' + (lv ? 0.3 + 0.5 * lv.power : 0.3) + ')';
    ctx.lineWidth = Math.max(1, 2 * u);
    ctx.beginPath(); ctx.arc(held.x, held.y, held.r * 1.5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  /* 进行页：动态背景（视频抠帧精灵表，cover 变换；crisp 强制最近邻保精度；animT 钟暂停/时停自动冻结） */
  function drawPlayBg(ctx, at) {
    var v = ZSM.view, d = ZSM.sheets.def.playbg;
    var sc = Math.max(v.w / d.gw, v.h / d.gh);
    ZSM.sheets.draw(ctx, 'playbg', v.w / 2, v.h / 2, d.gh * sc, 0, at, null, true);
  }

  /* 开始页/选关页：动态背景（视频抠帧精灵表，cover 变换；crisp 强制最近邻保精度） */
  function drawMenuBg(ctx) {
    if (!ZSM.sheets.ready('menubg')) return;
    var v = ZSM.view, d = ZSM.sheets.def.menubg;
    var sc = Math.max(v.w / d.gw, v.h / d.gh);
    ZSM.sheets.draw(ctx, 'menubg', v.w / 2, v.h / 2, d.gh * sc, 0, menuT, null, true);
  }

  /* 睡觉小人：抠像精灵表按 animT 取帧（暂停/时停自动冻结）；表未就绪时回退程序化两帧 */
  function drawSleeper(ctx, p, at) {
    var v = ZSM.view, s = p.sleeper;
    var bph = Math.sin(at * (Math.PI * 2 / ZSM.sheets.period('sleeper')) - Math.PI / 2);   // 光晕与源呼吸周期同相
    ZSM.pixelart.glow(ctx, s.x, s.y, s.worldH * 0.95, '#8A4FFF', 0.35 + 0.15 * bph);
    if (ZSM.sheets.draw(ctx, 'sleeper', s.x, s.y, s.worldH, 0, at)) return;
    var inhale = bph > 0.15;
    ZSM.pixelart.draw(ctx, inhale ? 'sleeperB' : 'sleeper', s.x, s.y + (inhale ? -v.u : 0), s.worldH * (1 + 0.03 * bph), 0);
  }

  function render(ctx) {
    var v = ZSM.view;
    ctx.clearRect(0, 0, v.w, v.h);
    ctx.save();
    if (ZSM.fx.shakeAmp > 0) ctx.translate((Math.random() - 0.5) * 2 * ZSM.fx.shakeAmp, (Math.random() - 0.5) * 2 * ZSM.fx.shakeAmp);
    var p = scenes.play;
    if (scenes.current === 'play' && p) {
      var at = p.animT || 0;
      ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      if (ZSM.sheets.ready('playbg')) drawPlayBg(ctx, at); else if (field) ctx.drawImage(field, 0, 0, v.w, v.h);
      ctx.restore();
      drawSleeper(ctx, p, at);
      // Zzz 漂浮（3 个循环：尺寸递增、上升淡出、横向摆）
      ctx.save();
      ctx.fillStyle = 'rgba(245,242,255,0.8)';
      for (var zk = 0; zk < 3; zk++) {
        var zp = (at * 0.4 + zk / 3) % 1;
        var zs = 10 + zk * 4;
        var zx = p.sleeper.x + p.sleeper.worldH * (0.14 + zk * 0.09) + Math.sin(at * 1.3 + zk * 2) * 3 * v.u;
        var zy = p.sleeper.y - p.sleeper.worldH * 0.50 - zp * 20 * v.u;
        ctx.globalAlpha = (1 - zp) * 0.75;
        ctx.font = '700 ' + Math.round(zs * v.u) + 'px "Noto Sans SC","Microsoft YaHei",sans-serif';
        ctx.fillText('Z', zx, zy);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      for (var i = 0; i < p.entities.length; i++) ZSM.entities.render(ctx, p.entities[i], at);
      drawUpgFx(ctx, p);
      if (ZSM.input.getHeld() && ZSM.upg.lv('zhuai') >= 1) {   // 时停（拽1）视觉提示：青色静场边框
        ctx.save();
        ctx.fillStyle = 'rgba(79,216,210,0.05)';
        ctx.fillRect(0, 0, v.w, v.h);
        ctx.strokeStyle = 'rgba(79,216,210,0.4)';
        ctx.lineWidth = Math.max(2, 3 * v.u);
        ctx.setLineDash([10 * v.u, 8 * v.u]);
        ctx.strokeRect(3 * v.u, 3 * v.u, v.w - 6 * v.u, v.h - 6 * v.u);
        ctx.restore();
      }
      if (p.state === 'run') drawAim(ctx, p);
      ZSM.fx.render(ctx);
      drawHUD(ctx, p);
      if (p.hurtT > 0) {
        var k = p.hurtT / 0.35;
        var g = ctx.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.3, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.7);
        g.addColorStop(0, 'rgba(255,77,77,0)');
        g.addColorStop(1, 'rgba(255,77,77,' + (0.45 * k).toFixed(3) + ')');
        ctx.fillStyle = g; ctx.fillRect(0, 0, v.w, v.h);
      }
    } else {
      if (scenes.current === 'start' || scenes.current === 'select') drawMenuBg(ctx);
      ZSM.fx.render(ctx);
    }
    ctx.restore();
  }

  function onResize() {
    buildField();
    var p = scenes.play;
    if (!p) return;
    p.sleeper = sleeperPos();
    p.entities.forEach(function (e) {
      ZSM.entities.setSizeMul(e, e.sizeMul);
    });
  }

  scenes.init = function () { scenes.current = 'start'; buildField(); };
  scenes.setMenuT = function (t) { menuT = t; };   // 测试钩子：?menut=N 定格开始页动画钟
  scenes.update = update; scenes.render = render; scenes.onResize = onResize;
  scenes.goStart = goStart; scenes.goSelect = goSelect; scenes.startLevel = startLevel;
  scenes.restart = restart; scenes.nextLevel = nextLevel; scenes.togglePause = togglePause; scenes.resume = resume;
})();
