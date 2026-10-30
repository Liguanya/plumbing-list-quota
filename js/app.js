/* ============================================================
 * 给排水专业智能组价系统 - 核心逻辑
 * 依据：天津市安装工程工程量清单计价指引（2025版，2025-10-01施行）
 *       配套 天津市安装工程预算基价 第八册 给排水、采暖、燃气工程 DBD29-308-2020
 *
 * 已实现：铸铁管（031001001）、镀锌钢管（031001002）
 *   第八册 第一章 给排水、采暖管道安装
 *   一、室外管道
 *     7. 承插铸铁给水管（青铅接口）      8-90 ~ 8-99   DN75~500
 *     8. 承插铸铁给水管（膨胀水泥接口）  8-100 ~ 8-109 DN75~500
 *     9. 承插铸铁给水管（石棉水泥接口）  8-110 ~ 8-119 DN75~500
 *    10. 承插铸铁给水管（胶圈接口）      8-120 ~ 8-128 DN100~500（无DN75）
 *    11. 承插铸铁排水管（石棉水泥接口）  8-129 ~ 8-134 DN50~200（50/75/100/125/150/200）
 *    12. 承插铸铁排水管（水泥接口）      8-135 ~ 8-140 DN50~200
 *   二、室内管道
 *     9. 承插铸铁给水管（青铅接口）      8-336 ~ 8-341 DN75~300
 *    10. 承插铸铁给水管（膨胀水泥接口）  8-342 ~ 8-347 DN75~300
 *    11. 承插铸铁给水管（石棉水泥接口）  8-348 ~ 8-353 DN75~300
 *    12. 承插铸铁排水管（石棉水泥接口）  8-354 ~ 8-359 DN50~250（50/75/100/150/200/250）
 *    13. 承插铸铁排水管（水泥接口）      8-360 ~ 8-365 DN50~250
 *   注：室内给水无胶圈接口子目；排水只有石棉水泥/水泥两种接口子目。
 *
 * 镀锌钢管（清单 031001002 镀锌钢管，单位 10m）
 *     室外管道 镀锌钢管(螺纹连接)        8-1    ~ 8-11   DN15~150（15/20/25/32/40/50/65/80/100/125/150）
 *     室内管道 镀锌钢管(螺纹连接)        8-173  ~ 8-183  DN15~150（同上11档）
 *     室外燃气镀锌钢管(螺纹连接)         8-1128 ~ 8-1131 DN25/32/40/50
 *     室内燃气镀锌钢管(螺纹连接)         8-1132 ~ 8-1140 DN15/20/25/32/40/50/65/80/100
 *
 * 价格库见 data/prices.js
 * ============================================================ */

