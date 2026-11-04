/* 给排水专业智能组价系统 - 单元测试
 * 运行：node tools/unit.js
 */
global.window = {};
require('../data/prices.js');
var A = require('../js/app.js');

var pass = 0, fail = 0;
function ck(name, got, want) {
  var ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; }
  else { fail++; console.log('  ✗ ' + name + '  期望=' + JSON.stringify(want) + '  实际=' + JSON.stringify(got)); }
}
function pr(n, qty) {
  var rows = A.parseRows([[1, n, qty === undefined ? 10 : qty]], '2026-10', 'guanglianda');
  return rows[0];
}
function code(n) { return pr(n).quotaCode; }

console.log('\n== 1. 名称解析 ==');
ck('DN大写', A.parseDN('铸铁管 DN100'), 100);
ck('DN小写', A.parseDN('排水铸铁管dn75'), 75);
ck('De', A.parseDN('铸铁管 De110'), 110);
ck('φ', A.parseDN('承插铸铁给水管φ150'), 150);
ck('数字+mm', A.parseDN('铸铁排水管 200mm'), 200);
ck('无管径', A.parseDN('铸铁管'), null);
ck('排水识别', A.parseMedium('机制离心排水铸铁管 DN100'), 'drain');
ck('给水识别', A.parseMedium('球墨铸铁给水管 DN200'), 'water');
ck('默认给水', A.parseMedium('铸铁管 DN100'), 'water');
ck('室外识别', A.parseLoc('室外承插铸铁给水管 DN150'), 'out');
ck('室内识别', A.parseLoc('室内排水铸铁管 DN100'), 'in');
ck('默认室内', A.parseLoc('铸铁管 DN100'), 'in');
ck('青铅', A.parseJoint('承插铸铁给水管 青铅接口'), 'lead');
ck('膨胀水泥', A.parseJoint('铸铁给水管 膨胀水泥接口'), 'expand');
ck('石棉水泥', A.parseJoint('排水铸铁管 石棉水泥接口'), 'asbestos');
ck('胶圈', A.parseJoint('铸铁给水管 胶圈接口'), 'rubber');
ck('柔性接口', A.parseJoint('柔性接口机制排水铸铁管'), 'rubber');
ck('水泥接口', A.parseJoint('排水铸铁管 水泥接口'), 'cement');

console.log('\n== 2. 清单编码 ==');
ck('铸铁管清单码', pr('室内排水铸铁管 DN100').listCode, '031001001');

console.log('\n== 3. 室外给水 青铅接口 8-90~8-99 ==');
[[75, '8-90'], [100, '8-91'], [150, '8-92'], [200, '8-93'], [250, '8-94'],
 [300, '8-95'], [350, '8-96'], [400, '8-97'], [450, '8-98'], [500, '8-99']].forEach(function (p) {
  ck('室外给水青铅DN' + p[0], code('室外承插铸铁给水管 青铅接口 DN' + p[0]), p[1]);
});

console.log('\n== 4. 室外给水 膨胀水泥 8-100~8-109 ==');
[[75, '8-100'], [150, '8-102'], [500, '8-109']].forEach(function (p) {
  ck('室外给水膨胀DN' + p[0], code('室外铸铁给水管 膨胀水泥接口 DN' + p[0]), p[1]);
});

console.log('\n== 5. 室外给水 石棉水泥 8-110~8-119 ==');
[[75, '8-110'], [200, '8-113'], [500, '8-119']].forEach(function (p) {
  ck('室外给水石棉DN' + p[0], code('室外铸铁给水管 石棉水泥接口 DN' + p[0]), p[1]);
});

console.log('\n== 6. 室外给水 胶圈 8-120~8-128（无DN75） ==');
[[100, '8-120'], [150, '8-121'], [300, '8-124'], [500, '8-128']].forEach(function (p) {
  ck('室外给水胶圈DN' + p[0], code('室外铸铁给水管 胶圈接口 DN' + p[0]), p[1]);
});
ck('胶圈DN75→DN100档8-120', code('室外铸铁给水管 胶圈接口 DN75'), '8-120');
ck('胶圈DN75标推', pr('室外铸铁给水管 胶圈接口 DN75').codeInferred, true);

console.log('\n== 7. 室外排水 石棉水泥 8-129~8-134 / 水泥 8-135~8-140 ==');
[[50, '8-129'], [75, '8-130'], [100, '8-131'], [125, '8-132'], [150, '8-133'], [200, '8-134']].forEach(function (p) {
  ck('室外排水石棉DN' + p[0], code('室外排水铸铁管 石棉水泥接口 DN' + p[0]), p[1]);
});
[[50, '8-135'], [100, '8-137'], [200, '8-140']].forEach(function (p) {
  ck('室外排水水泥DN' + p[0], code('室外排水铸铁管 水泥接口 DN' + p[0]), p[1]);
});

console.log('\n== 8. 室内给水 青铅 8-336~8-341 ==');
[[75, '8-336'], [100, '8-337'], [150, '8-338'], [200, '8-339'], [250, '8-340'], [300, '8-341']].forEach(function (p) {
  ck('室内给水青铅DN' + p[0], code('室内承插铸铁给水管 青铅接口 DN' + p[0]), p[1]);
});

