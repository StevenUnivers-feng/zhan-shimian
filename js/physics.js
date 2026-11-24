/* 物理：弹射初速度 / 线段-圆 / 圆-圆台球碰撞 / 出屏判定 */
(function () {
  window.ZSM = window.ZSM || {};
  var K = 6.0;          // 拖拽->速度 系数
  var MAXS = 2.4;       // 最大速度 (倍 min(w,h)/s)
  var MINDRAG = 10;     // 最小有效拖拽(px, 乘 u)

  function minDim() { return Math.min(ZSM.view.w, ZSM.view.h); }

  function maxDrag() { return MAXS * minDim() / K; }   // 拉弓最大有效长度(px)

  function launchVelocity(dx, dy) {
    var m = minDim();
    var len = Math.hypot(dx, dy);
    if (len < MINDRAG * ZSM.view.u) return null;   // 视为轻点，不弹射
    var vx = -dx * K, vy = -dy * K;
    var sp = Math.hypot(vx, vy), max = MAXS * m;
    if (sp > max) { vx = vx / sp * max; vy = vy / sp * max; }
    return { vx: vx, vy: vy, power: Math.min(1, sp / max) };
  }

  function segCircle(x1, y1, x2, y2, cx, cy, r) {
    var dx = x2 - x1, dy = y2 - y1;
    var l2 = dx * dx + dy * dy;
    var t = l2 ? ((cx - x1) * dx + (cy - y1) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    var px = x1 + t * dx, py = y1 + t * dy;
    return Math.hypot(cx - px, cy - py) <= r;
  }

  function offscreen(e, m) {
    var v = ZSM.view;
    return e.x < -m || e.x > v.w + m || e.y < -m || e.y > v.h + m;
  }

  /* 台球式：a 为运动方；返回是否发生碰撞 */
  function resolveCollision(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var dist = Math.hypot(dx, dy) || 0.0001;
    var rr = a.r + b.r;
    if (dist >= rr) return false;
    var nx = dx / dist, ny = dy / dist;
    // 分离重叠
    var overlap = (rr - dist) / 2;
    a.x -= nx * overlap; a.y -= ny * overlap;
    b.x += nx * overlap; b.y += ny * overlap;

    var spA = Math.hypot(a.vx, a.vy);
    if (b.state === 'home') {
      // 撞飞静止物：给予冲量 + 自旋
      b.state = 'knocked';
      b.knockT = 0;                                       // 3s 自消失计时（防无限关残留）
      b.vx = nx * spA * 0.9; b.vy = ny * spA * 0.9;
      b.vrot = (Math.random() - 0.5) * 12;
      a.vx *= 0.6; a.vy *= 0.6;
    } else {
      // 双方都在动：等质量交换法向分量
      var va = a.vx * nx + a.vy * ny;
      var vb = b.vx * nx + b.vy * ny;
      var diff = va - vb;
      a.vx -= diff * nx; a.vy -= diff * ny;
      b.vx += diff * nx; b.vy += diff * ny;
    }
    return true;
  }

  ZSM.physics = { launchVelocity: launchVelocity, segCircle: segCircle, offscreen: offscreen, resolveCollision: resolveCollision, maxDrag: maxDrag, K: K };
})();
