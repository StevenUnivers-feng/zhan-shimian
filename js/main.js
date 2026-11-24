/* 启动 / 原生分辨率模型 / 主循环 */
(function () {
  window.ZSM = window.ZSM || {};
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  ZSM.canvas = canvas; ZSM.ctx = ctx;

  var view = ZSM.view = { w: 0, h: 0, dpr: 1, u: 1 };

  function resize() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    view.dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    view.u = Math.min(view.w, view.h) / 540;   // 比例单位：换屏比例一致
    document.documentElement.style.setProperty('--u', view.u + 'px');
    if (ZSM.uibtn) ZSM.uibtn.applyAll();          // 按钮背景按设备像素重合成
    if (ZSM.scenes && ZSM.scenes.onResize) ZSM.scenes.onResize();
  }
  ZSM.resize = resize;
  window.addEventListener('resize', resize);

  var last = 0;
  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0);  // 钳制 dt，防切页回来穿模/加速
    last = t;
    requestAnimationFrame(loop);                      // 先排下一帧：单帧异常不再停摆主循环（缺陷 21）
    if (ZSM.scenes) {
      try { ZSM.scenes.update(dt); } catch (err) { console.error('[ZSM] update error', err); }
      try { ZSM.scenes.render(ctx); } catch (err) { console.error('[ZSM] render error', err); }
    }
  }

  // 测试钩子：同屏制造「切 / 甩 / 撞 / 收」四种反馈，供截图验证爽快感
  function demoJuice() {
    var p = ZSM.scenes.play;
    if (!p) return;
    var v = ZSM.view, W = v.w, H = v.h;
    p.queue.length = 0; p.qi = 99999; p.entities.length = 0;
    var mk = function (type, x, y, travel) {
      var e = ZSM.entities.make(type, x, y, travel, p.sleeper);
      p.entities.push(e);
      return e;
    };
    var ev = function (type, x, y) {
      window.dispatchEvent(new PointerEvent(type, { clientX: x || 0, clientY: y || 0 }));
    };
    mk('desire', W * 0.63, H * 0.50, 99);                       // 待撞飞的欲望（在甩出路径上）
    mk('idea', W * 0.20, H * 0.72, 99);                          // 待收集的灵感
    mk('desire', W * 0.30, H * 0.28, 99);                        // 待切开的欲望
    ev('pointermove', W * 0.20, H * 0.28);
    ZSM.input.ptr.t = performance.now() - 16;   // 合成事件同毫秒，回拨时间让速度判定成立
    ev('pointermove', W * 0.40, H * 0.28);                       // 一刀两断
    ev('pointerdown', W * 0.20, H * 0.72);                       // 收灵感
    var pr = mk('pressure', W * 0.55, H * 0.62, 99);
    ev('pointerdown', pr.x, pr.y);
    ev('pointermove', pr.x - W * 0.10, pr.y + H * 0.10);
    ev('pointerup');                                             // 甩出压力石，撞向上方欲望
    for (var i = 0; i < 8; i++) ZSM.scenes.update(1 / 60);
    var held = mk('pressure', W * 0.24, H * 0.50, 99);
    ev('pointerdown', held.x, held.y);
    ev('pointermove', held.x - W * 0.09, held.y + H * 0.09);      // 拉弓瞄准线
    ZSM.scenes.render(ctx);
  }

  function boot() {
    var q = new URLSearchParams(location.search);
    if (q.has('reset')) ['zsm_upg', 'zsm_ideas', 'zsm_tut', 'zsm_unlock', 'zsm_yield'].forEach(function (k) { ZSM.storage.del(k); });   // 测试钩子：?reset=1 清存档
    resize();
    ZSM.ui.init();
    ZSM.scenes.init();
    // 测试钩子：?screen=select 或 ?autostart=N（仅用于自动化截图/自测）
    var upgset = q.get('upgset');              // 测试钩子：?upgset=zhan3,zhuai2 直设升级等级
    if (upgset) {
      var o = { zhan: 0, zhuai: 0 };
      upgset.split(',').forEach(function (s) { if (s) o[s.slice(0, -1)] = parseInt(s.slice(-1), 10); });
      ZSM.storage.set('zsm_upg', o);
    }
    if (q.get('wallet')) ZSM.storage.set('zsm_ideas', parseInt(q.get('wallet'), 10));   // 测试钩子：直设想法钱包
    if (q.has('tutdone')) ZSM.storage.set('zsm_tut', '1');   // 测试钩子：跳过教学定格（L1 实拍用）
    if (q.get('screen') === 'select') ZSM.scenes.goSelect();
    else if (q.get('autostart')) ZSM.scenes.startLevel(parseInt(q.get('autostart'), 10) || 1);
    if (q.has('god') && ZSM.scenes.play) ZSM.scenes.play.hearts = 9999;   // 测试钩子：截图跑满全程不掉完心
    var sim = parseFloat(q.get('sim') || '0');   // 测试钩子：推进到游戏时间 N 秒便于截图（hitstop 会耗步数，故按 t 到位为止）
    if (sim > 0) {
      var sp = ZSM.scenes.play;
      for (var i = 0; sp && sp.state === 'run' && sp.t < sim && i < sim * 60 + 120000; i++) ZSM.scenes.update(1 / 60);
    }
    var menut = parseFloat(q.get('menut') || '0');   // 测试钩子：开始页动画钟定格
    if (menut > 0) ZSM.scenes.setMenuT(menut);
    var demo = q.get('demo');                 // 测试钩子：juice / pause / win / fail / tornado
    if (demo === 'juice') demoJuice();
    else if (demo === 'tornado' && ZSM.scenes.play) {
      var d0 = ZSM.scenes.play, v0 = ZSM.view;
      d0.queue.length = 0; d0.qi = 99999; d0.entities.length = 0;
      d0.cnt = { d: 19, i: 0 };
      var tgt = ZSM.entities.make('desire', v0.w * 0.5, v0.h * 0.4, 99, d0.sleeper);
      d0.entities.push(tgt);
      ZSM.input.sliceIt(tgt, v0.w * 0.45, v0.h * 0.4, v0.w * 0.55, v0.h * 0.4);   // 第 20 切 → 触发旋风
      d0.entities.push(ZSM.entities.make('desire', v0.w * 0.42, v0.h * 0.36, 99, d0.sleeper));
      d0.entities.push(ZSM.entities.make('idea', v0.w * 0.58, v0.h * 0.44, 99, d0.sleeper));
      for (var ti = 0; ti < 30; ti++) ZSM.scenes.update(1 / 60);
      ZSM.scenes.render(ctx);
    }
    else if (demo && ZSM.scenes.play) {
      var d = ZSM.scenes.play;
      if (demo === 'pause') ZSM.scenes.togglePause();
      else if (demo === 'win') { d.t = d.duration + 1; ZSM.scenes.update(1 / 60); }
      else if (demo === 'fail') { d.hearts = 0; ZSM.scenes.update(1 / 60); }
    }
    var upgpop = q.get('upgpop');             // 测试钩子：?upgpop=zhan 打开升级弹窗
    if (upgpop) { ZSM.scenes.goSelect(); ZSM.ui.openUpg(upgpop, ZSM.upg.lv(upgpop) + 1); }
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