console.log('\n== 9. 室内给水 膨胀水泥 8-342~8-347 / 石棉水泥 8-348~8-353 ==');
[[75, '8-342'], [300, '8-347']].forEach(function (p) {
  ck('室内给水膨胀DN' + p[0], code('室内铸铁给水管 膨胀水泥接口 DN' + p[0]), p[1]);
});
[[75, '8-348'], [100, '8-349'], [300, '8-353']].forEach(function (p) {
  ck('室内给水石棉DN' + p[0], code('室内铸铁给水管 石棉水泥接口 DN' + p[0]), p[1]);
});

console.log('\n== 10. 室内排水 石棉水泥 8-354~8-359 / 水泥 8-360~8-365 ==');
[[50, '8-354'], [75, '8-355'], [100, '8-356'], [150, '8-357'], [200, '8-358'], [250, '8-359']].forEach(function (p) {
  ck('室内排水石棉DN' + p[0], code('室内排水铸铁管 石棉水泥接口 DN' + p[0]), p[1]);
});
[[50, '8-360'], [100, '8-362'], [250, '8-365']].forEach(function (p) {
  ck('室内排水水泥DN' + p[0], code('室内排水铸铁管 水泥接口 DN' + p[0]), p[1]);
});

console.log('\n== 11. 用户关键词识别 ==');
ck('机制离心排水铸铁管', pr('机制离心排水铸铁管 DN100').category, 'castIron');
ck('机制离心排水铸铁管→排水', pr('机制离心排水铸铁管 DN100').medium, 'drain');
ck('离心浇筑灰口铁直管', pr('离心浇筑灰口铁直管 DN150').category, 'castIron');
ck('柔性接口机制排水铸铁管', pr('柔性接口机制排水铸铁管 DN150').category, 'castIron');
ck('柔性接口→排水', pr('柔性接口机制排水铸铁管 DN150').medium, 'drain');
ck('球墨铸铁给水管', pr('球墨铸铁给水管 DN200').category, 'castIron');

console.log('\n== 12. 非整档与超档 ==');
ck('DN80→100档8-91', code('室外铸铁给水管 青铅接口 DN80'), '8-91');
ck('DN80标推', pr('室外铸铁给水管 青铅接口 DN80').codeInferred, true);
ck('DN110→150档', code('室外铸铁给水管 青铅接口 DN110'), '8-92');
ck('DN600→500档8-99', code('室外铸铁给水管 青铅接口 DN600'), '8-99');
ck('DN600标推', pr('室外铸铁给水管 青铅接口 DN600').codeInferred, true);
ck('DN400室内给水超最大300档→8-341', code('室内铸铁给水管 青铅接口 DN400'), '8-341');

console.log('\n== 13. 接口回退 ==');
ck('室内给水胶圈→石棉8-348', code('室内铸铁给水管 胶圈接口 DN75'), '8-348');
ck('室内给水胶圈有回退提示', /无胶圈接口子目/.test(pr('室内铸铁给水管 胶圈接口 DN75').warn), true);
ck('排水青铅→石棉8-355', code('室内排水铸铁管 青铅接口 DN75'), '8-355');
ck('柔性接口排水→石棉', code('柔性接口机制排水铸铁管 DN100'), '8-356');
ck('室外排水膨胀水泥→石棉8-131', code('室外排水铸铁管 膨胀水泥接口 DN100'), '8-131');

console.log('\n== 14. 主材价 ==');
ck('给水DN100=72', pr('室内铸铁给水管 石棉水泥接口 DN100').price, 72);
ck('排水DN100=62', pr('室内排水铸铁管 石棉水泥接口 DN100').price, 62);
ck('给水DN80→100档72', pr('室内铸铁给水管 石棉水泥接口 DN80').price, 72);
ck('排水DN110→125档82', pr('室内排水铸铁管 石棉水泥接口 DN110').price, 82);
ck('价格来源市场价', pr('室内排水铸铁管 石棉水泥接口 DN100').priceSource, 'market');
ck('价格含依据', /铸铁排水管 DN100/.test(pr('室内排水铸铁管 石棉水泥接口 DN100').priceBasis), true);
ck('无管径→待询价', pr('铸铁管').priceSource, 'pending');
ck('无管径有提示', /未识别公称直径/.test(pr('铸铁管').warn), true);

console.log('\n== 15. 材质分类 ==');
ck('薄壁不锈钢管→stainless', pr('薄壁不锈钢管DN80').category, 'stainless');
ck('不锈钢定额8-268', pr('薄壁不锈钢管DN80').quotaCode, '8-268');
ck('不锈钢计价', pr('薄壁不锈钢管DN80').priceSource, 'market');
ck('PPR管→plastic', pr('PPR给水管 DN25').category, 'plastic');
ck('镀锌钢管→galv', pr('镀锌钢管 DN50').category, 'galv');
ck('焊接钢管→welded', pr('焊接钢管 DN50').category, 'welded');
ck('无缝钢管→seamless', pr('无缝钢管 DN50').category, 'seamless');
ck('铜管→copper', pr('铜管 DN54').category, 'copper');
ck('铝塑复合管→composite', pr('铝塑复合管 De32').category, 'composite');
ck('镀锌无缝钢管→seamless', pr('内外壁热浸镀锌无缝钢管 DN50').category, 'seamless');

