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

  var VERSION = '1.1.0';

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
    return {
      text: text,
      pages: doc.numPages,
      note: doc.numPages > pages ? ('说明共 ' + doc.numPages + ' 页，已解析前 ' + pages + ' 页') : '',
      empty: text.replace(/\s/g, '').length < 20
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
      rules: [], measures: {}, dnRange: null, sentences: [], keywords: [], frag: null
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

  function analyze(spec, items) {
    var out = [];
    if (!spec || !spec.ok) return out;
    if (!spec.rules || !spec.rules.length) {
      return [{ level: 'info', title: '说明未含管材/连接方式', text: '已提取到文字，但未识别到「…采用…连接」这类表述，清单按名称规则套用；上传含管材与连接方式的说明（如「生活给水管采用PE管，热熔连接」）后可自动比对与套用。' }];
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

    if (!out.length) {
      out.push({ level: 'ok', title: '一致性检查', text: '说明与工程量清单未发现明显漏项，连接方式已按说明自动套用。' });
    }
    return out;
  }

  global.SPEC = {
    version: VERSION,
    parseText: parseText,
    extractFile: extractFile,
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