(function () {
  'use strict';

  // ---------- 清单编码 ----------
  var LIST = {
    castIron: { code: '031001001', name: '铸铁管' },
    galv: { code: '031001002', name: '镀锌钢管' },
    steel: { code: '031001002', name: '钢管' },
    stainless: { code: '031001003', name: '不锈钢管' },
    copper: { code: '031001004', name: '铜管' },
    plastic: { code: '031001005', name: '塑料管' },
    composite: { code: '031001006', name: '复合管' },
    preInsul: { code: '031001007', name: '直埋保温管' }
  };

  // ---------- 铸铁管定额矩阵 ----------
  // start：该接口形式第一个子目号；dns：依次对应的公称直径档
  var CAST_IRON = {
    out_water: {
      lead: { start: 90, dns: [75, 100, 150, 200, 250, 300, 350, 400, 450, 500], name: '室外管道 承插铸铁给水管(青铅接口)' },
      expand: { start: 100, dns: [75, 100, 150, 200, 250, 300, 350, 400, 450, 500], name: '室外管道 承插铸铁给水管(膨胀水泥接口)' },
      asbestos: { start: 110, dns: [75, 100, 150, 200, 250, 300, 350, 400, 450, 500], name: '室外管道 承插铸铁给水管(石棉水泥接口)' },
      rubber: { start: 120, dns: [100, 150, 200, 250, 300, 350, 400, 450, 500], name: '室外管道 承插铸铁给水管(胶圈接口)' }
    },
    out_drain: {
      asbestos: { start: 129, dns: [50, 75, 100, 125, 150, 200], name: '室外管道 承插铸铁排水管(石棉水泥接口)' },
      cement: { start: 135, dns: [50, 75, 100, 125, 150, 200], name: '室外管道 承插铸铁排水管(水泥接口)' }
    },
    in_water: {
      lead: { start: 336, dns: [75, 100, 150, 200, 250, 300], name: '室内管道 承插铸铁给水管(青铅接口)' },
      expand: { start: 342, dns: [75, 100, 150, 200, 250, 300], name: '室内管道 承插铸铁给水管(膨胀水泥接口)' },
      asbestos: { start: 348, dns: [75, 100, 150, 200, 250, 300], name: '室内管道 承插铸铁给水管(石棉水泥接口)' }
    },
    in_drain: {
      asbestos: { start: 354, dns: [50, 75, 100, 150, 200, 250], name: '室内管道 承插铸铁排水管(石棉水泥接口)' },
      cement: { start: 360, dns: [50, 75, 100, 150, 200, 250], name: '室内管道 承插铸铁排水管(水泥接口)' }
    }
  };

  // ---------- 镀锌钢管定额矩阵 ----------
  var GALV = {
    out_water: { thread: { start: 1, dns: [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150], name: '室外管道 镀锌钢管(螺纹连接)' } },
    in_water: { thread: { start: 173, dns: [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150], name: '室内管道 镀锌钢管(螺纹连接)' } },
    out_gas: { thread: { start: 1128, dns: [25, 32, 40, 50], name: '室外燃气镀锌钢管(螺纹连接)' } },
    in_gas: { thread: { start: 1132, dns: [15, 20, 25, 32, 40, 50, 65, 80, 100], name: '室内燃气镀锌钢管(螺纹连接)' } }
  };

  var JOINT_CN = { lead: '青铅接口', expand: '膨胀水泥接口', asbestos: '石棉水泥接口', rubber: '胶圈接口', cement: '水泥接口', thread: '螺纹连接', gas_thread: '螺纹连接（燃气）' };
  var JOINT_ORDER = ['asbestos', 'cement', 'lead', 'expand', 'rubber'];
  var JOINT_ORDER_GALV = ['thread', 'gas_thread'];
  var LOC_CN = { in: '室内', out: '室外' };
  var MEDIUM_CN = { water: '给水', drain: '排水', gas: '燃气' };

  function ruleTable(it) { return it && it.category === 'galv' ? GALV : CAST_IRON; }
  // 定额分组键：铸铁 → 室内外+给排水；镀锌 → 室内外+给水/燃气（按所选连接方式区分燃气）
  function pipeKey(it) {
    var loc = it.loc === 'out' ? 'out_' : 'in_';
    if (it.category === 'galv') return loc + (it.joint === 'gas_thread' ? 'gas' : 'water');
    return loc + (it.medium === 'drain' ? 'drain' : 'water');
  }
  function jointsOf(it) {
    // 镀锌钢管：室外/室内均有普通与燃气两组螺纹连接子目，故两种连接方式始终可选
    if (it && it.category === 'galv') return ['thread', 'gas_thread'];
    var tbl = ruleTable(it)[pipeKey(it)] || {};
    var order = it && it.category === 'galv' ? JOINT_ORDER_GALV : JOINT_ORDER;
    return order.filter(function (j) { return !!tbl[j]; });
  }
  function defaultJoint(it) {
    var list = jointsOf(it);
    if (it && it.category === 'galv') return list.indexOf('thread') >= 0 ? 'thread' : (list[0] || 'thread');
    return list.indexOf('asbestos') >= 0 ? 'asbestos' : (list[0] || 'asbestos');
  }

  // ---------- 名称解析 ----------
  function isCastIron(name) {
    return /铸铁|离心浇筑灰口铁|机制离心|球墨铸铁|灰口铁/.test(name || '');
  }

  function parseDN(name) {
    var s = String(name || '').replace(/[（(]/g, ' ').replace(/[）)]/g, ' ');
    var m = s.match(/(?:DN|dn|De|de|D|Φ|φ|Ø)\s*[-－]?\s*(\d{2,4})/);
    if (m) return parseInt(m[1], 10);
    m = s.match(/(\d{2,4})\s*(?:mm|MM|毫米)/);
    if (m) return parseInt(m[1], 10);
    m = s.match(/[×xX*]\s*(\d{2,3})\b/); // 极少见写法
    if (m) return parseInt(m[1], 10);
    return null;
  }

  function parseMedium(name) {
    var s = name || '';
    if (/燃气|煤气|天然气|液化气|气源|瓦斯/.test(s)) return 'gas';
    if (/排水|污水|废水|雨水|冷凝水|冷凝|通气管|透气|地漏|潜污/.test(s)) return 'drain';
    if (/给水|生活给水|生产给水|消防|消火栓|喷淋|中水/.test(s)) return 'water';
    if (/排水/.test(s)) return 'drain';
    return 'water';
  }

  function parseLoc(name) {
    var s = name || '';
    if (/室外|户外|室外埋地|埋地|外网|庭院|厂区|小区|室外管网/.test(s)) return 'out';
    if (/室内|楼内|管井|地库|地下车库|卫生间|厨房|设备间|管道井/.test(s)) return 'in';
    return 'in';
  }

  function parseJoint(name) {
    var s = name || '';
    if (/青铅/.test(s)) return 'lead';
    if (/膨胀水泥/.test(s)) return 'expand';
    if (/石棉水泥|石棉/.test(s)) return 'asbestos';
    if (/胶圈|橡胶圈|柔性接口|卡箍|机械接口|法兰接口/.test(s)) return 'rubber';
    if (/水泥接口|水泥捻口|水泥/.test(s)) return 'cement';
    return null;
  }

  // 材质归类（后续材质规则陆续补充）
  function materialOf(name) {
    var s = name || '';
    if (isCastIron(s)) return '铸铁';
    if (/不锈钢/.test(s)) return '不锈钢';
    if (/镀锌钢管|热浸镀锌|热镀锌|镀锌焊接钢管|内外壁热浸镀锌|镀锌管/.test(s)) return '镀锌钢';
    if (/焊接钢管|无缝钢管|钢管/.test(s)) return '钢';
    if (/铜管/.test(s)) return '铜';
    if (/PPR|PP-R|PE|PVC|UPVC|HDPE|PB|PEX|塑料/.test(s)) return '塑料';
    if (/复合管|钢塑|铝塑/.test(s)) return '复合';
    return '其他';
  }

  // ---------- 建条目 ----------
  function buildItem(name) {
    if (!name) return null;
    var it = {};
    it.name = name;
    it.material = materialOf(name);
    it.dn = parseDN(name);
    it.medium = parseMedium(name);
    it.loc = parseLoc(name);
    it.mediumAmbiguous = !/排水|污水|废水|雨水|给水|消防|消火栓|喷淋|中水|冷凝|燃气|煤气|天然气|液化气/.test(name);
    it.locAmbiguous = !/室内|室外|户外|外网|庭院|楼内|管井|地库/.test(name);

    if (it.material === '铸铁') {
      it.category = 'castIron';
      it.listCode = LIST.castIron.code;
      it.listName = LIST.castIron.name;
      var j = parseJoint(name);
      it.jointAuto = j || defaultJoint(it);
      it.joint = it.jointAuto;
      it.jointFromName = !!j;
      var allow = jointsOf(it);
      if (allow.indexOf(it.joint) < 0) {
        it.jointFallback = it.joint;
        it.joint = defaultJoint(it);
      }
    } else if (it.material === '镀锌钢') {
      it.category = 'galv';
      it.listCode = LIST.galv.code;
      it.listName = LIST.galv.name;
      var isGas = /燃气|煤气|天然气|液化气|气源|瓦斯/.test(name);
      it.medium = isGas ? 'gas' : 'water';
      it.jointAuto = isGas ? 'gas_thread' : 'thread';
      it.joint = it.jointAuto;
      it.jointFromName = isGas;
      it.jointFallback = null;
    } else {
      it.category = 'other';
      it.listCode = '';
      it.listName = '';
      it.joint = null;
    }
    it.unit = 'm';
    return it;
  }

  // ---------- 定额匹配 ----------
  function matchQuota(it) {
    if (!it || (it.category !== 'castIron' && it.category !== 'galv')) return { code: '', name: '', inferred: false };
    var tbl = ruleTable(it)[pipeKey(it)];
    if (!tbl) return { code: '', name: '', inferred: false };
    var def = tbl[it.joint] || tbl[defaultJoint(it)];
    if (!def) return { code: '', name: '', inferred: false };
    if (it.dn === null || it.dn === undefined || isNaN(it.dn)) {
      return { code: '', name: def.name + '（管径待识别）', inferred: false, needDn: true };
    }
    var idx = -1;
    for (var i = 0; i < def.dns.length; i++) { if (it.dn <= def.dns[i]) { idx = i; break; } }
    var inferred = false;
    if (idx < 0) { idx = def.dns.length - 1; inferred = true; }
    else if (def.dns[idx] !== it.dn) inferred = true;
    var dn = def.dns[idx];
    return {
      code: '8-' + (def.start + idx),
      name: def.name + ' 公称直径' + dn + 'mm以内',
      inferred: inferred,
      dnTier: dn,
      unit: '10m',
      factor: 10
    };
  }

  // ---------- 价格 ----------
  function getPeriods() {
    var arr = (typeof window !== 'undefined' && window.PIPE_PRICE_PERIODS) ? window.PIPE_PRICE_PERIODS
      : ((typeof window !== 'undefined' && window.CABLE_PRICE_PERIODS) || []);
    return arr || [];
  }
  function getPeriod(periodKey) {
    var arr = getPeriods();
    for (var i = 0; i < arr.length; i++) if (arr[i].period === periodKey) return arr[i];
    return arr[0] || null;
  }
  function interpPrice(table, key) {
    var keys = Object.keys(table).map(Number).sort(function (a, b) { return a - b; });
    if (!keys.length) return null;
    if (table[key] !== undefined) return { price: table[key], exact: true, tier: key };
    for (var i = 0; i < keys.length; i++) {
      if (key <= keys[i]) return { price: table[keys[i]], exact: false, tier: keys[i] };
    }
    var last = keys[keys.length - 1];
    return { price: table[last], exact: false, tier: last, overflow: true };
  }

  function lookupCastIronPrice(periodKey, it) {
    var p = getPeriod(periodKey);
    if (!p || !p.castIron) return null;
    if (it.dn === null || isNaN(it.dn)) return null;
    var grp = it.medium === 'drain' ? p.castIron.drain : p.castIron.water;
    if (!grp) return null;
    var r = interpPrice(grp.price, it.dn);
    if (!r) return null;
    var basis = '铸铁' + MEDIUM_CN[it.medium] + '管 DN' + it.dn + '：' + grp.brand + '，' + r.price.toFixed(2) + '元/m（除税）' +
      (r.exact ? '' : '；信息价无DN' + it.dn + '档，按DN' + r.tier + '档就近取定') +
      (r.overflow ? '；已超常用最大档，请核对' : '');
    return { price: r.price, source: 'market', basis: basis };
  }

  function lookupGalvPrice(periodKey, it) {
    var p = getPeriod(periodKey);
    if (!p || !p.galv) return null;
    if (it.dn === null || isNaN(it.dn)) return null;
    var r = interpPrice(p.galv.price, it.dn);
    if (!r) return null;
    var basis = '镀锌钢管 DN' + it.dn + '（' + (it.joint === 'gas_thread' ? '燃气' : '给水') + '）：' + p.galv.brand +
      '，' + r.price.toFixed(2) + '元/m（除税）' +
      (r.exact ? '' : '；信息价无DN' + it.dn + '档，按DN' + r.tier + '档就近取定') +
      (r.overflow ? '；已超常用最大档，请核对' : '');
    return { price: r.price, source: 'market', basis: basis };
  }

  function isPriced(it) { return it && (it.category === 'castIron' || it.category === 'galv'); }

  function recomputePrice(it, periodKey) {
    var info = null;
    if (it.category === 'castIron') info = lookupCastIronPrice(periodKey, it);
    else if (it.category === 'galv') info = lookupGalvPrice(periodKey, it);
    if (info) {
      it.price = info.price; it.priceSource = info.source; it.priceBasis = info.basis;
    } else {
      it.price = null;
      it.priceSource = isPriced(it) ? 'pending' : 'na';
      it.priceBasis = '';
    }
  }

  // ---------- 项目特征 ----------
  function featureText(it) {
    var parts = [];
    parts.push('安装部位:' + (it.loc === 'out' ? '室外' : '室内'));
    parts.push('材质:' + (it.material || '铸铁'));
    if (it.dn) parts.push('型号规格:DN' + it.dn);
    if (it.category === 'castIron') {
      parts.push('连接形式:承插');
      parts.push('接口材料:' + (JOINT_CN[it.joint] || '石棉水泥接口'));
      parts.push(it.medium === 'drain' ? '灌水试验、通球试验' : '水压试验、水冲洗');
    } else if (it.category === 'galv') {
      parts.push('连接形式:螺纹连接');
      parts.push('接口材料:' + (it.joint === 'gas_thread' ? '聚四氟乙烯生料带（燃气管道）' : '铅油麻丝、聚四氟乙烯生料带'));
      parts.push(it.joint === 'gas_thread' ? '气压试验、空气吹扫' : '水压试验、水冲洗');
    }
    return parts.join('；');
  }

  // ---------- 核对提示 ----------
  function buildWarn(it, quota) {
    var w = [];
    if (!isPriced(it)) {
      w.push('该材质（' + it.material + '）的清单/定额匹配逻辑待补充，暂只输出名称与长度，请手工套用');
      return w.join('；');
    }
    if (it.dn === null || it.dn === undefined || isNaN(it.dn)) {
      w.push('未识别公称直径，请在项目名称中注明（如 DN100 / DN150）');
    }
    if (it.jointFallback) {
      w.push('所选' + LOC_CN[it.loc] + MEDIUM_CN[it.medium] + '无' + JOINT_CN[it.jointFallback] + '子目，已按' + JOINT_CN[it.joint] + '套用，请核对');
    }
    if (it.category === 'galv' && it.joint === 'gas_thread') {
      var gasRange = it.loc === 'out' ? 'DN25~50' : 'DN15~100';
      if (it.dn !== null && (it.loc === 'out' ? (it.dn < 25 || it.dn > 50) : (it.dn < 15 || it.dn > 100))) {
        w.push('燃气镀锌钢管' + LOC_CN[it.loc] + '子目仅' + gasRange + '，DN' + it.dn + '超出范围，请核对');
      }
    }
    if (it.dn !== null && quota && quota.code && quota.dnTier && quota.dnTier !== it.dn) {
      w.push('DN' + it.dn + '无对应档，按 DN' + quota.dnTier + '以内子目套用，请核对');
    }
    if (it.mediumAmbiguous) {
      if (it.category === 'galv') w.push('名称未注明给水/燃气，按给水（普通螺纹连接）套用，燃气管道请在选型列切换连接方式');
      else w.push('名称未注明给水/排水，按' + MEDIUM_CN[it.medium] + '套用，如不符请在名称中注明');
    }
    if (it.locAmbiguous) w.push('名称未注明室内/室外，按室内套用，可在选型列切换');
    if (it.qtyWarn) w.push('工程量缺失，暂按1m计，请核对');
    return w.join('；');
  }

  // ---------- 解析整表 ----------
  function parseRows(aoa, periodKey, format) {
    var results = [];
    var autoIdx = 0;
    for (var r = 0; r < aoa.length; r++) {
      var row = aoa[r] || [];
      var rawName = row[1];
      var name = (rawName === undefined || rawName === null) ? '' : String(rawName).trim();
      if (!name) continue;
      if (/序号/.test(String(row[0] || '')) && /名称/.test(name)) continue;
      if (/项目名称|管道名称|名称规格/.test(name) && !/\d/.test(name) && r < 5) continue;

      var it = buildItem(name);
      if (!it) continue;

      autoIdx++;
      var seqRaw = row[0];
      it.index = (seqRaw !== undefined && seqRaw !== null && String(seqRaw).trim() !== '') ? String(seqRaw).trim() : String(autoIdx);

      var qtyRaw = row[2];
      var qty = parseFloat(qtyRaw);
      it.qtyWarn = false;
      if (isNaN(qty) || qty <= 0) { qty = 1; it.qtyWarn = true; }
      it.quantity = qty;

      var quota = matchQuota(it);
      it.quotaCode = quota.code;
      it.quotaName = quota.name;
      it.quotaUnit = quota.unit || it.unit;
      it.quotaFactor = quota.factor || 1;
      it.codeInferred = !!quota.inferred;
      it.dnTier = quota.dnTier || null;
      it.warn = buildWarn(it, quota);

      recomputePrice(it, periodKey);
      it.features = featureText(it);
      results.push(it);
    }
    results._periodKey = periodKey;
    results._format = format;
    return results;
  }

  function recomputeQuota(it) {
    var q = matchQuota(it);
    it.quotaCode = q.code;
    it.quotaName = q.name;
    it.quotaUnit = q.unit || it.unit;
    it.quotaFactor = q.factor || 1;
    it.codeInferred = !!q.inferred;
    it.dnTier = q.dnTier || null;
    it.warn = buildWarn(it, q);
  }

  // ============================================================
  // 渲染
  // ============================================================
  function priceText(item) {
    if (!isPriced(item)) return '<span class="tag tag-na">未计价</span>';
    if (item.price === null) return '<span class="tag tag-pending">待询价</span>';
    var tip = item.priceBasis ? ' title="' + String(item.priceBasis).replace(/"/g, '&quot;') + '"' : '';
    if (item.priceSource === 'estimated') return '<span class="tag tag-est"' + tip + '>估</span> <span' + tip + '>¥' + item.price.toFixed(2) + '</span>';
    if (item.priceSource === 'market') return '<span class="tag tag-market"' + tip + '>市场价</span> <span' + tip + '>¥' + item.price.toFixed(2) + '</span>';
    return '<span class="tag tag-info"' + tip + '>信息价</span> <span' + tip + '>¥' + item.price.toFixed(2) + '</span>';
  }
  function inferTag(it) {
    return it.codeInferred ? '<span class="tag tag-infer" title="定额编号按公称直径档位就近推算，请对照2020预算基价第八册子目表核对">推</span>' : '';
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function opt(val, cur, label) {
    return '<option value="' + val + '"' + (val === cur ? ' selected' : '') + '>' + label + '</option>';
  }
  function sel(act, idx, html) {
    return '<select class="cell-select" data-act="' + act + '" data-idx="' + idx + '">' + html + '</select>';
  }

  // 安装部位 / 接口形式 列
  function layCell(it) {
    if (!isPriced(it)) {
      return '<span class="lay-static">待补充</span>';
    }
    var locHtml = opt('in', it.loc, '室内') + opt('out', it.loc, '室外');
    var js = jointsOf(it);
    var jointHtml = js.map(function (j) { return opt(j, it.joint, JOINT_CN[j]); }).join('');
    return '<div style="display:flex;flex-direction:column;gap:4px;">' +
      sel('loc', it._i, locHtml) + sel('joint', it._i, jointHtml) + '</div>';
  }

  function specCell(it) {
    if (it.dn === null || it.dn === undefined || isNaN(it.dn)) return '—';
    return 'DN' + it.dn;
  }

  function renderTable(data) {
    var tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    data.forEach(function (item, i) {
      item._i = i;
      var tr = document.createElement('tr');
      if (item.warn) tr.className = 'row-warn';
      tr.innerHTML =
        '<td>' + escapeHtml(item.index) + '</td>' +
        '<td>' + (item.listCode || '—') + '</td>' +
        '<td class="cell-name" title="' + escapeHtml(item.name) + '">' + escapeHtml(item.name) + '</td>' +
        '<td>' + layCell(item) + '</td>' +
        '<td>' + escapeHtml(item.material || '—') + '</td>' +
        '<td>' + specCell(item) + '</td>' +
        '<td class="cell-qcode">' + (item.quotaCode || '—') + ' ' + inferTag(item) + '</td>' +
        '<td class="cell-qname" title="' + escapeHtml(item.quotaName) + '">' + escapeHtml(item.quotaName || '—') + '</td>' +
        '<td class="cell-price">' + priceText(item) + '</td>' +
        '<td>' + item.quantity + '</td>' +
        '<td class="cell-warn">' + (item.warn ? '<span title="' + escapeHtml(item.warn) + '">⚠️ ' + escapeHtml(item.warn) + '</span>' : '') + '</td>';
      tbody.appendChild(tr);
    });

    bindRowSelects(data);

    var cast = data.filter(function (d) { return d.category === 'castIron'; }).length;
    var other = data.length - cast - data.filter(function (d) { return d.category === 'galv'; }).length;
    var pending = data.filter(function (d) { return isPriced(d) && d.price === null; }).length;
    var total = data.reduce(function (s, d) { return s + (d.price === null ? 0 : d.price * d.quantity); }, 0);

    document.getElementById('totalCount').textContent = data.length;
    var galv = data.filter(function (d) { return d.category === 'galv'; }).length;
    document.getElementById('catCast').textContent = cast;
    var galvEl = document.getElementById('catGalv');
    if (galvEl) galvEl.textContent = galv;
    document.getElementById('catOther').textContent = other;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('totalPrice').textContent = '¥' + total.toFixed(2);
  }

  function bindRowSelects(data) {
    document.querySelectorAll('#tableBody select.cell-select').forEach(function (s) {
      s.addEventListener('change', function () {
        var idx = parseInt(s.getAttribute('data-idx'), 10);
        var act = s.getAttribute('data-act');
        var it = data[idx];
        if (!it) return;
        if (act === 'loc') {
          it.loc = s.value;
          it.locAmbiguous = false;
          var allow = jointsOf(it);
          if (allow.indexOf(it.joint) < 0) it.joint = defaultJoint(it);
          it.jointFallback = null;
        } else if (act === 'joint') {
          it.joint = s.value;
          it.jointFallback = null;
        }
        recomputeQuota(it);
        recomputePrice(it, data._periodKey);
        it.features = featureText(it);
        renderTable(data);
      });
    });
  }

  // ============================================================
  // 导出
  // ============================================================
  function round4(v) { return Math.round(v * 10000) / 10000; }
  function num2(v) { return v === null || v === undefined ? '' : Number(Number(v).toFixed(2)); }

  function exportJianjing(data) {
    var wsData = [['序号', '清单编码', '项目名称', '定额编码', '定额名称', '主材价格', '数量', '项目特征']];
    data.forEach(function (it) {
      wsData.push([it.index, it.listCode, it.name, it.quotaCode, it.quotaName,
        it.price === null ? '' : num2(it.price), it.quantity, it.features]);
    });
    var total = data.reduce(function (s, d) { return s + (d.price === null ? 0 : d.price * d.quantity); }, 0);
    wsData.push([]);
    wsData.push(['合计', '', '', '', '', num2(total), '', '']);

    var ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 42 }, { wch: 10 }, { wch: 40 }, { wch: 12 }, { wch: 8 }, { wch: 66 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '清单定额报价表');
    XLSX.writeFile(wb, '清单定额报价表_建经_' + today() + '.xlsx');
  }

  function exportGLD(data) {
    var wsData = [['序号', '项目名称', '类型', '材质', '型号', '规格', '截面mm2', '工程量',
      '项目编码', '类型', '名称', '项目特征', '单位', '工程量', '主材单价']];

    var zIdx = 0;
    data.forEach(function (it) {
      var hasPrice = it.price !== null && isPriced(it);
      var specVal = specCell(it);

      if (!it.quotaCode) {
        wsData.push([
          it.index, it.name, '管道', it.material, '', specVal, '', it.quantity,
          '', '待人工处理', it.name, it.features, it.unit, it.quantity,
          hasPrice ? num2(it.price) : ''
        ]);
        return;
      }
      wsData.push([
        it.index, it.name, '管道', it.material, '', specVal, '', it.quantity,
        it.listCode, '清单行', it.name, it.features, it.unit, it.quantity,
        hasPrice ? num2(it.price) : ''
      ]);
      var qFactor = it.quotaFactor || 1;
      wsData.push([
        it.index + '.1', '', '', '', '', '', '', '',
        it.quotaCode, '定额行', it.quotaName, '', it.quotaUnit || it.unit,
        round4(it.quantity / qFactor), ''
      ]);
      if (hasPrice) {
        zIdx++;
        wsData.push([
          it.index + '.2', '', '', '', '', '', '', '',
          'Z00741-' + String(zIdx).padStart(3, '0'), '子目下设备', it.name, '', it.unit, it.quantity, num2(it.price)
        ]);
      }
    });

    var total = data.reduce(function (s, d) { return s + (d.price === null ? 0 : d.price * d.quantity); }, 0);
    wsData.push([]);
    wsData.push(['合计', '', '', '', '', '', '', '', '', '', '', '', '', '', num2(total)]);

    var ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 8 }, { wch: 40 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 9 }, { wch: 9 },
      { wch: 13 }, { wch: 10 }, { wch: 40 }, { wch: 56 }, { wch: 6 }, { wch: 9 }, { wch: 12 }
    ];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '清单定额报价表');
    XLSX.writeFile(wb, '清单定额报价表_广联达_' + today() + '.xlsx');
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }

  // ============================================================
  // 初始化 & 事件
  // ============================================================
  var exportData = [];

  function currentFormat() {
    return (document.querySelector('input[name="software"]:checked') || {}).value || 'guanglianda';
  }
  function currentPeriod() {
    var el = document.getElementById('periodSelect');
    return el ? el.value : (getPeriods()[0] || {}).period;
  }

  function refreshAll() {
    if (!window._rawAOA) return;
    exportData = parseRows(window._rawAOA, currentPeriod(), currentFormat());
    renderTable(exportData);
    var area = document.getElementById('resultArea');
    var btn = document.getElementById('btnGroup');
    var bar = document.getElementById('statusBar');
    if (exportData.length) {
      area.style.display = 'block';
      btn.style.display = 'flex';
      bar.style.display = 'block';
      bar.className = 'status-bar status-ok';
      var cast = exportData.filter(function (d) { return d.category === 'castIron'; }).length;
      var galv = exportData.filter(function (d) { return d.category === 'galv'; }).length;
      var other = exportData.length - cast - galv;
      bar.textContent = '成功解析 ' + exportData.length + ' 条：铸铁管 ' + cast + ' 条' +
        (galv ? '、镀锌钢管 ' + galv + ' 条' : '') +
        (other ? '，其他材质 ' + other + ' 条（匹配逻辑待补充，需手工套用）' : '') +
        '；铸铁管/镀锌钢管可在「安装部位/接口形式」列切换室内外与接口形式（镀锌可选螺纹连接/燃气），定额与主材价实时重算；黄色行为需人工核对项';
    } else {
      area.style.display = 'none';
      btn.style.display = 'none';
      bar.style.display = 'block';
      bar.className = 'status-bar status-err';
      bar.textContent = '未在B列识别到管道项目名称，请检查表头是否为：A序号 / B项目名称 / C长度（m）';
    }
  }

  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', function () {
    var selEl = document.getElementById('periodSelect');
    getPeriods().forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.period;
      o.textContent = p.releaseLabel;
      selEl.appendChild(o);
    });
    selEl.addEventListener('change', refreshAll);

    var fileInput = document.getElementById('excelFile');
    var uploadArea = document.getElementById('uploadArea');

    fileInput.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (file) readFile(file);
    });

    uploadArea.addEventListener('click', function () { fileInput.click(); });
    uploadArea.addEventListener('dragover', function (e) { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', function () { uploadArea.classList.remove('dragover'); });
    uploadArea.addEventListener('drop', function (e) {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      var f = e.dataTransfer.files[0];
      if (f) readFile(f);
    });

    document.querySelectorAll('input[name="software"]').forEach(function (r) {
      r.addEventListener('change', refreshAll);
    });

    document.getElementById('resetBtn').addEventListener('click', function () {
      window._rawAOA = null;
      exportData = [];
      document.getElementById('resultArea').style.display = 'none';
      document.getElementById('btnGroup').style.display = 'none';
      document.getElementById('summaryArea').style.display = 'none';
      document.getElementById('statusBar').style.display = 'none';
      fileInput.value = '';
      document.getElementById('tableBody').innerHTML = '';
      document.getElementById('uploadArea').style.display = 'block';
    });

    document.getElementById('exportBtn').addEventListener('click', function () {
      if (!exportData.length) return;
      if (currentFormat() === 'jianjing') exportJianjing(exportData);
      else exportGLD(exportData);
    });
  });

  function readFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = new Uint8Array(e.target.result);
        var wb = XLSX.read(data, { type: 'array' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        window._rawAOA = aoa;
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('summaryArea').style.display = 'grid';
        refreshAll();
      } catch (err) {
        var bar = document.getElementById('statusBar');
        bar.style.display = 'block';
        bar.className = 'status-bar status-err';
        bar.textContent = '文件解析失败：' + err.message;
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // 本地调试/自动化句柄（纯前端、本地计算）
  if (typeof window !== 'undefined') {
    window.__pipe = {
      parseRows: parseRows, matchQuota: matchQuota, buildItem: buildItem,
      recomputeQuota: recomputeQuota, getPeriods: getPeriods,
      exportGLD: exportGLD, exportJianjing: exportJianjing,
      getData: function () { return exportData; },
      setAOA: function (aoa) {
        window._rawAOA = aoa;
        exportData = parseRows(aoa, currentPeriod(), currentFormat());
        renderTable(exportData);
        return exportData;
      },
      setLoc: function (i, v) {
        var it = exportData[i]; it.loc = v; it.locAmbiguous = false;
        var allow = jointsOf(it);
        if (allow.indexOf(it.joint) < 0) it.joint = defaultJoint(it);
        it.jointFallback = null;
        recomputeQuota(it); recomputePrice(it, exportData._periodKey); it.features = featureText(it);
        renderTable(exportData);
      },
      setJoint: function (i, v) {
        var it = exportData[i]; it.joint = v; it.jointFallback = null;
        recomputeQuota(it); recomputePrice(it, exportData._periodKey); it.features = featureText(it);
        renderTable(exportData);
      }
    };
  }

  // 暴露给Node测试
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      LIST: LIST, CAST_IRON: CAST_IRON, GALV: GALV, JOINT_CN: JOINT_CN,
      buildItem: buildItem, matchQuota: matchQuota, parseRows: parseRows,
      parseDN: parseDN, parseMedium: parseMedium, parseLoc: parseLoc, parseJoint: parseJoint,
      materialOf: materialOf, jointsOf: jointsOf, defaultJoint: defaultJoint,
      lookupCastIronPrice: lookupCastIronPrice, lookupGalvPrice: lookupGalvPrice, getPeriods: getPeriods,
      pipeKey: pipeKey, isPriced: isPriced,
      featureText: featureText, buildWarn: buildWarn
    };
  }
})();