console.log('\n== 16. 整表解析 ==');
var rows = A.parseRows([
  ['序号', '项目名称', '长度'],
  [1, '室内排水铸铁管 DN100 石棉水泥接口', 120],
  [2, '室外承插铸铁给水管 青铅接口 DN200', 85.5],
  [3, '薄壁不锈钢管DN80', 60],
  [4, '室内铸铁给水管 石棉水泥接口 DN50', ''],
  ['', '柔性接口机制排水铸铁管 DN150', 30]
], '2026-10', 'guanglianda');
ck('解析条数（含自动补支架）', rows.length, 6);
ck('末行为自动补管道支架', rows[5].category, 'bracket');
ck('支架估算重量 335.7kg', rows[5].quantity, 335.7);
ck('支架清单031301005', rows[5].listCode, '031301005');
ck('支架定额7-138/100kg', rows[5].quotaCode + '/' + rows[5].quotaFactor, '7-138/100');
ck('支架型钢信息价4.2', rows[5].price, 4.2);
ck('序号保留', rows[0].index, '1');
ck('空序号自动编号', rows[4].index, '5');
ck('工程量小数', rows[1].quantity, 85.5);
ck('工程量缺失按1', rows[3].quantity, 1);
ck('工程量缺失提示', /工程量缺失/.test(rows[3].warn), true);
ck('第1行定额', rows[0].quotaCode, '8-356');
ck('第2行定额', rows[1].quotaCode, '8-93');
ck('第3行薄壁不锈钢DN80', rows[2].quotaCode, '8-268');
ck('第4行DN50室内给水', rows[3].quotaCode, '8-348');
ck('第5行柔性排水DN150→8-357', rows[4].quotaCode, '8-357');
ck('主材费合计（管道）', Number(rows.filter(function (d) { return d.category !== 'bracket'; }).reduce(function (s, d) { return s + (d.price === null ? 0 : d.price * d.quantity); }, 0).toFixed(2)), 120 * 62 + 85.5 * 152 + 60 * 128 + 1 * 58 + 30 * 105);

console.log('\n== 17. 项目特征 ==');
ck('特征含安装部位', /安装部位:室内/.test(rows[0].features), true);
ck('特征含接口材料', /接口材料:石棉水泥接口/.test(rows[0].features), true);
ck('特征含连接形式', /连接形式:承插/.test(rows[0].features), true);
ck('排水特征含通球', /通球试验/.test(rows[0].features), true);
ck('给水特征含水压', /水压试验/.test(rows[1].features), true);

console.log('\n== 18. 接口选项联动 ==');
function ci(loc, medium) { return { category: 'castIron', loc: loc, medium: medium, joint: null }; }
ck('室外给水可选接口', A.jointsOf(ci('out', 'water')), ['asbestos', 'lead', 'expand', 'rubber']);
ck('室内给水可选接口', A.jointsOf(ci('in', 'water')), ['asbestos', 'lead', 'expand']);
ck('室外排水可选接口', A.jointsOf(ci('out', 'drain')), ['asbestos', 'cement']);
ck('室内排水可选接口', A.jointsOf(ci('in', 'drain')), ['asbestos', 'cement']);
ck('默认接口石棉水泥', A.defaultJoint(ci('out', 'water')), 'asbestos');

// ============================================================
// 19. 定额单位与换算
// ============================================================
(function () {
  var PK = A.getPeriods()[0].period;
  var it = A.parseRows([[1, '室内排水铸铁管 DN100', 120]], PK, 'gld')[0];
  ck('定额单位10m', it.quotaUnit, '10m');
  ck('换算系数10', it.quotaFactor, 10);
  ck('清单单位m', it.unit, 'm');
  ck('清单工程量保留', it.quantity, 120);
})();

