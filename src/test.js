const JsonFixer = require('./components/JsonFixer.jsx');

const testCases = [
  // 标准JSON
  `{
    "extraSku": "6411174",
    "id": "172557532412248601",
    "name": "燕麦奶",
    "price": 0
  }`,
  
  // 基本测试
  `{
    'extraSku': "6411174",
    "id": "172557532412248601",
    "name": "燕麦奶",
    "price": 0
  }`,
  
  // 错误的方括号
  `{
    "extraSku": "6411174",
    "id": "172557532412248601",
    "name": "燕麦奶",
    "price": 0]
  }`,
  
  // 多余的大括号
  `{
    "extraSku": "6411174",
    "id": "172557532412248601",
    "name": "燕麦奶",
    "price": 0}}
  }`,

  // 键名前的错误括号
  `{
    "extraSku": "6411174",
    "id": "172557532412248601",
    "name": "燕麦奶",
    []"price": 0
  }`,

  // 错误的斜杠
  `{
    "extraSku": "6411174",
    "id": "172557532412248601",
    "name": "燕麦奶",/
    "price": 0
  }`,

  // 转义字符和换行符
  `{\\n  \\"extraSku\\": \\"6411174\\",\\n  \\"id\\": \\"172557532412248601\\",\\n  \\"name\\": \\"燕麦奶\\",\\n  \\"price\\": 0\\n}`
];

async function test() {
  for (const testCase of testCases) {
    console.log('\n============ 测试用例 ============');
    console.log('输入:', testCase);
    const result = await JsonFixer.fixJsonString(testCase);
    console.log('处理结果:');
    console.log('- 是否需要修复:', !result.needsNoFix);
    console.log('- 是否显示对比栏:', result.showDiff);
    console.log('- 提示消息:', result.message);
    if (result.showDiff) {
      console.log('- 修复后:', result.result);
    }
    console.log('================================\n');
  }
}

test(); 