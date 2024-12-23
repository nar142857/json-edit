import React from 'react';

/**
 * JSON修复工具类
 * 提供JSON字符串修复功能
 */
class JsonFixer {
  /**
   * 修复非标准JSON字符串
   * @param {string} str - 需要修复的JSON字符串
   * @returns {string} - 修复后的JSON字符串
   */
  static fixJsonString = (str) => {
    try {
      console.log('开始修复JSON，原始输入:', str);
      let processedStr = str;
      
      // 1. 预处理：清理空白字符、注释和控制字符
      console.log('1. 开始预处理...');
      processedStr = processedStr
        .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
        .replace(/\/\/.*/g, '') // 移除单行注释
        .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // 移除控制字符
        .replace(/^\s+|\s+$/g, '') // 移除首尾空白
        // 替换全角字符为半角字符
        .replace(/，/g, ',')     // 全角逗号
        .replace(/：/g, ':')     // 全角冒号
        .replace(/｛/g, '{')     // 全角大括号
        .replace(/｝/g, '}')     // 全角大括号
        .replace(/［/g, '[')     // 全角中括号
        .replace(/］/g, ']')     // 全角中括号
        .replace(/＂/g, '"')     // 全角引号
        .replace(/＇/g, "'")     // 全角单引号
        .replace(/（/g, '(')     // 全角圆括号
        .replace(/）/g, ')')     // 全角圆括号
        .replace(/／/g, '/')     // 全角斜杠
        .replace(/＼/g, '\\')    // 全角反斜杠
        .replace(/～/g, '~')     // 全角波浪号
        .replace(/｜/g, '|')     // 全角竖线
        .replace(/　/g, ' ');    // 全角空格
      console.log('预处理后:', processedStr);

      // 2. 处理转义字符
      console.log('2. 处理转义字符...');
      try {
        // 如果字符串包含转义字符，尝试解析它
        if (processedStr.includes('\\')) {
          processedStr = JSON.parse('"' + processedStr.replace(/^"|"$/g, '').replace(/\\"/g, '"') + '"');
        }
      } catch (e) {
        console.log('处理转义字符失败，继续其他修复:', e.message);
      }
      console.log('处理转义字符后:', processedStr);

      // 3. 处理多余的逗号
      console.log('3. 处理多余的逗号...');
      processedStr = processedStr
        // 移除对象末尾的逗号
        .replace(/,(\s*})/g, '$1')
        // 移除数组末尾的逗号
        .replace(/,(\s*\])/g, '$1')
        // 移除多余的空行
        .replace(/\n\s*\n/g, '\n');
      console.log('处理逗号后:', processedStr);

      // 4. 修复基本语法错误
      console.log('4. 修复基本语法错误...');
      processedStr = processedStr
        // 处理缺少引号的键名
        .replace(/([{,]\s*)([a-zA-Z0-9_$@\-/]+)(\s*):/g, '$1"$2"$3:')
        // 处理单引号
        .replace(/'([^']*)'(\s*[,}\]])/g, '"$1"$2')
        .replace(/'([^']*)'(\s*:)/g, '"$1"$2')
        .replace(/:\s*'([^']*)'/g, ': "$1"')
        // 修复错误的布尔值和null写法
        .replace(/:\s*True\b/gi, ': true')
        .replace(/:\s*False\b/gi, ': false')
        .replace(/:\s*None\b/gi, ': null')
        .replace(/:\s*undefined\b/gi, ': null')
        .replace(/:\s*NaN\b/g, ': null')
        // 处理数值周围不必要的引号
        .replace(/"(-?\d+\.?\d*)"(\s*[,}\]])/g, '$1$2');
      console.log('修复基本语法错误后:', processedStr);

      // 5. 尝试解析和格式化
      console.log('5. 尝试解析和格式化...');
      try {
        const parsed = JSON.parse(processedStr);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        console.log('首次解析失败，进行最后的修复:', e.message);
        
        // 最后的修复尝试
        processedStr = processedStr
          // 处理转义字符
          .replace(/\\\\/g, '\\')
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          // 确保属性之间有逗号
          .replace(/}(\s*){/g, '},{')
          .replace(/](\s*)\[/g, '],[')
          // 移除多余的逗号
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/,\s*,/g, ',')
          .replace(/,\s*$/g, '')
          // 再次尝试处理全角字符
          .replace(/[，：｛｝［］＂＇（）／＼～｜　]/g, char => {
            const map = {
              '，': ',', '：': ':', '｛': '{', '｝': '}',
              '［': '[', '］': ']', '＂': '"', '＇': "'",
              '（': '(', '）': ')', '／': '/', '＼': '\\',
              '～': '~', '｜': '|', '　': ' '
            };
            return map[char] || char;
          });
        
        console.log('最后修复尝试后:', processedStr);
        
        try {
          const parsed = JSON.parse(processedStr);
          return JSON.stringify(parsed, null, 2);
        } catch (e) {
          console.log('所有修复尝试都失败:', e.message);
          // 如果所有尝试都失败，尝试eval
          try {
            const evalResult = eval('(' + processedStr + ')');
            return JSON.stringify(evalResult, null, 2);
          } catch (e) {
            console.log('eval尝试也失败:', e.message);
            return str;
          }
        }
      }
    } catch (e) {
      console.error('JSON修复过程出错:', e.message);
      return str;
    }
  }
}

export default JsonFixer; 