// ============================================================
// 20. 镀锌钢管（031001002 / 第八册 8-1~8-11、8-173~8-183、8-1128~8-1131、8-1132~8-1140）
// ============================================================
(function () {
  var PK = A.getPeriods()[0].period;
  function mk(name) { return A.buildItem(name); }
  function q(name) { var it = mk(name); return { it: it, q: A.matchQuota(it) }; }

  // 清单编码与材质
  ck('镀锌钢管清单编码', mk('镀锌钢管DN50').listCode, '031001002');
  ck('镀锌钢管清单名称', mk('镀锌钢管DN50').listName, '镀锌钢管');
  ck('内外壁热浸镀锌识别', mk('内外壁热浸镀锌焊接普通钢管DN100').material, '镀锌钢');
  ck('热镀锌识别', mk('热镀锌钢管DN25').material, '镀锌钢');
  ck('镀锌钢默认普通螺纹', mk('镀锌钢管DN50').joint, 'thread');
  ck('燃气自动预选', mk('室内燃气镀锌钢管DN50').joint, 'gas_thread');
  ck('天然气自动预选', mk('室外天然气镀锌钢管DN32').joint, 'gas_thread');
  ck('镀锌材质类别', mk('镀锌钢管DN50').category, 'galv');

  // 室外给水 8-1~8-11
  var outDn = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150];
  outDn.forEach(function (dn, i) {
    ck('室外镀锌DN' + dn, q('室外给水镀锌钢管DN' + dn).q.code, '8-' + (1 + i));
  });
  ck('室外镀锌名称', q('室外镀锌钢管DN100').q.name, '室外管道 镀锌钢管(螺纹连接) 公称直径100mm以内');

  // 室内给水 8-173~8-183
  outDn.forEach(function (dn, i) {
    ck('室内镀锌DN' + dn, q('室内给水镀锌钢管DN' + dn).q.code, '8-' + (173 + i));
  });
  ck('室内镀锌默认室内', q('镀锌钢管DN80').it.loc, 'in');

  // 室外燃气 8-1128~8-1131（DN25/32/40/50）
  [25, 32, 40, 50].forEach(function (dn, i) {
    ck('室外燃气DN' + dn, q('室外燃气镀锌钢管DN' + dn).q.code, '8-' + (1128 + i));
  });
  // 室内燃气 8-1132~8-1140（DN15~100）
  [15, 20, 25, 32, 40, 50, 65, 80, 100].forEach(function (dn, i) {
    ck('室内燃气DN' + dn, q('室内燃气镀锌钢管DN' + dn).q.code, '8-' + (1132 + i));
  });

  // 档位回退与超档
  var g1 = q('室外燃气镀锌钢管DN20');
  ck('室外燃气DN20→DN25档', g1.q.code, '8-1128');
  ck('室外燃气DN20标推算', g1.q.inferred, true);
  var g2 = q('室内燃气镀锌钢管DN125');
  ck('室内燃气DN125→DN100档', g2.q.code, '8-1140');
  ck('室内燃气超档提示', /超出范围/.test(g2.it.warn) || /超/.test(A.buildWarn(g2.it, g2.q)), true);
  var g3 = q('镀锌钢管DN200');
  ck('镀锌DN200→150档', g3.q.code, '8-183');
  ck('镀锌DN200标推算', g3.q.inferred, true);
  var g4 = q('镀锌钢管DN70');
  ck('镀锌DN70→DN80档', g4.q.code, '8-180');

  // 连接方式可选项
  var gItem = mk('镀锌钢管DN50');
  ck('镀锌连接方式选项', A.jointsOf(gItem), ['thread', 'gas_thread']);
  ck('镀锌默认连接', A.defaultJoint(gItem), 'thread');
  ck('燃气连接中文', A.JOINT_CN.gas_thread, '螺纹连接（燃气）');

  // 主材价
  var p50 = A.lookupGalvPrice(PK, mk('镀锌钢管DN50'));
  ck('镀锌DN50主材价', p50.price, 24.5);
  var p70 = A.lookupGalvPrice(PK, mk('镀锌钢管DN70'));
  ck('镀锌DN70取80档价', p70.price, 39.5);
  var p200 = A.lookupGalvPrice(PK, mk('镀锌钢管DN200'));
  ck('镀锌DN200超档价', p200.price, 126);
  ck('镀锌价格来源', p50.source, 'market');

  // 定额单位
  var row = A.parseRows([[1, '室内燃气镀锌钢管 DN65', 120]], PK, 'gld')[0];
  ck('镀锌定额单位10m', row.quotaUnit, '10m');
  ck('镀锌换算系数', row.quotaFactor, 10);
  ck('镀锌清单单位m', row.unit, 'm');
  ck('镀锌工程量保留', row.quantity, 120);
  ck('燃气特征含气压试验', /气压试验/.test(row.features), true);
  ck('燃气特征含连接形式', /连接形式:螺纹连接/.test(row.features), true);

  // 整表混合
  var mix = A.parseRows([
    [1, '内外壁热浸镀锌焊接普通钢管DN100', 120],
    [2, '室外燃气镀锌钢管DN40', 30],
    [3, '机制离心排水铸铁管DN150', 80]
  ], PK, 'gld');
  ck('混合表条数（含自动补支架）', mix.length, 4);
  ck('混合表末行支架', mix[3].category, 'bracket');
  ck('混合表镀锌1', mix[0].quotaCode, '8-181');
  ck('混合表镀锌燃气', mix[1].quotaCode, '8-1130');
  ck('混合表铸铁', mix[2].quotaCode, '8-357');
  ck('混合表主材合计（管道）', Number(mix.filter(function (d) { return d.category !== 'bracket'; }).reduce(function (s, d) { return s + (d.price === null ? 0 : d.price * d.quantity); }, 0).toFixed(2)), 120 * 52 + 30 * 20 + 80 * 105);
  ck('混合表支架 241.5kg', mix[3].quantity, 241.5);
})();


