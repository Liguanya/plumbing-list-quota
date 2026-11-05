/* ============================================================
 * 天津造价信息 2026年1-10期 合并（data/periods-2026.js）
 * 作用：把官方期刊提取的管材/管件价格按期并入 PIPE_PRICE_PERIODS
 * 口径：除税价；钢管由吨价按 GB/T3091 理论重量折算元/m
 * ============================================================ */
(function () {
  var T = (typeof window !== 'undefined' && window.TJ_PERIODS_2026) || [];
  var P = (typeof window !== 'undefined' && window.PIPE_PRICE_PERIODS) || [];
  if (!T.length || !P.length) return;
  var tpl = P[0];
  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  function mg(dst, src) {
    if (!dst || !src) return 0;
    var n = 0;
    Object.keys(src).forEach(function (k) {
      var v = src[k];
      if (typeof v === 'number' && v > 0) { dst[k] = v; n++; }
    });
    return n;
  }
  function path(o, ks) {
    for (var i = 0; i < ks.length; i++) { if (!o) return null; o = o[ks[i]]; }
    return o;
  }
  T.forEach(function (p) {
    var exist = null;
    for (var i = 0; i < P.length; i++) if (P[i].period === p.period) exist = P[i];
    var o = exist || cp(tpl);
    o.period = p.period;
    o.releaseLabel = p.label;
    o.source = 'tj-info';
    var n = 0;
    function markInfo(node, src) {
      if (!node || !src) return;
      node.infoDns = Object.keys(src).map(Number).filter(function (x) { return !isNaN(x); });
    }
    n += mg(path(o, ['castIron', 'water', 'price']), p.castWater);
    markInfo(path(o, ['castIron', 'water']), p.castWater);
    n += mg(path(o, ['castIron', 'drain', 'price']), p.castDrain);
    markInfo(path(o, ['castIron', 'drain']), p.castDrain);
    n += mg(path(o, ['welded', 'price']), p.weld);
    markInfo(path(o, ['welded']), p.weld);
    n += mg(path(o, ['plastic', 'ppr', 'price']), p.ppr);
    markInfo(path(o, ['plastic', 'ppr']), p.ppr);
    n += mg(path(o, ['plastic', 'pe', 'price']), p.pe);
    markInfo(path(o, ['plastic', 'pe']), p.pe);
    n += mg(path(o, ['plastic', 'pvcDrain', 'price']), p.pvcDrain);
    markInfo(path(o, ['plastic', 'pvcDrain']), p.pvcDrain);
    n += mg(path(o, ['composite', 'alplastic', 'price']), p.composite);
    markInfo(path(o, ['composite', 'alplastic']), p.composite);
    o.infoCount = n;
    if (!exist) P.push(o);
  });
  function pk(s) { var a = String(s || '').split('-'); return (parseInt(a[0], 10) || 0) * 100 + (parseInt(a[1], 10) || 0); }
  P.sort(function (a, b) { return pk(b.period) - pk(a.period); });
})();
