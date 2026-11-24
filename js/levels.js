/* 关卡数据（权威数值见 docs/02-游戏关卡.md；布局取自《斩失眠关卡设计.docx》线框图）
   数量以 docx 文字为准、位置以线框图为准（视口百分比坐标，分辨率无关）。 */
(function () {
  window.ZSM = window.ZSM || {};
  var TOTAL_SLOTS = 18, MADE = 4;

  function rndCount(c) { return Array.isArray(c) ? (c[0] + Math.floor(Math.random() * (c[1] - c[0] + 1))) : c; }

  // 常用锚点（% 视口）：四角/三边/三列/生命两侧
  var Z = {
    TL: [14, 17], TC: [48, 14], TR: [85, 17],
    LT: [8, 32], L: [7, 50], LB: [10, 74],
    BL: [16, 86], HL: [31, 92], HR: [67, 92], BR: [84, 86],
    RB: [90, 74], R: [92, 50], RT: [91, 30]
  };

  // 组内排布偏移（% ）：row 横排 / col 竖列 / box 2列网格 / col2 2列密网格 / cl 散点（出生时抖动）
  function offsets(count, shape) {
    var out = [], i, r, c, rows;
    if (shape === 'row') for (i = 0; i < count; i++) out.push([(i - (count - 1) / 2) * 5.5, 0]);
    else if (shape === 'col') for (i = 0; i < count; i++) out.push([0, (i - (count - 1) / 2) * 8.5]);
    else if (shape === 'box') { rows = Math.ceil(count / 2); for (i = 0; i < count; i++) { r = Math.floor(i / 2); c = i % 2; out.push([(c - 0.5) * 6, (r - (rows - 1) / 2) * 9]); } }
    else if (shape === 'col2') { rows = Math.ceil(count / 2); for (i = 0; i < count; i++) { r = Math.floor(i / 2); c = i % 2; out.push([(c - 0.5) * 5, (r - (rows - 1) / 2) * 8]); } }
    else if (shape === 'g32') { rows = Math.ceil(count / 3); for (i = 0; i < count; i++) { r = Math.floor(i / 3); c = i % 3; out.push([(c - 1) * 6, (r - (rows - 1) / 2) * 8]); } }
    else for (i = 0; i < count; i++) out.push([0, 0]);
    return out;
  }

  function grp(at, type, count, shape) { return { at: at, type: type, count: count, shape: shape || 'cl' }; }
  function wave(t, travel, groups) { return { t: t, travel: travel, groups: groups }; }

  // 出生点 = 框最近的游戏边界（用户拍板 2026-11-24）：正上框→上边界、生命两侧框→下边界、左框→左边界、右框→右边界；
  // 编队的垂直偏移不越界，改为自边界向内的纵深（外排贴边界）。平距相同时优先级 左>右>上>下。
  function sideOf(x, y) {
    var dL = x, dR = 100 - x, dT = y, dB = 100 - y;
    var m = Math.min(dL, dR, dT, dB);
    if (m === dL) return 'L';
    if (m === dR) return 'R';
    if (m === dT) return 'T';
    return 'B';
  }

  function expand(ev) {
    var out = [];
    ev.groups.forEach(function (g) {
      var n = rndCount(g.count), offs = offsets(n, g.shape);
      var side = sideOf(g.at[0], g.at[1]);
      var minX = 0, maxX = 0, minY = 0, maxY = 0;
      offs.forEach(function (o) { minX = Math.min(minX, o[0]); maxX = Math.max(maxX, o[0]); minY = Math.min(minY, o[1]); maxY = Math.max(maxY, o[1]); });
      for (var i = 0; i < n; i++) {
        var ox = offs[i][0], oy = offs[i][1], px, py;
        if (side === 'T') { px = g.at[0] + ox; py = oy - minY; }
        else if (side === 'B') { px = g.at[0] + ox; py = 100 + oy - maxY; }
        else if (side === 'L') { px = ox - minX; py = g.at[1] + oy; }
        else { px = 100 + ox - maxX; py = g.at[1] + oy; }
        out.push({ t: ev.t, travel: ev.travel, type: g.type, px: px, py: py, cl: g.shape === 'cl' ? 1 : 0 });
      }
    });
    return out;
  }

  // 旧式顶边波（教学段沿用）
  function top(t, travel, items) { return { t: t, travel: travel, items: items }; }

  // 第三关 29 框环带（顺时针：顶10 → 右5 → 右下4 → 底4 → 左6），取自线框图 image22/24
  var RING = [
    [15, 16], [21, 16], [27, 16], [33, 16], [40, 16], [46, 16], [52, 16], [59, 16], [67, 17], [73, 17],
    [82, 24], [86, 34], [86, 45], [86, 57], [86, 68],
    [84, 80], [79, 86], [71, 90], [63, 90],
    [35, 90], [27, 90], [17, 90],
    [10, 84], [6, 75], [6, 64], [6, 53], [6, 43], [6, 32], [8, 19]
  ];
  var RING_IDEA = { 1: 1, 2: 1, 9: 1, 10: 1, 11: 1, 12: 1, 16: 1, 17: 1, 22: 1, 23: 1, 28: 1, 29: 1 };  // 70S 环扫中出想法的框

  function ringWave(t0, ideaMap) {
    var gs = [];
    for (var i = 0; i < 29; i++) gs.push(wave(+(t0 + i * 0.1).toFixed(1), 5, [grp(RING[i], ideaMap && ideaMap[i + 1] ? 'idea' : 'desire', 1)]));
    return gs;
  }

  // 第三关 60–68S 滑动三重波：框 k 在 60+k / 61+k / 62+k 各出一轮（框2/4/7 按用户拍板=欲望）
  var SLIDE = [
    { at: [17, 14], mix: 1 }, { at: [49, 15], mix: 0 }, { at: [84, 15], mix: 1 }, { at: [93, 52], mix: 0 },
    { at: [82, 90], mix: 1 }, { at: [19, 90], mix: 1 }, { at: [6, 52], mix: 0 }
  ];
  function slideWaves() {
    var out = [], k, w, t, s;
    for (k = 0; k < 7; k++) for (w = 0; w < 3; w++) {
      t = 60 + k + w; s = SLIDE[k];
      var gs = s.mix ? [grp(s.at, 'desire', 3, 'row'), grp([s.at[0] + 9, s.at[1]], 'pressure', 1)]
                     : [grp(s.at, 'desire', 5, s.at[1] > 30 && s.at[1] < 70 ? 'col' : 'row')];
      out.push(wave(t, 5, gs));
    }
    return out;
  }

  // 第四关·无限 demo：复用前三关语汇（corner/box/slide/ring）程序化出波。
  // 难度先易后难：t<60 入门（单波 2→6、间隔 2.6→1.5s）；t>=60 起**比第三关更难**（单波 6→10 + 镜像第二组 + 压力 2→4、间隔 1.2→0.5s）。
  function endlessSpawns(t) {
    var late = t >= 60;
    var k = late ? Math.min(1, (t - 60) / 60) : Math.min(1, t / 60);
    var n = late ? 6 + Math.floor(k * 4) : 2 + Math.floor(k * 4);
    var pn = late ? 2 + Math.floor(k * 2) : (t > 20 ? 1 : 0);
    var pick = Math.floor(t / (late ? 4 : 7)) % 4;
    var gs = [];
    function mirror(at) { return [100 - at[0], at[1]]; }
    if (pick === 0) {                                   // 四角连打
      var C = [[10, 18], [88, 20], [87, 85], [10, 83]];
      var c = C[Math.floor(t / 3) % 4];
      gs.push(grp(c, 'desire', n));
      if (late || t > 30) gs.push(grp(mirror(c), 'desire', Math.max(2, n - 2)));
    } else if (pick === 1) {                            // 六框混压
      var B = [[11, 13], [51, 17], [88, 14], [89, 48], [89, 83], [12, 83]];
      var b = B[Math.floor(t / 5) % 6];
      gs.push(grp(b, 'desire', 4, 'box'));
      if (pn) gs.push(grp([b[0] < 50 ? b[0] + 8 : b[0] - 8, b[1]], 'pressure', pn));
      if (late) gs.push(grp(mirror(b), 'desire', 4, 'box'));
    } else if (pick === 2) {                            // 滑动 row/col
      var S = [[17, 14], [49, 15], [84, 15], [93, 52], [82, 90], [19, 90], [6, 52]];
      var s = S[Math.floor(t / 4) % 7];
      gs.push(grp(s, 'desire', n, s[1] > 30 && s[1] < 70 ? 'col' : 'row'));
      if (pn) gs.push(grp([s[0] + 9, s[1]], 'pressure', pn));
      if (late) gs.push(grp(mirror(s), 'desire', n, s[1] > 30 && s[1] < 70 ? 'col' : 'row'));
    } else {                                            // 环带扫（周期性出想法）
      var idx = Math.floor(t / 0.6) % 29;
      gs.push(grp(RING[idx], (Math.floor(t / 10) % 2 === 1) ? 'idea' : 'desire', 1));
      gs.push(grp(RING[(idx + 14) % 29], 'desire', 1));
      if (late) gs.push(grp(RING[(idx + 7) % 29], 'desire', 3), grp(RING[(idx + 21) % 29], 'desire', 3));
    }
    return expand(wave(t, 5, gs));
  }

  var LEVELS = [
    {
      // 第一关 · 教学（37S）：0–20S 保留原教学六波；24/28/32S 分区波
      id: 1, name: '教学', duration: 37,
      spawns: [
        top(0, 5, [{ type: 'desire', count: 1 }]),
        top(4, 5, [{ type: 'desire', count: [2, 3] }]),
        top(8, 5, [{ type: 'idea', count: 1 }]),
        top(12, 5, [{ type: 'idea', count: [2, 3] }]),
        top(16, 5, [{ type: 'pressure', count: 1 }]),
        top(20, 5, [{ type: 'pressure', count: [2, 3] }]),
        wave(24, 5, [grp([7, 44], 'idea', 1), grp([91, 42], 'idea', 1), grp([28, 88], 'idea', 1), grp([70, 88], 'idea', 1)]),
        wave(28, 5, [grp([49, 15], 'desire', 3, 'row'), grp([8, 36], 'desire', 3, 'col'), grp([91, 31], 'desire', 3, 'col')]),
        wave(32, 5, [
          grp([48, 13], 'pressure', 1), grp([17.5, 25], 'pressure', 1), grp([80, 24], 'pressure', 1),
          grp([8.5, 54], 'pressure', 1), grp([92, 51], 'pressure', 1), grp([21, 86], 'pressure', 1), grp([78, 87], 'pressure', 1)
        ])
      ]
    },
    {
      // 第二关 · 训练（50S）：入门五圈 → 进阶双列 → 考验连打 → 奖励 → 混压 → 训练三区 → 考验全屏 → 奖励想法雨
      id: 2, name: '训练', duration: 50,
      spawns: [
        wave(0, 5, [grp([14, 19], 'desire', 3)]),
        wave(2, 5, [grp([47, 13], 'desire', 3, 'row')]),
        wave(4, 5, [grp([91, 26], 'desire', 3, 'col')]),
        wave(6, 5, [grp([86, 84], 'desire', 3)]),
        wave(8, 5, [grp([16, 85], 'desire', 3)]),
        wave(10, 5, [grp([7, 24], 'desire', 4, 'col'), grp([9, 74], 'desire', 4)]),
        wave(12, 5, [grp([91, 24], 'desire', 4, 'col'), grp([89, 74], 'desire', 4)]),
        wave(16, 5, [grp([47, 14], 'desire', 4, 'row'), grp([34, 95], 'desire', 2, 'row'), grp([66, 95], 'desire', 2, 'row')]),
        wave(17, 5, [grp([7.5, 50], 'desire', 4, 'col'), grp([92, 50], 'desire', 4, 'col')]),
        wave(19, 5, [grp([88, 25], 'desire', 5), grp([12, 72], 'desire', 5)]),
        wave(20, 5, [grp([12, 25], 'desire', 5), grp([86, 74], 'desire', 5)]),
        wave(22, 5, [grp([12, 80], 'desire', 4)]),
        wave(23, 5, [grp([86, 84], 'desire', 4)]),
        wave(24, 5, [grp([89, 28], 'desire', 4, 'col')]),
        wave(25, 5, [grp([47, 12], 'desire', 4, 'row')]),
        wave(26, 5, [grp([14, 20], 'desire', 4)]),
        wave(30, 5, [grp(Z.TL, 'idea', 1), grp(Z.TC, 'idea', 1), grp(Z.L, 'idea', 1), grp(Z.R, 'idea', 1), grp(Z.BL, 'idea', 1), grp(Z.BR, 'idea', 1)]),
        wave(34, 5, [grp([12, 15], 'desire', 5), grp([88, 78], 'desire', 5), grp([88, 15], 'pressure', 1), grp([10, 85], 'pressure', 1)]),
        wave(37, 5, [
          grp([8, 47], 'desire', 4, 'col'), grp([13, 85], 'desire', 4),
          grp([22, 16], 'pressure', 3, 'row'), grp([81, 88], 'pressure', 3),
          grp([92, 22], 'desire', 4, 'col'), grp([95, 62], 'desire', 4, 'col')
        ]),
        wave(40, 5, [
          grp([47, 13], 'desire', 7, 'row'), grp([8, 48], 'desire', 6, 'col2'), grp([92, 48], 'desire', 6, 'col2'),
          grp([36, 92], 'desire', 3), grp([65, 93], 'desire', 3),
          grp([14, 10], 'pressure', 3), grp([88, 12], 'pressure', 3), grp([13, 92], 'pressure', 3), grp([87, 92], 'pressure', 3)
        ]),
        wave(44, 5, [
          grp([47, 12], 'idea', 2, 'row'), grp([8, 45], 'idea', 2, 'col'), grp([92, 45], 'idea', 2, 'col'),
          grp([14, 18], 'idea', 4), grp([86, 18], 'idea', 4), grp([15, 85], 'idea', 4), grp([85, 85], 'idea', 4)
        ])
      ]
    },
    {
      // 第三关 · 考验（84S）：入门六框 → 训练六框往返 → 考验混压 → 想法奖励 → 四角连打 → 环扫×2 → 滑动风暴 → 环扫(想法) → 奖励
      id: 3, name: '考验', duration: 84,
      spawns: (function () {
        var T1 = [21, 17], T2 = [42, 17], T3 = [61, 17], B1 = [29, 92], B2 = [69, 92], B3 = [87, 92];
        var SIX = [T1, T2, T3, B1, B2, B3];
        var BOX = [[11, 13], [51, 17], [88, 14], [89, 48], [89, 83], [12, 83]];   // 训练六框 1–6
        var CORNER = [[10, 18], [88, 20], [87, 85], [10, 83]];                   // 42–50S 四角框 1–4
        var s = [];
        function sixWave(t, n, withP) {
          var gs = [];
          SIX.forEach(function (at) { gs.push(grp(at, 'desire', n, n > 3 ? 'g32' : 'row')); });
          if (withP) { gs.push(grp([88, 12], 'pressure', 2), grp([6, 85], 'pressure', 2)); }
          return wave(t, 5, gs);
        }
        function boxWave(t, i) {  // 框 i(0-based)：4 欲望 + 1 压力（压力在框侧）
          var at = BOX[i], px = at[0] < 50 ? at[0] + 8 : at[0] - 8;
          return wave(t, 5, [grp(at, 'desire', 4, 'box'), grp([px, at[1]], 'pressure', 1)]);
        }
        s.push(sixWave(0, 3), sixWave(2, 3), sixWave(4, 6, true), sixWave(6, 6, true));
        s.push(wave(8, 5, [grp([9, 52], 'desire', 12, 'col2'), grp([92, 52], 'desire', 12, 'col2'), grp([9, 92], 'pressure', 1), grp([92, 10], 'pressure', 1), grp([72, 10], 'pressure', 2, 'row'), grp([32, 92], 'pressure', 2, 'row')]));
        s.push(wave(10, 5, [grp([9, 52], 'desire', 12, 'col2'), grp([92, 52], 'desire', 12, 'col2'), grp([9, 92], 'pressure', 1), grp([92, 10], 'pressure', 1), grp([72, 10], 'pressure', 2, 'row'), grp([32, 92], 'pressure', 2, 'row')]));
        [12, 13, 14, 15, 16, 17].forEach(function (t, i) { s.push(boxWave(t, i)); });
        [20, 21, 22, 23, 24, 25].forEach(function (t, i) { s.push(boxWave(t, 5 - i)); });
        s.push(wave(28, 5, [grp([11, 15], 'desire', 4, 'box'), grp([19, 15], 'pressure', 1), grp([85, 85], 'desire', 4, 'box'), grp([77, 85], 'pressure', 1)]));
        s.push(wave(29, 5, [grp([86, 15], 'desire', 3), grp([86, 8], 'pressure', 2, 'row'), grp([12, 85], 'desire', 3), grp([12, 76], 'pressure', 2, 'row')]));
        s.push(wave(30, 5, [grp([10, 16], 'pressure', 1)]));
        s.push(wave(31, 5, [grp([50, 16], 'desire', 9, 'row')]));
        s.push(wave(32, 5, [grp([91, 16], 'pressure', 1)]));
        s.push(wave(33, 5, [grp([92, 52], 'desire', 6, 'col')]));
        s.push(wave(34, 5, [grp([91, 88], 'pressure', 1)]));
        s.push(wave(35, 5, [grp([72, 90], 'desire', 4, 'row')]));
        s.push(wave(36, 5, [grp([10, 90], 'pressure', 1)]));
        s.push(wave(37, 5, [grp([28, 90], 'desire', 4, 'row')]));
        s.push(wave(38, 5, [grp([7, 52], 'desire', 6, 'col')]));
        s.push(wave(40, 5, [grp([47, 12], 'idea', 6, 'row'), grp([6, 45], 'idea', 4, 'col'), grp([94, 45], 'idea', 4, 'col'), grp([30, 93], 'idea', 3, 'row'), grp([70, 93], 'idea', 3, 'row')]));
        [[42, [0]], [43, [0]], [44, [0, 1]], [45, [1]], [46, [1, 2]], [47, [2]], [48, [2, 3]], [49, [3]], [50, [3]]].forEach(function (e) {
          var gs = e[1].map(function (ci) { return grp(CORNER[ci], 'desire', 3); });
          s.push(wave(e[0], 5, gs));
        });
        ringWave(52).forEach(function (w) { s.push(w); });
        ringWave(55).forEach(function (w) { s.push(w); });
        slideWaves().forEach(function (w) { s.push(w); });
        ringWave(70, RING_IDEA).forEach(function (w) { s.push(w); });
        s.push(wave(80, 5, [grp([47, 12], 'idea', 6, 'row'), grp([6, 45], 'idea', 4, 'col'), grp([94, 45], 'idea', 4, 'col'), grp([30, 93], 'idea', 3, 'row'), grp([70, 93], 'idea', 3, 'row')]));
        return s;
      })()
    },
    {
      // 第四关 · 无限 demo：无倒计时，生命归零即结束；想法无上限；波次由 endlessSpawns 程序化生成
      id: 4, name: '无限', endless: true, duration: Infinity, spawns: []
    }
  ];

  ZSM.levels = {
    TOTAL_SLOTS: TOTAL_SLOTS, MADE: MADE,
    get: function (id) { return LEVELS[id - 1] || null; },
    rndCount: rndCount,
    expand: expand,
    endlessSpawns: endlessSpawns
  };
})();