console.log('\n== 19. 无缝钢管 / 焊接钢管 ==');
ck('无缝清单码', pr('无缝钢管 DN100').listCode, '031001003');
ck('无缝室内焊接DN32', code('无缝钢管 DN32 焊接'), '8-195');
ck('无缝室内焊接DN100', code('无缝钢管 DN100 焊接'), '8-200');
ck('无缝室内焊接DN300', code('无缝钢管 DN300 焊接'), '8-205');
ck('无缝室外焊接DN32', code('无缝钢管 DN32 焊接 室外'), '8-23');
ck('无缝室外焊接DN400', code('无缝钢管 DN400 焊接 室外'), '8-35');
ck('无缝沟槽DN65', code('无缝钢管 DN65 沟槽连接'), '8-206');
ck('无缝沟槽DN250', code('无缝钢管 DN250 沟槽连接'), '8-212');
ck('镀锌无缝归无缝', pr('内外壁热浸镀锌无缝钢管 DN50').listCode, '031001003');
ck('焊接钢管清单码', pr('焊接钢管 DN100').listCode, '031001004');
ck('焊接钢管室内DN200', code('焊接钢管 DN200'), '8-203');
ck('焊接钢管室外DN200', code('焊接钢管 DN200 焊接 室外'), '8-31');
ck('焊接钢管沟槽DN200', code('焊接钢管 DN200 沟槽连接'), '8-211');
ck('无缝单位m', pr('无缝钢管 DN100').unit, 'm');
ck('无缝定额单位10m', pr('无缝钢管 DN100').quotaUnit, '10m');
ck('无缝换算系数', pr('无缝钢管 DN100').quotaFactor, 10);
ck('无缝DN32主材价', pr('无缝钢管 DN32').price, 19);
ck('无缝DN100主材价', pr('无缝钢管 DN100').price, 60);
ck('无缝DN400主材价', pr('无缝钢管 DN400').price, 300);
ck('焊接DN200主材价', pr('焊接钢管 DN200').price, 100);
ck('无缝价格来源', pr('无缝钢管 DN100').priceSource, 'market');
ck('无缝特征连接形式', /连接形式:焊接/.test(pr('无缝钢管 DN100').features), true);
ck('沟槽特征管件另计', /沟槽管件另计/.test(pr('无缝钢管 DN100 沟槽连接').features), true);

console.log('\n== 20. 铜管 ==');
ck('铜管清单码', pr('铜管 DN54').listCode, '031001005');
ck('铜管默认卡压', code('铜管 DN54'), '8-314');
ck('铜管卡压DN18', code('铜管 DN18 卡压连接'), '8-309');
ck('铜管卡压DN108', code('铜管 DN108 卡压连接'), '8-317');
ck('铜管氧乙炔DN54', code('铜管 DN54 氧乙炔焊'), '8-323');
ck('铜管氧乙炔DN108', code('铜管 DN108 氧乙炔焊'), '8-326');
ck('铜管钎焊DN54', code('铜管 DN54 钎焊'), '8-332');
ck('铜管钎焊DN108', code('铜管 DN108 钎焊'), '8-335');
ck('铜管DN54主材价', pr('铜管 DN54').price, 155);
ck('铜管DN108主材价', pr('铜管 DN108').price, 430);
ck('铜管连接形式', /连接形式:钎焊/.test(pr('铜管 DN54 钎焊').features), true);
ck('铜管焊材', /焊条\/焊丝/.test(pr('铜管 DN54 钎焊').features), true);

console.log('\n== 21. 不锈钢管 ==');
ck('不锈钢清单码', pr('不锈钢管 DN25').listCode, '031001006');
ck('不锈钢卡压DN15', code('不锈钢管 DN15 卡压连接'), '8-261');
ck('不锈钢卡压DN100', code('不锈钢管 DN100 卡压连接'), '8-269');
ck('不锈钢卡套DN15', code('不锈钢管 DN15 卡套连接'), '8-270');
ck('不锈钢氩弧DN100', code('不锈钢管 DN100 承插氩弧焊'), '8-287');
ck('不锈钢螺纹DN50', code('不锈钢管 DN50 螺纹连接'), '8-293');
ck('不锈钢电弧DN200', code('不锈钢管 DN200 对接电弧焊'), '8-308');
ck('燃气不锈钢氩弧DN25', code('室内燃气不锈钢管 DN25 承插氩弧焊'), '8-1141');
ck('燃气不锈钢卡套DN15', code('室内燃气不锈钢管 DN15 卡套连接'), '8-1148');
ck('燃气不锈钢卡压DN50', code('燃气不锈钢管 DN50 卡压连接'), '8-1159');
ck('燃气介质识别', pr('室内燃气不锈钢管 DN25').medium, 'gas');
ck('不锈钢DN100主材价', pr('不锈钢管 DN100').price, 168);
ck('不锈钢DN200主材价', pr('不锈钢管 DN200').price, 400);
ck('燃气特征气压试验', /气压试验/.test(pr('室内燃气不锈钢管 DN25').features), true);

