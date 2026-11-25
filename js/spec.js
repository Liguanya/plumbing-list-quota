/* ============================================================
 * 图纸说明解析引擎（给排水专业）
 * ------------------------------------------------------------
 * 职责：
 *   1. 文本提取：PDF（pdf.js 文字层）/ DXF / DWG（二进制启发式）/ TXT
 *   2. 关键信息抽取：管材、系统（给水/排水/雨水…）、连接方式、
 *      安装部位、管径范围、试验与措施要求
 *   3. 说明规则 → 工程量清单行的匹配（材质 + 管径条件 + 介质 + 部位）
 * 全部在浏览器本地完成，不上传任何文件。
 * ============================================================ */
(function (global) {
  'use strict';

  var VERSION = '1.3.0';

  /* ==================== 词典 ==================== */

  // 管材：顺序即优先级，先具体后宽泛
  var MATERIALS = [
    { key: 'pvdf', label: 'PVDF（聚偏二氟乙烯）', re: /PVDF|聚偏二氟乙烯/i },
    { key: 'pb', label: 'PB（聚丁烯）', re: /PB\s*管|聚丁烯/i },
    { key: 'ppr', label: 'PP-R（聚丙烯）', re: /PP-?R|聚丙烯/i },
    // 复合管必须排在 PE 之前：「钢丝网骨架PE复合给水管」含 PE 字样但属复合管
    { key: 'composite', label: '钢塑/钢网复合管', re: /钢塑|铝塑|衬塑|涂塑|钢骨架|钢丝网骨架|钢网骨架|复合管/ },
    { key: 'pe', label: 'PE（聚乙烯）', re: /HDPE|聚乙烯|(?<![A-Za-z])PE(?![A-Za-z])/i },
    { key: 'pvc', label: 'PVC-U（聚氯乙烯）', re: /UPVC|U-PVC|PVC|聚氯乙烯/i },
    { key: 'stainless', label: '不锈钢管', re: /不锈钢/ },
    { key: 'galv', label: '镀锌钢管', re: /镀锌/ },
    { key: 'cast', label: '铸铁管', re: /铸铁/ },
    { key: 'copper', label: '铜管', re: /铜管|紫铜/ },
    { key: 'steel', label: '焊接钢管', re: /无缝钢管|焊接钢管|碳钢管/ },
    { key: 'frp', label: '玻璃钢管', re: /玻璃钢|FRP/i }
  ];

  // 连接方式：顺序即优先级（沟槽/电熔/热熔须先于宽泛的“焊”“承插”）
  var JOINTS = [
    { key: 'groove', label: '沟槽连接（卡箍）', re: /沟槽|卡箍/ },
    { key: 'nut', label: '螺母密封圈连接', re: /螺母密封圈|密封圈连接|橡胶圈密封|橡胶密封圈|螺母压紧/ },
    { key: 'electro', label: '电熔连接', re: /电熔|电热熔/ },
    { key: 'fusion', label: '热熔连接', re: /热熔/ },
    { key: 'glue', label: '粘接', re: /粘接|胶粘|溶剂粘接|承插粘接/ },
    { key: 'press', label: '卡压连接', re: /卡压|卡套|环压/ },
    { key: 'argon', label: '承插氩弧焊', re: /氩弧焊/ },
    { key: 'braze', label: '钎焊', re: /钎焊/ },
    { key: 'arc', label: '对接电弧焊', re: /电弧焊/ },
    { key: 'weld', label: '焊接', re: /焊接|焊口|满焊/ },
    { key: 'thread', label: '螺纹连接', re: /螺纹|丝扣|丝接/ },
    { key: 'flange', label: '法兰连接', re: /法兰/ },
    { key: 'sleeve', label: '卡套连接', re: /卡套(?!连接)/ },
    { key: 'oxy', label: '氧乙炔焊', re: /氧乙炔|气焊/ },
    { key: 'rubber', label: '胶圈接口', re: /胶圈接口|橡胶圈|胶圈承插|橡胶圈承插/ },
    { key: 'asbestos', label: '石棉水泥接口', re: /石棉水泥/ },
    { key: 'cement', label: '水泥接口', re: /水泥捻口|水泥接口/ }
  ];

  // 系统 / 介质
  var SYSTEMS = [
    { key: 'rain', label: '雨水系统', medium: 'rain', re: /雨水/ },
    { key: 'cond', label: '冷凝水系统', medium: 'drain', re: /冷凝水|凝结水/ },
    { key: 'drain', label: '生活排水系统', medium: 'drain', re: /排水|污水|废水|污废/ },
    { key: 'reclaim', label: '中水系统', medium: 'water', re: /中水|再生水/ },
    { key: 'fire', label: '消防系统', medium: 'fire', re: /消火栓|喷淋|消防/ },
    { key: 'gas', label: '燃气系统', medium: 'gas', re: /燃气|煤气|天然气|液化气/ },
    { key: 'water', label: '生活给水系统', medium: 'water', re: /给水|冷水|热水|直饮水|回水|补水/ }
  ];

  // 措施 / 试验要求
  var MEASURES = [
    { key: 'test', label: '水压试验', re: /水压试验|打压|压力试验/ },
    { key: 'disinfect', label: '消毒冲洗', re: /消毒|冲洗/ },
    { key: 'floodTest', label: '灌水/通球试验', re: /灌水试验|闭水试验|通球/ },
    { key: 'sleeve', label: '套管', re: /套管/ },
    { key: 'insulation', label: '保温/防结露', re: /保温|防结露|绝热/ },
    { key: 'support', label: '管道支架', re: /支架|管卡|吊架|托架/ },
    { key: 'anticorrosion', label: '防腐刷漆', re: /防腐|防锈|刷漆|银粉/ },
    { key: 'penetration', label: '穿墙穿板', re: /穿墙|穿楼板|穿板|穿基础/ }
  ];

  /* ==================== 造价要点词典 ==================== */
  // 说明里真正决定造价的不是「哪根管子用什么连接」，而是这些成块的钱：
  // 拆除清运、抗震支架、设备供货、不含项边界、保温套管、试验要求。
  // level: critical 漏了就是大钱 / important 影响单价 / normal 影响做法
  var POINTS = [
    {
      key: 'demolish', level: 'critical', label: '拆除与清运',
      re: /拆除|拆改|拆换|清运|废料|废弃|原系统|原有.{0,8}(拆除|更换|废除)|剔凿|剔槽/,
      prefer: /(?:管道|设备|附件|箱|管线|系统|阀门|洁具)[^。；]{0,10}(?:拆除|拆改|拆换)|(?:拆除|拆改|拆换)[^。；]{0,10}(?:管道|设备|附件|箱|管线|系统|阀门|洁具)|废料[^。；]{0,8}清运|垃圾[^。；]{0,6}外运|拆除[^。；]{0,6}(?:造价|费用|清运)/,
      hint: '改造项目最大的隐形项：拆除人工、垃圾外运、成品保护通常不在管道定额内，须单列。',
      listRe: /拆除|清运|垃圾|剔凿|拆改/
    },
    {
      key: 'seismic', level: 'critical', label: '抗震支吊架',
      re: /抗震|支吊架|侧向支撑|纵向支撑|侧向[^。；]{0,10}(?:间距|支架|支撑)|纵向[^。；]{0,10}(?:间距|支架|支撑)|(?:间距|参数)[^。；]{0,10}(?:一半|减半)/,
      hint: '抗震支架是独立清单项（按 kg 或套计）。注意改建工程间距常为新建的一半，数量翻倍。',
      listRe: /抗震|支吊架/,
      detail: function (t) {
        var d = [];
        var dn = t.match(/(?:不小于|大于等于|≥|>)\s*D\s*N\s*(\d+)/i) || t.match(/D\s*N\s*(\d+)\s*(?:以上|及以上)/i);
        if (dn) d.push('起设管径 DN' + dn[1]);
        // OCR 常把「24」拆成「2 4」，数字内部允许空白，取到后清掉
        var lat = t.match(/侧\s*向[^。；]{0,26}?(\d[\d\s]*(?:\.\s*\d+)?)\s*(?:米|m(?![a-z])|M)/);
        var lon = t.match(/纵\s*向[^。；]{0,26}?(\d[\d\s]*(?:\.\s*\d+)?)\s*(?:米|m(?![a-z])|M)/);
        var rebuild = /改建|改造|加固/.test(t);
        if (lat) d.push('侧向间距 ' + (rebuild ? '按新建 ' : '') + lat[1].replace(/\s/g, '') + 'm');
        if (lon) d.push('纵向间距 ' + (rebuild ? '按新建 ' : '') + lon[1].replace(/\s/g, '') + 'm');
        if (rebuild) d.push('本工程为改建，实际间距取上述的一半');
        return d.length ? d.join(' · ') : null;
      }
    },
    {
      key: 'equipment', level: 'critical', label: '设备供货',
      re: /水泵|水箱(?!间)|热泵|机组|消毒器|气压罐|换热器|热水器|开水器|变频|稳压|隔膜罐|膨胀罐|水处理/,
      prefer: /[QHN]\s*[=＝]|\d+(?:\.\d+)?\s*kW|(?:容积|有效容积|流量|扬程|功率)\s*[:：]?\s*\d|(?:台|套)\s*[×x*]?\s*\d/,
      hint: '设备单价占比最高。核对参数（流量/扬程/功率/容积）与数量是否与清单一致，避免规格降档。',
      listRe: /泵|水箱|机组|消毒器|罐|换热|热水器|开水器|变频|稳压/,
      detail: function (t) {
        var d = [];
        var q = t.match(/Q\s*[=＝]\s*(\d+(?:\.\d+)?)\s*m[³3]?\s*\/\s*h/i);
        if (q) d.push('Q=' + q[1] + 'm³/h');
        var h = t.match(/H\s*[=＝]\s*(\d+(?:\.\d+)?)\s*m(?![a-z])/i);
        if (h) d.push('H=' + h[1] + 'm');
        var n = t.match(/N\s*[=＝]\s*(\d+(?:\.\d+)?)\s*kW/i);
        if (n) d.push('N=' + n[1] + 'kW');
        var v = t.match(/(?:容积|有效容积)\s*(\d+(?:\.\d+)?)\s*(?:m[³3]|吨|t|L|升)/i);
        if (v) d.push('容积 ' + v[1]);
        return d.length ? d.join(' · ') : null;
      }
    },
    {
      key: 'exclusion', level: 'critical', label: '不含项 / 另行委托',
      re: /不含|不在.{0,10}(范围|本次)|另行|专项设计|由.{0,12}(采购|供货|深化|负责方)|本次不|暂不|不在本次/,
      hint: '范围边界。说明写「不含」的，清单里若出现要警惕重复计价；写「另行委托」的，别算进本次报价。',
      listRe: null
    },
    {
      key: 'insulation', level: 'important', label: '保温绝热',
      re: /保温|绝热|防结露|橡塑|玻璃棉|离心玻璃棉|聚氨酯|岩棉/,
      prefer: /(?:保温|绝热)[^。；]{0,14}(?:厚度|δ|\d+\s*mm|\d+\s*kg)|橡塑[^。；]{0,10}(?:mm|厚)|玻璃棉[^。；]{0,10}(?:mm|厚|密度)/,
      hint: '保温要核三件事：材质、厚度、密度。清单只写「保温」不写厚度时单价差一倍以上。',
      listRe: /保温|绝热|橡塑|玻璃棉|岩棉|聚氨酯/,
      detail: function (t) {
        // 按句分别抓，避免橡塑的厚度和玻璃棉的密度串成一条
        var parts = String(t).split('；');
        var mats = [
          { n: '橡塑', re: /橡塑/ },
          { n: '玻璃棉', re: /玻璃棉/ },
          { n: '岩棉', re: /岩棉/ },
          { n: '聚氨酯', re: /聚氨酯/ }
        ];
        var out = [];
        mats.forEach(function (m) {
          var hit = null;
          parts.forEach(function (x) { if (!hit && m.re.test(x)) hit = x; });
          if (!hit) return;
          var d = [m.n];
          var th = hit.match(/(?:厚度|δ\s*[=＝]?)\s*(\d+(?:\.\d+)?)\s*mm/i) || hit.match(/(\d+(?:\.\d+)?)\s*mm\s*(?:厚|橡塑|玻璃棉|岩棉)/);
          if (th) d.push('厚 ' + th[1] + 'mm');
          var den = hit.match(/(\d+(?:\.\d+)?)\s*kg\s*\/\s*m[³3]/i);
          if (den) d.push('密度 ' + den[1] + 'kg/m³');
          out.push(d.join(' '));
        });
        return out.length ? out.join(' · ') : null;
      }
    },
    {
      key: 'penetration', level: 'important', label: '套管与防火封堵',
      re: /套管|防水套管|阻火圈|防火封堵|穿墙|穿楼板|穿板|穿基础|密闭套管/,
      notRe: /石英套管|石英玻璃套管|套管换热|套管式/,
      hint: '套管、阻火圈、封堵多数定额不含或另计。刚性防水套管与一般钢套管单价差数倍，要分清。',
      listRe: /套管|阻火圈|封堵/,
      detail: function (t) {
        var d = [];
        if (/柔性防水套管/.test(t)) d.push('柔性防水套管');
        else if (/刚性防水套管/.test(t)) d.push('刚性防水套管');
        else if (/防水套管/.test(t)) d.push('防水套管');
        else if (/套管/.test(t)) d.push('一般套管');
        if (/阻火圈/.test(t)) d.push('阻火圈');
        if (/防火封堵/.test(t)) d.push('防火封堵');
        return d.length ? d.join(' · ') : null;
      }
    },
    {
      key: 'test', level: 'important', label: '试压 / 冲洗 / 消毒',
      re: /水压试验|打压|压力试验|灌水试验|闭水试验|通球|冲洗(?!阀|头|嘴|水箱|设备|水量|方式)|消毒|水质/,
      prefer: /水压试验|打压|压力试验|灌水试验|闭水试验|通球|试验压力|冲洗消毒|冲洗流速/,
      hint: '给水须冲洗消毒并取样检验，排水须灌水通球。先确认是否已含在管道定额工作内容里，别重复计。',
      listRe: /试验|冲洗|消毒|通球|水质/,
      detail: function (t) {
        var d = [];
        var p = t.match(/(\d+(?:\.\d+)?)\s*(?:MPa|兆帕)/i);
        if (p) d.push('试验压力 ' + p[1] + 'MPa');
        if (/灌水试验|闭水试验/.test(t)) d.push('灌水/闭水');
        if (/通球/.test(t)) d.push('通球');
        if (/冲洗/.test(t)) d.push('冲洗');
        if (/消毒/.test(t)) d.push('消毒');
        return d.length ? d.join(' · ') : null;
      }
    },
    {
      key: 'support', level: 'important', label: '管道支架',
      re: /支架|管卡|吊架|托架|固定支架|滑动支架|支墩/,
      notRe: /抗震支吊架|抗震支架|抗震加固|侧向支撑|纵向支撑|抗震设防/,
      hint: '支架形式与间距决定用量。注意「抗震支架」与「承重支架」是两笔钱，别混为一谈。',
      listRe: /支架|管卡|吊架|托架|支墩/,
      detail: function (t) {
        var d = [];
        var sp = t.match(/(?:间距|不大于|不超过)\s*(\d+(?:\.\d+)?)\s*(?:米|m(?![a-z])|M)/);
        if (sp) d.push('间距 ' + sp[1] + 'm');
        if (/固定支架/.test(t)) d.push('含固定支架');
        return d.length ? d.join(' · ') : null;
      }
    },
    {
      key: 'anticorrosion', level: 'normal', label: '防腐与刷漆',
      re: /防腐|防锈|刷漆|银粉|防锈漆|镀锌层|四油|三布/,
      hint: '埋地管、支架、非镀锌件的防腐做法影响单价，注意「几油几布」这类具体做法。',
      listRe: /防腐|防锈|刷漆|银粉/,
      detail: function (t) {
        var m = t.match(/([一二三四五])\s*油\s*([一二三四五])\s*布/);
        return m ? (m[1] + '油' + m[2] + '布') : null;
      }
    },
    {
      key: 'boundary', level: 'important', label: '管材分界 / 界面划分',
      re: /以.{0,16}为界|分界|界面|出户|进户|接户井|检查井前|由.{0,8}至.{0,8}(接|供)/,
      prefer: /以[^。；]{0,18}为界|分界|界面划分|出户[^。；]{0,10}(?:检查井|管材|分界)|进户[^。；]{0,10}(?:管材|分界|阀门)/,
      hint: '分界点决定哪段算室内、哪段算室外，两侧定额与单价完全不同。清单按室内外混编时要按界拆分。',
      listRe: null
    },
    {
      key: 'metering', level: 'normal', label: '计量与远传',
      re: /水表|计量|远传|能耗监测|分户|分级计量/,
      hint: '远传水表与普通水表价差明显，且常单列。',
      listRe: /水表|计量/
    },
    {
      key: 'waterquality', level: 'normal', label: '水质处理',
      notRe: /不含|不在本次|暂不|另行/, 
      re: /软化|除垢|过滤|紫外线|银离子|消毒设备|纯水|直饮水|RO/,
      hint: '水处理设备与耗材常被漏，尤其消毒器、过滤器。',
      listRe: /软化|过滤|消毒|纯水|净水|直饮水/
    }
  ];

  var POINT_RANK = { critical: 0, important: 1, normal: 2 };

  // 从全文中抽取造价要点：每类命中的句子按信息密度排序，取最短的两句作依据
  // 句子信息量打分：越像「带具体参数的规定句」分越高，越像标题句或 OCR 噪声分越低。
  // 只按长度排序会把「石英套管」「5.1.5给水计量」这类短噪声当成依据，必须打分。
  function scoreSent(s) {
    var t = s.replace(/\s+/g, '');
    var len = t.length, sc = 0;
    if (len < 10) sc -= 4;
    else if (len < 16) sc -= 2;
    else if (len <= 95) sc += 2;
    else if (len <= 260) sc -= 1;
    else sc -= 10;   // OCR 常把整页粘成一句，这种段落无法作为依据
    if (/\d/.test(t)) sc += 2;
    if (/DN\s*\d|\d+\s*(?:kW|KW|MPa|mm|m³|m3|L\/s|kg\/m|℃|米|t(?![a-z])|m(?![a-z]))/i.test(t)) sc += 3;
    if (/采用|应|须|不小于|不大于|不得|要求|按.{0,6}(规定|规范|标准)/.test(t)) sc += 1;
    // 中文占比过低 → OCR 拆字或规范编号堆砌，不是可用依据
    var cn = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
    var ratio = len ? cn / len : 0;
    if (ratio < 0.45) sc -= 6;
    else if (ratio < 0.6) sc -= 2;
    return sc;
  }

  function extractPoints(text) {
    var out = [];
    var sents = splitSentences(text);
    POINTS.forEach(function (p) {
      var hits = [], seen = {};
      sents.forEach(function (s) {
        if (!p.re.test(s) || (p.notRe && p.notRe.test(s))) return;
        var k = s.replace(/\s+/g, '');
        if (seen[k]) return;
        seen[k] = 1;
        hits.push(s);
      });
      if (!hits.length) return;
      // 按信息量降序；同分时取较短的（更聚焦）
      hits.sort(function (a, b) {
        var sa = scoreSent(a) + (p.prefer && p.prefer.test(a) ? 5 : 0);
        var sb = scoreSent(b) + (p.prefer && p.prefer.test(b) ? 5 : 0);
        var d = sb - sa;
        return d !== 0 ? d : a.length - b.length;
      });
      // detail 的输入放宽到前 8 句，避免关键参数句被挤掉
      var joined = hits.slice(0, 8).join('；');
      out.push({
        key: p.key,
        label: p.label,
        level: p.level,
        hint: p.hint,
        count: hits.length,
        detail: p.detail ? p.detail(joined) : null,
        evidence: (function () {
          var pick = hits.filter(function (s) { return s.replace(/\s+/g, '').length <= 260; });
          if (!pick.length) pick = hits;
          return pick.slice(0, 2).map(function (s) {
            var t = s.replace(/\s+/g, ' ').trim();
            return t.length > 108 ? t.slice(0, 108) + '…' : t;
          });
        })()
      });
    });
    out.sort(function (a, b) {
      var d = POINT_RANK[a.level] - POINT_RANK[b.level];
      return d !== 0 ? d : b.count - a.count;
    });
    return out;
  }

  // 连接方式 → 材质族（用于无材质说明句的兜底）
  var PLASTIC_JOINTS = { fusion: 1, electro: 1, glue: 1, nut: 1 };
  var METAL_JOINTS = { groove: 1, weld: 1, arc: 1, argon: 1, braze: 1, thread: 1, flange: 1, press: 1, sleeve: 1, oxy: 1, rubber: 1, asbestos: 1, cement: 1 };
  var PLASTIC_MATS = { pvdf: 1, pe: 1, ppr: 1, pb: 1, pvc: 1 };

  /* ==================== 基础工具 ==================== */

  function normalize(t) {
    return String(t || '')
      .replace(/\u3000/g, ' ')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // 按分隔符切分，但跳过括号内的分隔符（如「（给水S5级；热水S2级）」不能被切开）
  function splitOutside(text, sepRe) {
    var src = String(text), out = [], buf = '', depth = 0;
    for (var i = 0; i < src.length; i++) {
      var ch = src.charAt(i);
      if (ch === '（' || ch === '(' || ch === '【' || ch === '《') depth++;
      else if (ch === '）' || ch === ')' || ch === '】' || ch === '》') depth = depth > 0 ? depth - 1 : 0;
      if (depth === 0 && sepRe.test(ch)) { out.push(buf); buf = ''; }
      else buf += ch;
    }
    out.push(buf);
    return out.map(function (x) { return x.trim(); }).filter(Boolean);
  }

  // 图纸说明里的换行大多是排版/文字实体边界，不是语义边界：
  // 「均采用PP-R管」与「接口为热熔连接」常分处两行，按行硬切会把材质与连接方式割裂。
  // 因此句子只按 。；; 切，换行在段落内合并。
  function splitSentences(text) {
    return splitOutside(normalize(text), /[。；;]/)
      .filter(function (x) { return x.replace(/\s/g, '').length >= 4; });
  }

  function splitClauses(sentence) {
    return splitOutside(sentence, /[，,、：:]/);
  }

  // 编号/小标题行：1.1、1.1.1、一、、（1）、以及「给水系统：」这类短标题
  function isHeading(t) {
    var s = String(t).trim();
    if (!s || s.length > 40) return false;
    if (/^\d+(\.\d+)*[\s、.．]/.test(s)) return true;
    if (/^[一二三四五六七八九十]+[、.．]/.test(s)) return true;
    if (/^[（(]\d+[）)]/.test(s)) return true;
    if (s.length <= 26 && /[：:]$/.test(s)) return true;
    return false;
  }

  // 切成「标题 + 正文行」的段落，标题携带的系统/介质供后文继承
  function splitSections(text) {
    var lines = normalize(text).split('\n');
    var secs = [], cur = { title: '', lines: [] };
    function flush() {
      if (cur.title || cur.lines.length) secs.push(cur);
      cur = { title: '', lines: [] };
    }
    lines.forEach(function (ln) {
      var t = ln.trim();
      if (!t) { flush(); return; }
      if (isHeading(t)) { flush(); cur.title = t; return; }
      cur.lines.push(t);
    });
    flush();
    return secs;
  }

  // 段落正文按长度分块，避免整章合并成一个超长块导致跨段错配
  function chunkLines(lines, limit) {
    var out = [], buf = [], len = 0;
    lines.forEach(function (ln) {
      if (buf.length && (len + ln.length) > limit) { out.push(buf.join('\n')); buf = []; len = 0; }
      buf.push(ln);
      len += ln.length + 1;
    });
    if (buf.length) out.push(buf.join('\n'));
    return out;
  }

  // 行是文字实体边界，行内再按标点切：DWG 说明常整行无标点，只按逗号切会把整段并成一个 token
  // 同时保留字符位置，便于把「依据」定位到命中处而不是整段开头
  function tokensOfChunk(body) {
    var src = String(body), out = [], depth = 0, start = 0;
    for (var i = 0; i <= src.length; i++) {
      var ch = i < src.length ? src.charAt(i) : '\n';
      if (ch === '（' || ch === '(') depth++;
      else if (ch === '）' || ch === ')') depth = depth > 0 ? depth - 1 : 0;
      if (depth === 0 && /[。；;，,、：:\n]/.test(ch)) {
        var seg = src.slice(start, i).trim();
        if (seg) out.push({ text: seg, idx: start });
        start = i + 1;
      }
    }
    return out;
  }

  // 这些词表示「换了一类管段」，此前的部位/管径条件不应再往下继承
  var SEG_RESET = /干管|立管|支管|横管|总管|机组|设备间|机房|泵房/;

  function firstHit(list, text) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].re.test(text)) return list[i];
    }
    return null;
  }

  function firstJoint(clause) {
    // 「焊接钢管」是材质不是连接方式，先剔除
    var s = String(clause).replace(/焊接钢管|无缝钢管|电焊钢管/g, '');
    for (var i = 0; i < JOINTS.length; i++) {
      if (JOINTS[i].re.test(s)) return JOINTS[i];
    }
    return null;
  }

  function jointFamily(key) {
    if (PLASTIC_JOINTS[key]) return 'plastic';
    if (METAL_JOINTS[key]) return 'metal';
    return null;
  }

  function normMat(key) {
    if (!key) return '';
    if (key === 'pvcDrain') return 'pvc';
    return key;
  }

  function familyOfMat(key) {
    return PLASTIC_MATS[normMat(key)] ? 'plastic' : (key ? 'metal' : null);
  }

  // 管径分档条件：支持「DN≥100」「≥DN65」「DN<100」「DN65（70）」「DN80及以下」「不大于」等写法
  function dnCondOf(s) {
    var t = String(s), m;
    m = t.match(/(?:DN|De|dn|de|Φ|φ)\s*(≥|>=|≤|<=|>|＞|<|＜)\s*(\d{2,4})/);
    if (m) {
      var op = /≥|>=/.test(m[1]) ? 'ge' : (/≤|<=/.test(m[1]) ? 'le' : (/[>＞]/.test(m[1]) ? 'gt' : 'lt'));
      return { op: op, val: parseInt(m[2], 10) };
    }
    m = t.match(/(?:≥|>=|不小于|大于等于|不低于)\s*(?:DN|De|dn|de|Φ|φ)?\s*(\d{2,4})/);
    if (m) return { op: 'ge', val: parseInt(m[1], 10) };
    m = t.match(/(?:≤|<=|不大于|小于等于|不超过)\s*(?:DN|De|dn|de|Φ|φ)?\s*(\d{2,4})/);
    if (m) return { op: 'le', val: parseInt(m[1], 10) };
    m = t.match(/(?:DN|De|dn|de|Φ|φ)\s*(\d{2,4})\s*(?:mm)?\s*(及以上|以上|及以下|以下)/);
    if (m) return { op: /以下/.test(m[2]) ? 'le' : 'ge', val: parseInt(m[1], 10) };
    m = t.match(/(?:>|＞|大于)\s*(?:DN|De|dn|de|Φ|φ)?\s*(\d{2,4})/);
    if (m) return { op: 'gt', val: parseInt(m[1], 10) };
    m = t.match(/(?:<|＜|小于)\s*(?:DN|De|dn|de|Φ|φ)?\s*(\d{2,4})/);
    if (m) return { op: 'lt', val: parseInt(m[1], 10) };
    return null;
  }

  function dnRangeOf(text) {
    var src = String(text);
    var reR = /(?:DN|De|dn|de)\s*(\d{2,4})\s*(?:[~～\-—－]|至)\s*(?:DN|De|dn|de)?\s*(\d{2,4})/gi;
    var mins = [], maxs = [], ev = [], m;
    while ((m = reR.exec(src)) !== null) {
      var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      if (!a || !b) continue;
      mins.push(Math.min(a, b)); maxs.push(Math.max(a, b));
      if (!ev.length) ev.push(m[0]);
    }
    if (mins.length) {
      return {
        min: Math.min.apply(null, mins), max: Math.max.apply(null, maxs),
        evidence: ev[0] + (mins.length > 1 ? ' 等 ' + mins.length + ' 段' : '')
      };
    }
    // 只有「DN50及以下 / DN65及以上」这类分档条件、没有显式区间时，不构成管径范围
    if (/(?:及以上|以上|≥|>=|及以下|以下|≤|<=|不小于|不大于|大于等于|小于等于|[<>＜＞])/.test(text)) return null;
    var all = [], re = /(?:DN|De|dn|de|Φ|φ)\s*(\d{2,4})/gi, mm;
    while ((mm = re.exec(text)) !== null) {
      var v = parseInt(mm[1], 10);
      if (v >= 10 && v <= 2000) all.push(v);
    }
    if (all.length >= 2) {
      return { min: Math.min.apply(null, all), max: Math.max.apply(null, all), evidence: '' };
    }
    return null;
  }

  function clauseLoc(s) {
    if (/室外|户外|外网|庭院|埋地|室外埋地/.test(s)) return 'out';
    if (/室内|楼内|管井|管廊|吊顶内|地库|明装|暗装|暗敷|明敷/.test(s)) return 'in';
    return null;
  }

  function clauseMedium(s) {
    var sys = firstHit(SYSTEMS, s);
    return sys ? sys.medium : null;
  }

  /* ==================== 文本提取 ==================== */

  function readAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error || new Error('读取文件失败')); };
      r.readAsArrayBuffer(file);
    });
  }

  function readAsText(file, enc) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error || new Error('读取文件失败')); };
      r.readAsText(file, enc || 'utf-8');
    });
  }

  function decode(buf, enc) {
    try { return new TextDecoder(enc).decode(new Uint8Array(buf)); } catch (e) { return ''; }
  }

  // PDF：走 pdf.js 文字层
  // 轻量嗅探 PDF 原始字节：只看对象字典里有没有字体、图片，不去物化内容流。
  // 大图纸一页能有几十万条绘图指令，getOperatorList() 会把它们全展开进内存（实测峰值 1.1GB 且不释放），
  // 普通笔记本直接卡死。扫字节是毫秒级、几十 MB 内存的事。
  function sniffPdfBytes(buf) {
    try {
      var u8 = new Uint8Array(buf);
      var dec = new TextDecoder('latin1');
      var hasFont = false, hasImage = false, CH = 65536;
      for (var i = 0; i < u8.length; i += CH) {
        var s = dec.decode(u8.subarray(i, Math.min(i + CH, u8.length)));
        if (!hasFont && s.indexOf('/Font') >= 0) hasFont = true;
        if (!hasImage && (s.indexOf('/Subtype/Image') >= 0 || s.indexOf('/Subtype /Image') >= 0)) hasImage = true;
        if (hasFont && hasImage) break;
      }
      return { font: hasFont, image: hasImage };
    } catch (e) { return null; }
  }

  async function extractPdf(buf) {
    var lib = global.pdfjsLib;
    if (!lib) throw new Error('PDF 解析组件未加载');
    if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
      try {
        lib.GlobalWorkerOptions.workerSrc = new URL('js/pdf.worker.min.js', (global.location && global.location.href) || 'http://localhost/').href;
      } catch (e) {
        lib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
      }
    }
    // 必须在交给 pdf.js 之前扫：它会把 ArrayBuffer transfer 给 worker，之后原 buffer 就 detached 了
    var sn = sniffPdfBytes(buf);
    var doc;
    try {
      doc = await lib.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
    } catch (e) {
      // file:// 或 worker 被拦截时退回主线程解析
      if (lib.GlobalWorkerOptions) lib.GlobalWorkerOptions.workerSrc = '';
      doc = await lib.getDocument({ data: new Uint8Array(buf), useSystemFonts: true, disableWorker: true }).promise;
    }
    var pages = Math.min(doc.numPages, 40);
    var lines = [];
    for (var p = 1; p <= pages; p++) {
      var page = await doc.getPage(p);
      var tc = await page.getTextContent();
      var line = '';
      for (var i = 0; i < tc.items.length; i++) {
        var item = tc.items[i];
        if (item.str === undefined) continue;
        line += item.str;
        if (item.hasEOL) { lines.push(line); line = ''; }
      }
      if (line) lines.push(line);
      lines.push('');
    }
    var text = normalize(lines.join('\n'));
    var empty = text.replace(/\s/g, '').length < 20;
    var diag = null;
    if (empty) {
      // 区分「扫描件」与「文字被转成曲线的矢量化导出件」——两者处理方式完全不同
      if (sn) {
        if (!sn.font && !sn.image) diag = 'vector';
        else if (sn.image) diag = 'scan';
        else diag = 'unknown';
      } else {
        diag = 'unknown';
      }
    }
    return {
      text: text,
      pages: doc.numPages,
      note: doc.numPages > pages ? ('说明共 ' + doc.numPages + ' 页，已解析前 ' + pages + ' 页') : '',
      empty: empty,
      diag: diag,
      paths: 0,
      images: sn && sn.image ? 1 : 0
    };
  }

  // DXF：文本格式，取 group code 1/3 的内容（TEXT/MTEXT 文字）
  function extractDxf(buf) {
    var t = decode(buf, 'utf-8');
    if (!/SECTION|ENTITIES|AcDb/i.test(t)) t = decode(buf, 'gbk');
    var out = [];
    var lines = t.split(/\r\n|\n|\r/);
    for (var i = 0; i < lines.length - 1; i++) {
      var code = lines[i].trim();
      if (code === '1' || code === '3') {
        var v = lines[i + 1] || '';
        v = v.replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, '').trim();
        if (v.length >= 2) out.push(v);
      }
    }
    return { text: normalize(out.join('\n')), note: '已从 DXF 提取 ' + out.length + ' 条文字' };
  }

  // DWG：二进制格式，无官方浏览器解析器；按 UTF-16LE 与 GBK 双路解码后抽取文字片段
  function pickFragments(str) {
    var out = [];
    var re = /[\u4e00-\u9fa5][\u4e00-\u9fa5A-Za-z0-9（）()、。，,.:：；;％%\/\-+~～=<>《》【】\[\]{}·_]{3,60}/g;
    var m;
    while ((m = re.exec(str)) !== null) {
      var s = m[0].trim();
      if (s.length < 4) continue;
      var cjk = (s.match(/[\u4e00-\u9fa5]/g) || []).length;
      if (cjk / s.length < 0.45) continue;
      out.push(s);
    }
    return out;
  }

  function extractDwg(buf) {
    var frags = [];
    var u16 = decode(buf, 'utf-16le');
    if (u16) frags = frags.concat(pickFragments(u16));
    var gbk = decode(buf, 'gbk');
    if (gbk) frags = frags.concat(pickFragments(gbk));
    var seen = {}, uniq = [];
    frags.forEach(function (f) {
      if (seen[f]) return;
      seen[f] = 1; uniq.push(f);
    });
    return {
      text: normalize(uniq.slice(0, 4000).join('\n')),
      note: 'DWG 为二进制图纸格式，浏览器端仅能提取图中文字（' + uniq.length + ' 段）。如识别不全，建议在 CAD 中把说明另存为 PDF 或 DXF 后上传'
    };
  }

  async function extractFile(file) {
    var name = (file && file.name) || '';
    var ext = (name.split('.').pop() || '').toLowerCase();
    var buf, res;
    if (ext === 'pdf') {
      buf = await readAsArrayBuffer(file);
      res = await extractPdf(buf);
    } else if (ext === 'dxf') {
      buf = await readAsArrayBuffer(file);
      res = extractDxf(buf);
    } else if (ext === 'dwg') {
      buf = await readAsArrayBuffer(file);
      res = extractDwg(buf);
    } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp' || ext === 'bmp') {
      // 图片：直接交给 OCR 通道，这里只做格式确认
      return { text: '', empty: true, diag: 'image', isImage: true, pages: 1, note: '图片待 OCR', kind: ext, fileName: name, size: file.size || 0 };
    } else if (ext === 'txt' || ext === 'md' || ext === 'csv') {
      var txt = await readAsText(file, 'utf-8');
      if (!/[\u4e00-\u9fa5]/.test(txt)) {
        try { txt = decode(await readAsArrayBuffer(file), 'gbk'); } catch (e) { /* 保持原样 */ }
      }
      res = { text: normalize(txt), note: '' };
    } else {
      throw new Error('暂不支持 .' + ext + ' 格式，请上传 PDF / DWG / DXF / TXT（图片版说明请先转成 PDF）');
    }
    res.kind = ext;
    res.fileName = name;
    res.size = file.size || 0;
    if (!res.empty && res.text.replace(/\s/g, '').length < 20) res.empty = true;
    return res;
  }

  /* ==================== 规则抽取 ==================== */

  // 连接方式若与材质不在同一子句，需就近回溯（「PP-R管，接口为热熔连接」这类列举式说明）
  var JOINT_SKIP = { flange: 1 };   // 「与设备、阀门采用法兰连接」说的是附件，不是管道本体

  function extractChunk(body, ctx, out) {
    var toks = tokensOfChunk(body).map(function (t) {
      return {
        text: t.text,
        idx: t.idx,
        mat: firstHit(MATERIALS, t.text),
        joint: firstJoint(t.text),
        cond: dnCondOf(t.text),
        loc: clauseLoc(t.text),
        sys: firstHit(SYSTEMS, t.text)
      };
    });
    // 逐子句推进上下文：材质/管径条件/部位/系统都可被后续子句继承
    var cur = {
      material: ctx.material || null,
      matIdx: null,
      cond: null,
      loc: ctx.loc || null,
      system: ctx.system || null
    };
    toks.forEach(function (tk) {
      if (tk.mat) {
        if (!cur.material || cur.material.key !== tk.mat.key) cur.cond = null;  // 换材质即换管段，管径条件作废
        cur.material = tk.mat;
        cur.matIdx = tk.idx;
      }
      if (tk.cond) cur.cond = tk.cond;
      if (tk.loc) cur.loc = tk.loc;
      else if (SEG_RESET.test(tk.text)) { cur.loc = null; cur.cond = null; }
      if (tk.sys) cur.system = tk.sys;
      if (!tk.joint) return;
      if (JOINT_SKIP[tk.joint.key] && !/管道|管材/.test(tk.text)) return;
      // 材质离得太远（文字实体顺序被打乱时会出现）就不强行配对，避免张冠李戴
      var mat = cur.material;
      if (mat && cur.matIdx != null && Math.abs(tk.idx - cur.matIdx) > 120) mat = ctx.material || null;
      out.push({
        materialKey: mat ? mat.key : null,
        materialLabel: mat ? mat.label : '',
        conf: tk.mat ? 'high' : 'low',
        joint: tk.joint.key,
        jointLabel: tk.joint.label,
        medium: cur.system ? cur.system.medium : null,
        loc: cur.loc,
        dnCond: tk.cond || cur.cond || null,
        evidence: String(body).slice(Math.max(0, tk.idx - 40), tk.idx + tk.text.length + 60).replace(/\s+/g, ' ').trim()
      });
    });
    // 只回写材质/系统：部位（室内外）跨句继承极易串味，改由管径分档规则补全
    ctx.material = cur.material;
    ctx.system = cur.system;
  }

  // 「管径<DN65时采用螺纹连接」这类续句本身不带部位，按同材质同介质的分档规则补
  function fillRuleLoc(rules) {
    var byKey = {};
    rules.forEach(function (r) {
      if (!r.loc) return;
      var k = (r.materialKey || '-') + '|' + (r.medium || '-');
      byKey[k] = byKey[k] || [];
      if (byKey[k].indexOf(r.loc) < 0) byKey[k].push(r.loc);
    });
    rules.forEach(function (r) {
      if (r.loc || !r.dnCond) return;
      var k = (r.materialKey || '-') + '|' + (r.medium || '-');
      if (byKey[k] && byKey[k].length === 1) r.loc = byKey[k][0];
    });
    return rules;
  }

  function dedupeRules(rules) {
    var seen = {}, out = [];
    rules.forEach(function (r) {
      var k = [r.materialKey || '-', r.joint, r.medium || '-', r.loc || '-',
        r.dnCond ? (r.dnCond.op + r.dnCond.val) : '-'].join('|');
      if (seen[k]) return;
      seen[k] = 1; out.push(r);
    });
    return out;
  }

  function parseText(raw) {
    var text = normalize(raw);
    var spec = {
      version: VERSION, ok: false, textLen: text.length,
      materials: [], systems: [], joints: [], locs: [],
      rules: [], measures: {}, dnRange: null, sentences: [], keywords: [], points: [], frag: null
    };
    if (text.replace(/\s/g, '').length < 20) return spec;
    spec.ok = true;

    MATERIALS.forEach(function (m) { if (m.re.test(text)) spec.materials.push({ key: m.key, label: m.label }); });
    SYSTEMS.forEach(function (s) { if (s.re.test(text)) spec.systems.push({ key: s.key, label: s.label, medium: s.medium }); });
    JOINTS.forEach(function (j) { if (j.re.test(text)) spec.joints.push({ key: j.key, label: j.label }); });
    if (/室内|楼内|管井|吊顶内/.test(text)) spec.locs.push('in');
    if (/室外|户外|外网|埋地|庭院/.test(text)) spec.locs.push('out');
    MEASURES.forEach(function (m) { if (m.re.test(text)) spec.measures[m.key] = true; });
    spec.dnRange = dnRangeOf(text);

    var rawLines = text.split('\n').filter(function (l) { return l.trim(); });
    spec.frag = {
      lines: rawLines.length,
      avgLine: rawLines.length ? Math.round(text.replace(/\s/g, '').length / rawLines.length) : 0
    };

    spec.sentences = [];
    splitSections(text).forEach(function (sec) {
      // 小标题（如「1.1.1 给水、热水系统：」）携带的系统/部位供整段继承
      var ctx = {
        material: firstHit(MATERIALS, sec.title),
        system: firstHit(SYSTEMS, sec.title),
        loc: clauseLoc(sec.title)
      };
      chunkLines(sec.lines, 1200).forEach(function (body) {
        splitSentences(body).forEach(function (sent) { spec.sentences.push(sent); });
        extractChunk(body, ctx, spec.rules);
      });
    });

    spec.rules = fillRuleLoc(dedupeRules(spec.rules));
    spec.points = extractPoints(text);
    var hi = 0, lo = 0;
    spec.rules.forEach(function (r) { if (r.materialKey) hi++; else lo++; });
    spec.conf = { high: hi, low: lo, lowRatio: (hi + lo) ? lo / (hi + lo) : 0 };

    // 关键信息摘要（给界面卡片用）
    spec.keywords = [];
    spec.materials.forEach(function (m) { spec.keywords.push({ type: 'material', text: m.label, key: m.key }); });
    spec.systems.forEach(function (s) { spec.keywords.push({ type: 'system', text: s.label, key: s.key }); });
    spec.joints.forEach(function (j) { spec.keywords.push({ type: 'joint', text: j.label, key: j.key }); });
    if (spec.locs.length) {
      spec.keywords.push({ type: 'loc', text: spec.locs.map(function (l) { return l === 'out' ? '室外' : '室内'; }).join(' / '), key: spec.locs.join(',') });
    }
    if (spec.dnRange) {
      spec.keywords.push({ type: 'dn', text: 'DN/De ' + spec.dnRange.min + '~' + spec.dnRange.max, key: 'dn' });
    }
    Object.keys(spec.measures).forEach(function (k) {
      var m = MEASURES.filter(function (x) { return x.key === k; })[0];
      if (m) spec.keywords.push({ type: 'measure', text: m.label, key: k });
    });

    return spec;
  }

  /* ==================== 与清单行匹配 ==================== */

  function itemMaterialKey(it) {
    if (!it) return null;
    if (it.category === 'plastic') return normMat(it.plasticKind || 'ppr');
    var map = {
      castIron: 'cast', galv: 'galv', stainless: 'stainless', copper: 'copper',
      composite: 'composite', seamless: 'steel', welded: 'steel', frp: 'frp'
    };
    return map[it.category] || null;
  }

  function matchItem(spec, it) {
    if (!spec || !spec.ok || !spec.rules || !spec.rules.length) return null;
    if (!it || !it.category) return null;
    var mk = itemMaterialKey(it);
    if (!mk) return null;
    var fam = familyOfMat(mk);
    var dn = it.dn || 0;
    var im = it.isRain ? 'rain' : (it.medium || 'water');
    var best = null, bestScore = 0;
    spec.rules.forEach(function (r) {
      var sc = 0;
      if (r.materialKey) {
        if (normMat(r.materialKey) !== mk) return;
        sc += 6;
      } else {
        var jf = jointFamily(r.joint);
        if (jf && fam && jf !== fam) return;
        sc += 2;
      }
      if (r.dnCond) {
        if (!dn) return;
        var cv = r.dnCond.val, okDn = true;
        if (r.dnCond.op === 'ge') okDn = dn >= cv;
        else if (r.dnCond.op === 'gt') okDn = dn > cv;
        else if (r.dnCond.op === 'le') okDn = dn <= cv;
        else if (r.dnCond.op === 'lt') okDn = dn < cv;
        if (!okDn) return;
        sc += 3;
      }
      if (r.loc) {
        if (r.loc === it.loc) sc += 1;
        else if (it.locAmbiguous) sc -= 1;   // 清单未注明部位，以说明为准
        else return;                          // 部位明确冲突（室内 vs 室外），不套用该条
      }
      if (r.medium) {
        if (r.medium === im) sc += 2;
        else if (r.medium === 'fire' || r.medium === 'gas') { /* 中性 */ }
        else sc -= 1;
      }
      if (sc > bestScore) { bestScore = sc; best = r; }
    });
    return bestScore >= 3 ? best : null;
  }

  /* ==================== 对比分析 ==================== */

  var SYS_TO_MEDIUM = { water: 'water', drain: 'drain', rain: 'rain', cond: 'drain', reclaim: 'water', fire: 'fire', gas: 'gas' };

  // 造价要点 × 清单比对：独立于「管材+连接方式」是否识别成功，只要说明里抽到要点就比对
  function analyzePoints(spec, items) {
    var out = [];
    var pts = (spec && spec.points) || [];
    if (!pts.length) return out;
    var allItems = items || [];
    var list = allItems.filter(function (i) { return i && i.category && i.category !== 'other'; });
    var aux = { insulation: 0, sleeve: 0, support: 0 };
    list.forEach(function (i) {
      if (i.category === 'insulRubber' || i.category === 'insulGlass') aux.insulation++;
      if (i.category === 'bracket') aux.support++;
      if (/套管/.test(i.name || '')) aux.sleeve++;
    });
    var ptMap = {};
    pts.forEach(function (p) { ptMap[p.key] = p; });
    var hasName = function (re) {
      return list.some(function (i) { return re.test(i.name || ''); });
    };
    var hasNameAll = function (re) {
      return allItems.some(function (i) { return re.test(i.name || ''); });
    };

    if (ptMap.demolish) {
      if (!hasNameAll(/拆除|清运|垃圾|剔凿|拆改|外运/)) {
        out.push({
          level: 'warn', title: '拆除与清运',
          text: '说明写明需拆除原系统并清运废料（命中 ' + ptMap.demolish.count + ' 处），本清单未见拆除或垃圾外运项目。改造类项目这是整块费用，建议单列「管道及设备拆除」「垃圾外运」。'
        });
      } else {
        out.push({ level: 'ok', title: '拆除与清运', text: '说明要求拆除清运，清单已有对应项目，请核对拆除范围与说明一致。' });
      }
    }

    if (ptMap.seismic) {
      if (!hasName(/抗震|支吊架/)) {
        out.push({
          level: 'warn', title: '抗震支吊架',
          text: '说明要求设置抗震支吊架' + (ptMap.seismic.detail ? '（' + ptMap.seismic.detail + '）' : '') +
            '，本清单未见抗震支架项目。抗震支架按 kg 或套单列，普通管道承重支架不能替代。'
        });
      }
    }

    if (ptMap.equipment && !hasNameAll(/泵|水箱|机组|消毒器|气压罐|换热器|热水器|开水器|变频|稳压/)) {
      out.push({
        level: 'warn', title: '设备供货',
        text: '说明含设备要求（命中 ' + ptMap.equipment.count + ' 处）' + (ptMap.equipment.detail ? '，如 ' + ptMap.equipment.detail : '') +
          '，本清单未见对应设备项目。设备按台/套单列，请核对是否漏项。'
      });
    }

    if (ptMap.insulation) {
      if (!aux.insulation) {
        // 漏项由原有保温检查负责，这里只提示参数，避免同一问题报两遍
        if (ptMap.insulation.detail) {
          out.push({
            level: 'info', title: '保温参数',
            text: '说明给的保温做法是「' + ptMap.insulation.detail + '」。补保温项目时按此参数套定额——厚度与密度直接决定单价，别用默认值。'
          });
        }
      } else if (ptMap.insulation.detail) {
        var idt = ptMap.insulation.detail;
        var rubN = list.filter(function (i) { return i.category === 'insulRubber'; }).length;
        var glassN = list.filter(function (i) { return i.category === 'insulGlass'; }).length;
        if (/橡塑/.test(idt) && !rubN && glassN) {
          out.push({ level: 'warn', title: '保温材质', text: '说明要求橡塑保温，清单为玻璃棉保温，材质不一致，单价差异较大，请核对。' });
        }
        if (/玻璃棉/.test(idt) && !glassN && rubN) {
          out.push({ level: 'warn', title: '保温材质', text: '说明要求玻璃棉保温，清单为橡塑保温，材质不一致，请核对。' });
        }
      }
    }

    if (ptMap.exclusion) {
      var exNames = [];
      (ptMap.exclusion.evidence || []).forEach(function (s) {
        var m = s.match(/(?:不含|不在本次.{0,8}范围|本次不(?:含|包括)|暂不(?:含|包括))\s*(?!项)([^，。；、\s][^，。；、]{1,11})/);
        if (m) exNames.push(m[1].replace(/[（(].*$/, '').trim());
      });
      if (exNames.length) {
        var conflict = allItems.filter(function (i) {
          return exNames.some(function (n) { return n && (i.name || '').indexOf(n) >= 0; });
        });
        if (conflict.length) {
          out.push({
            level: 'warn', title: '范围冲突',
            text: '说明标注「不含 ' + exNames.join('、') + '」，但清单含 ' + conflict.length + ' 条相关项目（如 ' +
              (conflict[0].name || '').slice(0, 18) + '），请确认是否属本次范围，避免重复计价。'
          });
        } else {
          out.push({ level: 'info', title: '不含范围', text: '说明标注不含：' + exNames.join('、') + '，清单未出现相关项目，范围一致。' });
        }
      }
    }

    if (ptMap.boundary) {
      out.push({
        level: 'info', title: '室内外分界',
        text: '说明含管材分界约定（' + (ptMap.boundary.evidence[0] || '').slice(0, 60) + '…），清单按室内外混编时注意分界两侧定额与单价不同，建议按界拆分。'
      });
    }

    return out;
  }

  function analyze(spec, items) {
    var out = [];
    if (!spec || !spec.ok) return out;
    var ptAlerts = analyzePoints(spec, items);
    if (!spec.rules || !spec.rules.length) {
      return ptAlerts.concat([{ level: 'info', title: '说明未含管材/连接方式', text: '已提取到文字，但未识别到「…采用…连接」这类表述，清单按名称规则套用；上传含管材与连接方式的说明（如「生活给水管采用PE管，热熔连接」）后可自动比对与套用。' }]);
    }
    var list = (items || []).filter(function (i) { return i && i.category && i.category !== 'other'; });
    var pipes = list.filter(function (i) { return i.listCode && /^031001/.test(i.listCode); });
    var mats = {};
    var mediums = {};
    var aux = { insulation: 0, sleeve: 0, support: 0 };
    pipes.forEach(function (i) {
      var k = itemMaterialKey(i);
      if (k) mats[k] = (mats[k] || 0) + 1;
      var m = i.isRain ? 'rain' : (i.medium || 'water');
      mediums[m] = (mediums[m] || 0) + 1;
    });
    list.forEach(function (i) {
      if (i.category === 'insulRubber' || i.category === 'insulGlass') aux.insulation++;
      if (i.category === 'bracket') aux.support++;
      if (/套管/.test(i.name || '')) aux.sleeve++;
    });

    // 1. 系统覆盖
    spec.systems.forEach(function (s) {
      if (s.key === 'fire') {
        if (!mediums.fire) {
          if (mats.galv) {
            out.push({ level: 'info', title: '消防系统', text: '说明中消防给水采用镀锌钢管，本清单有 ' + mats.galv + ' 项镀锌钢管未注明用途；若确为消防管道，建议用「消防专业智能组价系统」单独组价（消防水沟槽/螺纹口径与本站一致，本站按给水套用）。' });
          } else {
            out.push({ level: 'info', title: '消防系统', text: '说明提到消防给水，本清单未见消防管道——消防水建议用「消防专业智能组价系统」单独组价，本站仅处理给排水。' });
          }
        }
        return;
      }
      var med = SYS_TO_MEDIUM[s.key];
      if (!med) return;
      if (s.key === 'cond') {
        if (!mediums.drain) out.push({ level: 'warn', title: s.label, text: '说明含' + s.label + '，清单未见排水/冷凝水管道，请核对是否漏项。' });
        return;
      }
      if (!mediums[med]) {
        out.push({ level: 'warn', title: s.label, text: '说明含' + s.label + '，清单未见对应管道项目，请核对是否漏项。' });
      }
    });

    // 2. 管材覆盖
    spec.materials.forEach(function (m) {
      if (m.key === 'steel' || m.key === 'frp') return;
      if (!mats[m.key]) {
        out.push({ level: 'warn', title: m.label, text: '说明要求' + m.label + '，清单未见该材质管道，请核对是否漏项或材质写法。' });
      }
    });

    // 3. 措施项
    if (spec.measures.insulation && !aux.insulation) {
      out.push({ level: 'info', title: '保温/防结露', text: '说明要求管道保温（防结露），清单未见保温项目，可增加「橡塑保温/玻璃棉保温」行由本站自动套定额。' });
    }
    if (spec.measures.sleeve && !aux.sleeve) {
      out.push({ level: 'info', title: '套管', text: '说明要求穿墙/穿楼板设套管，清单未见套管项目，请核对（本站暂不含套管定额，需在计价软件中补充）。' });
    }
    if (spec.measures.support && aux.support) {
      out.push({ level: 'ok', title: '管道支架', text: '说明要求管道支架，清单已含支架项目，按 7-138 套用。' });
    }
    if (spec.measures.test) {
      out.push({ level: 'ok', title: '水压试验', text: '说明要求水压试验，已含在各管道定额工作内容中，无需另列。' });
    }
    if (spec.measures.disinfect) {
      out.push({ level: 'ok', title: '消毒冲洗', text: '说明要求消毒冲洗，本站已对给水管道自动附加消毒冲洗子目。' });
    }

    // 4. 管径越界
    if (spec.dnRange) {
      var over = pipes.filter(function (i) { return i.dn && (i.dn > spec.dnRange.max || i.dn < spec.dnRange.min); });
      if (over.length) {
        out.push({
          level: 'warn', title: '管径范围',
          text: '说明管径范围为 ' + spec.dnRange.min + '~' + spec.dnRange.max + 'mm，清单有 ' + over.length + ' 条超出：' +
            over.slice(0, 4).map(function (i) { return (i.name || '').slice(0, 18) + '(DN' + i.dn + ')'; }).join('、') +
            (over.length > 4 ? ' 等' : '') + '，请核对。'
        });
      }
    }

    // 5. 说明未提及的材质
    Object.keys(mats).forEach(function (k) {
      var hit = spec.materials.some(function (m) { return m.key === k; });
      if (!hit) {
        var label = (MATERIALS.filter(function (m) { return m.key === k; })[0] || {}).label || k;
        out.push({ level: 'info', title: label, text: '清单含' + label + '，说明未提及该材质，已按名称规则套用，请核对连接方式。' });
      }
    });

    // 6. 连接方式被说明覆盖的行
    var over2 = list.filter(function (i) { return i.specJointConflict; });
    if (over2.length) {
      out.push({
        level: 'info', title: '连接方式以说明为准',
        text: over2.length + ' 条清单名称所写连接方式与说明不一致，已按说明套用（如 ' + (over2[0].name || '').slice(0, 16) + '），如需以名称为准可在选型列改回。'
      });
    }

    // 造价要点比对已在上方独立计算（analyzePoints），此处直接合并
    out = out.concat(ptAlerts);

    if (!out.length) {
      out.push({ level: 'ok', title: '一致性检查', text: '说明与工程量清单未发现明显漏项，连接方式已按说明自动套用。' });
    }
    return out;
  }


  /* ==================== OCR（矢量化 / 扫描件 PDF 兜底） ==================== */

  var TESS_BASE = 'js/tesseract/';

  // worker 内部的相对路径以 worker 脚本位置为基准，必须给绝对地址
  function tessAbs(p) {
    try { return new URL(p, document.baseURI).href; } catch (e) { return p; }
  }
  var tessLoading = null;

  // 懒加载：只有真正要 OCR 时才拉 11MB 的引擎和中文语言包
  function loadTesseract() {
    if (global.Tesseract) return Promise.resolve(global.Tesseract);
    if (tessLoading) return tessLoading;
    tessLoading = new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = TESS_BASE + 'tesseract.min.js';
      sc.onload = function () { global.Tesseract ? resolve(global.Tesseract) : reject(new Error('OCR 组件未就绪')); };
      sc.onerror = function () { tessLoading = null; reject(new Error('OCR 组件加载失败，检查 js/tesseract/ 目录是否完整')); };
      document.head.appendChild(sc);
    });
    return tessLoading;
  }

  // tesseract 对中文逐字识别，字间会插入空格（「D N6 5」「0 . 6 MP a」），
  // 且常见字形混淆（耻有/既有、卡籍/卡箍）。这里做还原。
  var OCR_FIX = [
    [/耻有/g, '既有'], [/蚂有/g, '既有'], [/蚂存/g, '既有'], [/既冇/g, '既有'],
    [/卡籍/g, '卡箍'], [/卡籍连接/g, '卡箍连接'], [/卡箱连接/g, '卡箍连接'],
    [/抗晨/g, '抗震'], [/抗居/g, '抗震'], [/抗展/g, '抗震'], [/支品架/g, '支吊架'],
    [/消火检/g, '消火栓'], [/消淡/g, '消火'],
    [/薄璧/g, '薄壁'], [/热溶/g, '热熔'], [/螺绞/g, '螺纹'], [/法蓝/g, '法兰'],
    [/水压试马验/g, '水压试验'], [/试马验/g, '试验'],
    [/(\d)\s*[Kk]\s*[Ww][Ww]/g, '$1kW'], [/(\d)\s*[Kk][Ww]\b/g, '$1kW'],
    [/(\d)\s*[Mm]\s*[Pp]\s*[Aa]/g, '$1MPa'], [/(\d)\s*[Mm]\s*[Mm]\b/g, '$1mm']
  ];

  function tidyOcr(t) {
    var x = String(t || '');
    // 只处理空格类字符（含全角空格/不换行空格），保留换行，避免段落粘连
    x = x.replace(/(\d)[ \t\u00a0]*\.[ \t\u00a0]*(?=\d)/g, '$1.');          // 0 . 6 → 0.6
    x = x.replace(/(\d)[ \t\u00a0]+(?=\d)/g, '$1');                            // 3 0 4 → 304
    x = x.replace(/(\d)[ \t\u00a0]+(?=[A-Za-zµ])/g, '$1');                      // 25 mm → 25mm
    x = x.replace(/([A-Za-z])[ \t\u00a0]+(?=\d)/g, '$1');                       // DN 65 → DN65
    x = x.replace(/([A-Za-z])[ \t\u00a0]+(?=[A-Za-z])/g, '$1');                  // D N → DN
    x = x.replace(/([A-Za-z0-9])[ \t\u00a0]*([-\/])[ \t\u00a0]*(?=[A-Za-z0-9])/g, '$1$2'); // PP - R → PP-R
    x = x.replace(/([\u4e00-\u9fa5])[ \t\u00a0]+(?=[\u4e00-\u9fa5])/g, '$1');  // 薄 壁 → 薄壁
    x = x.replace(/([\u4e00-\u9fa5])[ \t\u00a0]+(?=[A-Za-z0-9])/g, '$1');        // 中英边界
    x = x.replace(/([A-Za-z0-9])[ \t\u00a0]+(?=[\u4e00-\u9fa5])/g, '$1');
    x = x.replace(/[ \t\u00a0]+([，。；、：（）,;:])/g, '$1');                      // 标点前空格
    x = x.replace(/([，。；、：（）,;:])[ \t\u00a0]+/g, '$1');                      // 标点后空格
    OCR_FIX.forEach(function (r) { x = x.replace(r[0], r[1]); });
    return x;
  }

  // 图片 OCR：截图直接识别，不需要经过 PDF
  async function ocrImage(file, onProgress) {
    var report = function (o) { if (onProgress) onProgress(o); };
    report({ phase: 'engine', page: 0, total: 1, note: '正在加载 OCR 引擎（首次约 11MB，之后走缓存）' });
    var T = await loadTesseract();

    var bmp;
    try {
      bmp = await createImageBitmap(file);
    } catch (e) {
      throw new Error('图片读取失败，换一张 PNG / JPG 试试');
    }
    // 字太小就先放大，太大就缩到 3600px 以内，兼顾清晰度和速度
    var w = bmp.width, h = bmp.height;
    var scale = 1;
    if (w < 1200) scale = Math.min(3, 1800 / w);
    else if (w > 3600) scale = 3600 / w;
    var cv = document.createElement('canvas');
    cv.width = Math.round(w * scale);
    cv.height = Math.round(h * scale);
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
    try { bmp.close && bmp.close(); } catch (e) {}

    report({ phase: 'ocr', page: 1, total: 1, note: '正在识别图片（' + cv.width + '×' + cv.height + '）' });
    var worker = await T.createWorker('chi_sim', 1, {
      workerPath: tessAbs(TESS_BASE + 'worker.min.js'),
      corePath: tessAbs(TESS_BASE),
      langPath: tessAbs(TESS_BASE + 'lang'),
      workerBlobURL: false,
      logger: function () {}
    });
    await worker.setParameters({ preserve_interword_spaces: '0' });
    var r = await worker.recognize(cv);
    try { await worker.terminate(); } catch (e) {}
    cv.width = cv.height = 0;

    report({ phase: 'done', page: 1, total: 1, note: '' });
    return { text: normalize(tidyOcr((r && r.data && r.data.text) || '')), pages: 1, engine: 'tesseract-chi_sim' };
  }

  // 把 PDF 每页渲染成位图再识别。onProgress({phase,page,total,note})
  async function ocrPdf(buf, onProgress, opts) {
    opts = opts || {};
    var lib = global.pdfjsLib;
    if (!lib) throw new Error('PDF 解析组件未加载');
    var report = function (o) { if (onProgress) onProgress(o); };

    report({ phase: 'engine', page: 0, total: 0, note: '正在加载 OCR 引擎（首次约 11MB，之后走缓存）' });
    var T = await loadTesseract();
    if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
      lib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
    }

    // 传副本：pdf.js 会把 buffer transfer 给 worker，原件后续还要用
    var doc = await lib.getDocument({ data: new Uint8Array(buf.slice(0)), useSystemFonts: true }).promise;
    var maxPages = Math.min(doc.numPages, opts.maxPages || 12);

    report({ phase: 'engine', page: 0, total: maxPages, note: '正在初始化中文识别模型' });
    var worker = await T.createWorker('chi_sim', 1, {
      workerPath: tessAbs(TESS_BASE + 'worker.min.js'),
      corePath: tessAbs(TESS_BASE),
      langPath: tessAbs(TESS_BASE + 'lang'),
      workerBlobURL: false,
      logger: function () {}
    });
    await worker.setParameters({ preserve_interword_spaces: '0' });

    var chunks = [];
    for (var i = 1; i <= maxPages; i++) {
      report({ phase: 'render', page: i, total: maxPages, note: '正在渲染第 ' + i + '/' + maxPages + ' 页' });
      var page = await doc.getPage(i);
      var base = page.getViewport({ scale: 1 });
      // 目标宽度约 3000px：够看清小字，又不至于撑爆内存
      var scale = Math.min(5, Math.max(2, 3000 / base.width));
      var vp = page.getViewport({ scale: scale });
      var cv = document.createElement('canvas');
      cv.width = Math.round(vp.width);
      cv.height = Math.round(vp.height);
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      report({ phase: 'ocr', page: i, total: maxPages, note: '正在识别第 ' + i + '/' + maxPages + ' 页（' + cv.width + '×' + cv.height + '）' });
      var r = await worker.recognize(cv);
      chunks.push((r && r.data && r.data.text) || '');
      cv.width = cv.height = 0;
      cv = null;
    }
    try { await worker.terminate(); } catch (e) {}

    report({ phase: 'done', page: maxPages, total: maxPages, note: '' });
    return { text: normalize(tidyOcr(chunks.join('\n'))), pages: maxPages, engine: 'tesseract-chi_sim' };
  }

  global.SPEC = {
    version: VERSION,
    parseText: parseText,
    extractFile: extractFile,
    ocrPdf: ocrPdf,
    ocrImage: ocrImage,
    matchItem: matchItem,
    analyze: analyze,
    itemMaterialKey: itemMaterialKey,
    MATERIALS: MATERIALS,
    JOINTS: JOINTS,
    SYSTEMS: SYSTEMS,
    MEASURES: MEASURES,
    _internal: {
      normalize: normalize, splitSentences: splitSentences, splitClauses: splitClauses,
      firstJoint: firstJoint, dnCondOf: dnCondOf, dnRangeOf: dnRangeOf,
      clauseLoc: clauseLoc, clauseMedium: clauseMedium, jointFamily: jointFamily
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.SPEC;
})(typeof globalThis !== 'undefined' ? globalThis : window);
