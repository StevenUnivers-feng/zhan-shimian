/* 指针输入 + 三手势判别（规则见 docs/01 第 2.1 节；升级效果见补充 docx） */
(function () {
  window.ZSM = window.ZSM || {};
  var ptr = { x: 0, y: 0, px: 0, py: 0, t: 0, speed: 0 };
  var held = null, grab = null, aim = null, grabId = -1;

  function active() { return ZSM.scenes.current === 'play' && ZSM.play && ZSM.play.state === 'run'; }
  function sliceMin() { return 300 * ZSM.view.u; }
  function zhuai() { return ZSM.upg.lv('zhuai'); }
  function zhan() { return ZSM.upg.lv('zhan'); }

  function pick(type, x, y) {
    var es = ZSM.play.entities;
    for (var i = es.length - 1; i >= 0; i--) {
      var e = es[i];
      if (e.state !== 'home' || e.type !== type) continue;
      if (Math.hypot(e.x - x, e.y - y) <= e.r * 1.18) return e;   // 略放宽命中，手感更爽
    }
    return null;
  }

  function count(type) {
    var p = ZSM.play;
    if (!p) return;
    p.cnt = p.cnt || { d: 0, i: 0 };
    if (type === 'desire') p.cnt.d++; else p.cnt.i++;
  }

  function sliceIt(e, x1, y1, x2, y2, passive) {
    var u = ZSM.view.u;
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var nx = -Math.sin(ang), ny = Math.cos(ang);
    var sp = (200 + Math.random() * 80) * u;
    var at = (ZSM.play ? ZSM.play.animT : 0) + e.atOff;   // 飞散半块定格在切中那一帧
    e.state = 'dead';
    if (!passive) {                                       // 仅玩家亲手切碎计入旋风/爆发触发（被动剑气不计）
      count('desire');
      if (ZSM.play) ZSM.play.lastKill = { x: e.x, y: e.y };   // 旋风切点
    }
    ZSM.fx.ghost('desireL', e.x, e.y, ang, e.worldH, nx * sp, ny * sp, (Math.random() - 0.5) * 10, 0.45, at);
    ZSM.fx.ghost('desireR', e.x, e.y, ang, e.worldH, -nx * sp, -ny * sp, (Math.random() - 0.5) * 10, 0.45, at);
    ZSM.fx.burst(e.x, e.y, '#FF7AB0', 12, 220 * u, 3);
    ZSM.fx.flash(e.x, e.y, e.worldH * 0.9);
    ZSM.fx.hitstop(0.04); ZSM.fx.shake(2 * u);
    ZSM.audio.sfx('slice');
  }

  function collect(e, counted, passive) {
    e.state = 'dead';
    if (counted && !passive) {                            // 仅玩家划过收集计入触发（被动剑气不计）
      count('idea');
      if (ZSM.play) ZSM.play.lastKill = { x: e.x, y: e.y };
    }
    if (ZSM.play) ZSM.upg.grant(ZSM.play.levelId);        // 每个想法入账（每关上限 10，无限关无上限）
    ZSM.fx.suck(e.x, e.y, '#FFF3B0');
    ZSM.fx.sparkle(e.x, e.y, '#FFD75E', 10);
    ZSM.audio.sfx('collect');
  }

  function grabPressure(p, x, y, id) {
    held = p; p.state = 'held';
    grab = { x: p.x, y: p.y }; aim = { x: x, y: y }; grabId = id;
    if (zhuai() >= 2) ZSM.entities.setSizeMul(p, 2);       // 巨石：抓起时体型×2
    ZSM.fx.clearTrail();
  }

  function releaseHeld() {
    if (held && held.state === 'held') { held.state = 'home'; ZSM.entities.setSizeMul(held, 1); }
    held = null; grab = null; aim = null; grabId = -1;
  }

  function flingWith(e, lv) {
    e.state = 'flung'; e.vx = lv.vx; e.vy = lv.vy;
    e.vrot = (Math.random() - 0.5) * 8;
    ZSM.audio.sfx('fling');
    ZSM.fx.burst(e.x, e.y, '#4FD8D2', 8, 160 * ZSM.view.u, 3);
    if (e.type === 'pressure' && zhuai() >= 3) {           // 裂投（拽3）：空中裂成 3 块（±18°）
      var ang = Math.atan2(lv.vy, lv.vx), sp = Math.hypot(lv.vx, lv.vy);
      [-1, 1].forEach(function (sg) {
        var a2 = ang + sg * 18 * Math.PI / 180;
        var c = ZSM.entities.make('pressure', e.x, e.y, 1, ZSM.play.sleeper);
        ZSM.entities.setSizeMul(c, e.sizeMul);
        c.state = 'flung'; c.vx = Math.cos(a2) * sp; c.vy = Math.sin(a2) * sp;
        c.vrot = (Math.random() - 0.5) * 10;
        ZSM.play.entities.push(c);
      });
    }
  }

  function down(x, y, id) {
    ZSM.audio.unlock();
    if (!active()) return;
    var h = ZSM.hud;
    if (h && h.pauseRect && x >= h.pauseRect.x && x <= h.pauseRect.x + h.pauseRect.w && y >= h.pauseRect.y && y <= h.pauseRect.y + h.pauseRect.h) {
      ZSM.scenes.togglePause(); return;
    }
    if (held) return;                                  // 单抓取模型：多余指针忽略，防残留 held
    var p = pick('pressure', x, y);
    if (p) { grabPressure(p, x, y, id); return; }
    var id2 = pick('idea', x, y);
    if (id2) { collect(id2, false); return; }          // 点击收集不计入旋风计数
    ZSM.fx.pushTrail(x, y);
  }

  function move(x, y, t, id) {
    if (held && id !== grabId) return;                 // 第二根手指不干扰瞄准
    var dt = (t - ptr.t) / 1000;
    ptr.px = ptr.x; ptr.py = ptr.y; ptr.x = x; ptr.y = y; ptr.t = t;
    ptr.speed = dt > 0 ? Math.hypot(x - ptr.px, y - ptr.py) / dt : 0;   // 同毫秒事件不判速，距离累积到下一段
    if (!active()) return;
    if (held) {
      if (zhuai() >= 4) { held.x = x; held.y = y; }        // 任意释放（拽4）：时停中跟手搬运到任意位置
      aim = { x: x, y: y }; return;
    }
    ZSM.fx.pushTrail(x, y);
    if (ptr.speed <= 0) return;
    if (ptr.speed > sliceMin()) {
      var es = ZSM.play.entities, canSwipeIdea = zhan() >= 2;   // 划过收集
      for (var i = es.length - 1; i >= 0; i--) {
        var e = es[i];
        if (e.state !== 'home') continue;
        if (!ZSM.physics.segCircle(ptr.px, ptr.py, x, y, e.x, e.y, e.r * 1.1)) continue;
        if (e.type === 'desire') sliceIt(e, ptr.px, ptr.py, x, y);
        else if (e.type === 'idea' && canSwipeIdea) collect(e, true);
      }
    }
  }

  function up(id) {
    if (held && id !== grabId) return;
    if (held) {
      var lv = ZSM.physics.launchVelocity(aim.x - grab.x, aim.y - grab.y);
      if (lv) {
        flingWith(held, lv);
        held = null; grab = null; aim = null; grabId = -1;
      } else releaseHeld();
    }
  }

  function cancel() { if (held) releaseHeld(); ZSM.fx.clearTrail(); }

  window.addEventListener('pointerdown', function (e) { down(e.clientX, e.clientY, e.pointerId); });
  window.addEventListener('pointermove', function (e) { move(e.clientX, e.clientY, e.timeStamp, e.pointerId); });
  window.addEventListener('pointerup', function (e) { up(e.pointerId); });
  window.addEventListener('pointercancel', cancel);
  window.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', function () { if (document.hidden) cancel(); });

  ZSM.input = { ptr: ptr, getHeld: function () { return held; }, getGrab: function () { return grab; }, getAim: function () { return aim; }, cancel: cancel, sliceIt: sliceIt, collect: collect };
})();