console.log('\n== 22. 复合管 ==');
ck('复合管清单码', pr('铝塑复合管 De32').listCode, '031001007');
ck('室外钢骨架De32', code('钢骨架塑料复合管 De32 电熔连接 室外'), '8-81');
ck('室外钢骨架De160', code('钢骨架塑料复合管 De160 电熔连接 室外'), '8-89');
ck('室内钢骨架De20', code('室内钢骨架塑料复合管 De20 电熔连接'), '8-250');
ck('室内钢骨架De160', code('室内钢骨架塑料复合管 De160 电熔连接'), '8-260');
ck('铝塑卡压De20', code('铝塑复合管 De20 卡压连接'), '8-227');
ck('铝塑卡套De32', code('铝塑复合管 De32 卡套连接'), '8-235');
ck('铝塑热熔De160', code('铝塑复合管 De160 热熔连接'), '8-249');
ck('铝塑De32主材价', pr('铝塑复合管 De32').price, 16);
ck('钢骨架De110主材价', pr('钢骨架塑料复合管 De110').price, 105);
ck('复合管规格De', A.parseRows([[1, '铝塑复合管 De32', 5]], '2026-10', 'gld')[0].dn, 32);

console.log('\n== 23. 塑料管 ==');
ck('塑料清单码', pr('PPR给水管 De32').listCode, '031001008');
ck('室外给水热熔De32', code('室外塑料给水管 De32 热熔连接'), '8-36');
ck('室外给水热熔De315', code('室外塑料给水管 De315 热熔连接'), '8-47');
ck('室外给水电熔De110', code('室外塑料给水管 De110 电熔连接'), '8-54');
ck('室外给水粘接De110', code('室外塑料给水管 De110 粘接'), '8-66');
ck('室内给水热熔De20', code('室内塑料给水管 De20 热熔连接'), '8-410');
ck('室内给水电熔De25', code('室内塑料给水管 De25 电熔连接'), '8-422');
ck('室内给水粘接De160', code('室内塑料给水管 De160 粘接'), '8-442');
ck('室内排水粘接De50', code('室内塑料排水管 De50 粘接'), '8-377');
ck('室内排水粘接De160', code('室内塑料排水管 De160 粘接'), '8-380');
ck('室内排水热熔De250', code('室内塑料排水管 De250 热熔连接'), '8-388');
ck('室内雨水粘接De75', code('室内塑料雨水管 De75 粘接'), '8-405');
ck('室内雨水粘接De250', code('室内塑料雨水管 De250 粘接'), '8-409');
ck('PPR De32主材价', pr('PPR给水管 De32').price, 14.5);
ck('PVC排水De110主材价', pr('PVC-U排水管 De110').price, 35);
ck('排水介质识别', pr('PVC-U排水管 De110').medium, 'drain');
ck('排水特征通球', /通球试验/.test(pr('PVC-U排水管 De110').features), true);
ck('钢管特征规格DN', /型号规格:DN100/.test(pr('无缝钢管 DN100').features), true);
ck('铜管特征规格De', /型号规格:De54/.test(pr('铜管 DN54').features), true);
ck('复合管特征规格De', /型号规格:De32/.test(pr('铝塑复合管 De32').features), true);
ck('塑料管特征规格De', /型号规格:De25/.test(pr('PPR给水管 De25').features), true);

console.log('\n== 24. 附加定额（消毒冲洗 / 沟槽管件） ==');
var g1 = pr('无缝钢管 DN100', 100);
ck('消毒冲洗挂出', g1.extras.length, 1);
ck('消毒冲洗DN100→8-491', g1.extras[0].code, '8-491');
ck('消毒冲洗单位100m', g1.extras[0].unit, '100m');
ck('消毒冲洗系数100', g1.extras[0].factor, 100);
ck('消毒冲洗数量=管长', g1.extras[0].qty, 100);
ck('消毒冲洗换算量', Number((g1.extras[0].qty / g1.extras[0].factor).toFixed(4)), 1);
ck('消毒冲洗DN50→8-490', pr('无缝钢管 DN50', 100).extras[0].code, '8-490');
ck('消毒冲洗DN400→8-494', pr('无缝钢管 DN400 焊接 室外', 100).extras[0].code, '8-494');
var g3 = pr('无缝钢管 DN65 沟槽连接', 100);
ck('沟槽附加两项', g3.extras.length, 2);
ck('沟槽管件8-220', g3.extras[0].code, '8-220');
ck('沟槽管件单位10个', g3.extras[0].unit, '10个');
ck('沟槽管件系数10', g3.extras[0].factor, 10);
ck('沟槽管件数量按6m', g3.extras[0].qty, 17);
ck('沟槽管件换算量', Number((g3.extras[0].qty / 10).toFixed(2)), 1.7);
ck('沟槽DN80管件8-221', pr('无缝钢管 DN80 沟槽连接').extras[0].code, '8-221');
ck('沟槽DN250管件8-226', pr('无缝钢管 DN250 沟槽连接').extras[0].code, '8-226');
ck('管件角色', g3.extras[0].role, 'fitting');
ck('冲洗角色', g3.extras[1].role, 'flush');
ck('燃气也挂消毒冲洗', pr('室内燃气不锈钢管 DN25').extras.length, 1);
ck('燃气提示不计取', /一般不计取/.test(pr('室内燃气不锈钢管 DN25').warn), true);
ck('排水提示不计取', /一般不计取/.test(pr('室内塑料排水管 De110 粘接').warn), true);
ck('沟槽提示管件', /沟槽连接已附加管件定额/.test(pr('无缝钢管 DN100 沟槽连接').warn), true);

