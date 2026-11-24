/* DOM 界面：开始/选关/弹窗/按钮/音频开关 */
(function () {
  window.ZSM = window.ZSM || {};
  var $ = function (id) { return document.getElementById(id); };
  var el = {};

  function showScreen(name) {
    el.start.classList.toggle('hidden', name !== 'start');
    el.select.classList.toggle('hidden', name !== 'select');
    if (name === 'select') { refreshGrid(); refreshUpg(); }
    ZSM.uibtn.applyAll();                       // 隐藏时量为 0，显示后按实际尺寸合成
  }
  function setPlaying(on) { document.getElementById('app').classList.toggle('playing', !!on); }
  function openModal(id) { $(id).classList.remove('hidden'); ZSM.uibtn.applyAll(); }
  function closeModal(id) { $(id).classList.add('hidden'); }
  function closeAllModals() { ['mdl-maker', 'mdl-pause', 'mdl-win', 'mdl-fail', 'mdl-upg'].forEach(closeModal); }

  function unlockedMax() {
    var m = parseInt(ZSM.storage.get('zsm_unlock', 1), 10);
    if (!isFinite(m) || m < 1) m = 1;
    if (m > ZSM.levels.MADE) m = ZSM.levels.MADE;
    return m;
  }

  function refreshGrid() {
    var max = unlockedMax();
    el.grid.innerHTML = '';
    for (var i = 1; i <= ZSM.levels.TOTAL_SLOTS; i++) {
      (function (id) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        var lab = document.createElement('div');          // 本关已收/可收 想法标签
        lab.className = 'cell-lab';
        var st = document.createElement('img');
        st.src = ZSM.pixeltext.star('#FFF3B0', 2);
        st.alt = ''; st.style.height = 'calc(var(--u) * 10)';
        var yn = ZSM.upg.yieldFor(id);
        var capTxt = id === 4 ? '∞' : ZSM.upg.CAP;      // 无限关想法无上限
        var tx = document.createElement('img');
        tx.src = ZSM.pixeltext.raster(yn + '/' + capTxt, { size: 8, k: 2, color: yn > 0 ? '#FFF3B0' : '#9a93b8', stroke: '#14101F' });
        tx.alt = yn + '/' + capTxt;
        tx.style.height = 'calc(var(--u) * 12)';
        lab.appendChild(st); lab.appendChild(tx);
        var b = document.createElement('button');
        b.className = 'lvl';
        var made = id <= ZSM.levels.MADE;
        var unlocked = id <= max;
        b.setAttribute('data-pt', String(id));
        ZSM.pixeltext.apply(b, { size: 15, k: 2, h: 22, color: (made && unlocked) ? '#14101F' : '#8a83a8', stroke: (made && unlocked) ? '#F5F2FF' : '#2A2438' });
        if (!made) {
          b.classList.add('locked', 'tbd');
          var t = document.createElement('img');
          t.className = 'ptbd'; t.alt = '敬请期待';
          t.src = ZSM.pixeltext.raster('敬请期待', { size: 9, k: 2, color: '#9a93b8', stroke: '#2A2438' });
          b.appendChild(t);
        } else if (!unlocked) { b.classList.add('locked'); }
        else b.addEventListener('click', function () { ZSM.audio.sfx('click'); ZSM.scenes.startLevel(id); });
        cell.appendChild(lab);
        cell.appendChild(b);
        el.grid.appendChild(cell);
        ZSM.uibtn.reg(b);
      })(i);
    }
    ZSM.uibtn.applyAll();
  }

  /* 升级面板：双列五节点 + 钱包（补充 docx 右栏） */
  var upgRoute = null;
  function refreshUpg() {
    ['zhan', 'zhuai'].forEach(function (route) {
      var col = $('upg-col-' + route);
      col.innerHTML = '';
      var head = document.createElement('div');
      head.className = 'upg-head';
      var hi = document.createElement('img');
      hi.src = ZSM.pixeltext.raster(ZSM.upg.NAME[route], { size: 14, k: 2, color: '#F5F2FF', stroke: '#14101F' });
      hi.alt = ZSM.upg.NAME[route];
      head.appendChild(hi);
      col.appendChild(head);
      var lv = ZSM.upg.lv(route);
      for (var n = 1; n <= 5; n++) {
        (function (n) {
          var state = n <= lv ? 'owned' : (n === lv + 1 ? 'next' : 'locked');
          var b = document.createElement('button');
          b.className = 'unode' + (state === 'locked' ? ' locked' : '') + (state === 'next' ? ' next' : '');
          b.setAttribute('data-pt', ZSM.upg.NAME[route] + n);
          ZSM.pixeltext.apply(b, { size: 12, k: 2, h: 18, color: state === 'locked' ? '#8a83a8' : '#14101F', stroke: state === 'locked' ? '#2A2438' : '#F5F2FF' });
          var mask = document.createElement('div');
          mask.className = 'mask';
          b.appendChild(mask);
          if (state === 'next') b.addEventListener('click', function () { ZSM.audio.sfx('click'); openUpg(route, n); });
          col.appendChild(b);
          ZSM.uibtn.reg(b);
        })(n);
      }
    });
    var w = $('upg-wallet');
    w.innerHTML = '';
    var ws = document.createElement('img');
    ws.src = ZSM.pixeltext.star('#FFF3B0', 3);
    ws.alt = ''; ws.style.height = 'calc(var(--u) * 16)';
    var wn = document.createElement('img');
    wn.src = ZSM.pixeltext.raster(String(ZSM.upg.wallet()), { size: 13, k: 2, color: '#FFF3B0', stroke: '#14101F' });
    wn.alt = String(ZSM.upg.wallet());
    wn.style.height = 'calc(var(--u) * 20)';
    w.appendChild(ws); w.appendChild(wn);
    ZSM.uibtn.applyAll();
  }

  function openUpg(route, n) {
    upgRoute = route;
    var intro = $('upg-intro');
    intro.setAttribute('data-pt', ZSM.upg.NAME[route] + n + '：' + ZSM.upg.DESC[route][n - 1]);
    ZSM.pixeltext.apply(intro, { size: 11, k: 2, h: 18, color: '#F5F2FF', stroke: '#14101F' });
    var cost = ZSM.upg.nextCost(route);
    var cl = $('upg-cost');
    cl.setAttribute('data-pt', '消耗想法 ' + cost + ' ／ 持有 ' + ZSM.upg.wallet());
    ZSM.pixeltext.apply(cl, { size: 11, k: 2, h: 18, color: ZSM.upg.canBuy(route) ? '#FFF3B0' : '#FF7AB0', stroke: '#14101F' });
    $('btn-upg-ok').classList.toggle('disabled', !ZSM.upg.canBuy(route));
    openModal('mdl-upg');
  }

  function syncToggles() {
    el.sfx.classList.toggle('off', !ZSM.audio.isSfx());
    el.music.classList.toggle('off', !ZSM.audio.isMusic());
    ZSM.uibtn.applyAll();
  }

  function pixelizeAll() {
    var PT = ZSM.pixeltext;
    var root = document.documentElement.style;
    root.setProperty('--star', 'url(' + PT.star('#F5F2FF', 3) + ')');
    root.setProperty('--star-dim', 'url(' + PT.star('#14101F', 2) + ')');
    Array.prototype.forEach.call(document.querySelectorAll('.title'), function (t) {
      PT.apply(t, { size: 26, k: 2, h: 56, color: '#F5F2FF', stroke: '#14101F' });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.btn'), function (t) {
      PT.apply(t, { size: 15, k: 2, h: 22, color: '#14101F', stroke: '#F5F2FF' });
    });
    el.sfx.setAttribute('data-pt', '点击\n音效');
    PT.apply(el.sfx, { size: 11, k: 2, h: 30, color: '#14101F', stroke: '#F5F2FF' });
    PT.apply(el.music, { size: 11, k: 2, h: 16, color: '#14101F', stroke: '#F5F2FF' });
    Array.prototype.forEach.call(document.querySelectorAll('.x'), function (x) {
      PT.apply(x, { size: 14, k: 2, h: 18, color: '#14101F', stroke: '#F5F2FF' });
    });
    var cb = $('btn-close-select');
    cb.setAttribute('data-pt', '×');
    PT.apply(cb, { size: 16, k: 2, h: 26, color: '#14101F', stroke: '#F5F2FF' });
    Array.prototype.forEach.call(document.querySelectorAll('.ghost h2'), function (h) {
      var dark = h.classList.contains('dark');
      PT.apply(h, { size: 22, k: 2, h: 44, color: dark ? '#14101F' : '#F5F2FF', stroke: dark ? '#F5F2FF' : '#14101F' });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.box .line'), function (l) {
      PT.apply(l, { size: 11, k: 2, h: 18, color: '#F5F2FF', stroke: '#14101F' });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.panel, .box'), function (p) {
      p.setAttribute('data-uiv', 'panel');
    });
    ZSM.uibtn.regAll('.btn, .roundbtn, .x, .closebtn, .panel, .box');
  }

  function init() {
    el.start = $('scr-start'); el.select = $('scr-select'); el.grid = $('level-grid');
    el.sfx = $('btn-sfx'); el.music = $('btn-music');

    $('btn-start').addEventListener('click', function () { ZSM.audio.sfx('click'); ZSM.scenes.goSelect(); });
    $('btn-maker').addEventListener('click', function () { ZSM.audio.sfx('click'); openModal('mdl-maker'); });
    $('btn-reset').addEventListener('click', function () {
      ZSM.audio.sfx('click');
      if (!window.confirm('确定清空全部进度（升级、想法、解锁关卡、教学）回到全新状态？')) return;
      ['zsm_upg', 'zsm_ideas', 'zsm_tut', 'zsm_unlock', 'zsm_yield'].forEach(function (k) { ZSM.storage.del(k); });
      location.reload();
    });
    $('btn-close-select').addEventListener('click', function () { ZSM.audio.sfx('click'); ZSM.scenes.goStart(); });
    el.sfx.addEventListener('click', function () { ZSM.audio.setSfx(!ZSM.audio.isSfx()); ZSM.audio.sfx('click'); syncToggles(); });
    el.music.addEventListener('click', function () { ZSM.audio.setMusic(!ZSM.audio.isMusic()); ZSM.audio.sfx('click'); syncToggles(); });

    Array.prototype.forEach.call(document.querySelectorAll('.x'), function (x) {
      x.addEventListener('click', function () {
        ZSM.audio.sfx('click'); closeModal(x.getAttribute('data-close'));
        if (x.getAttribute('data-close') === 'mdl-pause') ZSM.scenes.resume();
      });
    });

    $('btn-resume').addEventListener('click', function () { ZSM.audio.sfx('click'); ZSM.scenes.resume(); });
    $('btn-restart').addEventListener('click', function () { ZSM.audio.sfx('click'); ZSM.scenes.restart(); });
    $('btn-quit').addEventListener('click', function () { ZSM.audio.sfx('click'); ZSM.scenes.goSelect(); });
    $('btn-next').addEventListener('click', function () { ZSM.audio.sfx('click'); ZSM.scenes.nextLevel(); });
    $('btn-win-select').addEventListener('click', function () { ZSM.audio.sfx('click'); ZSM.scenes.goSelect(); });
    $('btn-win-exit').addEventListener('click', function () { ZSM.audio.sfx('click'); ZSM.scenes.goStart(); });
    $('btn-retry').addEventListener('click', function () { ZSM.audio.sfx('click'); ZSM.scenes.restart(); });
    $('btn-fail-select').addEventListener('click', function () { ZSM.audio.sfx('click'); ZSM.scenes.goSelect(); });
    $('btn-fail-exit').addEventListener('click', function () { ZSM.audio.sfx('click'); ZSM.scenes.goStart(); });

    $('btn-upg-cancel').addEventListener('click', function () { ZSM.audio.sfx('click'); closeModal('mdl-upg'); });
    $('btn-upg-ok').addEventListener('click', function () {
      if (!upgRoute || !ZSM.upg.canBuy(upgRoute)) return;
      ZSM.upg.buy(upgRoute);
      ZSM.audio.sfx('collect');
      closeModal('mdl-upg');
      refreshUpg(); refreshGrid();
    });

    syncToggles();
    pixelizeAll();
    refreshGrid();
    showScreen('start');
  }

  ZSM.ui = { init: init, showScreen: showScreen, setPlaying: setPlaying, openModal: openModal, closeModal: closeModal, closeAllModals: closeAllModals, refreshGrid: refreshGrid, refreshUpg: refreshUpg, openUpg: openUpg, syncToggles: syncToggles, unlockedMax: unlockedMax };
})();
