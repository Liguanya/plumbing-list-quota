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

console.log('\n== 15. 其他材质 ==');
ck('薄壁不锈钢管→other', pr('薄壁不锈钢管DN80').category, 'other');
ck('不锈钢无定额', pr('薄壁不锈钢管DN80').quotaCode, '');
ck('不锈钢未计价', pr('薄壁不锈钢管DN80').priceSource, 'na');
ck('不锈钢有提示', /待补充/.test(pr('薄壁不锈钢管DN80').warn), true);
ck('PPR管→other', pr('PPR给水管 DN25').category, 'other');
ck('镀锌钢管→galv', pr('镀锌钢管 DN50').category, 'galv');
ck('焊接钢管→other', pr('焊接钢管 DN50').category, 'other');

console.log('\n== 16. 整表解析 ==');
var rows = A.parseRows([
  ['序号', '项目名称', '长度'],
  [1, '室内排水铸铁管 DN100 石棉水泥接口', 120],
  [2, '室外承插铸铁给水管 青铅接口 DN200', 85.5],
  [3, '薄壁不锈钢管DN80', 60],
  [4, '室内铸铁给水管 石棉水泥接口 DN50', ''],
  ['', '柔性接口机制排水铸铁管 DN150', 30]
], '2026-10', 'guanglianda');
ck('解析条数', rows.length, 5);
ck('序号保留', rows[0].index, '1');
ck('空序号自动编号', rows[4].index, '5');
ck('工程量小数', rows[1].quantity, 85.5);
ck('工程量缺失按1', rows[3].quantity, 1);
ck('工程量缺失提示', /工程量缺失/.test(rows[3].warn), true);
ck('第1行定额', rows[0].quotaCode, '8-356');
ck('第2行定额', rows[1].quotaCode, '8-93');
ck('第3行无定额', rows[2].quotaCode, '');
ck('第4行DN50室内给水', rows[3].quotaCode, '8-348');
ck('第5行柔性排水DN150→8-357', rows[4].quotaCode, '8-357');
ck('主材费合计', Number(rows.reduce(function (s, d) { return s + (d.price === null ? 0 : d.price * d.quantity); }, 0).toFixed(2)), 120 * 62 + 85.5 * 152 + 0 + 1 * 58 + 30 * 105);

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
  ck('混合表条数', mix.length, 3);
  ck('混合表镀锌1', mix[0].quotaCode, '8-181');
  ck('混合表镀锌燃气', mix[1].quotaCode, '8-1130');
  ck('混合表铸铁', mix[2].quotaCode, '8-357');
  ck('混合表主材合计', Number(mix.reduce(function (s, d) { return s + (d.price === null ? 0 : d.price * d.quantity); }, 0).toFixed(2)), 120 * 52 + 30 * 20 + 80 * 105);
})();

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
if (fail) process.exit(1);