console.log('\n== 25. 导出多定额行 ==');
var capG = null, capJ = null;
global.XLSX = {
  utils: {
    aoa_to_sheet: function (d) { return d; },
    book_new: function () { return {}; },
    book_append_sheet: function (wb, ws) { wb.__rows = ws; }
  },
  writeFile: function (wb, name) { if (/建经/.test(name)) capJ = wb.__rows; else capG = wb.__rows; }
};
A.exportGLD([pr('无缝钢管 DN65 沟槽连接', 100)]);
ck('广联达总行数', capG.length, 8);
ck('广联达表头15列', capG[0].length, 15);
ck('清单行项目编码', capG[1][8], '031001003');
ck('清单行类型', capG[1][9], '清单行');
ck('清单行单位m', capG[1][12], 'm');
ck('清单行工程量', capG[1][13], 100);
ck('主定额行号', capG[2][0], '1.1');
ck('主定额编码', capG[2][8], '8-206');
ck('主定额单位10m', capG[2][12], '10m');
ck('主定额工程量÷10', capG[2][13], 10);
ck('管件定额行号', capG[3][0], '1.2');
ck('管件定额编码', capG[3][8], '8-220');
ck('管件定额单位10个', capG[3][12], '10个');
ck('管件定额工程量', capG[3][13], 1.7);
ck('冲洗定额行号', capG[4][0], '1.3');
ck('冲洗定额编码', capG[4][8], '8-491');
ck('冲洗定额单位100m', capG[4][12], '100m');
ck('冲洗定额工程量', capG[4][13], 1);
ck('设备行最后', capG[5][9], '子目下设备');
ck('设备行编码', capG[5][8], 'Z00741-001');
ck('设备行单价', capG[5][14], 37);
ck('合计行', capG[7][0], '合计');
A.exportJianjing([pr('无缝钢管 DN65 沟槽连接', 100)]);
ck('建经总行数', capJ.length, 6);
ck('建经表头8列', capJ[0].length, 8);
ck('建经主定额', capJ[1][3], '8-206');
ck('建经管件另起一行', capJ[2][3], '8-220');
ck('建经管件数量说明', /数量1\.7 10个/.test(capJ[2][4]), true);
ck('建经冲洗行', capJ[3][3], '8-491');
ck('建经合计', capJ[5][0], '合计');
delete global.XLSX;

console.log('\n== 26. 阀门及管道附件（031002001~031002305，与暖通站同口径） ==');
var v1 = pr('闸阀 DN100', 4);
ck('闸阀分类', v1.category, 'waterValve');
ck('闸阀清单031002001', v1.listCode, '031002001');
ck('闸阀DN100定额8-622', v1.quotaCode, '8-622');
ck('闸阀信息价290', v1.price, 290);
ck('闸阀信息价不标品牌', v1.priceBrand, '');
ck('闸阀单位个', v1.unit, '个');
var v2 = pr('Y型过滤器 DN150', 2);
ck('过滤器DN150定额8-624', v2.quotaCode, '8-624');
ck('过滤器信息价500', v2.price, 500);
var v3 = pr('橡胶软接头 DN200', 2);
ck('软接头市场价', v3.priceSource, 'market');
ck('软接头标品牌', /冠龙/.test(v3.priceBrand || ''), true);
var v4 = pr('波纹补偿器 DN300', 1);
ck('补偿器DN300定额8-627', v4.quotaCode, '8-627');
var v5 = pr('闸阀 DN32', 2);
ck('DN32螺纹8-582', v5.quotaCode, '8-582');
ck('DN32闸阀信息价95', v5.price, 95);
var v6 = pr('闸阀 DN500', 1);
ck('DN500取8-629', v6.quotaCode, '8-629');
ck('DN500超档提示', /超本类最大档/.test(v6.warn), true);
var v7 = pr('自动排气阀 DN25', 6);
ck('自动排气阀031002303', v7.listCode, '031002303');
ck('自动排气阀8-682', v7.quotaCode, '8-682');
ck('自动排气阀信息价95', v7.price, 95);
var v8 = pr('散热器温控阀 DN25', 2);
ck('温控阀031002306', v8.listCode, '031002306');
ck('温控阀8-686', v8.quotaCode, '8-686');
ck('温控阀市场价260', v8.price, 260);
var v9 = pr('浮球阀 DN100', 2);
ck('浮球阀031002301', v9.listCode, '031002301');
ck('浮球阀8-615', v9.quotaCode, '8-615');
ck('浮球阀市场价480', v9.price, 480);
var v10 = pr('液压水位控制阀 DN150', 1);
ck('水位控制阀031002302', v10.listCode, '031002302');
ck('水位控制阀8-648', v10.quotaCode, '8-648');
ck('水位控制阀市场价1900', v10.price, 1900);
var v11 = pr('口部冲洗阀', 2);
ck('口部冲洗阀031002304', v11.listCode, '031002304');
ck('口部冲洗阀8-1260', v11.quotaCode, '8-1260');
ck('口部冲洗阀单位套', v11.unit, '套');
ck('口部冲洗阀480', v11.price, 480);
ck('口部冲洗阀标品牌', /人防/.test(v11.priceBrand || ''), true);
var v12 = pr('电磁阀 DN25', 3);
ck('电磁阀031002305', v12.listCode, '031002305');
ck('电磁阀DN25螺纹8-605', v12.quotaCode, '8-605');
ck('电磁阀DN25市场价230', v12.price, 230);
var v13 = pr('电磁阀 DN100', 3);
ck('电磁阀DN100法兰8-635', v13.quotaCode, '8-635');
ck('电磁阀DN100市场价820', v13.price, 820);
var v14 = pr('电磁阀 DN500', 1);
ck('电磁阀DN500法兰8-644', v14.quotaCode, '8-644');
ck('电磁阀DN500市场价6500', v14.price, 6500);
ck('阀门不影响管道识别', A.buildItem('球墨铸铁给水管 DN200').category, 'castIron');
ck('阀门特征含类型', /类型:金属阀门/.test(v1.features), true);
ck('阀门无部位下拉', A.isValveCat(v1.category), true);

