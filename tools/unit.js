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
ck('镀锌钢管→other', pr('镀锌钢管 DN50').category, 'other');

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
ck('室外给水可选接口', A.jointsOf('out', 'water'), ['asbestos', 'lead', 'expand', 'rubber']);
ck('室内给水可选接口', A.jointsOf('in', 'water'), ['asbestos', 'lead', 'expand']);
ck('室外排水可选接口', A.jointsOf('out', 'drain'), ['asbestos', 'cement']);
ck('室内排水可选接口', A.jointsOf('in', 'drain'), ['asbestos', 'cement']);
ck('默认接口石棉水泥', A.defaultJoint('out', 'water'), 'asbestos');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
if (fail) process.exit(1);
