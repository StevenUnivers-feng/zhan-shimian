/* 成长系统（补充 docx）：想法货币 / 每关产量上限 / 斩·拽双路线升级 */
(function () {
  window.ZSM = window.ZSM || {};
  var CAP = 10;
  var COST = { zhan: [3, 10, 15, 20, 30], zhuai: [3, 10, 15, 20, 30] };
  var NAME = { zhan: '斩', zhuai: '拽' };
  var DESC = {
    zhan: [
      '旋风：玩家每切碎15个欲望，在切点生成持续2.5秒的旋风，吸入附近的想法与欲望。',
      '划过收集：鼠标划过想法即可收集；旋风触发条件变为玩家切碎15个欲望和想法。',
      '环绕剑气：一道剑气环绕睡觉小人飞行，切碎碰到的欲望与想法（被动击杀不计旋风触发）。',
      '剑气阵：环绕剑气数量+2。',
      '剑气爆发：触发旋风时，在切点向四个方向释放4道更大的剑气。'
    ],
    zhuai: [
      '时停：拖拽压力时全世界停摆（只能拉弓瞄准，不能移动压力）。',
      '巨石：拖拽压力时，压力体型×2。',
      '裂投：甩出的压力在空中裂成3块。',
      '任意释放：时停中可把压力搬到任意位置，松手即在该处放下或甩出。',
      '护眠：被压力撞飞的物体不再伤害睡觉小人。'
    ]
  };

  function ups() {
    var o = ZSM.storage.get('zsm_upg', null);
    if (!o || typeof o !== 'object') o = { zhan: 0, zhuai: 0 };
    return o;
  }
  function lv(route) { var o = ups(); var n = o[route] | 0; return Math.max(0, Math.min(5, n)); }
  function wallet() { var n = parseInt(ZSM.storage.get('zsm_ideas', 0), 10); return isFinite(n) ? Math.max(0, n) : 0; }
  function addIdea(n) { ZSM.storage.set('zsm_ideas', wallet() + n); }
  function nextCost(route) { var l = lv(route); return l >= 5 ? null : COST[route][l]; }
  function canBuy(route) { var c = nextCost(route); return c !== null && wallet() >= c; }
  function buy(route) {
    var c = nextCost(route);
    if (c === null || wallet() < c) return false;
    addIdea(-c);
    var o = ups(); o[route] = lv(route) + 1; ZSM.storage.set('zsm_upg', o);
    return true;
  }
  function yieldMap() { var m = ZSM.storage.get('zsm_yield', null); return (m && typeof m === 'object') ? m : {}; }
  function yieldFor(id) { return yieldMap()[id] | 0; }
  function grant(id) {
    var m = yieldMap(), cur = m[id] | 0;
    if (id !== 4 && cur >= CAP) return false;          // 第四关（无限 demo）想法无上限
    m[id] = cur + 1; ZSM.storage.set('zsm_yield', m);
    addIdea(1);
    return true;
  }

  ZSM.upg = {
    CAP: CAP, COST: COST, NAME: NAME, DESC: DESC,
    lv: lv, wallet: wallet, addIdea: addIdea, nextCost: nextCost, canBuy: canBuy, buy: buy,
    yieldFor: yieldFor, grant: grant
  };
})();
