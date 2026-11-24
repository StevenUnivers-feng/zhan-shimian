/* 交互物实体：想法/欲望/压力 的生成、移动、状态与绘制 */
(function () {
  window.ZSM = window.ZSM || {};
  var WORLD_H = { idea: 36, desire: 30, pressure: 44 };  // 世界高度(倍 u)
  var SPRITE = { idea: 'bulb', desire: 'desire', pressure: 'pressure' };

  function make(type, x, y, travel, sleeper) {
    var u = ZSM.view.u;
    var worldH = WORLD_H[type] * u;
    var r = worldH * 0.42;
    var dx = sleeper.x - x, dy = sleeper.y - y;
    var dist = Math.hypot(dx, dy) || 1;
    var speed = dist / travel;
    return {
      type: type, x: x, y: y, r: r, worldH: worldH, sizeMul: 1, age: 0,
      state: 'home',           // home|held|flung|knocked|dead
      vx: 0, vy: 0,
      dirx: dx / dist, diry: dy / dist, speed: speed,
      rot: 0, vrot: 0, phase: Math.random() * 6.28, ghostT: 0,
      atOff: Math.random() * ZSM.sheets.period(SPRITE[type])   // 表播放错相位，同类实体不同步跳
    };
  }

  function setSizeMul(e, m) {
    var u = ZSM.view.u;
    e.sizeMul = m;
    e.worldH = WORLD_H[e.type] * u * m;
    e.r = e.worldH * 0.42;
  }

  function update(e, dt, play) {
    if (e.state === 'home') {
      e.age += dt;
      e.x += e.dirx * e.speed * dt;
      e.y += e.diry * e.speed * dt;
    } else if (e.state === 'flung' || e.state === 'knocked') {
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.rot += e.vrot * dt;
      if (e.state === 'knocked') {                          // 被压力撞飞后 3s 自消失，防残留（尤其无限关）
        e.knockT = (e.knockT || 0) + dt;
        if (e.knockT >= 3) {
          e.state = 'dead';
          ZSM.fx.burst(e.x, e.y, '#8F7BD8', 8, 140 * ZSM.view.u, 2);
          return;
        }
      }
      // 残影（爽快反馈）
      e.ghostT -= dt;
      if (e.ghostT <= 0) {
        e.ghostT = 0.035;
        ZSM.fx.ghost(SPRITE[e.type], e.x, e.y, e.rot, e.worldH, 0, 0, 0, 0.22, (play ? play.animT : 0) + e.atOff);
      }
      if (ZSM.physics.offscreen(e, e.r * 2)) {
        e.state = 'dead';
        if (e.type === 'pressure') { ZSM.fx.burst(e.x, e.y, '#4FD8D2', 10, 160, 3); ZSM.audio.sfx('pop'); }
      }
    }
  }

  /* 抠像表就绪时直接播源动画（视频自带跳动/压扁，不再叠程序化 bob+squash）；否则回退程序化精灵 */
  function render(ctx, e, t) {
    if (e.state === 'dead' || e.state === 'held-aim') return;
    var key = SPRITE[e.type];
    var home = e.state === 'home';
    if (ZSM.sheets.ready(key)) {
      if (e.type === 'idea') {
        var pu = 1 + Math.sin(t * 6 + e.phase) * 0.12;
        ZSM.pixelart.glow(ctx, e.x, e.y, e.worldH * 1.1 * pu, '#FFF3B0', 0.35);
      }
      ZSM.sheets.draw(ctx, key, e.x, e.y, e.worldH, e.rot, t + e.atOff);
      return;
    }
    var s = Math.abs(Math.sin(t * 3.4 + e.phase));
    var bob = home ? -s * 8 * ZSM.view.u : 0;   // 上下跳动（§8.4 幅度加强）
    if (e.type === 'idea') {
      var pulse = 1 + Math.sin(t * 6 + e.phase) * 0.12;
      ZSM.pixelart.glow(ctx, e.x, e.y + bob, e.worldH * 1.1 * pulse, '#FFF3B0', 0.35);
    }
    if (home) {                                  // 落地压扁回弹
      var sq = s < 0.3 ? (0.85 + 0.5 * s) : 1;
      ctx.save();
      ctx.translate(e.x, e.y + bob);
      ctx.scale(2 - sq, sq);
      ZSM.pixelart.draw(ctx, key, 0, 0, e.worldH, e.rot);
      ctx.restore();
    } else {
      ZSM.pixelart.draw(ctx, key, e.x, e.y + bob, e.worldH, e.rot);
    }
  }

  function touchSleeper(e, sleeper) {
    return Math.hypot(e.x - sleeper.x, e.y - sleeper.y) < e.r + sleeper.r;
  }

  ZSM.entities = { make: make, update: update, render: render, touchSleeper: touchSleeper, setSizeMul: setSizeMul, WORLD_H: WORLD_H, SPRITE: SPRITE };
})();
