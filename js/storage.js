/* localStorage 安全封装：file:// 或隐私模式下回退内存 */
(function () {
  var mem = {};
  var ok = (function () {
    try { localStorage.setItem('__zsm_t', '1'); localStorage.removeItem('__zsm_t'); return true; }
    catch (e) { return false; }
  })();
  window.ZSM = window.ZSM || {};
  ZSM.storage = {
    get: function (key, dflt) {
      try {
        var raw = ok ? localStorage.getItem(key) : mem[key];
        if (raw === null || raw === undefined) return dflt;
        return JSON.parse(raw);
      } catch (e) { return dflt; }
    },
    set: function (key, val) {
      try {
        var raw = JSON.stringify(val);
        if (ok) localStorage.setItem(key, raw); else mem[key] = raw;
      } catch (e) { /* ignore */ }
    },
    del: function (key) {
      try { if (ok) localStorage.removeItem(key); else delete mem[key]; } catch (e) { /* ignore */ }
    }
  };
})();