console.log('\n== 27. 管道支架 / 保温绝热（与暖通站同口径） ==');
ck('橡塑识别', A.buildItem('橡塑保温 DN100').category, 'insulRubber');
ck('橡塑保温壳识别', A.buildItem('橡塑保温壳').category, 'insulRubber');
ck('玻璃棉识别', A.buildItem('离心玻璃棉 40mm').category, 'insulGlass');
ck('玻璃棉简写识别', A.buildItem('玻璃棉').category, 'insulGlass');
ck('管道支架识别', A.buildItem('管道支架').category, 'bracket');
ck('支吊架识别', A.buildItem('管道支吊架制安').category, 'bracket');
var ir = A.buildItem('橡塑保温 DN100');
ck('橡塑清单031208002', ir.listCode, '031208002');
ck('橡塑定额11-582', A.matchQuota(ir).code, '11-582');
ck('橡塑单位m³', ir.unit, 'm³');
ck('橡塑厚度30', ir.insulThk, 30);
ck('橡塑市场价1000', A.auxPrice(ir).price, 1000);
ck('橡塑标品牌', /华美/.test(A.auxPrice(ir).brand || ''), true);
var ig = A.buildItem('离心玻璃棉');
ck('玻璃棉定额11-647', A.matchQuota(ig).code, '11-647');
ck('玻璃棉厚度40', ig.insulThk, 40);
ck('玻璃棉市场价450', A.auxPrice(ig).price, 450);
var bk = A.buildItem('管道支架');
ck('支架定额7-138', A.matchQuota(bk).code, '7-138');
ck('支架定额单位100kg', A.matchQuota(bk).unit, '100kg');
ck('支架单位kg', bk.unit, 'kg');
ck('支架型钢信息价4.2', A.auxPrice(bk).price, 4.2);
ck('支架信息价来源', A.auxPrice(bk).source, 'info');
ck('含量DN50', A.bracketWeightPerM(50), 0.45);
ck('含量DN100', A.bracketWeightPerM(100), 0.9);
ck('含量DN200', A.bracketWeightPerM(200), 1.5);
ck('含量DN400', A.bracketWeightPerM(400), 2.4);
ck('含量DN500', A.bracketWeightPerM(500), 3.2);
ck('无管径0.6', A.bracketWeightPerM(null), 0.6);

// 自动补支架 + 已有支架不重复
var d1 = A.parseRows([[1, '球墨铸铁给水管 DN200', 80], [2, '镀锌钢管 DN50', 60]], '2026-10', 'glodon');
ck('自动补支架行数', d1.length, 3);
ck('支架 147kg', d1[2].quantity, 147);
ck('支架不附消毒冲洗', (d1[2].extras || []).length, 0);
var d2 = A.parseRows([[1, '球墨铸铁给水管 DN200', 80], [2, '管道支架', 200]], '2026-10', 'glodon');
ck('已带支架不重复补', d2.length, 2);
ck('已带支架工程量保留', d2[1].quantity, 200);
var d3 = A.parseRows([[1, '闸阀 DN100', 4]], '2026-10', 'glodon');
ck('仅阀门不补支架', d3.length, 1);

// 保温单位折算
var d4 = A.parseRows([[1, '橡塑保温 DN100', 20, 'm²']], '2026-10', 'glodon');
ck('橡塑m²折算m³', d4[0].quantity, 0.6);
var d5 = A.parseRows([[1, '离心玻璃棉 DN200', 10, 'm']], '2026-10', 'glodon');
ck('玻璃棉m折算m³', d5[0].quantity, Math.round(Math.PI * (0.2 + 0.04) * 0.04 * 10 * 1000) / 1000);
var d6 = A.parseRows([[1, '橡塑保温 DN100', 5, 'm³']], '2026-10', 'glodon');
ck('橡塑m³原样', d6[0].quantity, 5);
ck('保温特征含厚度', /厚度30mm/.test(A.buildItem('橡塑保温 DN100').features || A.featureText(A.buildItem('橡塑保温 DN100'))), true);

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
if (fail) process.exit(1);
