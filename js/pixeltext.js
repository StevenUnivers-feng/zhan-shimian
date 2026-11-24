/* 运行期像素字：小画布栅格化后最近邻放大，零字体依赖、file:// 可用 */
(function () {
  window.ZSM = window.ZSM || {};
  var cache = {};

  // 硬像素文字：源画布放大 2 倍绘制 → 描边+投影 → alpha 阈值二值化去灰边 → 最近邻放大 k 倍
  function raster(text, o) {
    o = o || {};
    var size = o.size || 16, color = o.color || '#F5F2FF', k = o.k || 2;
    var bold = o.bold !== false, stroke = o.stroke || '#14101F';
    var key = text + '|' + size + '|' + color + '|' + k + '|' + bold + '|' + stroke;
    if (cache[key]) return cache[key];
    var lines = String(text).split('\n');
    var S = size * 2;                                  // 源画布 2 倍，阈值化后仍有细节
    var font = (bold ? '700 ' : '400 ') + S + 'px "Noto Sans SC","Microsoft YaHei","SimHei",sans-serif';
    var lh = Math.ceil(S * 1.3);
    var lw = Math.max(3, Math.round(S * 0.16));        // 描边宽
    var c = document.createElement('canvas');
    var g = c.getContext('2d');
    g.font = font;
    var w = 2 * lw + 6;
    for (var i = 0; i < lines.length; i++) w = Math.max(w, Math.ceil(g.measureText(lines[i]).width) + 2 * lw + 6);
    var h = lh * lines.length + 2 * lw + 6;
    c.width = w; c.height = h;
    g = c.getContext('2d');
    g.font = font; g.textBaseline = 'top'; g.lineJoin = 'round'; g.miterLimit = 2;
    var x0 = lw + 3, y0 = lw + 3;
    g.fillStyle = 'rgba(12,8,22,0.85)';                // 1px 投影
    for (var s = 0; s < lines.length; s++) g.fillText(lines[s], x0 + 2, y0 + 2 + s * lh);
    g.strokeStyle = stroke; g.lineWidth = lw;          // 描边
    for (var t = 0; t < lines.length; t++) g.strokeText(lines[t], x0, y0 + t * lh);
    g.fillStyle = color;                               // 填充
    for (var j = 0; j < lines.length; j++) g.fillText(lines[j], x0, y0 + j * lh);
    var id = g.getImageData(0, 0, w, h), d = id.data;  // alpha 阈值二值化：硬边
    for (var p = 3; p < d.length; p += 4) d[p] = d[p] > 110 ? 255 : 0;
    g.putImageData(id, 0, 0);
    var c2 = document.createElement('canvas');
    c2.width = w * k; c2.height = h * k;
    var g2 = c2.getContext('2d');
    g2.imageSmoothingEnabled = false;
    g2.drawImage(c, 0, 0, w * k, h * k);
    var url = c2.toDataURL();
    cache[key] = url;
    return url;
  }

  // 四芒星小图（按钮/面板/进度条的星空元素）
  function star(color, k) {
    var key = 'star|' + color + '|' + k;
    if (cache[key]) return cache[key];
    k = k || 3;
    var g0 = document.createElement('canvas');
    g0.width = 7; g0.height = 7;
    var g = g0.getContext('2d');
    g.fillStyle = color;
    g.fillRect(3, 0, 1, 7); g.fillRect(0, 3, 7, 1);
    g.fillRect(2, 2, 1, 1); g.fillRect(4, 4, 1, 1); g.fillRect(4, 2, 1, 1); g.fillRect(2, 4, 1, 1);
    var c2 = document.createElement('canvas');
    c2.width = 7 * k; c2.height = 7 * k;
    var g2 = c2.getContext('2d');
    g2.imageSmoothingEnabled = false;
    g2.drawImage(g0, 0, 0, 7 * k, 7 * k);
    cache[key] = c2.toDataURL();
    return cache[key];
  }

  // 把元素文字替换为像素 img；h 为显示高度（u 单位）
  function apply(el, o) {
    if (!el) return null;
    var text = el.getAttribute('data-pt') || el.textContent.trim();
    el.textContent = '';
    var img = document.createElement('img');
    img.className = 'ptext';
    img.alt = text.replace(/\n/g, ' ');
    img.src = raster(text, o);
    img.style.height = 'calc(var(--u) * ' + (o && o.h ? o.h : 20) + ')';
    el.appendChild(img);
    return img;
  }

  // 像素九宫格框 24×24（slice 8）：暗环2 + 高光/阴影2 + 底色 + 角星
  function frame(base, hi, sh, ring, starC) {
    var key = 'frame|' + base + '|' + hi + '|' + sh + '|' + ring + '|' + starC;
    if (cache[key]) return cache[key];
    var c = document.createElement('canvas');
    c.width = 24; c.height = 24;
    var g = c.getContext('2d');
    g.fillStyle = ring; g.fillRect(0, 0, 24, 24);
    g.fillStyle = hi; g.fillRect(2, 2, 20, 2); g.fillRect(2, 2, 2, 20);
    g.fillStyle = sh; g.fillRect(2, 20, 20, 2); g.fillRect(20, 2, 2, 20);
    g.fillStyle = base; g.fillRect(4, 4, 16, 16);
    g.fillStyle = ring;                                   // 内圈暗线：双线框更"像素"
    g.fillRect(2, 6, 20, 2); g.fillRect(2, 16, 20, 2);
    g.fillRect(6, 2, 2, 20); g.fillRect(16, 2, 2, 20);
    g.fillStyle = base; g.fillRect(8, 8, 8, 8);
    if (starC) {
      g.fillStyle = starC;
      [[5, 5], [18, 5], [5, 18], [18, 18]].forEach(function (p) {
        g.fillRect(p[0] - 1, p[1], 3, 1); g.fillRect(p[0], p[1] - 1, 1, 3);
      });
    }
    cache[key] = c.toDataURL();
    return cache[key];
  }

  ZSM.pixeltext = { raster: raster, star: star, frame: frame, apply: apply };
})();
