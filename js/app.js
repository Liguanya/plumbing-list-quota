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
    seamless: { code: '031001003', name: '无缝钢管' },
    welded: { code: '031001004', name: '焊接钢管' },
    copper: { code: '031001005', name: '铜管' },
    stainless: { code: '031001006', name: '不锈钢管' },
    composite: { code: '031001007', name: '复合管' },
    plastic: { code: '031001008', name: '塑料管' },
    preInsul: { code: '031001009', name: '直埋保温管' }
  };

  // ---------- 阀门及管道附件（与暖通站同口径）----------
  var V_LIST = {
    waterValve: { code: '031002001', name: '金属阀门' },
    autoAir: { code: '031002303', name: '自动排气阀' },
    tempValve: { code: '031002306', name: '散热器温控阀' },
    floatValve: { code: '031002301', name: '法兰浮球阀' },
    levelValve: { code: '031002302', name: '液压水位控制阀' },
    flushValve: { code: '031002304', name: '口部冲洗阀' },
    solenoidValve: { code: '031002305', name: '电磁阀' }
  };
  var V_LABEL = {
    waterValve: '金属阀门', autoAir: '自动排气阀', tempValve: '散热器温控阀',
    floatValve: '法兰浮球阀', levelValve: '液压水位控制阀', flushValve: '口部冲洗阀', solenoidValve: '电磁阀'
  };
  var V_WORK = {
    waterValve: '阀体安装、螺纹/法兰连接、试压、调试',
    autoAir: '阀体安装、螺纹连接、试压、调试',
    tempValve: '温控阀及传感器安装、连接、调试',
    floatValve: '阀体安装、法兰连接、试压、调试',
    levelValve: '阀体安装、法兰连接、试压、调试',
    flushValve: '壁龛（地坑）门框及扇（盖）制作安装、阀安装、刷油、水压试验',
    solenoidValve: '阀体安装、螺纹/法兰连接、接线、试压、调试'
  };
  function TT(max, code, label) { return { max: max, code: code, label: label }; }
  var V_WTHREAD = [TT(15, '8-579', '15mm以内'), TT(20, '8-580', '20mm以内'), TT(25, '8-581', '25mm以内'),
    TT(32, '8-582', '32mm以内'), TT(40, '8-583', '40mm以内'), TT(50, '8-584', '50mm以内')];
  var V_WFLANGE = [TT(65, '8-620', '65mm以内'), TT(80, '8-621', '80mm以内'), TT(100, '8-622', '100mm以内'),
    TT(125, '8-623', '125mm以内'), TT(150, '8-624', '150mm以内'), TT(200, '8-625', '200mm以内'),
    TT(250, '8-626', '250mm以内'), TT(300, '8-627', '300mm以内'), TT(350, '8-628', '350mm以内'),
    TT(400, '8-629', '400mm以内')];
  var V_FLOAT = [TT(32, '8-612', '32mm以内'), TT(50, '8-613', '50mm以内'), TT(80, '8-614', '80mm以内'),
    TT(100, '8-615', '100mm以内'), TT(150, '8-616', '150mm以内')];
  var V_LEVEL = [TT(50, '8-645', '50mm以内'), TT(80, '8-646', '80mm以内'), TT(100, '8-647', '100mm以内'),
    TT(150, '8-648', '150mm以内'), TT(200, '8-649', '200mm以内')];
  var V_STHREAD = [TT(15, '8-603', '15mm以内'), TT(20, '8-604', '20mm以内'), TT(25, '8-605', '25mm以内'),
    TT(32, '8-606', '32mm以内'), TT(40, '8-607', '40mm以内'), TT(50, '8-608', '50mm以内')];
  var V_SFLANGE = [TT(32, '8-630', '32mm以内'), TT(40, '8-631', '40mm以内'), TT(50, '8-632', '50mm以内'),
    TT(65, '8-633', '65mm以内'), TT(80, '8-634', '80mm以内'), TT(100, '8-635', '100mm以内'),
    TT(125, '8-636', '125mm以内'), TT(150, '8-637', '150mm以内'), TT(200, '8-638', '200mm以内'),
    TT(250, '8-639', '250mm以内'), TT(300, '8-640', '300mm以内'), TT(350, '8-641', '350mm以内'),
    TT(400, '8-642', '400mm以内'), TT(450, '8-643', '450mm以内'), TT(500, '8-644', '500mm以内')];

  function valveCfg() {
    return (typeof window !== 'undefined' && window.PIPE_VALVE_PRICES) || {};
  }
  function isValveCat(c) { return !!V_LIST[c]; }
  // 国标公称直径系列（用于「阀门-300」这类只给数字的写法校验）
  var DN_STD = [15,20,25,32,40,50,65,80,100,125,150,200,250,300,350,400,450,500,600,700,800,900,1000,1200,1400,1600,1800,2000];
  function parseVDn(name) {
    var s2 = String(name || '');
    var m = s2.match(/(?:DN|dn|De|de|D|Φ|φ|Ø)\s*[-－]?\s*(\d{2,4})/);
    if (m) return parseInt(m[1], 10);
    m = s2.match(/(\d{2,4})\s*(?:mm|MM|毫米)/);
    if (m) return parseInt(m[1], 10);
    // 水阀「阀门-300」写法：-300 即 DN300（与暖通站圆形风道阀门同口径）
    // 只认国标 DN 系列，避免 -16(压力) / -220(电压) 之类被误判为公称直径
    m = s2.match(/[-－—–_]\s*(\d{2,4})\s*(MPa|Mpa|mpa|PN|℃|°C|V|伏|公斤|元|个|台|套|片)?\s*$/);
    if (m) {
      var dv = parseInt(m[1], 10);
      var isPress = /MPa|Mpa|mpa|PN|公斤|压力/.test(s2);
      var isVolt = /电动|电磁/.test(s2) && [12, 24, 36, 110, 220, 380].indexOf(dv) >= 0;
      if (!m[2] && !isPress && !isVolt && DN_STD.indexOf(dv) >= 0) return dv;
    }
    return null;
  }
  function valveKindOf(name) {
    var s2 = String(name || '');
    if (/闸阀/.test(s2)) return 'gate';
    if (/截止阀/.test(s2)) return 'globe';
    if (/蝶阀/.test(s2)) return 'butterfly';
    if (/止回阀|逆止阀/.test(s2)) return 'check';
    if (/Y型过滤器|y型过滤器|过滤器/.test(s2)) return 'strainer';
    if (/球阀/.test(s2)) return 'ball';
    return 'market';
  }
  // 阀门识别（给排水站无风阀，含"阀"且带 DN 即可判为水阀）
  function valveCatOf(name) {
    var n = String(name || '');
    if (/口部冲洗/.test(n)) return 'flushValve';
    if (/电磁阀/.test(n)) return 'solenoidValve';
    if (/自动排气阀|放风阀/.test(n)) return 'autoAir';
    if (/温控阀/.test(n)) return 'tempValve';
    if (/浮球阀/.test(n)) return 'floatValve';
    if (/水位控制阀/.test(n)) return 'levelValve';
    if (/闸阀|截止阀|蝶阀|球阀|止回阀|逆止阀|Y型过滤器|y型过滤器|过滤器|软接头|橡胶软接头|补偿器|波纹补偿器|平衡阀|减压阀|水阀/.test(n)) return 'waterValve';
    if (/阀/.test(n) && parseVDn(n) && !/阀门井|阀室|阀门套/.test(n)) return 'waterValve';
    return null;
  }
  function buildValveItem(name, cat) {
    var it = {};
    it.name = name;
    it.category = cat;
    it.isValve = true;
    it.listCode = V_LIST[cat].code;
    it.listName = V_LIST[cat].name;
    it.material = V_LABEL[cat];
    it.dn = parseVDn(name);
    it.unit = (cat === 'flushValve') ? '套' : '个';
    it.valveKind = valveKindOf(name);
    var vc = valveCfg();
    if (cat === 'waterValve') {
      var inf = (vc.info || {})[it.valveKind];
      it.brand = inf ? '' : (vc.brand || '');
    } else if (cat === 'solenoidValve') {
      it.brand = (vc.solenoid || {}).brand || '';
    } else if (cat === 'flushValve') {
      it.brand = ((vc.special || {}).flush || {}).brand || '';
    } else {
      var key = { autoAir: 'autoAir', tempValve: 'temp', floatValve: 'float', levelValve: 'level' }[cat];
      var sp = (vc.special || {})[key] || {};
      it.brand = (sp.source === 'info') ? '' : (sp.brand || vc.brand || '');
    }
    return it;
  }
  function nearIdxV(arr, v) {
    if (!(v > 0)) return 0;
    for (var i = 0; i < arr.length; i++) if (v <= arr[i]) return i;
    return arr.length - 1;
  }
  function tierIdxV(tiers, dn) {
    for (var i = 0; i < tiers.length; i++) if (dn <= tiers[i].max) return i;
    return tiers.length - 1;
  }

  // ---------- 管道支架 / 保温绝热（与暖通站同口径）----------
  var AUX_LIST = {
    bracket: { code: '031301005', name: '支/吊架、基础型钢' },
    insulRubber: { code: '031208002', name: '其他管道绝热' },
    insulGlass: { code: '031208002', name: '其他管道绝热' }
  };
  var AUX_LABEL = { bracket: '管道支架', insulRubber: '橡塑保温', insulGlass: '离心玻璃棉' };
  function auxCfg() {
    return (typeof window !== 'undefined' && window.PIPE_AUX_PRICES) || {};
  }
  function isAuxCat(c) { return !!AUX_LIST[c]; }
  // 保温/支架优先于管道识别（"橡塑保温管""管道支架"都含"管"）
  function auxCatOf(name) {
    var n = String(name || '');
    if (/橡塑/.test(n)) return 'insulRubber';
    if (/玻璃棉/.test(n)) return 'insulGlass';
    if (/管道支架|支吊架|支架制作|支架安装|支架制安/.test(n)) return 'bracket';
    return null;
  }
  function buildAuxItem(name, cat) {
    var it = {};
    it.name = name;
    it.category = cat;
    it.isAux = true;
    it.listCode = AUX_LIST[cat].code;
    it.listName = AUX_LIST[cat].name;
    it.material = AUX_LABEL[cat];
    it.dn = parseDN(name);
    it.unit = (cat === 'bracket') ? 'kg' : 'm³';
    var cfg = auxCfg();
    if (cat === 'insulRubber') it.insulThk = (cfg.insul && cfg.insul.rubber.thk) || 30;
    if (cat === 'insulGlass') it.insulThk = (cfg.insul && cfg.insul.glass.thk) || 40;
    return it;
  }
  function matchAuxQuota(it) {
    var c = it.category;
    if (c === 'bracket') return { code: '7-138', name: '管道支吊架制作、安装 管道支吊架', inferred: false, unit: '100kg', factor: 100 };
    if (c === 'insulRubber') return { code: '11-582', name: '管道橡塑保温壳安装（管道） D133以内', inferred: false, unit: 'm³', factor: 1 };
    if (c === 'insulGlass') return { code: '11-647', name: '带铝箔离心玻璃棉安装 通风管道 厚度40mm', inferred: false, unit: 'm³', factor: 1 };
    return { code: '', name: '', inferred: false };
  }
  function auxPrice(it) {
    var cfg = auxCfg();
    if (it.category === 'bracket') {
      var b = cfg.bracket || { steel: 4.2 };
      return { price: b.steel, source: 'info', basis: '信息价：型钢（角钢、槽钢）' + b.steel + '元/kg' };
    }
    var k = it.category === 'insulRubber' ? 'rubber' : 'glass';
    var m = (cfg.insul || {})[k] || { price: 0, brand: '', name: '' };
    return {
      price: m.price, source: 'market', brand: m.brand,
      basis: '市场价（' + m.brand + '）：' + m.name + ' ' + m.price + '元/m³'
    };
  }
  function bracketWeightPerM(dn) {
    var t = (auxCfg().bracket || {}).weightPerM || [{ max: 9999, w: 0.6 }];
    if (!(dn > 0)) return 0.60;
    for (var i = 0; i < t.length; i++) if (dn <= t[i].max) return t[i].w;
    return t[t.length - 1].w;
  }
  // 管道清单全部套完后自动补「管道支架」一行；原表已含支架则不重复
  function withBracket(items) {
    var totalM = 0, kg = 0, hasPipe = false, hasBracket = false;
    items.forEach(function (it) {
      if (it.category === 'bracket') hasBracket = true;
      if (isAuxCat(it.category) || isValveCat(it.category) || isSanCat(it.category)) return;
      if (!(it.quantity > 0)) return;
      hasPipe = true;
      totalM += it.quantity;
      kg += it.quantity * bracketWeightPerM(it.dn);
    });
    if (!hasPipe || hasBracket) return items;
    kg = Math.round(kg * 10) / 10;
    if (!(kg > 0)) return items;
    var it = buildAuxItem('管道支架', 'bracket');
    it.index = String(items.length + 1);
    it.quantity = kg;
    it.loc = null; it.joint = null;
    var q = matchAuxQuota(it);
    it.quotaCode = q.code; it.quotaName = q.name; it.quotaUnit = q.unit; it.quotaFactor = q.factor;
    it.codeInferred = false; it.extras = [];
    var pr = auxPrice(it);
    it.price = pr.price; it.priceSource = pr.source; it.priceBasis = pr.basis; it.priceBrand = pr.brand || '';
    it.warn = '管道支架为自动补项：按管道总长 ' + Math.round(totalM) + 'm 与管径分档含量估算约 ' + kg +
      'kg（0.45~3.2kg/m），定额 7-138 计量单位为 100kg，请按图纸支架实际重量调整';
    it.features = featureText(it);
    items.push(it);
    return items;
  }

  // ---------- 其他管材定额组（2026-11-02 补充）----------
  // 每组：loc 室内/室外；joint 连接方式；medium 介质（water/gas/drain/rain，默认 water）
  //       start 首个子目号；dns 依次对应的管径档；name 子目名称
  var GROOVE_FITTING = { start: 220, dns: [65, 80, 100, 125, 150, 200, 250], name: '室内管道 钢管沟槽连接管件', unit: '10个', factor: 10 };
  var PIPE_FLUSH = { start: 490, dns: [50, 100, 200, 300, 400, 500], name: '管道消毒冲洗', unit: '100m', factor: 100 };
  var PLASTIC_OUT_DNS = [32, 40, 50, 63, 75, 90, 110, 125, 160, 200, 250, 315];
  var PLASTIC_IN_DNS = [20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 160];
  var PLASTIC_DRAIN_DNS = [50, 75, 110, 160, 200, 250];
  var PIPE_GROUPS = {
    seamless: [
      { loc: 'out', joint: 'weld', start: 23, dns: [32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400], name: '室外管道 钢管(焊接)' },
      { loc: 'in', joint: 'weld', start: 195, dns: [32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300], name: '室内管道 钢管(焊接)' },
      { loc: 'in', joint: 'groove', start: 206, dns: [65, 80, 100, 125, 150, 200, 250], name: '室内管道 钢管(沟槽连接)' }
    ],
    welded: [
      { loc: 'out', joint: 'weld', start: 23, dns: [32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400], name: '室外管道 钢管(焊接)' },
      { loc: 'in', joint: 'weld', start: 195, dns: [32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300], name: '室内管道 钢管(焊接)' },
      { loc: 'in', joint: 'groove', start: 206, dns: [65, 80, 100, 125, 150, 200, 250], name: '室内管道 钢管(沟槽连接)' }
    ],
    copper: [
      { loc: 'in', joint: 'press', start: 309, dns: [18, 22, 28, 35, 42, 54, 76, 89, 108], name: '室内管道 铜管(卡压连接)' },
      { loc: 'in', joint: 'oxy', start: 318, dns: [18, 22, 28, 35, 42, 54, 76, 89, 108], name: '室内管道 铜管(氧乙炔焊)' },
      { loc: 'in', joint: 'braze', start: 327, dns: [18, 22, 28, 35, 42, 54, 76, 89, 108], name: '室内管道 铜管(钎焊)' }
    ],
    stainless: [
      { loc: 'in', joint: 'press', start: 261, dns: [15, 20, 25, 32, 40, 50, 65, 80, 100], name: '室内管道 薄壁不锈钢管(卡压连接)' },
      { loc: 'in', joint: 'sleeve', start: 270, dns: [15, 20, 25, 32, 40, 50, 65, 80, 100], name: '室内管道 薄壁不锈钢管(卡套连接)' },
      { loc: 'in', joint: 'argon', start: 279, dns: [15, 20, 25, 32, 40, 50, 65, 80, 100], name: '室内管道 薄壁不锈钢管(承插氩弧焊)' },
      { loc: 'in', joint: 'thread', start: 288, dns: [15, 20, 25, 32, 40, 50, 65, 80, 100], name: '室内管道 不锈钢管(螺纹连接)' },
      { loc: 'in', joint: 'arc', start: 297, dns: [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200], name: '室内管道 不锈钢管(对接电弧焊)' },
      { loc: 'in', joint: 'argon', medium: 'gas', start: 1141, dns: [25, 32, 40, 50, 65, 80, 100], name: '室内燃气不锈钢管(承插氩弧焊)' },
      { loc: 'in', joint: 'sleeve', medium: 'gas', start: 1148, dns: [15, 20, 25, 32, 40, 50], name: '室内燃气不锈钢管(卡套连接)' },
      { loc: 'in', joint: 'press', medium: 'gas', start: 1154, dns: [15, 20, 25, 32, 40, 50], name: '室内燃气不锈钢管(卡压连接)' }
    ],
    composite: [
      { loc: 'out', joint: 'electro', start: 81, dns: [32, 40, 50, 63, 75, 90, 110, 125, 160], name: '室外管道 钢骨架塑料复合管(电熔连接)' },
      { loc: 'in', joint: 'press', start: 227, dns: [20, 25, 32, 40, 50, 63], name: '室内管道 铝塑复合管(卡压连接)' },
      { loc: 'in', joint: 'sleeve', start: 233, dns: [20, 25, 32, 40, 50, 63], name: '室内管道 铝塑复合管(卡套连接)' },
      { loc: 'in', joint: 'fusion', start: 239, dns: [20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 160], name: '室内管道 铝塑复合管(热熔连接)' },
      { loc: 'in', joint: 'electro', start: 250, dns: [20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 160], name: '室内管道 钢骨架塑料复合管(电熔连接)' }
    ],
    plastic: [
      { loc: 'out', joint: 'fusion', start: 36, dns: PLASTIC_OUT_DNS, name: '室外管道 塑料给水管(热熔连接)' },
      { loc: 'out', joint: 'electro', start: 48, dns: PLASTIC_OUT_DNS, name: '室外管道 塑料给水管(电熔连接)' },
      { loc: 'out', joint: 'glue', start: 60, dns: PLASTIC_OUT_DNS, name: '室外管道 塑料给水管(粘接)' },
      { loc: 'in', joint: 'fusion', start: 410, dns: PLASTIC_IN_DNS, name: '室内管道 塑料给水管(热熔连接)' },
      { loc: 'in', joint: 'electro', start: 421, dns: PLASTIC_IN_DNS, name: '室内管道 塑料给水管(电熔连接)' },
      { loc: 'in', joint: 'glue', start: 432, dns: PLASTIC_IN_DNS, name: '室内管道 塑料给水管(粘接)' },
      { loc: 'in', joint: 'glue', medium: 'drain', start: 377, dns: PLASTIC_DRAIN_DNS, name: '室内管道 塑料排水管(粘接)' },
      { loc: 'in', joint: 'fusion', medium: 'drain', start: 383, dns: PLASTIC_DRAIN_DNS, name: '室内管道 塑料排水管(热熔连接)' },
      { loc: 'in', joint: 'nut', medium: 'drain', start: 389, dns: PLASTIC_DRAIN_DNS, name: '室内管道 塑料排水管(螺母密封圈连接)' },
      { loc: 'in', joint: 'glue', medium: 'rain', start: 405, dns: [75, 110, 160, 200, 250], name: '室内管道 塑料雨水管(粘接)' }
    ]
  };
  var JOINT_CN2 = {
    weld: '焊接', groove: '沟槽连接（卡箍）', press: '卡压连接', sleeve: '卡套连接',
    argon: '承插氩弧焊', thread: '螺纹连接', arc: '对接电弧焊', oxy: '氧乙炔焊',
    braze: '钎焊', fusion: '热熔连接', electro: '电熔连接', glue: '粘接', nut: '螺母密封圈连接'
  };
  // 塑料管连接方式展示顺序：室外按热熔/电熔/粘接，室内按粘接/热熔/电熔/螺母密封圈
  var PLASTIC_JOINT_ORDER = {
    out: ['fusion', 'electro', 'glue'],
    in: ['glue', 'fusion', 'electro', 'nut']
  };
  var MEDIUM_CN3 = { rain: '雨水管', drain: '排水管', water: '给水管' };

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
  var MEDIUM_CN = { water: '给水', drain: '排水', rain: '雨水', gas: '燃气' };

  function ruleTable(it) { return it && it.category === 'galv' ? GALV : CAST_IRON; }
  // 定额分组键：铸铁 → 室内外+给排水；镀锌 → 室内外+给水/燃气（按所选连接方式区分燃气）
  function pipeKey(it) {
    var loc = it.loc === 'out' ? 'out_' : 'in_';
    if (it.category === 'galv') return loc + (it.joint === 'gas_thread' ? 'gas' : 'water');
    return loc + (it.medium === 'drain' ? 'drain' : 'water');
  }
  var JOINT_PREFER = ['weld', 'groove', 'press', 'fusion', 'electro', 'glue', 'argon', 'arc', 'sleeve', 'thread', 'oxy', 'braze'];
  function jointsOf(it) {
    // 镀锌钢管：室外/室内均有普通与燃气两组螺纹连接子目，故两种连接方式始终可选
    if (it && it.category === 'galv') return ['thread', 'gas_thread'];
    if (it && PIPE_GROUPS[it.category]) {
      var gs = PIPE_GROUPS[it.category];
      var mk = mediumKeyOf(it);
      var out = [];
      gs.forEach(function (g) {
        if (g.loc !== it.loc) return;
        if ((g.medium || 'water') !== mk) return;
        if (out.indexOf(g.joint) < 0) out.push(g.joint);
      });
      if (!out.length && it.category !== 'plastic') {
        // 介质无对应子目：回退到同部位给水/排水组（塑料管不回落，介质由用户在选型列指定）
        gs.forEach(function (g) {
          if (g.loc !== it.loc) return;
          var m = g.medium || 'water';
          if (m === 'gas') return;
          if (out.indexOf(g.joint) < 0) out.push(g.joint);
        });
      }
      if (it.category === 'plastic') {
        var ord = PLASTIC_JOINT_ORDER[it.loc] || PLASTIC_JOINT_ORDER.in;
        out.sort(function (a, b) { return ord.indexOf(a) - ord.indexOf(b); });
        return out;
      }
      out.sort(function (a, b) { return JOINT_PREFER.indexOf(a) - JOINT_PREFER.indexOf(b); });
      return out;
    }
    var tbl = ruleTable(it)[pipeKey(it)] || {};
    var order = it && it.category === 'galv' ? JOINT_ORDER_GALV : JOINT_ORDER;
    return order.filter(function (j) { return !!tbl[j]; });
  }
  function defaultJoint(it) {
    var list = jointsOf(it);
    if (it && it.category === 'galv') return list.indexOf('thread') >= 0 ? 'thread' : (list[0] || 'thread');
    if (it && PIPE_GROUPS[it.category]) {
      // 优先名称中已注明的连接方式
      var pj = parsePipeJoint(it.name || '');
      if (pj && list.indexOf(pj) >= 0) return pj;
      if (it.category === 'plastic') {
        // 名称未注明时：排水/雨水按粘接，PVC-U 给水按粘接，其余给水按热熔
        var mk = mediumKeyOf(it);
        if (mk === 'drain' || mk === 'rain' || it.plasticKind === 'pvc' || it.plasticKind === 'pvcDrain') {
          if (list.indexOf('glue') >= 0) return 'glue';
        }
        if (list.indexOf('fusion') >= 0) return 'fusion';
      }
      return list[0] || '';
    }
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

  // 材质归类
  function materialOf(name) {
    var s = name || '';
    if (isCastIron(s)) return '铸铁';
    if (/不锈钢/.test(s)) return '不锈钢';
    if (/无缝/.test(s)) return '无缝钢';       // 含"内外壁热浸镀锌无缝钢管"
    if (/镀锌钢管|热浸镀锌|热镀锌|镀锌焊接钢管|内外壁热浸镀锌|镀锌管/.test(s)) return '镀锌钢';
    // 塑料管：PVDF / 聚乙烯 / 聚丙烯 / 聚丁烯 / 聚氯乙烯 等通用塑料及工程塑料（031001008）
    // 钢骨架、钢塑、铝塑、衬塑、涂塑属复合管，须先排除
    if (!/钢骨架|钢塑|铝塑|衬塑|涂塑|钢带增强/.test(s) &&
      /PVDF|聚偏二氟乙烯|聚乙烯|聚丙烯|聚丁烯|聚氯乙烯|PPR|PP-R|PE管|HDPE|PVC|UPVC|U-PVC|PB管|PEX|塑料管|塑料给水|塑料排水|塑料雨水/.test(s)) return '塑料';
    if (/复合管|钢塑|铝塑|衬塑|涂塑/.test(s)) return '复合';
    if (/铜管|紫铜|黄铜管/.test(s)) return '铜';
    if (/焊接钢管|钢管/.test(s)) return '焊接钢';
    return '其他';
  }

  // 塑料管细分：pvdf 聚偏二氟乙烯 / ppr / pe / pb 聚丁烯 / pvc 给水 / pvcDrain 排水
  var PLASTIC_LABEL = {
    pvdf: 'PVDF（聚偏二氟乙烯）', ppr: 'PP-R（聚丙烯）', pe: 'PE（聚乙烯）',
    pb: 'PB（聚丁烯）', pvc: 'PVC-U（聚氯乙烯）', pvcDrain: 'PVC-U（聚氯乙烯）'
  };
  function plasticKindOf(name, medium) {
    var s = String(name || '');
    if (medium === 'drain' || /排水|雨水|污水|废水|冷凝水/.test(s)) medium = 'drain';
    if (/PVDF|聚偏二氟乙烯/.test(s)) return 'pvdf';
    if (/PB管|聚丁烯/.test(s)) return 'pb';
    if (/PPR|PP-R|聚丙烯/.test(s)) return 'ppr';
    if (/PE管|HDPE|聚乙烯/.test(s)) return 'pe';
    if (/PVC|UPVC|U-PVC|聚氯乙烯/.test(s)) return (medium === 'drain') ? 'pvcDrain' : 'pvc';
    if (medium === 'drain') return 'pvcDrain';
    return 'ppr';
  }

  // 连接方式解析（其他管材）
  function parsePipeJoint(name) {
    var s = name || '';
    if (/沟槽|卡箍|卡环|机械卡箍/.test(s)) return 'groove';
    if (/卡压|卡凸/.test(s)) return 'press';
    if (/卡套/.test(s)) return 'sleeve';
    if (/承插氩弧焊|氩弧焊|氩电联焊/.test(s)) return 'argon';
    if (/对接电弧焊|电弧焊|手工电弧焊/.test(s)) return 'arc';
    if (/氧乙炔焊|气焊/.test(s)) return 'oxy';
    if (/钎焊|银钎焊/.test(s)) return 'braze';
    if (/电熔/.test(s)) return 'electro';
    if (/热熔/.test(s)) return 'fusion';
    if (/粘接|胶粘|承插粘接/.test(s)) return 'glue';
    if (/螺母密封圈|螺母压紧|密封圈连接|压盖密封/.test(s)) return 'nut';
    if (/螺纹|丝扣|丝接/.test(s)) return 'thread';
    if (/焊接|焊口/.test(s)) return 'weld';
    return null;
  }

  // 其他管材的介质键（water/gas/drain/rain）
  function mediumKeyOf(it) {
    if (it.medium === 'gas') return 'gas';
    if (it.medium === 'drain') return it.isRain ? 'rain' : 'drain';
    return 'water';
  }

  // ============================================================
  // 卫生器具（洁具）—— 2026-11-05 补充
  // 清单：031003001~031003011 / 031003014 / 031003018 / 031003019
  // 定额：第八册 卫生器具安装（8-831~8-1007…）；烘手器走第二册 2-1878
  // 定额计量单位按 10 组 / 10 个 / 10 台（factor=10），导出时自动换算
  // ============================================================
  var S_DEF = {
    bathtub:      { code: '031003001', lname: '浴缸', unit: '组', qunit: '10组', factor: 10,
                    q: '8-831', qn: '搪瓷浴盆 冷热水' },
    bidet:        { code: '031003002', lname: '净身盆', unit: '组', qunit: '10组', factor: 10,
                    q: '8-837', qn: '净身盆 冷热水' },
    washbasin:    { code: '031003003', lname: '洗脸盆', unit: '组', qunit: '10组', factor: 10,
                    opts: [ { k: 'normal', l: '普通（钢管组成）', q: '8-839', qn: '洗脸盆 钢管组成 冷热水' },
                            { k: 'sensor', l: '感应（光电控台式）', q: '8-846', qn: '光电控洗脸盆 台式' } ] },
    sink:         { code: '031003004', lname: '洗涤盆', unit: '组', qunit: '10组', factor: 10,
                    q: '8-848', qn: '洗涤盆 单嘴' },
    labSink:      { code: '031003005', lname: '化验盆', unit: '组', qunit: '10组', factor: 10,
                    q: '8-855', qn: '化验盆 单联' },
    toilet:       { code: '031003006', lname: '大便器', unit: '组', qunit: '10组', factor: 10,
                    opts: [ { k: 'squat', l: '蹲式（脚踏阀冲洗）', q: '8-879', qn: '蹲式大便器 脚踏阀冲洗' },
                            { k: 'seat',  l: '坐式（带水箱坐便器）', q: '8-884', qn: '坐式大便器 带水箱坐便器' } ] },
    urinal:       { code: '031003007', lname: '小便器', unit: '组', qunit: '10组', factor: 10,
                    q: '8-889', qn: '小便器 挂斗式 感应自动冲洗阀' },
    faucet:       { code: '031003008', lname: '其他成品卫生器具', unit: '个', qunit: '10个', factor: 10,
                    q: '8-938', qn: '水龙头 公称直径15mm以内' },
    waterHeater:  { code: '031003008', lname: '其他成品卫生器具', unit: '台', qunit: '10台', factor: 10,
                    opts: [ { k: 'RS15',  l: 'RS15 挂式', q: '8-959', qn: '电热水器 挂式 RS15型' },
                            { k: 'RS30',  l: 'RS30 挂式', q: '8-960', qn: '电热水器 挂式 RS30型' },
                            { k: 'RS50W', l: 'RS50 挂式', q: '8-961', qn: '电热水器 挂式 RS50型' },
                            { k: 'RS50L', l: 'RS50 立式', q: '8-962', qn: '电热水器 立式 RS50型' },
                            { k: 'RS100', l: 'RS100 立式', q: '8-963', qn: '电热水器 立式 RS100型' },
                            { k: 'RS300', l: 'RS300 立式', q: '8-964', qn: '电热水器 立式 RS300型' } ] },
    boiler:       { code: '031003008', lname: '其他成品卫生器具', unit: '台', qunit: '10台', factor: 10,
                    q: '8-965', qn: '电开水炉 立式 KSA型' },
    steamHeater:  { code: '031003008', lname: '其他成品卫生器具', unit: '台', qunit: '10台', factor: 10,
                    opts: [ { k: '1', l: '1#', q: '8-967', qn: '蒸汽间断式加热器 1#' },
                            { k: '2', l: '2#', q: '8-968', qn: '蒸汽间断式加热器 2#' },
                            { k: '3', l: '3#', q: '8-969', qn: '蒸汽间断式加热器 3#' } ] },
    heatExchanger:{ code: '031003008', lname: '其他成品卫生器具', unit: '台', qunit: '10台', factor: 10,
                    opts: [ { k: '1', l: '1#', q: '8-970', qn: '容积式热交换器 1#' },
                            { k: '2', l: '2#', q: '8-971', qn: '容积式热交换器 2#' },
                            { k: '3', l: '3#', q: '8-972', qn: '容积式热交换器 3#' },
                            { k: '4', l: '4#', q: '8-973', qn: '容积式热交换器 4#' },
                            { k: '5', l: '5#', q: '8-974', qn: '容积式热交换器 5#' },
                            { k: '6', l: '6#', q: '8-975', qn: '容积式热交换器 6#' },
                            { k: '7', l: '7#', q: '8-976', qn: '容积式热交换器 7#' } ] },
    flushDevice:  { code: '031003008', lname: '其他成品卫生器具', unit: '套', qunit: '10套', factor: 10,
                    q: '8-988', qn: '感应式冲洗器 明装' },
    handDryer:    { code: '031003009', lname: '烘手器', unit: '个', qunit: '10个', factor: 10,
                    q: '2-1878', qn: '小电器安装接线 烘手器' },
    shower:       { code: '031003010', lname: '淋浴器', unit: '组', qunit: '10组', factor: 10,
                    q: '8-861', qn: '淋浴器 钢管组成 冷热水' },
    showerRoom:   { code: '031003011', lname: '淋浴间', unit: '套', qunit: '10套', factor: 10,
                    q: '8-869', qn: '淋浴间 整体淋浴室安装 冷热水' },
    floorDrain:   { code: '031003014', lname: '给、排水附件', unit: '个', qunit: '10个', factor: 10, defDn: 100,
                    tiers: [ { max: 50,  q: '8-941', qn: '地漏 公称直径50mm以内' },
                             { max: 75,  q: '8-942', qn: '地漏 公称直径75mm以内' },
                             { max: 100, q: '8-943', qn: '地漏 公称直径100mm以内' },
                             { max: 150, q: '8-944', qn: '地漏 公称直径150mm以内' } ] },
    cleanout:     { code: '031003014', lname: '给、排水附件', unit: '个', qunit: '10个', factor: 10, defDn: 100,
                    tiers: [ { max: 50,  q: '8-945', qn: '地面扫除口 公称直径50mm以内' },
                             { max: 75,  q: '8-946', qn: '地面扫除口 公称直径75mm以内' },
                             { max: 100, q: '8-947', qn: '地面扫除口 公称直径100mm以内' },
                             { max: 125, q: '8-948', qn: '地面扫除口 公称直径125mm以内' },
                             { max: 150, q: '8-949', qn: '地面扫除口 公称直径150mm以内' } ] },
    rainHead:     { code: '031003014', lname: '给、排水附件', unit: '个', qunit: '10个', factor: 10, defDn: 150,
                    tiers: [ { max: 100, q: '8-950', qn: '普通雨水斗 公称直径100mm以内' },
                             { max: 125, q: '8-951', qn: '普通雨水斗 公称直径125mm以内' },
                             { max: 150, q: '8-952', qn: '普通雨水斗 公称直径150mm以内' } ] },
    siphonHead:   { code: '031003014', lname: '给、排水附件', unit: '个', qunit: '10个', factor: 10, defDn: 150,
                    tiers: [ { max: 50,  q: '8-953', qn: '虹吸式雨水斗 公称直径50mm以内' },
                             { max: 100, q: '8-954', qn: '虹吸式雨水斗 公称直径100mm以内' },
                             { max: 150, q: '8-955', qn: '虹吸式雨水斗 公称直径150mm以内' } ] },
    waterDispenser:{ code: '031003018', lname: '饮水器', unit: '台', qunit: '10台', factor: 10,
                    q: '8-987', qn: '饮水器' },
    greaseTrap:   { code: '031003019', lname: '隔油器', unit: '台', qunit: '10台', factor: 10, defDn: 100,
                    forms: { ground: { l: '地上式', tiers: [ { max: 50,  q: '8-1007', qn: '隔油器 地上式 DN50' },
                                                             { max: 80,  q: '8-1008', qn: '隔油器 地上式 DN80' },
                                                             { max: 100, q: '8-1009', qn: '隔油器 地上式 DN100' } ] },
                             hang:   { l: '悬挂式', tiers: [ { max: 50,  q: '8-1010', qn: '隔油器 悬挂式 DN50' },
                                                             { max: 100, q: '8-1011', qn: '隔油器 悬挂式 DN100' },
                                                             { max: 150, q: '8-1012', qn: '隔油器 悬挂式 DN150' } ] } } }
  };

  var S_WORK = {
    bathtub: '浴盆安装、冷热水连接、排水配件安装、试水',
    bidet: '净身盆安装、冷热水连接、排水配件安装、试水',
    washbasin: '盆体安装、冷热水龙头安装、角阀与排水配件安装、试水',
    sink: '盆体安装、龙头安装、排水配件安装、试水',
    labSink: '化验盆安装、化验龙头安装、排水配件安装、试水',
    toilet: '大便器安装、水箱及冲洗阀安装、冲洗管连接、试水',
    urinal: '小便器安装、感应冲洗阀安装、排水连接、试水',
    faucet: '水龙头安装、生料带密封、通水试验',
    waterHeater: '热水器就位固定、进出水管连接、安全阀安装、通电试运行',
    boiler: '开水炉就位固定、进出水管连接、通电试运行',
    steamHeater: '加热器就位固定、蒸汽与凝结水管连接、疏水器安装、试压',
    heatExchanger: '换热器就位固定、冷热水与蒸汽管连接、安全阀与温控安装、试压',
    flushDevice: '感应冲洗器安装、电磁阀接线、通水调试',
    handDryer: '烘手器固定、电源接线、试运行',
    shower: '淋浴器组装、冷热水管连接、花洒安装、试水',
    showerRoom: '整体淋浴间就位、给排水连接、密封打胶、试水',
    floorDrain: '地漏安装、找坡配合、水封检查',
    cleanout: '扫除口安装、盖板固定、密封检查',
    rainHead: '雨水斗安装、与雨水管连接、密封检查',
    siphonHead: '虹吸雨水斗安装、整流器安装、与雨水管连接、密封检查',
    waterDispenser: '饮水器就位固定、进水管连接、通电试运行',
    greaseTrap: '隔油器就位固定、进出水管连接、通水试验'
  };

  function isSanCat(c) { return !!S_DEF[c]; }
  function sanCfg() { return (typeof window !== 'undefined' && window.PIPE_SANITARY_PRICES) || {}; }

  // 洁具识别：具体项优先（淋浴间 > 淋浴器、虹吸雨水斗 > 雨水斗、容积式热交换器 > 热交换器）
  function sanCatOf(name) {
    var n = String(name || '');
    if (!n) return null;
    if (/淋浴间|整体淋浴/.test(n)) return 'showerRoom';
    if (/虹吸/.test(n) && /雨水斗/.test(n)) return 'siphonHead';
    if (/雨水斗/.test(n)) return 'rainHead';
    if (/地漏/.test(n)) return 'floorDrain';
    if (/扫除口/.test(n)) return 'cleanout';
    if (/隔油池|隔油器/.test(n)) return 'greaseTrap';
    if (/热交换器/.test(n)) return 'heatExchanger';
    if (/加热器/.test(n)) return 'steamHeater';
    if (/开水炉/.test(n)) return 'boiler';
    if (/热水器/.test(n)) return 'waterHeater';
    if (/饮水机|饮水器|直饮水/.test(n)) return 'waterDispenser';
    if (/烘手器|烘干器/.test(n)) return 'handDryer';
    if (/冲洗器/.test(n)) return 'flushDevice';
    if (/洗脸盆|洗手盆|手盆/.test(n)) return 'washbasin';
    if (/洗涤盆|洗涤池|盥洗池|洗涤槽/.test(n)) return 'sink';
    if (/化验盆|化验池/.test(n)) return 'labSink';
    if (/净身盆/.test(n)) return 'bidet';
    if (/浴缸|浴盆/.test(n)) return 'bathtub';
    if (/大便器|坐便器|座便器|蹲便器/.test(n)) return 'toilet';
    if (/小便器|小便斗/.test(n)) return 'urinal';
    if (/淋浴器|花洒|淋浴/.test(n)) return 'shower';
    if (/水龙头|龙头/.test(n)) return 'faucet';
    return null;
  }

  function buildSanItem(name, cat) {
    var d = S_DEF[cat];
    var it = {};
    it.name = name;
    it.category = cat;
    it.isSan = true;
    it.listCode = d.code;
    it.listName = d.lname;
    it.material = d.lname;
    it.unit = d.unit;
    it.sanDn = parseVDn(name);
    it.sanOptFromName = false;
    if (d.opts) {
      var pick = d.opts[0].k;
      if (cat === 'toilet') {
        if (/坐便|坐式|座便/.test(name)) { pick = 'seat'; it.sanOptFromName = true; }
        else if (/蹲/.test(name)) { pick = 'squat'; it.sanOptFromName = true; }
        else { pick = 'squat'; }
      } else if (cat === 'washbasin') {
        pick = /感应/.test(name) ? 'sensor' : 'normal';
        it.sanOptFromName = true;
      } else if (cat === 'waterHeater') {
        if (/RS\s*300/i.test(name)) { pick = 'RS300'; it.sanOptFromName = true; }
        else if (/RS\s*100/i.test(name)) { pick = 'RS100'; it.sanOptFromName = true; }
        else if (/RS\s*50/i.test(name)) { pick = /立式/.test(name) ? 'RS50L' : 'RS50W'; it.sanOptFromName = true; }
        else if (/RS\s*30/i.test(name)) { pick = 'RS30'; it.sanOptFromName = true; }
        else if (/RS\s*15/i.test(name)) { pick = 'RS15'; it.sanOptFromName = true; }
        else { pick = 'RS50W'; }
      } else if (cat === 'steamHeater') {
        var m1 = String(name).match(/([123])\s*#/);
        if (m1) { pick = m1[1]; it.sanOptFromName = true; }
      } else if (cat === 'heatExchanger') {
        var m2 = String(name).match(/([1-7])\s*#/);
        if (m2) { pick = m2[1]; it.sanOptFromName = true; }
      }
      it.sanOpt = pick;
    }
    if (d.forms) {
      it.sanForm = /悬挂/.test(name) ? 'hang' : 'ground';
      it.sanFormFromName = /悬挂|地上/.test(name);
    }
    return it;
  }

  function sanOptLabel(it) {
    var d = S_DEF[it.category];
    if (!d || !d.opts) return '';
    for (var i = 0; i < d.opts.length; i++) if (d.opts[i].k === it.sanOpt) return d.opts[i].l;
    return d.opts[0].l;
  }

  function matchSanQuota(it) {
    var d = S_DEF[it.category];
    var res = { inferred: false, unit: d.qunit, factor: d.factor };
    if (d.opts) {
      var o = null;
      for (var i = 0; i < d.opts.length; i++) if (d.opts[i].k === it.sanOpt) o = d.opts[i];
      if (!o) o = d.opts[0];
      res.code = o.q; res.name = o.qn;
      return res;
    }
    if (d.tiers) {
      var dn = it.sanDn || d.defDn;
      var idx = d.tiers.length - 1;
      for (var j = 0; j < d.tiers.length; j++) { if (dn <= d.tiers[j].max) { idx = j; break; } }
      res.code = d.tiers[idx].q; res.name = d.tiers[idx].qn;
      res.dnTier = d.tiers[idx].max;
      res.inferred = !it.sanDn || d.tiers[idx].max !== dn;
      return res;
    }
    if (d.forms) {
      var f = d.forms[it.sanForm] || d.forms.ground;
      var dn2 = it.sanDn || d.defDn || 100;
      var k2 = f.tiers.length - 1;
      for (var k = 0; k < f.tiers.length; k++) { if (dn2 <= f.tiers[k].max) { k2 = k; break; } }
      res.code = f.tiers[k2].q; res.name = f.tiers[k2].qn;
      res.dnTier = f.tiers[k2].max;
      res.inferred = !it.sanDn;
      return res;
    }
    res.code = d.q; res.name = d.qn;
    return res;
  }

  function sanPrice(it) {
    var cfg = sanCfg();
    var d = S_DEF[it.category];
    var m = (cfg.items || {})[it.category] || {};
    var brand = m.brand || cfg.brand || '';
    var nm = m.name || d.lname;
    if (d.opts) {
      var p = (m.opts || {})[it.sanOpt];
      var lbl = sanOptLabel(it);
      return { price: p, source: 'market', brand: brand,
        basis: '市场价（' + brand + '）：' + nm + ' ' + lbl + ' ' + p + ' 元/' + d.unit };
    }
    if (d.tiers) {
      var key = String(it.dnTier || d.defDn);
      var p2 = (m.prices || {})[key];
      return { price: p2, source: 'market', brand: brand,
        basis: '市场价（' + brand + '）：' + nm + ' DN' + key + ' ' + p2 + ' 元/' + d.unit };
    }
    if (d.forms) {
      var fk = it.sanForm === 'hang' ? 'hang' : 'ground';
      var key2 = String(it.dnTier || 100);
      var p3 = ((m.forms || {})[fk] || {})[key2];
      return { price: p3, source: 'market', brand: brand,
        basis: '市场价（' + brand + '）：' + nm + ' ' + (fk === 'hang' ? '悬挂式' : '地上式') + ' DN' + key2 + ' ' + p3 + ' 元/' + d.unit };
    }
    return { price: m.price, source: 'market', brand: brand,
      basis: '市场价（' + brand + '）：' + nm + ' ' + m.price + ' 元/' + d.unit };
  }

  var MAT_CAT = { '无缝钢': 'seamless', '焊接钢': 'welded', '铜': 'copper', '不锈钢': 'stainless', '复合': 'composite', '塑料': 'plastic' };

  // ---------- 建条目 ----------
  function buildItem(name) {
    if (!name) return null;
    // 卫生器具（洁具）优先识别
    var scat = sanCatOf(name);
    if (scat) return buildSanItem(name, scat);
    // 保温绝热 / 管道支架优先（名称里也含"管"字）
    var acat = auxCatOf(name);
    if (acat) return buildAuxItem(name, acat);
    // 阀门及管道附件优先（与暖通站同口径）
    var vcat = valveCatOf(name);
    if (vcat) return buildValveItem(name, vcat);
    var it = {};
    it.name = name;
    it.material = materialOf(name);
    it.dn = parseDN(name) || parseVDn(name);   // 水表/倒流防止器等「-150」写法兜底
    it.medium = parseMedium(name);
    it.loc = parseLoc(name);
    it.isRain = /雨水/.test(name);
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
    } else if (PIPE_GROUPS[MAT_CAT[it.material]]) {
      it.category = MAT_CAT[it.material];
      it.listCode = LIST[it.category].code;
      it.listName = LIST[it.category].name;
      it.isRain = /雨水/.test(name);
      it.medium = /燃气|煤气|天然气|液化气|气源|瓦斯/.test(name) ? 'gas' : (it.isRain ? 'drain' : it.medium);
      // 室外塑料管仅有给水管子目（8-36~8-71），介质固定为给水（须在连接方式解析前确定）
      if (it.category === 'plastic' && it.loc === 'out') {
        it.wasDrainName = (it.medium === 'drain' || it.isRain);
        it.medium = 'water'; it.isRain = false;
      }
      // 塑料管细分（用于主材价、项目特征与默认连接方式），须在连接方式解析前确定
      if (it.category === 'plastic') {
        it.plasticKind = plasticKindOf(name, it.medium);
        it.materialLabel = PLASTIC_LABEL[it.plasticKind] || '塑料';
      }
      var pj = parsePipeJoint(name);
      it.jointAuto = pj || defaultJoint(it);
      it.joint = it.jointAuto;
      it.jointFromName = !!pj;
      var allow2 = jointsOf(it);
      if (allow2.indexOf(it.joint) < 0) {
        it.jointFallback = it.joint;
        it.joint = defaultJoint(it);
      }
      // 塑料管材质细分（用于主材价与项目特征）
      if (it.category === 'composite') {
        it.compositeKind = /钢骨架|钢塑|衬塑|涂塑/.test(name) ? 'steelmesh' : 'alplastic';
      }
    } else {
      it.category = 'other';
      it.listCode = '';
      it.listName = '';
      it.joint = null;
    }
    it.unit = 'm';
    return it;
  }

  // 档位定位：返回 { idx, dn }
  function tierOf(dns, dn) {
    if (dn === null || dn === undefined || isNaN(dn)) return null;
    for (var i = 0; i < dns.length; i++) if (dn <= dns[i]) return { idx: i, dn: dns[i], exact: dns[i] === dn };
    return { idx: dns.length - 1, dn: dns[dns.length - 1], exact: false, overflow: true };
  }

  // 其他管材：按部位+介质+连接方式定位定额组
  function groupOf(it) {
    var gs = PIPE_GROUPS[it.category];
    if (!gs) return null;
    var mk = mediumKeyOf(it);
    var hit = null;
    gs.forEach(function (g) { if (!hit && g.loc === it.loc && (g.medium || 'water') === mk && g.joint === it.joint) hit = g; });
    if (!hit) gs.forEach(function (g) { if (!hit && g.loc === it.loc && (g.medium || 'water') === mk) hit = g; });
    if (!hit) gs.forEach(function (g) { if (!hit && g.loc === it.loc) hit = g; });
    return hit;
  }

  // ---------- 定额匹配 ----------
  // 阀门定额：通用 8-579~584/8-620~629；特殊阀 8-682/8-686/8-612~616/8-645~649/8-1260；电磁阀 8-603~608/8-630~644
  function matchValveQuota(it) {
    var dn = it.dn, noDn = !(dn > 0);
    var c = it.category;
    if (c === 'waterValve') {
      if (noDn) return { code: '8-579', name: '螺纹阀门 公称直径15mm以内', inferred: false, noDn: true, unit: '个', factor: 1 };
      if (dn <= 50) {
        var wi = tierIdxV(V_WTHREAD, dn);
        return { code: V_WTHREAD[wi].code, name: '螺纹阀门 公称直径' + V_WTHREAD[wi].label, inferred: V_WTHREAD[wi].max !== dn, unit: '个', factor: 1 };
      }
      var wf = tierIdxV(V_WFLANGE, dn);
      return {
        code: V_WFLANGE[wf].code, name: '焊接法兰阀门 公称直径' + V_WFLANGE[wf].label,
        inferred: V_WFLANGE[wf].max !== dn, overRange: dn > 400, unit: '个', factor: 1
      };
    }
    if (c === 'autoAir') return { code: '8-682', name: '自动排气阀、手动放风阀 公称直径25mm以内', inferred: false, unit: '个', factor: 1 };
    if (c === 'tempValve') return { code: '8-686', name: '散热器温控阀 公称直径25mm以内', inferred: false, unit: '个', factor: 1 };
    if (c === 'flushValve') return { code: '8-1260', name: '口部冲洗阀制作、安装 壁龛式', inferred: false, unit: '套', factor: 1 };
    if (c === 'floatValve') {
      var fi = noDn ? 0 : tierIdxV(V_FLOAT, dn);
      return { code: V_FLOAT[fi].code, name: '法兰浮球阀 公称直径' + V_FLOAT[fi].label, inferred: !noDn && V_FLOAT[fi].max !== dn, noDn: noDn, overRange: !noDn && dn > 150, unit: '个', factor: 1 };
    }
    if (c === 'levelValve') {
      var li = noDn ? 0 : tierIdxV(V_LEVEL, dn);
      return { code: V_LEVEL[li].code, name: '法兰液压水位控制阀 公称直径' + V_LEVEL[li].label, inferred: !noDn && V_LEVEL[li].max !== dn, noDn: noDn, overRange: !noDn && dn > 200, unit: '个', factor: 1 };
    }
    if (c === 'solenoidValve') {
      if (noDn) return { code: '8-603', name: '螺纹电磁阀安装 公称直径15mm以内', inferred: false, noDn: true, unit: '个', factor: 1 };
      if (dn <= 50) {
        var si = tierIdxV(V_STHREAD, dn);
        return { code: V_STHREAD[si].code, name: '螺纹电磁阀安装 公称直径' + V_STHREAD[si].label, inferred: V_STHREAD[si].max !== dn, unit: '个', factor: 1 };
      }
      var sf = tierIdxV(V_SFLANGE, dn);
      return {
        code: V_SFLANGE[sf].code, name: '法兰电磁阀安装 公称直径' + V_SFLANGE[sf].label,
        inferred: V_SFLANGE[sf].max !== dn, overRange: dn > 500, unit: '个', factor: 1
      };
    }
    return { code: '', name: '', inferred: false };
  }

  // 阀门主材价：有信息价取信息价（不标品牌），无信息价取市场价并给参考品牌
  function valvePrice(it) {
    var vc = valveCfg(), dn = it.dn, c = it.category;
    if (c === 'waterValve') {
      var t = (vc.info || {})[it.valveKind || 'market'];
      if (t) {
        var i1 = nearIdxV(t.dns, dn);
        return {
          price: t.prices[i1], source: 'info',
          basis: '信息价：' + t.name + ' DN' + t.dns[i1] + ' ' + t.prices[i1] + '元/个' +
            (dn > 0 && t.dns[i1] !== dn ? '（DN' + dn + '按相邻档取定）' : '')
        };
      }
      var mk = vc.market || { dns: [15], prices: [40] };
      var i2 = nearIdxV(mk.dns, dn);
      return {
        price: mk.prices[i2], source: 'market', brand: vc.brand,
        basis: '市场价（' + vc.brand + '）：' + it.name + ' DN' + mk.dns[i2] + ' ' + mk.prices[i2] + '元/个（该阀种无信息价，按市场价计）'
      };
    }
    if (c === 'flushValve') {
      var fl = (vc.special || {}).flush || { prices: [480], brand: '' };
      return { price: fl.prices[0], source: 'market', brand: fl.brand, basis: '市场价（' + fl.brand + '）：口部冲洗阀 成套 ' + fl.prices[0] + '元/套（定额 8-1260 按套计）' };
    }
    if (c === 'solenoidValve') {
      var so = vc.solenoid || { dns: [15], prices: [180], brand: '' };
      var i4 = nearIdxV(so.dns, dn);
      return {
        price: so.prices[i4], source: 'market', brand: so.brand,
        basis: '市场价（' + so.brand + '）：电磁阀 DN' + so.dns[i4] + ' ' + so.prices[i4] + '元/个' +
          (dn > 0 && so.dns[i4] !== dn ? '（DN' + dn + '按相邻档取定）' : '')
      };
    }
    var key = { autoAir: 'autoAir', tempValve: 'temp', floatValve: 'float', levelValve: 'level' }[c];
    var sp = (vc.special || {})[key] || { dns: [25], prices: [0], source: 'market' };
    var i3 = nearIdxV(sp.dns, dn);
    if (sp.source === 'info') {
      return { price: sp.prices[i3], source: 'info', basis: '信息价：' + sp.name + ' DN' + sp.dns[i3] + ' ' + sp.prices[i3] + '元/个' };
    }
    return {
      price: sp.prices[i3], source: 'market', brand: sp.brand || vc.brand,
      basis: '市场价（' + (sp.brand || vc.brand) + '）：' + sp.name + ' DN' + sp.dns[i3] + ' ' + sp.prices[i3] + '元/个'
    };
  }

  function matchQuota(it) {
    if (!it) return { code: '', name: '', inferred: false };
    if (isSanCat(it.category)) return matchSanQuota(it);
    if (isAuxCat(it.category)) return matchAuxQuota(it);
    if (isValveCat(it.category)) return matchValveQuota(it);
    if (PIPE_GROUPS[it.category]) {
      var g = groupOf(it);
      if (!g) return { code: '', name: '', inferred: false };
      if (it.dn === null || it.dn === undefined || isNaN(it.dn)) {
        return { code: '', name: g.name + '（管径待识别）', inferred: false, needDn: true };
      }
      var t = tierOf(g.dns, it.dn);
      var dnLabel = (it.category === 'copper' || it.category === 'plastic' || it.category === 'composite') ? '公称外径' : '公称直径';
      return {
        code: '8-' + (g.start + t.idx),
        name: g.name + ' ' + dnLabel + t.dn + 'mm以内',
        inferred: !t.exact,
        dnTier: t.dn,
        unit: '10m',
        factor: 10,
        group: g
      };
    }
    if (it.category !== 'castIron' && it.category !== 'galv') return { code: '', name: '', inferred: false };
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

  // ---------- 附加定额（沟槽管件 / 管道消毒冲洗）----------
  function buildExtraQuotas(it, quota) {
    if (isSanCat(it.category)) return [];
    var arr = [];
    if (!quota || !quota.code) return arr;
    if (isValveCat(it.category)) return arr;   // 阀门及附件不计管道消毒冲洗/沟槽管件
    if (isAuxCat(it.category)) return arr;     // 支架/保温不计管道消毒冲洗/沟槽管件
    var tierDn = quota.dnTier || it.dn;
    if (it.joint === 'groove') {
      var f = tierOf(GROOVE_FITTING.dns, tierDn);
      if (f) {
        var cnt = Math.max(1, Math.ceil(it.quantity / 6));
        arr.push({
          role: 'fitting', code: '8-' + (GROOVE_FITTING.start + f.idx),
          name: GROOVE_FITTING.name + ' 公称直径' + f.dn + 'mm以内',
          unit: GROOVE_FITTING.unit, factor: GROOVE_FITTING.factor,
          qty: cnt, note: '管件数量按6m定尺估算（每6m一个管件），请按图纸调整'
        });
      }
    }
    var fl = tierOf(PIPE_FLUSH.dns, tierDn);
    if (fl) {
      arr.push({
        role: 'flush', code: '8-' + (PIPE_FLUSH.start + fl.idx),
        name: PIPE_FLUSH.name + ' 公称直径' + fl.dn + 'mm以内',
        unit: PIPE_FLUSH.unit, factor: PIPE_FLUSH.factor,
        qty: it.quantity, note: ''
      });
    }
    return arr;
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
    var isInfo = !!(grp.infoDns && grp.infoDns.indexOf(r.tier) >= 0);
    if (isInfo) {
      return { price: r.price, source: 'info',
        basis: '铸铁' + MEDIUM_CN[it.medium] + '管 DN' + it.dn + '：天津市工程造价信息（除税）' + r.price.toFixed(2) + '元/m' +
          (r.exact ? '' : '；信息价无DN' + it.dn + '档，按DN' + r.tier + '档取定') };
    }
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

  var PIPE_PRICE_META = {
    seamless: function (p) { return p.seamless; },
    welded: function (p) { return p.welded; },
    copper: function (p) { return p.copper; },
    stainless: function (p) { return p.stainless; },
    composite: function (p) { return (p.composite || {})['alplastic']; },
    plastic: function (p) { return (p.plastic || {})['ppr']; }
  };

  function lookupPipePrice(periodKey, it) {
    var p = getPeriod(periodKey);
    if (!p) return null;
    if (it.dn === null || isNaN(it.dn)) return null;
    var grp = null, label = '';
    if (it.category === 'seamless') { grp = p.seamless; label = '无缝钢管'; }
    else if (it.category === 'welded') { grp = p.welded; label = '焊接钢管'; }
    else if (it.category === 'copper') { grp = p.copper; label = '铜管'; }
    else if (it.category === 'stainless') { grp = p.stainless; label = '不锈钢管'; }
    else if (it.category === 'composite') {
      grp = (p.composite || {})[it.compositeKind || 'alplastic'];
      label = it.compositeKind === 'steelmesh' ? '钢骨架塑料复合管' : '铝塑复合管';
    } else if (it.category === 'plastic') {
      grp = (p.plastic || {})[it.plasticKind || 'ppr'];
      label = { ppr: 'PP-R给水管', pe: 'PE给水管', pvc: 'PVC-U给水管', pvcDrain: 'PVC-U排水管',
        pvdf: 'PVDF管', pb: 'PB给水管' }[it.plasticKind || 'ppr'];
    }
    if (!grp || !grp.price) return null;
    var r = interpPrice(grp.price, it.dn);
    if (!r) return null;
    var dnLabel = (it.category === 'plastic' || it.category === 'composite') ? 'De' : 'DN';
    var isInfo = !!(grp.infoDns && grp.infoDns.indexOf(r.tier) >= 0);
    if (isInfo) {
      return { price: r.price, source: 'info',
        basis: label + ' ' + dnLabel + it.dn + '：天津市工程造价信息（除税）' + r.price.toFixed(2) + '元/m' +
          (r.exact ? '' : '；信息价无' + dnLabel + it.dn + '档，按' + dnLabel + r.tier + '档取定') };
    }
    var basis = label + ' ' + dnLabel + it.dn + '：' + grp.brand + '，' + r.price.toFixed(2) + '元/m（除税）' +
      (r.exact ? '' : '；价格库无' + dnLabel + it.dn + '档，按' + dnLabel + r.tier + '档就近取定') +
      (r.overflow ? '；已超常用最大档，请核对' : '');
    return { price: r.price, source: 'market', basis: basis };
  }

  function isPriced(it) { return it && (it.category === 'castIron' || it.category === 'galv' || !!PIPE_GROUPS[it.category] || isValveCat(it.category) || isAuxCat(it.category) || isSanCat(it.category)); }

  function recomputePrice(it, periodKey) {
    if (isSanCat(it.category)) {
      var sp = sanPrice(it);
      it.price = sp.price; it.priceSource = sp.source; it.priceBasis = sp.basis; it.priceBrand = sp.brand || '';
      return;
    }
    if (isAuxCat(it.category)) {
      var ap = auxPrice(it);
      it.price = ap.price; it.priceSource = ap.source; it.priceBasis = ap.basis; it.priceBrand = ap.brand || '';
      return;
    }
    if (isValveCat(it.category)) {
      var vp = valvePrice(it);
      it.price = vp.price; it.priceSource = vp.source; it.priceBasis = vp.basis; it.priceBrand = vp.brand || '';
      return;
    }
    var info = null;
    if (it.category === 'castIron') info = lookupCastIronPrice(periodKey, it);
    else if (it.category === 'galv') info = lookupGalvPrice(periodKey, it);
    else if (PIPE_GROUPS[it.category]) info = lookupPipePrice(periodKey, it);
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
    if (isSanCat(it.category)) {
      var sf = [];
      sf.push('名称:' + it.name);
      sf.push('类型:' + S_DEF[it.category].lname);
      if (S_DEF[it.category].opts) sf.push('型号:' + sanOptLabel(it));
      if (it.dnTier) sf.push('规格:DN' + it.dnTier);
      sf.push('品牌参考:' + (it.priceBrand || ''));
      sf.push('其他:' + (S_WORK[it.category] || '器具安装、配件安装、试水'));
      return sf.join('；');
    }
    if (isAuxCat(it.category)) {
      var af = [];
      af.push('名称:' + it.name);
      af.push('类型:' + AUX_LABEL[it.category]);
      if (it.category === 'bracket') {
        af.push('计量:按型钢重量 kg 计');
        af.push('主材:型钢（信息价 4.20 元/kg）');
        af.push('其他:除锈、刷油、制作、安装、固定');
      } else {
        if (it.dn) af.push('规格型号:DN' + it.dn + ' 厚度' + it.insulThk + 'mm');
        else af.push('厚度:' + it.insulThk + 'mm');
        af.push('品牌参考:' + (it.priceBrand || ''));
        af.push('其他:' + (it.category === 'insulRubber' ? '保温壳安装、粘接、接缝处理' : '带铝箔玻璃棉铺贴、绑扎、接缝处理'));
      }
      return af.join('；');
    }
    if (isValveCat(it.category)) {
      var vf = [];
      vf.push('名称:' + it.name);
      vf.push('类型:' + V_LABEL[it.category]);
      if (it.dn) vf.push('规格型号:DN' + it.dn);
      vf.push('品牌参考:' + (it.brand || '信息价（不标品牌）'));
      vf.push('其他:' + (V_WORK[it.category] || ''));
      return vf.join('；');
    }
    var parts = [];
    parts.push('安装部位:' + (it.loc === 'out' ? '室外' : '室内'));
    parts.push('材质:' + (it.materialLabel || it.material || '铸铁'));
    if (it.dn) parts.push('型号规格:' + specCell(it));
    if (it.category === 'plastic') {
      parts.push('输送介质:' + (it.isRain ? '雨水' : (it.medium === 'drain' ? '排水' : '给水')));
    }
    if (it.category === 'castIron') {
      parts.push('连接形式:承插');
      parts.push('接口材料:' + (JOINT_CN[it.joint] || '石棉水泥接口'));
      parts.push(it.medium === 'drain' ? '灌水试验、通球试验' : '水压试验、水冲洗');
    } else if (it.category === 'galv') {
      parts.push('连接形式:螺纹连接');
      parts.push('接口材料:' + (it.joint === 'gas_thread' ? '聚四氟乙烯生料带（燃气管道）' : '铅油麻丝、聚四氟乙烯生料带'));
      parts.push(it.joint === 'gas_thread' ? '气压试验、空气吹扫' : '水压试验、水冲洗');
    } else if (PIPE_GROUPS[it.category]) {
      parts.push('连接形式:' + (JOINT_CN2[it.joint] || '焊接'));
      if (it.joint === 'groove') parts.push('沟槽管件另计');
      else if (it.joint === 'weld' || it.joint === 'arc' || it.joint === 'argon' || it.joint === 'oxy' || it.joint === 'braze') parts.push('接口材料:焊条/焊丝');
      if (it.medium === 'gas') parts.push('气压试验、空气吹扫');
      else if (it.medium === 'drain') parts.push('灌水试验、通球试验');
      else parts.push('水压试验、水冲洗、消毒冲洗');
    }
    return parts.join('；');
  }

  // ---------- 核对提示 ----------
  // 核对提示去重（同一提示只保留一次）
  function wjoin(w) {
    var seen = {}, out = [];
    (w || []).forEach(function (x) {
      if (!x || seen[x]) return;
      seen[x] = 1; out.push(x);
    });
    return out.join('；');
  }
  function buildWarn(it, quota) {
    var w = [];
    if (isSanCat(it.category)) {
      var sd = S_DEF[it.category];
      if (sd.opts && !it.sanOptFromName) {
        w.push('名称未注型号，已按 ' + sanOptLabel(it) + ' 计列，可在「选型」列切换（' + sd.opts.map(function (x) { return x.l; }).join(' / ') + '）');
      }
      if (sd.tiers && !it.sanDn) w.push('名称未注公称直径，已按 DN' + sd.defDn + '（' + quota.code + '）计列，可在「选型」列切换');
      if (sd.tiers && it.sanDn && quota.dnTier && quota.dnTier !== it.sanDn) w.push('DN' + it.sanDn + ' 无对应档，已按 DN' + quota.dnTier + '以内子目套用，请核对');
      if (sd.forms && !it.sanDn) w.push('名称未注公称直径，已按 DN100 计列，可在「选型」列切换');
      return wjoin(w);
    }
    if (it.category === 'bracket') {
      w.push('管道支架工程量按管道长度与管径分档含量估算，定额 7-138 计量单位 100kg，请按图纸支架实际重量调整');
      return wjoin(w);
    }
    if (it.category === 'insulRubber' || it.category === 'insulGlass') {
      w.push((it.category === 'insulRubber' ? '橡塑保温' : '离心玻璃棉') + '按保温体积（m³）计，厚度按 ' + it.insulThk +
        'mm 取定；单位列填 m² 按面积×厚度折算，填 m 且含 DN 按 π×(DN+δ)×δ×L 折算');
      return wjoin(w);
    }
    if (isValveCat(it.category)) {
      if (!it.dn && it.category !== 'flushValve') w.push('名称未注公称直径（如 DN100），已按本类最小档 ' + quota.code + ' 计列，请核对');
      if (quota.overRange) w.push('公称直径超本类最大档，已取顶档 ' + quota.code + '，请核对');
      if (it.category === 'flushValve') w.push('口部冲洗阀按 8-1260（壁龛式）计列，如为地坑式请改选 8-1261');
      if (it.category === 'waterValve' && !it.brand) w.push('该阀种取信息价，页面不标品牌');
      return wjoin(w);
    }
    if (!isPriced(it)) {
      w.push('该材质（' + it.material + '）的清单/定额匹配逻辑待补充，暂只输出名称与长度，请手工套用');
      return wjoin(w);
    }
    if (it.dn === null || it.dn === undefined || isNaN(it.dn)) {
      w.push('未识别公称直径，请在项目名称中注明（如 DN100 / DN150）');
    }
    if (it.jointFallback) {
      var jf = JOINT_CN2[it.jointFallback] || JOINT_CN[it.jointFallback] || '该连接方式';
      var jt = JOINT_CN2[it.joint] || JOINT_CN[it.joint] || '默认连接方式';
      var mcn = it.isRain ? '雨水' : MEDIUM_CN[it.medium];
      w.push('所选' + LOC_CN[it.loc] + mcn + '无' + jf + '子目，已按' + jt + '套用，请核对');
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
    if (PIPE_GROUPS[it.category]) {
      if (it.category === 'copper' && it.loc === 'out') w.push('第八册铜管无室外子目，已按室内铜管子目套用，请核对');
      if (it.loc === 'out' && it.joint === 'groove') w.push('室外管道无沟槽连接子目，已按室外钢管(焊接)套用，请核对');
      if (it.category === 'plastic') {
        if (!it.jointFromName && !it.jointPicked) w.push('名称未注明连接方式，已按' + (JOINT_CN2[it.joint] || '粘接') + '计列，可在「安装部位/接口形式」列切换');
        if (it.joint === 'nut') w.push('螺母密封圈连接子目 8-389~8-394 按子目序号连续推定，请对照基价表核对');
        if (it.loc === 'out' && it.wasDrainName) w.push('第八册室外塑料管仅设给水管子目（8-36~8-71），已按室外塑料给水管套用，请核对');
      }
      if (it.joint === 'groove') w.push('沟槽连接已附加管件定额' + ((it.extras || [])[0] ? ' ' + it.extras[0].code : '') + '，管件数量按6m定尺估算');
      if (it.medium === 'drain' || it.medium === 'gas') w.push('已附加管道消毒冲洗，排水/燃气管一般不计取，如无需请删除该定额行');
    }
    if (it.mediumAmbiguous) {
      if (it.category === 'galv') w.push('名称未注明给水/燃气，按给水（普通螺纹连接）套用，燃气管道请在选型列切换连接方式');
      else if (it.category === 'plastic') w.push('名称未注明给水/排水，按' + MEDIUM_CN[it.medium] + '套用，可在「安装部位/接口形式」列改选管道类型');
      else w.push('名称未注明给水/排水，按' + MEDIUM_CN[it.medium] + '套用，如不符请在名称中注明');
    }
    if (it.locAmbiguous) w.push('名称未注明室内/室外，按室内套用，可在选型列切换');
    if (it.qtyWarn) w.push('工程量缺失，暂按1m计，请核对');
    return wjoin(w);
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
      // 保温绝热：D 列可填 m²（面积）或 m（管长），自动折算为 m³
      var unitRaw = row[3] === undefined || row[3] === null ? '' : String(row[3]).trim();
      if (it.category === 'insulRubber' || it.category === 'insulGlass') {
        var delta = (it.insulThk || 30) / 1000;
        if (/m²|㎡|平方米|平米/.test(unitRaw)) {
          qty = qty * delta;
          it.unitFrom = 'm²';
        } else if (/^(m|米|延米|延长米)$/.test(unitRaw) && it.dn) {
          qty = Math.PI * (it.dn / 1000 + delta) * delta * qty;
          it.unitFrom = 'm';
        }
        qty = Math.round(qty * 1000) / 1000;
      }
      it.quantity = qty;

      var quota = matchQuota(it);
      it.quotaCode = quota.code;
      it.quotaName = quota.name;
      it.quotaUnit = quota.unit || it.unit;
      it.quotaFactor = quota.factor || 1;
      it.codeInferred = !!quota.inferred;
      it.dnTier = quota.dnTier || null;
      it.extras = buildExtraQuotas(it, quota);
      it.warn = buildWarn(it, quota);

      recomputePrice(it, periodKey);
      it.features = featureText(it);
      results.push(it);
    }
    var out = withBracket(results);
    out._periodKey = periodKey;
    out._format = format;
    return out;
  }

  function recomputeQuota(it) {
    var q = matchQuota(it);
    it.quotaCode = q.code;
    it.quotaName = q.name;
    it.quotaUnit = q.unit || it.unit;
    it.quotaFactor = q.factor || 1;
    it.codeInferred = !!q.inferred;
    it.dnTier = q.dnTier || null;
    it.extras = buildExtraQuotas(it, q);
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
    if (isSanCat(it.category)) {
      var sd = S_DEF[it.category];
      if (sd.opts) {
        return sel('variant', it._i, sd.opts.map(function (x) { return opt(x.k, it.sanOpt, x.l); }).join(''));
      }
      if (sd.forms) {
        return sel('form', it._i, opt('ground', it.sanForm, '地上式') + opt('hang', it.sanForm, '悬挂式'));
      }
      if (sd.tiers) {
        var cur = String(it.dnTier || sd.defDn);
        return sel('variant', it._i, sd.tiers.map(function (t) {
          return opt(String(t.max), cur, 'DN' + t.max + '以内');
        }).join(''));
      }
      return '<span class="lay-static">—</span>';
    }
    if (isAuxCat(it.category)) return '<span class="lay-static">—</span>';
    if (isValveCat(it.category)) return '<span class="lay-static">—</span>';
    if (!isPriced(it)) {
      return '<span class="lay-static">待补充</span>';
    }
    var locHtml = opt('in', it.loc, '室内') + opt('out', it.loc, '室外');
    var js = jointsOf(it);
    var jointHtml = js.map(function (j) { return opt(j, it.joint, JOINT_CN2[j] || JOINT_CN[j] || j); }).join('');
    // 塑料管三级联动：室内外 →（室内）雨水/排水/给水管 → 连接方式；（室外）室内外 → 连接方式
    if (it.category === 'plastic') {
      var medSel = '';
      if (it.loc !== 'out') {
        var mk0 = mediumKeyOf(it);
        medSel = sel('medium', it._i, ['rain', 'drain', 'water'].map(function (m) {
          return opt(m, mk0, MEDIUM_CN3[m]);
        }).join(''));
      }
      return '<div class="lay-stack">' + sel('loc', it._i, locHtml) + medSel + sel('joint', it._i, jointHtml) + '</div>';
    }
    return '<div class="lay-stack">' +
      sel('loc', it._i, locHtml) + sel('joint', it._i, jointHtml) + '</div>';
  }

  function specCell(it) {
    if (isSanCat(it.category)) {
      var sd = S_DEF[it.category];
      if (sd.opts) return sanOptLabel(it) || '成套';
      if (sd.tiers) return 'DN' + (it.dnTier || sd.defDn);
      if (sd.forms) return (it.sanForm === 'hang' ? '悬挂式' : '地上式') + ' DN' + (it.dnTier || 100);
      return '成套';
    }
    if (isAuxCat(it.category)) {
      if (it.category === 'bracket') return '—';
      return (it.dn ? 'DN' + it.dn + ' ' : '') + 'δ' + it.insulThk;
    }
    if (isValveCat(it.category)) return it.dn ? 'DN' + it.dn : (it.category === 'flushValve' ? '成套' : '—');
    if (it.dn === null || it.dn === undefined || isNaN(it.dn)) return '—';
    var p = (it.category === 'plastic' || it.category === 'composite' || it.category === 'copper') ? 'De' : 'DN';
    return p + it.dn;
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
        '<td class="cell-feature" title="' + escapeHtml(item.features || '') + '">' + escapeHtml(item.features || '—') + '</td>' +
        '<td class="cell-qcode">' + (item.quotaCode || '—') + ' ' + inferTag(item) + '</td>' +
        '<td class="cell-qname" title="' + escapeHtml(item.quotaName + ((item.extras && item.extras.length) ? ' ＋ ' + item.extras.map(function (x) { return x.code + ' ' + x.name; }).join(' ＋ ') : '')) + '">' +
          escapeHtml(item.quotaName || '—') +
          ((item.extras && item.extras.length) ? item.extras.map(function (x) {
            return '<br><span class="tag tag-info">＋' + x.code + '</span> <span style="font-size:12px;color:#5b6b73">' + escapeHtml(x.name.replace(/^.*?管道\s*/, '')) + '</span>';
          }).join('') : '') + '</td>' +
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
          var prevLoc = it.loc;
          it.loc = s.value;
          it.locAmbiguous = false;
          if (it.category === 'plastic') {
            if (it.loc === 'out') {
              // 室外仅有给水管子目：记住室内所选介质，切回室内时恢复
              if (prevLoc !== 'out') it.mediumInKey = mediumKeyOf(it);
              it.wasDrainName = (it.medium === 'drain' || it.isRain);
              it.medium = 'water'; it.isRain = false;
            } else if (prevLoc === 'out' && it.mediumInKey) {
              it.medium = it.mediumInKey === 'rain' ? 'drain' : it.mediumInKey;
              it.isRain = it.mediumInKey === 'rain';
            }
          }
          var allow = jointsOf(it);
          if (allow.indexOf(it.joint) < 0) it.joint = defaultJoint(it);
          it.jointFallback = null;
        } else if (act === 'medium') {
          it.medium = s.value;
          it.isRain = s.value === 'rain';
          it.mediumAmbiguous = false;
          it.mediumFromSel = true;
          var allowM = jointsOf(it);
          if (allowM.indexOf(it.joint) < 0) it.joint = defaultJoint(it);
          it.jointFallback = null;
        } else if (act === 'joint') {
          it.joint = s.value;
          it.jointPicked = true;
          it.jointFallback = null;
        } else if (act === 'variant') {
          if (isSanCat(it.category) && S_DEF[it.category].opts) {
            it.sanOpt = s.value;
            it.sanOptFromName = true;
          } else {
            it.sanDn = parseInt(s.value, 10);
          }
        } else if (act === 'form') {
          it.sanForm = s.value;
          it.sanFormFromName = true;
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
      (it.extras || []).forEach(function (x) {
        wsData.push(['', '', '', x.code, x.name + '（数量' + round4(x.qty / (x.factor || 1)) + ' ' + x.unit + '）', '', '', '']);
      });
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
          it.index, it.name, (isAuxCat(it.category) ? AUX_LABEL[it.category] : (isSanCat(it.category) ? '洁具' : '管道')), (it.materialLabel || it.material), '', specVal, '', it.quantity,
          '', '待人工处理', it.name, it.features, it.unit, it.quantity,
          hasPrice ? num2(it.price) : ''
        ]);
        return;
      }
      wsData.push([
        it.index, it.name, (isAuxCat(it.category) ? AUX_LABEL[it.category] : (isSanCat(it.category) ? '洁具' : '管道')), (it.materialLabel || it.material), '', specVal, '', it.quantity,
        it.listCode, '清单行', it.name, it.features, it.unit, it.quantity,
        hasPrice ? num2(it.price) : ''
      ]);
      var qFactor = it.quotaFactor || 1;
      var sub = 0;
      wsData.push([
        it.index + '.' + (++sub), '', '', '', '', '', '', '',
        it.quotaCode, '定额行', it.quotaName, '', it.quotaUnit || it.unit,
        round4(it.quantity / qFactor), ''
      ]);
      (it.extras || []).forEach(function (x) {
        wsData.push([
          it.index + '.' + (++sub), '', '', '', '', '', '', '',
          x.code, '定额行', x.name, '', x.unit, round4(x.qty / (x.factor || 1)), ''
        ]);
      });
      if (hasPrice) {
        zIdx++;
        wsData.push([
          it.index + '.' + (++sub), '', '', '', '', '', '', '',
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

  // 切换导出格式 / 信息价期号时，保留用户手选的室内外、接口形式、洁具选型
  function snapChoices(data) {
    var m = {};
    (data || []).forEach(function (it) {
      if (!it || it.index === undefined) return;
      m[it.index + '|' + it.name] = { loc: it.loc, joint: it.joint, medium: it.medium, isRain: it.isRain, mediumFromSel: it.mediumFromSel, sanOpt: it.sanOpt, sanDn: it.sanDn, sanForm: it.sanForm };
    });
    return m;
  }
  function applyChoices(data, snap) {
    if (!snap) return;
    data.forEach(function (it) {
      var s = snap[it.index + '|' + it.name];
      if (!s) return;
      var dirty = false;
      if (isSanCat(it.category)) {
        if (s.sanOpt !== undefined && s.sanOpt !== it.sanOpt) { it.sanOpt = s.sanOpt; it.sanOptFromName = true; dirty = true; }
        if (s.sanDn !== undefined && s.sanDn !== it.sanDn) { it.sanDn = s.sanDn; dirty = true; }
        if (s.sanForm !== undefined && s.sanForm !== it.sanForm) { it.sanForm = s.sanForm; it.sanFormFromName = true; dirty = true; }
      } else if (it.loc !== undefined && s.loc) {
        if (s.loc !== it.loc) { it.loc = s.loc; it.locAmbiguous = false; dirty = true; }
        if (s.mediumFromSel && s.medium && s.medium !== it.medium) {
          it.medium = s.medium; it.isRain = s.medium === 'rain'; it.mediumAmbiguous = false; it.mediumFromSel = true; dirty = true;
        }
        if (s.joint && s.joint !== it.joint) { it.joint = s.joint; it.jointPicked = true; it.jointFallback = null; dirty = true; }
      }
      if (dirty) {
        recomputeQuota(it);
        recomputePrice(it, data._periodKey);
        it.features = featureText(it);
      }
    });
  }

  function refreshAll() {
    if (!window._rawAOA) return;
    var snap = snapChoices(exportData);
    exportData = parseRows(window._rawAOA, currentPeriod(), currentFormat());
    applyChoices(exportData, snap);
    renderTable(exportData);
    var area = document.getElementById('resultArea');
    var btn = document.getElementById('btnGroup');
    var bar = document.getElementById('statusBar');
    if (exportData.length) {
      area.style.display = 'block';
      btn.style.display = 'flex';
      bar.style.display = 'block';
      bar.className = 'status-bar status-ok';
      var cnt = {};
      exportData.forEach(function (d) { cnt[d.category] = (cnt[d.category] || 0) + 1; });
      var nameMap = { castIron: '铸铁管', galv: '镀锌钢管', seamless: '无缝钢管', welded: '焊接钢管', copper: '铜管', stainless: '不锈钢管', composite: '复合管', plastic: '塑料管', waterValve: '阀门', bracket: '管道支架', insulRubber: '橡塑保温', insulGlass: '玻璃棉', other: '其他材质' };
      var sanNames = { bathtub: '浴缸', bidet: '净身盆', washbasin: '洗脸盆', sink: '洗涤盆', labSink: '化验盆', toilet: '大便器', urinal: '小便器', faucet: '水龙头', waterHeater: '电热水器', boiler: '电开水炉', steamHeater: '蒸汽加热器', heatExchanger: '热交换器', flushDevice: '冲洗器', handDryer: '烘手器', shower: '淋浴器', showerRoom: '淋浴间', floorDrain: '地漏', cleanout: '扫除口', rainHead: '雨水斗', siphonHead: '虹吸雨水斗', waterDispenser: '饮水器', greaseTrap: '隔油器' };
      var parts = [];
      Object.keys(nameMap).forEach(function (k) { if (cnt[k]) parts.push(nameMap[k] + ' ' + cnt[k] + ' 条'); });
      Object.keys(sanNames).forEach(function (k) { if (cnt[k]) parts.push(sanNames[k] + ' ' + cnt[k] + ' 条'); });
      bar.textContent = '成功解析 ' + exportData.length + ' 条：' + parts.join('、') +
        '；「安装部位/接口形式」列可切换室内外、连接方式及洁具选型，定额与主材价实时重算（洁具定额按 10 组 / 10 个 / 10 台 计量，导出自动换算）；黄色行为需人工核对项';
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
      lookupCastIronPrice: lookupCastIronPrice, lookupGalvPrice: lookupGalvPrice,
      lookupPipePrice: lookupPipePrice, getPeriods: getPeriods,
      pipeKey: pipeKey, isPriced: isPriced, PIPE_GROUPS: PIPE_GROUPS,
      parsePipeJoint: parsePipeJoint, JOINT_CN2: JOINT_CN2, plasticKindOf: plasticKindOf, MEDIUM_CN3: MEDIUM_CN3,
      featureText: featureText, buildWarn: buildWarn,
      exportGLD: exportGLD, exportJianjing: exportJianjing,
      V_LIST: V_LIST, V_LABEL: V_LABEL, isValveCat: isValveCat, valveCatOf: valveCatOf,
      buildValveItem: buildValveItem, matchValveQuota: matchValveQuota, valvePrice: valvePrice,
      V_WTHREAD: V_WTHREAD, V_WFLANGE: V_WFLANGE, V_FLOAT: V_FLOAT, V_LEVEL: V_LEVEL,
      V_STHREAD: V_STHREAD, V_SFLANGE: V_SFLANGE,
      AUX_LIST: AUX_LIST, AUX_LABEL: AUX_LABEL, isAuxCat: isAuxCat, auxCatOf: auxCatOf,
      buildAuxItem: buildAuxItem, matchAuxQuota: matchAuxQuota, auxPrice: auxPrice,
      bracketWeightPerM: bracketWeightPerM, withBracket: withBracket,
      S_DEF: S_DEF, S_WORK: S_WORK, isSanCat: isSanCat, sanCatOf: sanCatOf,
      buildSanItem: buildSanItem, matchSanQuota: matchSanQuota, sanPrice: sanPrice,
      sanOptLabel: sanOptLabel
    };
  }
})();
