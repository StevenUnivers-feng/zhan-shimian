/* UI 按钮资产（assets/ui-btn.png 120x44 原生像素表）九宫格无损合成。
   精度口径：最近邻 + 余数分配（每原生行/列至少复现 floor 次，绝丢不描边行）；
   尺寸精确到设备像素 => 分辨率无关且硬边。变体通过调色映射生成（锁定/关闭态）。 */
(function () {
  window.ZSM = window.ZSM || {};
  var NW = 120, NH = 44, CAP = 14;           // 原生宽高与角帽（行/列）
  var img = new Image();
  img.src = 'data:image/png;base64,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';   // 内嵌：file:// 下 getImageData 不被 tainted
  var src = null;                            // Uint8ClampedArray RGBA
  var cache = {};

  img.onload = function () {
    var c = document.createElement('canvas');
    c.width = NW; c.height = NH;
    var g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    src = g.getImageData(0, 0, NW, NH).data;
    applyAll();
  };

  function variantPx(r, g, b, variant) {
    if (variant === 'panel') {                // 面板：薰衣草族->深紫内底（保金环/暗棕描边/紫边）
      if (b > 150 && r > 120 && g > 90) {
        var lum = r * 0.3 + g * 0.5 + b * 0.2;
        var t = Math.max(0, Math.min(1, (lum - 160) / 60));
        return [36 + t * 44, 24 + t * 36, 57 + t * 71];
      }
      return [r, g, b];
    }
    if (variant === 'dim') {                 // 锁定/未开启：灰紫暗调，保结构
      var l = (r * 0.3 + g * 0.5 + b * 0.2);
      return [40 + l * 0.30, 36 + l * 0.28, 52 + l * 0.36];
    }
    if (variant === 'off') {                 // 开关关闭：更暗
      var l2 = (r * 0.3 + g * 0.5 + b * 0.2);
      return [26 + l2 * 0.20, 22 + l2 * 0.19, 36 + l2 * 0.24];
    }
    return [r, g, b];
  }

  /* 行/列映射：三段（帽/中/帽），最近邻+余数分配 */
  function makeMap(nSrc, nDst, cap) {
    cap = Math.max(1, Math.min(cap, Math.floor(nDst / 2), Math.floor(nSrc / 2)));
    var midSrc = nSrc - cap * 2, midDst = Math.max(1, nDst - cap * 2);
    var m = new Array(nDst);
    for (var i = 0; i < nDst; i++) {
      if (i < cap) m[i] = Math.floor(i * cap / cap) === cap ? cap - 1 : Math.min(cap - 1, Math.floor(i * cap / cap));
      else if (i < nDst - cap) m[i] = cap + Math.min(midSrc - 1, Math.floor((i - cap) * midSrc / midDst));
      else m[i] = nSrc - cap + Math.min(cap - 1, Math.floor((i - (nDst - cap)) * cap / cap));
    }
    return m;
  }

  function compose(w, h, variant) {
    w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h));
    var key = w + '|' + h + '|' + (variant || '');
    if (cache[key]) return cache[key];
    var rowMap = makeMap(NH, h, CAP), colMap = makeMap(NW, w, CAP);
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    var id = g.createImageData(w, h), d = id.data;
    for (var y = 0; y < h; y++) {
      var gy = rowMap[y];
      for (var x = 0; x < w; x++) {
        var gx = colMap[x];
        var so = (gy * NW + gx) * 4, doff = (y * w + x) * 4;
        var a = src[so + 3];
        if (a < 128) continue;
        var col = variantPx(src[so], src[so + 1], src[so + 2], variant);
        d[doff] = col[0]; d[doff + 1] = col[1]; d[doff + 2] = col[2]; d[doff + 3] = 255;
      }
    }
    g.putImageData(id, 0, 0);
    var url = c.toDataURL();
    cache[key] = url;
    return url;
  }

  /* 元素接入：按设备像素尺寸合成背景 */
  function paint(el, variant) {
    if (!src) return;
    var r = el.getBoundingClientRect();
    var dpr = ZSM.view ? ZSM.view.dpr : 1;
    var w = r.width * dpr, h = r.height * dpr;
    if (w < 4 || h < 4) return;
    el.style.backgroundImage = 'url(' + compose(w, h, variant) + ')';
  }

  function variantFor(el) {
    if (el.classList.contains('locked')) return 'dim';
    if (el.classList.contains('off')) return 'off';
    return el.getAttribute('data-uiv') || '';
  }

  var registered = [];
  function reg(el) { if (el && registered.indexOf(el) < 0) registered.push(el); }

  function applyAll() {
    if (!src) return;
    registered.forEach(function (el) {
      if (!document.body.contains(el)) return;
      paint(el, variantFor(el));
    });
  }

  ZSM.uibtn = {
    ready: function () { return !!src; },
    compose: compose,
    reg: reg,
    paint: paint,
    applyAll: applyAll,
    /* 便捷：选择器批量注册 */
    regAll: function (sel) { Array.prototype.forEach.call(document.querySelectorAll(sel), reg); applyAll(); },
    NW: NW, NH: NH
  };
})();
