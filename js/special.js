/* ============================================================================
 * 补充清单定额规则共享模块（2026-11-24 第二批，主人指定口径）
 * 覆盖：给排水 / 暖通 / 消防 三站（预算 + 概算 = 六个平台）
 *
 * 用法（各站 app.js / pipes.js）：
 *   var SP = (typeof window !== 'undefined' && window.PIPE_SPECIAL) ||
 *            (typeof require === 'function' ? require('./special.js') : null);
 *   buildItem : var c = SP.catOf(name); if (c) return SP.buildItem(name, c);
 *   matchQuota: if (it.special) return SP.matchQuota(it);
 *   extras    : if (it.special) return SP.extras(it, quota);
 *   price     : if (it.special) return SP.price(it);
 *   feature   : if (it.special) return SP.feature(it);
 *   spec      : if (it.special) return SP.spec(it);
 *   warn      : if (it.special) return SP.warn(it, quota);
 *   opts      : if (it.special && SP.hasOpts(it)) → 渲染选型下拉，change 时 SP.setOpt(it, k)
 *
 * 各站可用 native 集合排除本站已有原生实现的类别（如给排水站原生洁具）：
 *   SP.setNative(['washSink','emergencyShower','floorCleanout'])
 * ========================================================================== */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PIPE_SPECIAL = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  function S(v) { return String(v == null ? '' : v); }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function r2(v) { return Math.round(v * 100) / 100; }

  var DN_STD = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000];

  function parseDn(name) {
    var s = S(name);
    var m = s.match(/(?:DN|dn|De|de|D|Φ|φ|Ø)\s*[-－]?\s*(\d{2,4})/);
    if (m) return parseInt(m[1], 10);
    m = s.match(/(\d{2,4})\s*(?:mm|MM|毫米)/);
    if (m) return parseInt(m[1], 10);
    m = s.match(/[-－—–_]\s*(\d{2,4})\s*$/);
    if (m) {
      var v = parseInt(m[1], 10);
      if (DN_STD.indexOf(v) >= 0) return v;
    }
    return null;
  }
  function nearIdx(arr, v) {
    if (!(v > 0)) return 0;
    for (var i = 0; i < arr.length; i++) if (v <= arr[i]) return i;
    return arr.length - 1;
  }
  // 按 DN 档位步进放大/缩小（1.2/0.8、1.1/0.9 等系数口径）
  function stepPrice(base, baseDn, dn, up, down) {
    var i0 = DN_STD.indexOf(baseDn), i1 = DN_STD.indexOf(dn);
    if (i0 < 0 || i1 < 0 || !(dn > 0)) return base;
    var k = i1 - i0, p = base;
    while (k > 0) { p *= up; k--; }
    while (k < 0) { p *= down; k++; }
    return r3(p);
  }

  // ---------------------------------------------------------------------------
  // 类别元数据
  // ---------------------------------------------------------------------------
  var CATS = {
    preInsul:      { code: '030801020', lname: '低压直埋保温管道', unit: 'm',  label: '直埋式预制保温管', type: '管道', work: '管道安装、接口保温、水压试验、冲洗' },
    ppDrain:       { code: '031001008', lname: '塑料管',           unit: 'm',  label: 'PP排水管',        type: '管道', work: '粘接、灌水试验、通球试验' },
    levelGauge:    { code: '031002001', lname: '金属阀门',         unit: '台', label: '直读玻璃管（板）液位计', type: '仪表', work: '仪表安装、接线、调试' },
    pressGauge:    { code: '030601002', lname: '压力仪表',         unit: '台', label: '压力表、真空表 就地', type: '仪表', work: '仪表安装、校验' },
    pressGaugeElec:{ code: '030601002', lname: '压力仪表',         unit: '台', label: '电接点压力表', type: '仪表', work: '仪表安装、接线、校验' },
    sensor:        { code: '030503005', lname: '传感器',           unit: '台', label: '压力传感器',     type: '仪表', work: '传感器安装、接线、调试' },
    flexJoint:     { code: '031002008', lname: '软接头（软管）',   unit: '个', label: '可曲挠橡胶软接头', type: '阀门', work: '安装、试压' },
    waterMeter:    { code: '031002011', lname: '水表',             unit: '个', label: '水表',           type: '阀门', work: '水表安装、连接、试压' },
    waterHammer:   { code: '031002016', lname: '水锤消除器',       unit: '个', label: '水锤消除器',     type: '阀门', work: '消除器安装、连接、试压' },
    bellMouth:     { code: '031002001', lname: '金属阀门',         unit: '个', label: '喇叭口',         type: '阀门', work: '喇叭口安装、连接、密封' },
    vacuumBreaker: { code: '031002001', lname: '金属阀门',         unit: '个', label: '真空破坏器',     type: '阀门', work: '阀体安装、连接、试压' },
    backflow:      { code: '031002001', lname: '金属阀门',         unit: '个', label: '倒流防止器',     type: '阀门', work: '阀体安装、连接、试压、调试' },
    uvLamp:        { code: '031005012', lname: '紫外线杀菌设备',   unit: '台', label: '紫外线消毒器',   type: '设备', work: '设备就位、进出水连接、通电调试' },
    waterTank:     { code: '031005016', lname: '水箱',             unit: '台', label: '整体水箱',       type: '设备', work: '水箱就位、拼装、进出水管连接、满水试验' },
    pressureTank:  { code: '031005004', lname: '气压罐',           unit: '台', label: '隔膜式气压水罐', type: '设备', work: '罐体就位固定、接管、充气调试' },
    manifold:      { code: '030113019001', lname: '分离器',        unit: '台', label: '分集水器',       type: '设备', work: '集水器/分水器就位、固定、接管、试压' },
    pump:          { code: '031005001', lname: '变频给水设备',     unit: '台', label: '水泵',           type: '设备', work: '泵就位、找平、联轴器安装、试运转' },
    flexSleeve:    { code: '031301003', lname: '套管',             unit: '个', label: '柔性防水套管',   type: '套管', work: '套管制作、焊接、安装、封堵' },
    rigidSleeve:   { code: '031301003', lname: '套管',             unit: '个', label: '刚性防水套管',   type: '套管', work: '套管制作、焊接、安装、封堵' },
    steelSleeve:   { code: '031301003', lname: '套管',             unit: '个', label: '一般穿墙套管',   type: '套管', work: '套管制作、安装、封堵' },
    washSink:      { code: '031003003', lname: '洗脸盆',           unit: '组', label: '洗脸盆',         type: '洁具', work: '盆体安装、龙头安装、排水配件安装、试水' },
    sewageSink:    { code: '031003004', lname: '洗涤盆',           unit: '组', label: '洗涤盆',         type: '洁具', work: '盆体安装、龙头安装、排水配件安装、试水' },
    emergencyShower:{ code: '031003010', lname: '淋浴器',          unit: '组', label: '紧急喷淋（洗眼器）', type: '洁具', work: '喷淋器组装、给排水连接、试水' },
    heaterElec:   { code: '031005013', lname: '热水器、开水炉',   unit: '台', label: '电热水器',       type: '设备', work: '热水器就位固定、进出水管连接、通电试运行' },
    boilerElec:    { code: '031005013', lname: '热水器、开水炉',   unit: '台', label: '电开水炉',       type: '设备', work: '开水炉就位固定、进出水管连接、通电试运行' },
    floorCleanout: { code: '031003014', lname: '给、排水附件',     unit: '个', label: '地面扫除口',     type: '洁具', work: '扫除口安装、盖板固定、密封检查' },
    fireRing:      { code: '031001011', lname: '阻火圈',           unit: '个', label: '排水管阻火圈',   type: '套管', work: '阻火圈安装、固定' }
  };

  // 站内已有原生实现的类别（由各站 setNative 指定，命中则不拦截）
  var NATIVE = {};
  function setNative(arr) {
    NATIVE = {};
    (arr || []).forEach(function (k) { NATIVE[k] = 1; });
  }

  // ---------------------------------------------------------------------------
  // 分类识别
  // ---------------------------------------------------------------------------
  function catOf(name) {
    var n = S(name);
    if (!n) return '';
    var c = catOfRaw(n);
    if (!c) return '';
    return NATIVE[c] ? '' : c;
  }

  function catOfRaw(n) {
    // 保温 / 刷漆 / 除锈 / 防腐 / 支架 等非设备类条目直接放过（「直埋保温管」除外）
    if (/保温(?!管)|刷漆|除锈|防腐|支吊架|支架|吊架|保温层/.test(n)) return '';
    // ---- 仪表 ----
    if (/电接点压力表/.test(n)) return 'pressGaugeElec';
    if (/压力表|真空表/.test(n)) return 'pressGauge';
    if (/液位计/.test(n)) return 'levelGauge';
    if (/压力传感器|传感器/.test(n)) return 'sensor';
    // ---- 水表 ----
    if (/水表/.test(n) && !/水表井|水表箱|水表间/.test(n)) return 'waterMeter';
    // ---- 水锤 ----
    if (/水锤/.test(n)) return 'waterHammer';
    // ---- 消毒 ----
    if (/紫外线|消毒器/.test(n)) return 'uvLamp';
    // ---- 水箱（排除便器水箱 / 膨胀水箱归气压罐） ----
    if (/水箱/.test(n) && !/大便器|坐便|座便|蹲便|便器|冲洗水箱|膨胀水箱|气压罐/.test(n)) return 'waterTank';
    // ---- 气压罐 / 膨胀罐 ----
    if (/膨胀罐|压力罐|气压罐|定压罐|补水罐|储水罐|水罐|稳压罐/.test(n)) return 'pressureTank';
    if (/罐/.test(n) && !/罐体|罐车|油罐|储油罐|罐区/.test(n)) return 'pressureTank';
    // ---- 分集水器 ----
    if (/分集水器|分水器|集水器/.test(n)) return 'manifold';
    // ---- 泵 ----
    // 热泵/冷热水机组属暖通设备（030112003 等），不按水泵套用
    if (/热泵/.test(n)) return '';
    if (/泵/.test(n) && !/接合器|泵房|水泵房|泵组基础|冷热水机组|冷水机组/.test(n)) return 'pump';
    // ---- 套管 ----
    if (/柔性防水套管|柔性套管/.test(n)) return 'flexSleeve';
    if (/刚性防水套管|刚性套管/.test(n)) return 'rigidSleeve';
    if (/套管/.test(n)) return 'steelSleeve';
    // ---- 阀门类补充 ----
    if (/喇叭口/.test(n)) return 'bellMouth';
    if (/倒流防止器/.test(n)) return 'backflow';
    if (/真空破坏器|破坏器/.test(n)) return 'vacuumBreaker';
    if (/可曲挠|橡胶软接头|软接头|软管接头/.test(n)) {
      if (/帆布|三防布|复合布|钢丝撑筋|风管|风道|风阀/.test(n)) return '';
      if (/[×xX*]\s*\d{2,3}/.test(n)) return '';
      return 'flexJoint';
    }
    // ---- 管道 ----
    if (/直埋保温管|预制直埋保温|直埋预制保温|聚氨酯保温管/.test(n)) return 'preInsul';
    if (/PP\s*排水|PP\s*静音|静音管|PP\s*管/i.test(n)) return 'ppDrain';
    // ---- 洁具 / 附件 ----
    if (/扫除口/.test(n)) return 'floorCleanout';
    if (/阻火圈/.test(n)) return 'fireRing';
    if (/污水池|拖布池|拖把池/.test(n)) return 'sewageSink';
    if (/洗手池|刷手池|洗脸池|净化洗手池/.test(n)) return 'washSink';
    if (/紧急喷淋|紧急冲洗|洗眼器/.test(n)) return 'emergencyShower';
    if (/开水器|开水炉/.test(n)) return 'boilerElec';
    if (/热水器/.test(n)) return 'heaterElec';
    return '';
  }

  function isCat(c) { return !!CATS[c]; }

  // ---------------------------------------------------------------------------
  // 建条目
  // ---------------------------------------------------------------------------
  function buildItem(name, cat) {
    var d = CATS[cat];
    var it = {};
    it.name = name;
    it.category = cat;
    it.special = true;
    it.listCode = d.code;
    it.listName = d.lname;
    it.unit = d.unit;
    it.material = d.label;
    it.materialLabel = d.label;
    it.dn = parseDn(name);

    if (cat === 'preInsul') { it.medium = 'water'; it.loc = 'out'; it.joint = 'weld'; }
    if (cat === 'ppDrain') {
      it.medium = 'drain';
      it.isRain = /雨水/.test(name);
      it.joint = 'glue';
      it.materialLabel = /静音/.test(name) ? 'PP排水静音管' : 'PP排水管';
    }
    if (cat === 'waterTank') {
      var dim = parseTankDims(name);
      if (dim) {
        it.tankVol = r2(dim.vol);
        it.tankArea = r2(dim.area);
        it.tankDim = dim.txt;
      }
    }
    if (cat === 'pressureTank') it.tankVolL = parseVolumeL(name);
    if (cat === 'pump') it.pumpKw = parseKw(name);
    if (cat === 'waterMeter') it.meterRemote = /远传|智能|物联网|IC卡|预付费/.test(name);
    if (cat === 'heaterElec' || cat === 'boilerElec') it.specialOpt = parseHeaterOpt(name, cat);
    return it;
  }

  // 电热水器 / 电开水炉 型号识别（名称里带 RS15 / RS50立式 / KSA 等）
  function parseHeaterOpt(name, cat) {
    var n = S(name);
    if (/KSA|开水炉|开水器/.test(n)) return 'BOILER';
    if (/RS\s*300/i.test(n)) return 'RS300';
    if (/RS\s*100/i.test(n)) return 'RS100';
    if (/RS\s*50/i.test(n)) return /立式|竖式/.test(n) ? 'RS50L' : 'RS50W';
    if (/RS\s*30/i.test(n)) return 'RS30';
    if (/RS\s*15/i.test(n)) return 'RS15';
    return cat === 'boilerElec' ? 'BOILER' : 'RS50W';
  }

  // 水箱尺寸：3000*5000*4000（mm）→ 体积 60m³、表面积 94㎡
  function parseTankDims(name) {
    var s = S(name);
    var m = s.match(/(\d+(?:\.\d+)?)\s*[*×xX]\s*(\d+(?:\.\d+)?)\s*[*×xX]\s*(\d+(?:\.\d+)?)/);
    if (!m) return null;
    var a = parseFloat(m[1]), b = parseFloat(m[2]), c = parseFloat(m[3]);
    if (!(a > 0 && b > 0 && c > 0)) return null;
    // 单位一般为 mm；三边均 >100 视为 mm，否则视为 m
    var scale = (a > 100 || b > 100 || c > 100) ? 0.001 : 1;
    a *= scale; b *= scale; c *= scale;
    return { vol: a * b * c, area: (a * b + b * c + a * c) * 2, txt: a + '*' + b + '*' + c };
  }
  function parseVolumeL(name) {
    var s = S(name);
    var m = s.match(/(\d+(?:\.\d+)?)\s*(?:L|l|升|m³|m3|立方)/);
    if (!m) return null;
    var v = parseFloat(m[1]);
    if (/m³|m3|立方/.test(m[0])) v *= 1000;
    return v > 0 ? v : null;
  }
  function parseKw(name) {
    var s = S(name);
    var m = s.match(/(\d+(?:\.\d+)?)\s*(?:kW|KW|kw|Kw|千瓦)/);
    if (m) return parseFloat(m[1]);
    return null;
  }

  // ---------------------------------------------------------------------------
  // 定额匹配
  // ---------------------------------------------------------------------------
  var PINS = [32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400];        // 8-141~8-153
  var PPDRAIN = [50, 75, 110, 160, 200, 250];                                      // 8-377~8-382
  var FLEX_THREAD = [15, 20, 25, 32, 40];                                          // 8-812~8-816
  var FLEX_FLANGE = [50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400];          // 8-819~8-829
  var WM_THREAD = [15, 20, 25, 32, 40];                                            // 8-758~8-762
  var WM_FLANGE = [50, 80, 100, 150, 200, 250, 300];                               // 8-768~8-774
  var WH_THREAD = [15, 20, 25, 32, 40];                                            // 5-283~5-287
  var WH_FLANGE = [50, 65, 80, 100, 125, 150, 200, 300];                           // 5-289~5-296
  var VALVE_THREAD = [15, 20, 25, 32, 40, 50];                                     // 8-579~8-584
  var VALVE_FLANGE = [65, 80, 100, 125, 150, 200, 250, 300, 350, 400];             // 8-620~8-629
  var BELL_THREAD = [15, 20, 25, 32, 40];                                          // 8-579~8-583
  var BELL_FLANGE = [32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400];   // 8-617~8-629
  var TANK_CAP = [3, 5, 10, 15, 20, 30, 40, 60];                                   // 8-910~8-917
  var SLEEVE_MAKE = [50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000]; // 制作 17 档
  var SLEEVE_INST = [50, 80, 100, 150, 200, 300, 400, 600, 1000];                  // 安装 9 档
  var STEEL_SLEEVE = [50, 65, 80, 100, 125, 150, 200, 250, 300, 500];              // 6-3029~6-3038
  var CLEANOUT_DN = [50, 75, 100, 125, 150];                                       // 8-945~8-949
  var FIRE_RING_DN = [50, 75, 110, 160];                                           // 8-808~8-811

  function needDn(it, nm) {
    return { code: '', name: nm + '（管径待识别）', inferred: false, needDn: true, unit: CATS[it.category].unit, factor: 1 };
  }

  function matchQuota(it) {
    var c = it.category, d = CATS[c] || {};
    var dn = it.dn;
    var noDn = !(dn > 0);

    if (c === 'preInsul') {
      if (noDn) return needDn(it, '室外管道 直埋式预制保温管');
      var i1 = nearIdx(PINS, dn);
      return { code: '8-' + (141 + i1), name: '室外管道 直埋式预制保温管 公称直径' + PINS[i1] + 'mm以内',
        inferred: PINS[i1] !== dn, dnTier: PINS[i1], unit: '10m', factor: 10 };
    }
    if (c === 'ppDrain') {
      if (noDn) return needDn(it, '室内管道 塑料排水管（粘接）');
      var i2 = nearIdx(PPDRAIN, dn);
      return { code: '8-' + (377 + i2), name: '室内管道 塑料排水管（粘接）公称外径' + PPDRAIN[i2] + 'mm以内',
        inferred: PPDRAIN[i2] !== dn, dnTier: PPDRAIN[i2], unit: '10m', factor: 10 };
    }
    if (c === 'levelGauge') return { code: '10-77', name: '物位检测仪表 直读玻璃管（板）液位计 管（板）长度1700mm以内', inferred: false, unit: '台', factor: 1 };
    if (c === 'pressGauge') return { code: '10-25', name: '压力仪表 压力表、真空表 就地', inferred: false, unit: '台', factor: 1 };
    if (c === 'pressGaugeElec') return { code: '10-31', name: '压力仪表 电接点压力表', inferred: false, unit: '台', factor: 1 };
    if (c === 'sensor') return { code: '12-541', name: '传感器安装', inferred: false, unit: '台', factor: 1 };
    if (c === 'uvLamp') return { code: '8-980', name: '消毒器 湿式 250*400', inferred: false, unit: '台', factor: 1 };

    if (c === 'flexJoint') {
      if (noDn) return needDn(it, '橡胶软接头');
      if (dn < 50) {
        var i3 = nearIdx(FLEX_THREAD, dn);
        return { code: '8-' + (812 + i3), name: '橡胶软接头（螺纹连接）公称直径' + FLEX_THREAD[i3] + 'mm以内', inferred: FLEX_THREAD[i3] !== dn, dnTier: FLEX_THREAD[i3], unit: '个', factor: 1 };
      }
      var i4 = nearIdx(FLEX_FLANGE, dn);
      return { code: '8-' + (819 + i4), name: '橡胶软接头（法兰连接）公称直径' + FLEX_FLANGE[i4] + 'mm以内', inferred: FLEX_FLANGE[i4] !== dn, dnTier: FLEX_FLANGE[i4], unit: '个', factor: 1 };
    }
    if (c === 'waterMeter') {
      if (noDn) return needDn(it, '水表');
      if (dn < 50) {
        var i5 = nearIdx(WM_THREAD, dn);
        return { code: '8-' + (758 + i5), name: '螺纹水表 公称直径' + WM_THREAD[i5] + 'mm以内', inferred: WM_THREAD[i5] !== dn, dnTier: WM_THREAD[i5], unit: '个', factor: 1 };
      }
      var i6 = nearIdx(WM_FLANGE, dn);
      return { code: '8-' + (768 + i6), name: '焊接法兰水表（带旁通管及止回阀）公称直径' + WM_FLANGE[i6] + 'mm以内', inferred: WM_FLANGE[i6] !== dn, dnTier: WM_FLANGE[i6], unit: '个', factor: 1 };
    }
    if (c === 'waterHammer') {
      if (noDn) return needDn(it, '水锤消除器');
      if (dn < 50) {
        var i7 = nearIdx(WH_THREAD, dn);
        return { code: '5-' + (283 + i7), name: '水锤消除器安装（螺纹连接）公称直径' + WH_THREAD[i7] + 'mm以内', inferred: WH_THREAD[i7] !== dn, dnTier: WH_THREAD[i7], unit: '个', factor: 1 };
      }
      var i8 = nearIdx(WH_FLANGE, dn);
      return { code: '5-' + (289 + i8), name: '水锤消除器安装（法兰连接）公称直径' + WH_FLANGE[i8] + 'mm以内', inferred: WH_FLANGE[i8] !== dn, dnTier: WH_FLANGE[i8], unit: '个', factor: 1 };
    }
    if (c === 'bellMouth') {
      if (noDn) return needDn(it, '喇叭口');
      if (dn < 50) {
        var i9 = nearIdx(BELL_THREAD, dn);
        return { code: '8-' + (579 + i9), name: '螺纹阀门 公称直径' + BELL_THREAD[i9] + 'mm以内', inferred: BELL_THREAD[i9] !== dn, dnTier: BELL_THREAD[i9], unit: '个', factor: 1 };
      }
      var i10 = nearIdx(BELL_FLANGE, dn);
      return { code: '8-' + (617 + i10), name: '焊接法兰阀门 公称直径' + BELL_FLANGE[i10] + 'mm以内', inferred: BELL_FLANGE[i10] !== dn, dnTier: BELL_FLANGE[i10], unit: '个', factor: 1 };
    }
    if (c === 'vacuumBreaker' || c === 'backflow') {
      var nm = c === 'backflow' ? '倒流防止器' : '真空破坏器';
      if (noDn) return needDn(it, nm);
      if (dn <= 50) {
        var i11 = nearIdx(VALVE_THREAD, dn);
        return { code: '8-' + (579 + i11), name: '螺纹阀门 公称直径' + VALVE_THREAD[i11] + 'mm以内', inferred: VALVE_THREAD[i11] !== dn, dnTier: VALVE_THREAD[i11], unit: '个', factor: 1 };
      }
      var i12 = nearIdx(VALVE_FLANGE, dn);
      return { code: '8-' + (620 + i12), name: '焊接法兰阀门 公称直径' + VALVE_FLANGE[i12] + 'mm以内', inferred: VALVE_FLANGE[i12] !== dn, dnTier: VALVE_FLANGE[i12], unit: '个', factor: 1 };
    }
    if (c === 'waterTank') {
      var vol = it.tankVol;
      if (!(vol > 0)) {
        return { code: '8-910', name: '整体水箱安装 水箱总容量3m³以内', inferred: true, dnTier: 3, unit: '台', factor: 1, noVol: true };
      }
      var i13 = nearIdx(TANK_CAP, vol);
      return { code: '8-' + (910 + i13), name: '整体水箱安装 水箱总容量' + TANK_CAP[i13] + 'm³以内', inferred: TANK_CAP[i13] !== vol, dnTier: TANK_CAP[i13], unit: '台', factor: 1 };
    }
    if (c === 'pressureTank') return { code: '8-1013', name: '隔膜式气压水罐（气压罐）罐体直径400mm以内', inferred: false, unit: '台', factor: 1 };
    if (c === 'manifold') return { code: '10-004', name: '集水器、分水器安装 公称直径400mm以内', inferred: false, unit: '台', factor: 1 };
    if (c === 'pump') return { code: '1-690', name: '单机离心泵及离心式耐腐蚀泵安装 设备质量0.2t以内', inferred: false, unit: '台', factor: 1 };
    if (c === 'flexSleeve' || c === 'rigidSleeve') {
      var flex = c === 'flexSleeve';
      if (noDn) return needDn(it, flex ? '柔性防水套管制作' : '刚性防水套管制作');
      var i14 = nearIdx(SLEEVE_MAKE, dn);
      var makeStart = flex ? 2977 : 3003;
      return { code: '6-' + (makeStart + i14), name: (flex ? '柔性防水套管制作' : '刚性防水套管制作') + ' 公称直径' + SLEEVE_MAKE[i14] + 'mm以内',
        inferred: SLEEVE_MAKE[i14] !== dn, dnTier: SLEEVE_MAKE[i14], unit: '个', factor: 1 };
    }
    if (c === 'steelSleeve') {
      if (noDn) return needDn(it, '一般穿墙套管制作、安装');
      var i15 = nearIdx(STEEL_SLEEVE, dn);
      return { code: '6-' + (3029 + i15), name: '一般穿墙套管制作、安装 公称直径' + STEEL_SLEEVE[i15] + 'mm以内',
        inferred: STEEL_SLEEVE[i15] !== dn, dnTier: STEEL_SLEEVE[i15], unit: '个', factor: 1 };
    }
    if (c === 'washSink') return { code: '8-839', name: '洗脸盆 钢管组成 冷热水', inferred: false, unit: '10组', factor: 10 };
    if (c === 'sewageSink') return { code: '8-848', name: '洗涤盆 单嘴', inferred: false, unit: '10组', factor: 10 };
    if (c === 'emergencyShower') return { code: '8-861', name: '淋浴器 钢管组成 冷热水', inferred: false, unit: '10组', factor: 10 };
    if (c === 'heaterElec' || c === 'boilerElec') {
      var opt = it.specialOpt || (c === 'boilerElec' ? 'BOILER' : 'RS50W');
      var o = HEATER_OPTS.filter(function (x) { return x.k === opt; })[0] || HEATER_OPTS[0];
      return { code: o.q, name: o.qn, inferred: false, unit: '10台', factor: 10 };
    }
    if (c === 'floorCleanout') {
      var cdn = it.dn > 0 ? it.dn : 100;
      var i16 = nearIdx(CLEANOUT_DN, cdn);
      return { code: '8-' + (945 + i16), name: '地面扫除口 公称直径' + CLEANOUT_DN[i16] + 'mm以内',
        inferred: CLEANOUT_DN[i16] !== cdn, dnTier: CLEANOUT_DN[i16], unit: '10个', factor: 10, defDn: !(it.dn > 0) };
    }
    if (c === 'fireRing') {
      var fdn = it.dn > 0 ? it.dn : 110;
      var i17 = nearIdx(FIRE_RING_DN, fdn);
      return { code: '8-' + (808 + i17), name: '排水管阻火圈 管外径' + FIRE_RING_DN[i17] + 'mm以内',
        inferred: FIRE_RING_DN[i17] !== fdn, dnTier: FIRE_RING_DN[i17], unit: '10个', factor: 10, defDn: !(it.dn > 0) };
    }
    return { code: '', name: '', inferred: false, unit: d.unit || '个', factor: 1 };
  }

  // ---------------------------------------------------------------------------
  // 附加定额（泵控制柜 / 防水套管安装）
  // ---------------------------------------------------------------------------
  function extras(it, quota) {
    var c = it.category, arr = [];
    if (c === 'pump') {
      arr.push({
        role: 'ctrlbox', code: '2-303', name: '同期小屏控制箱安装',
        unit: '台', factor: 1, qty: it.quantity,
        note: '泵控制柜按每台泵 1 台控制箱计列，请按实际配电系统调整',
        mat: { name: '水泵控制柜', price: 3800 }
      });
    }
    if (c === 'flexSleeve' || c === 'rigidSleeve') {
      var dn = quota && quota.dnTier ? quota.dnTier : it.dn;
      var i = nearIdx(SLEEVE_INST, dn);
      var flex = c === 'flexSleeve';
      arr.push({
        role: 'sleeveInstall', code: '6-' + ((flex ? 2994 : 3020) + i),
        name: (flex ? '柔性防水套管安装' : '刚性防水套管安装') + ' 公称直径' + SLEEVE_INST[i] + 'mm以内',
        unit: '个', factor: 1, qty: it.quantity, note: '安装定额不含主材'
      });
    }
    return arr;
  }

  // ---------------------------------------------------------------------------
  // 主材价
  // ---------------------------------------------------------------------------
  var PREINSUL_PRICE = { 32: 55, 40: 65, 50: 78, 65: 98, 80: 118, 100: 145, 125: 185,
    150: 225, 200: 320, 250: 420, 300: 530, 350: 650, 400: 780 };
  var PP_PIPE_PRICE = { 50: 12.851, 75: 24.097, 100: 40.16, 150: 58.5 };
  var PP_FIT_PRICE = { 50: 6.108, 75: 10.682, 100: 19.867, 150: 32.54 };
  var FLEX_JOINT_PRICE = { 15: 22, 20: 26, 25: 32, 32: 42, 40: 52, 50: 68, 65: 95, 80: 120,
    100: 165, 125: 210, 150: 265, 200: 390, 250: 540, 300: 720, 350: 920, 400: 1150 };
  var WATER_METER_PRICE = { 15: 45, 20: 58, 25: 78, 32: 115, 40: 155, 50: 270, 80: 480,
    100: 640, 150: 1150, 200: 1950, 250: 2900, 300: 3800 };
  var VACUUM_PRICE = { 15: 95, 20: 110, 25: 135, 32: 170, 40: 210, 50: 280, 65: 360, 80: 450,
    100: 620, 125: 800, 150: 980, 200: 1500, 250: 2200, 300: 2900 };
  var MANIFOLD_PRICE = { 25: 600, 32: 800, 40: 1000, 50: 1400, 65: 1900, 80: 2400, 100: 3100,
    125: 4200, 150: 5200, 200: 7500, 250: 9800, 300: 12500, 400: 18000 };
  // 按功率升序排列（对象数字键会被引擎重排，故用数组）
  var PUMP_PRICE = [[1.5, 1800], [2.2, 2200], [3, 2600], [4, 3100], [5.5, 3600], [7.5, 4500],
    [11, 6000], [15, 7800], [18.5, 9200], [22, 10500], [30, 13000], [37, 16000], [45, 18000],
    [55, 21000], [75, 27000], [90, 32000]];
  var TANK_PRICE_PER_M2 = 800;
  var PRESSURE_TANK_PRICE = { 24: 850, 50: 1250, 100: 1900, 150: 2500, 200: 3100, 300: 3900,
    500: 5200, 1000: 8500, 2000: 14000, 3000: 19000 };
  var WELD_STEEL_PRICE = { 50: 65, 65: 85, 80: 105, 100: 140, 125: 180, 150: 220, 200: 300,
    250: 390, 300: 480, 350: 580, 400: 680, 450: 790, 500: 900, 600: 1150, 700: 1400, 800: 1700, 1000: 2400 };
  var CLEANOUT_PRICE = { 50: 35, 75: 45, 100: 58, 125: 75, 150: 95 };
  var FIRE_RING_PRICE = { 50: 28, 75: 35, 110: 45, 160: 60 };

  var HEATER_OPTS = [
    { k: 'RS15', l: '电热水器 RS15 挂式', q: '8-959', qn: '电热水器 挂式 RS15型', price: 1200 },
    { k: 'RS30', l: '电热水器 RS30 挂式', q: '8-960', qn: '电热水器 挂式 RS30型', price: 1800 },
    { k: 'RS50W', l: '电热水器 RS50 挂式', q: '8-961', qn: '电热水器 挂式 RS50型', price: 2600 },
    { k: 'RS50L', l: '电热水器 RS50 立式', q: '8-962', qn: '电热水器 立式 RS50型', price: 3000 },
    { k: 'RS100', l: '电热水器 RS100 立式', q: '8-963', qn: '电热水器 立式 RS100型', price: 5500 },
    { k: 'RS300', l: '电热水器 RS300 立式', q: '8-964', qn: '电热水器 立式 RS300型', price: 15000 },
    { k: 'BOILER', l: '电开水炉 KSA 立式', q: '8-965', qn: '电开水炉 立式 KSA型', price: 4500 }
  ];
  function hasOpts(it) { return it && (it.category === 'heaterElec' || it.category === 'boilerElec'); }
  function opts(it) {
    if (!hasOpts(it)) return [];
    return HEATER_OPTS.map(function (x) { return { k: x.k, l: x.l }; });
  }
  function setOpt(it, k) {
    if (!hasOpts(it)) return;
    it.specialOpt = k;
    it.category = (k === 'BOILER') ? 'boilerElec' : 'heaterElec';
    var d = CATS[it.category];
    it.listCode = d.code; it.listName = d.lname;
  }
  function optLabel(it) {
    var k = it.specialOpt || 'RS50W';
    var o = HEATER_OPTS.filter(function (x) { return x.k === k; })[0];
    return o ? o.l : '';
  }

  function price(it) {
    var c = it.category, dn = it.dn;
    var tier = it.dnTier || dn;

    if (c === 'preInsul') {
      var p1 = PREINSUL_PRICE[tier];
      if (!p1) return null;
      return { price: p1, source: 'market', basis: '直埋式预制保温管 DN' + tier + '：国产中高档市场价（聚氨酯保温+HDPE外护）' + p1 + '元/m（除税）' };
    }
    if (c === 'ppDrain') {
      if (!(dn > 0)) return null;
      var ks = [50, 75, 100, 150];
      function interp(tbl) {
        if (dn <= ks[0]) return tbl[ks[0]];
        for (var i = 0; i < ks.length - 1; i++) {
          if (dn <= ks[i + 1]) {
            var a = ks[i], b = ks[i + 1];
            return tbl[a] + (dn - a) / (b - a) * (tbl[b] - tbl[a]);
          }
        }
        return tbl[150] + (dn - 150) / 50 * (tbl[150] - tbl[100]);
      }
      var pp = r3(interp(PP_PIPE_PRICE)), pf = r3(interp(PP_FIT_PRICE));
      it.mat2 = { name: it.name + '管件', price: pf };
      return { price: pp, source: 'fixed', basis: 'PP排水静音管 DN' + dn + '：管材 ' + pp.toFixed(3) + '元/m、管件 ' + pf.toFixed(3) + '元/m（主人指定价格体系，其余管径按同体系分段折算）' };
    }
    if (c === 'levelGauge') return { price: 542.268, source: 'fixed', basis: '玻璃管（板）液位计 1700mm以内：主人指定主材价542.268元/台' };
    if (c === 'pressGauge') return { price: 47.86, source: 'fixed', basis: '压力表（就地）：主人指定主材价47.86元/台' };
    if (c === 'pressGaugeElec') return { price: 60.503, source: 'fixed', basis: '电接点压力表：主人指定主材价60.503元/台' };
    if (c === 'sensor') return { price: 1239.986, source: 'fixed', basis: '压力传感器：主人指定主材价1239.986元/台' };
    if (c === 'uvLamp') return { price: 3650.468, source: 'fixed', basis: '紫外线消毒器 250*400：主人指定主材价3650.468元/台' };
    if (c === 'flexJoint') {
      var p2 = FLEX_JOINT_PRICE[tier];
      if (!p2) return null;
      return { price: p2, source: 'market', basis: '可曲挠橡胶软接头 DN' + tier + '：信息价缺项，按国产中高档市场价' + p2 + '元/个（除税）' };
    }
    if (c === 'waterMeter') {
      var p3 = WATER_METER_PRICE[tier];
      if (!p3) return null;
      var f = it.meterRemote ? 1.8 : 1;
      var pv = r2(p3 * f);
      return { price: pv, source: 'market',
        basis: '水表 DN' + tier + (it.meterRemote ? '（远传/智能型，按普通水表1.8倍）' : '（旋翼/螺翼式）') + '：市场价' + pv + '元/个（除税）' };
    }
    if (c === 'waterHammer') {
      if (!(tier > 0)) return null;
      var p4 = stepPrice(879.786, 100, tier, 1.2, 0.8);
      return { price: p4, source: 'market', basis: '水锤消除器 DN' + tier + '：以 DN100 879.786 元为基准，每档按 1.2 / 0.8 系数计取，' + p4 + '元/个（除税）' };
    }
    if (c === 'bellMouth') {
      if (!(tier > 0)) return null;
      var p5 = stepPrice(108.454, 150, tier, 1.1, 0.9);
      return { price: p5, source: 'market', basis: '喇叭口 DN' + tier + '：以 DN150 108.454 元为基准，每档按 1.1 / 0.9 系数计取，' + p5 + '元/个（除税）' };
    }
    if (c === 'backflow') {
      if (!(tier > 0)) return null;
      var p6 = stepPrice(238.598, 20, tier, 1.2, 0.8);
      return { price: p6, source: 'market', basis: '倒流防止器 DN' + tier + '：以 DN20 238.598 元为基准，每档按 1.2 / 0.8 系数计取，' + p6 + '元/个（除税）' };
    }
    if (c === 'vacuumBreaker') {
      var p7 = VACUUM_PRICE[tier];
      if (!p7) return null;
      return { price: p7, source: 'market', basis: '真空破坏器 DN' + tier + '：市场价' + p7 + '元/个（除税）' };
    }
    if (c === 'waterTank') {
      if (!(it.tankArea > 0)) return null;
      var pv2 = r2(it.tankArea * TANK_PRICE_PER_M2);
      return { price: pv2, source: 'market',
        basis: '水箱 ' + (it.tankDim || '') + '：表面积' + it.tankArea + '㎡ × 800元/㎡ = ' + pv2 + '元/台（除税）' };
    }
    if (c === 'pressureTank') {
      var volL = it.tankVolL || 100;
      var key = null;
      Object.keys(PRESSURE_TANK_PRICE).forEach(function (k) { if (key === null && volL <= parseFloat(k)) key = k; });
      if (key === null) key = '3000';
      var p8 = PRESSURE_TANK_PRICE[key];
      return { price: p8, source: 'market',
        basis: '气压罐 ' + volL + 'L：按' + key + 'L档市场价' + p8 + '元/台（除税）' + (it.tankVolL ? '' : '（名称未注容积，暂按100L计，请核对）') };
    }
    if (c === 'manifold') {
      var p9 = MANIFOLD_PRICE[tier] || MANIFOLD_PRICE[400];
      return { price: p9, source: 'market', basis: '分集水器 DN' + (tier || 400) + '：市场价' + p9 + '元/台（除税）' };
    }
    if (c === 'pump') {
      var kw = it.pumpKw;
      var p10, bs;
      if (kw) {
        var kk = PUMP_PRICE[PUMP_PRICE.length - 1][0], pv0 = PUMP_PRICE[PUMP_PRICE.length - 1][1];
        for (var pi = 0; pi < PUMP_PRICE.length; pi++) {
          if (kw <= PUMP_PRICE[pi][0]) { kk = PUMP_PRICE[pi][0]; pv0 = PUMP_PRICE[pi][1]; break; }
        }
        p10 = pv0;
        bs = '水泵 ' + kw + 'kW：按' + kk + 'kW档市场价' + p10 + '元/台（除税）';
      } else {
        p10 = 4500;
        bs = '水泵：名称未注功率，暂按 7.5kW（4500元/台）计列，请核对';
      }
      return { price: p10, source: 'market', basis: bs };
    }
    if (c === 'flexSleeve' || c === 'rigidSleeve' || c === 'steelSleeve') {
      var p11 = WELD_STEEL_PRICE[tier];
      if (!p11) return null;
      return { price: p11, source: 'market',
        basis: (c === 'steelSleeve' ? '一般穿墙套管' : '防水套管') + ' DN' + tier + '：焊接钢管市场价' + p11 + '元/个（除税）' };
    }
    if (c === 'washSink') return { price: 650, source: 'market', basis: '洗脸盆（成套）：市场价650元/组（除税）' };
    if (c === 'sewageSink') return { price: 309.735, source: 'fixed', basis: '洗涤盆 单嘴：主人指定主材价309.735元/组' };
    if (c === 'emergencyShower') return { price: 1500, source: 'market', basis: '紧急喷淋（复合式洗眼器）：市场价1500元/组（除税）' };
    if (c === 'heaterElec' || c === 'boilerElec') {
      var k2 = it.specialOpt || (c === 'boilerElec' ? 'BOILER' : 'RS50W');
      var o = HEATER_OPTS.filter(function (x) { return x.k === k2; })[0] || HEATER_OPTS[0];
      return { price: o.price, source: 'market', basis: o.l + '：市场价' + o.price + '元/台（除税）' };
    }
    if (c === 'floorCleanout') {
      var p12 = CLEANOUT_PRICE[tier] || CLEANOUT_PRICE[100];
      return { price: p12, source: 'market', basis: '地面扫除口 DN' + (tier || 100) + '：市场价' + p12 + '元/个（除税）' };
    }
    if (c === 'fireRing') {
      var p13 = FIRE_RING_PRICE[tier] || FIRE_RING_PRICE[110];
      return { price: p13, source: 'market', basis: '排水管阻火圈 管外径' + (tier || 110) + '：市场价' + p13 + '元/个（除税）' };
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // 项目特征 / 规格 / 类型 / 核对提示
  // ---------------------------------------------------------------------------
  function feature(it) {
    var d = CATS[it.category] || {};
    var f = ['名称:' + it.name, '类型:' + (d.label || '')];
    var tier = it.dnTier || it.dn;
    if (!tier && (it.category === 'floorCleanout' || it.category === 'fireRing')) {
      var qf = matchQuota(it);
      if (qf && qf.dnTier) tier = qf.dnTier;
    }
    if (it.category === 'preInsul') {
      f.push('规格:DN' + tier, '结构:工作管+聚氨酯保温层+HDPE外护管', '连接形式:焊接', '其他:' + d.work);
    } else if (it.category === 'ppDrain') {
      f.push('规格:De' + tier, '连接形式:粘接', '输送介质:' + (it.isRain ? '雨水' : '排水'), '主材:管材+管件双主材', '其他:' + d.work);
    } else if (it.category === 'waterTank') {
      f.push('规格:' + (it.tankDim || '—') + (it.tankVol ? '（' + it.tankVol + 'm³）' : ''), '材质:不锈钢/组合式水箱', '其他:' + d.work);
    } else if (it.category === 'pump') {
      f.push('规格:' + (it.pumpKw ? it.pumpKw + 'kW' : '—'), '配套:控制柜（2-303 同期小屏控制箱）', '其他:' + d.work);
    } else if (it.category === 'heaterElec' || it.category === 'boilerElec') {
      f.push('型号:' + optLabel(it), '其他:' + d.work);
    } else if (it.category === 'flexSleeve' || it.category === 'rigidSleeve' || it.category === 'steelSleeve') {
      f.push('规格:DN' + tier, '材质:焊接钢管', '其他:' + d.work);
    } else if (it.category === 'floorCleanout' || it.category === 'fireRing') {
      f.push('规格:DN' + tier, '其他:' + d.work);
    } else if (it.category === 'manifold') {
      f.push('规格:DN' + (tier || 400), '其他:' + d.work);
    } else if (it.category === 'pressureTank') {
      f.push('规格:' + (it.tankVolL ? it.tankVolL + 'L' : '罐体直径400mm以内'), '其他:' + d.work);
    } else if (it.category === 'waterMeter') {
      f.push('规格:DN' + tier, '型式:' + (it.meterRemote ? '远传水表' : '普通水表'), '其他:' + d.work);
    } else if (it.category === 'sensor' || it.category === 'uvLamp' || it.category === 'levelGauge' || it.category === 'pressGauge' || it.category === 'pressGaugeElec') {
      f.push('其他:' + d.work);
    } else {
      f.push('规格:' + (tier ? 'DN' + tier : '—'), '其他:' + d.work);
    }
    return f.join('；');
  }

  function spec(it) {
    var c = it.category;
    var tier = it.dnTier || it.dn;
    if (c === 'waterTank') return it.tankDim ? (it.tankDim + '（' + it.tankVol + 'm³）') : '—';
    if (c === 'pump') return it.pumpKw ? it.pumpKw + 'kW' : '—';
    if (c === 'pressureTank') return it.tankVolL ? it.tankVolL + 'L' : 'DN400以内';
    if (c === 'sensor') return '压力传感器';
    if (c === 'uvLamp') return '250*400 湿式';
    if (c === 'levelGauge') return '管（板）长度1700mm以内';
    if (c === 'pressGauge') return '就地 0~1.6MPa';
    if (c === 'pressGaugeElec') return '电接点 0~1.6MPa';
    if (c === 'heaterElec' || c === 'boilerElec') return optLabel(it);
    if (c === 'manifold') return tier ? 'DN' + tier : 'DN400以内';
    if (c === 'ppDrain') return tier ? 'De' + tier : '—';
    if (c === 'waterMeter' && it.meterRemote) return tier ? 'DN' + tier + ' 远传' : '远传';
    if (!tier && (it.category === 'floorCleanout' || it.category === 'fireRing')) {
      var qd = matchQuota(it);
      if (qd && qd.dnTier) tier = qd.dnTier;
    }
    return tier ? 'DN' + tier : '—';
  }

  function typeLabel(it) {
    var d = CATS[it && it.category];
    return d ? d.type : '管道';
  }

  function warn(it, quota) {
    var w = [];
    var c = it.category;
    var tier = it.dnTier || it.dn;
    var q = quota || {};
    if (q.needDn) w.push('名称未识别到公称直径，请在名称中补充 DN/De 规格');
    if (it.category === 'waterTank') {
      if (!(it.tankVol > 0)) w.push('名称未识别水箱尺寸（如 3000*5000*4000，单位mm），已按 3m³ 档计列，请核对');
      else w.push('水箱容量按名称尺寸折算 ' + it.tankVol + 'm³（表面积 ' + it.tankArea + '㎡ × 800元/㎡），容量档位按 3/5/10/15/20/30/40/60m³ 取定，请对照基价表核对');
    }
    if (c === 'pump') {
      w.push('泵已按 1-690（设备质量0.2t以内）＋2-303 同期小屏控制箱（含控制柜主材）两个定额计列，控制柜按每台1台计，请按实际配电调整');
      if (/消防泵|喷淋泵|稳压泵/.test(it.name)) w.push('名称含消防泵类，本站按变频给水设备＋单机离心泵口径套用，如为消防专用泵请核对清单编码');
    }
    if (c === 'flexSleeve' || c === 'rigidSleeve') {
      w.push('防水套管已按「制作（含焊接钢管主材）＋安装（无主材）」两个定额计列');
      if (quota && quota.dnTier && SLEEVE_INST.indexOf(quota.dnTier) < 0) w.push('安装定额档位按就近档取定，请对照基价表核对');
    }
    if (c === 'steelSleeve') w.push('一般穿墙套管按制作安装一个定额计列，主材为焊接钢管市场价');
    if (c === 'waterMeter' && it.meterRemote) w.push('识别为远传/智能水表，主材按普通水表1.8倍计列，请按实际品牌核对');
    if (c === 'waterHammer') w.push('水锤消除器主材以 DN100 879.786 元为基准按 1.2/0.8 系数逐档推算，请核对');
    if (c === 'bellMouth') w.push('喇叭口主材以 DN150 108.454 元为基准按 1.1/0.9 系数逐档推算，请核对');
    if (c === 'backflow') w.push('倒流防止器主材以 DN20 238.598 元为基准按 1.2/0.8 系数逐档推算，请核对');
    if (c === 'vacuumBreaker') w.push('真空破坏器按阀门清单定额口径套用，主材为市场价，请核对');
    if (c === 'floorCleanout' && q.defDn) w.push('名称未注尺寸，已按 DN100（8-947）计列');
    if (c === 'fireRing' && q.defDn) w.push('名称未注尺寸，已按管外径110mm（8-810）计列');
    if (c === 'heaterElec' || c === 'boilerElec') w.push('电热水器/电开水炉可在「选型」列切换（RS15~RS300 / KSA 立式）');
    if (c === 'washSink') w.push('洗手池/刷手池按洗脸盆（8-839 钢管组成冷热水）计列，感应式为 8-846，请核对');
    if (c === 'pressureTank' && !it.tankVolL) w.push('名称未注容积（如 100L），暂按 100L 档计列，请核对');
    return w.join('；');
  }

  return {
    CATS: CATS,
    catOf: catOf,
    catOfRaw: catOfRaw,
    isCat: isCat,
    setNative: setNative,
    buildItem: buildItem,
    matchQuota: matchQuota,
    extras: extras,
    price: price,
    feature: feature,
    spec: spec,
    typeLabel: typeLabel,
    warn: warn,
    hasOpts: hasOpts,
    opts: opts,
    setOpt: setOpt,
    optLabel: optLabel,
    parseDn: parseDn,
    parseTankDims: parseTankDims,
    _tables: {
      PINS: PINS, PPDRAIN: PPDRAIN, WM_THREAD: WM_THREAD, WM_FLANGE: WM_FLANGE,
      WH_THREAD: WH_THREAD, WH_FLANGE: WH_FLANGE, TANK_CAP: TANK_CAP,
      SLEEVE_MAKE: SLEEVE_MAKE, SLEEVE_INST: SLEEVE_INST, STEEL_SLEEVE: STEEL_SLEEVE,
      CLEANOUT_DN: CLEANOUT_DN, FIRE_RING_DN: FIRE_RING_DN, HEATER_OPTS: HEATER_OPTS
    }
  };
});
