/**
 * JSON修复工具类
 * 提供JSON字符串修复功能，支持多层嵌套
 */
const { jsonrepair } = require('jsonrepair');

class JsonFixer {
  /**
   * 修复非标准JSON字符串
   * @param {string} str - 需要修复的JSON字符串
   * @returns {Promise<object>} - 返回包含修复结果和错误信息的对象
   */
  static async fixJsonString(str) {
    try {
      // 首先尝试直接解析原始输入
      try {
        console.log('尝试解析JSON，原始输入:', str);
        const parsed = JSON.parse(str);
        console.log('解析成功，标准JSON，无需修复');
        const formatted = JSON.stringify(parsed, null, 2);
        const result = {
          success: true,
          result: formatted,
          error: null,
          needsNoFix: true,
          showDiff: false,
          isDiffMode: false,
          message: '标准JSON，无需修复'
        };
        console.log('返回结果:', result);
        return result;
      } catch (e) {
        console.log('解析失败，开始修复JSON');
        
        // 预处理字符
        let processedStr = str
          .replace(/，/g, ',')              // 处理全角逗号
          .replace(/：/g, ':')              // 处理全角冒号
          .replace(/[""]/g, '"')            // 处理中文双引号
          .replace(/['']/g, '"')            // 处理中文单引号
          .replace(/,\s*,+/g, ',')          // 处理连续的逗号
          .replace(/,\s*}/g, '}')           // 处理对象末尾的逗号
          .replace(/,\s*]/g, ']');          // 处理数组末尾的逗号

        // 使用 jsonrepair 库修复 JSON，启用所有修复选项
        const fixed = jsonrepair(processedStr, {
          stringsOnlyDoubleQuotes: true,    // 只使用双引号
          allowComments: true,              // 允许注释
          allowTrailingComma: true,         // 允许尾随逗号
          allowUnquotedProperties: true,     // 允许未加引号的属性名
          allowSingleQuotes: true,          // 允许单引号
          allowEscapedUnicode: true,        // 允许转义的 Unicode
          allowNonStringKeyValues: true,     // 允许非字符串的键值
          allowSpecialFloats: true,         // 允许特殊浮点数
          allowUnquotedControlCharacters: true, // 允许未加引号的控制字符
          allowInvalidUnicodeEscapes: true,  // 允许无效的 Unicode 转义
          allowMissingCommas: true,         // 允许缺失的逗号
          allowMissingColons: true,         // 允许缺失的冒号
          allowMissingValues: true,         // 允许缺失的值
          allowTrailingDecimalPoint: true,   // 允许尾随小数点
          allowLeadingDecimalPoint: true,    // 允许前导小数点
          allowNumericKeys: true,           // 允许数字键名
          allowInfinity: true,              // 允许无穷大
          allowNaN: true,                   // 允许 NaN
          allowEmptyValues: true,           // 允许空值
          allowArrayTrailingComma: true,    // 允许数组尾随逗号
          allowObjectTrailingComma: true,    // 允许对象尾随逗号
          allowArrayLeadingComma: true,     // 允许数组前导逗号
          allowObjectLeadingComma: true,     // 允许对象前导逗号
          allowArrayLeadingZeros: true,     // 允许数组前导零
          allowObjectLeadingZeros: true,     // 允许对象前导零
          allowArraySpread: true,           // 允许数组展开
          allowObjectSpread: true,          // 允许对象展开
          allowArrayElision: true,          // 允许数组省略
          allowObjectElision: true,         // 允许对象省略
          allowArrayHoles: true,            // 允许数组空洞
          allowObjectHoles: true,           // 允许对象空洞
          allowArrayDuplicates: true,       // 允许数组重复
          allowObjectDuplicates: true,      // 允许对象重复
          allowArrayIndentation: true,      // 允许数组缩进
          allowObjectIndentation: true,     // 允许对象缩进
          allowArrayNewline: true,          // 允许数组换行
          allowObjectNewline: true,         // 允许对象换行
          allowArrayComments: true,         // 允许数组注释
          allowObjectComments: true,        // 允许对象注释
          allowArrayTrailingSpaces: true,   // 允许数组尾随空格
          allowObjectTrailingSpaces: true,  // 允许对象尾随空格
          allowArrayLeadingSpaces: true,    // 允许数组前导空格
          allowObjectLeadingSpaces: true,   // 允许对象前导空格
        });

        // 格式化修复后的 JSON
        const formatted = JSON.stringify(JSON.parse(fixed), null, 2);
        console.log('修复后:', formatted);
        
        const response = {
          success: true,
          result: formatted,
          error: null,
          needsNoFix: false,
          showDiff: true,
          isDiffMode: true,
          message: '已修复JSON格式问题'
        };
        console.log('返回结果:', response);
        return response;
      }
    } catch (e) {
      console.error('JSON修复过程出错:', e.message);
      return {
        success: false,
        result: str,
        error: '修复过程出错：' + e.message,
        needsNoFix: false,
        showDiff: false,
        isDiffMode: false,
        message: '修复过程出错：' + e.message
      };
    }
  }
}

module.exports = JsonFixer; 