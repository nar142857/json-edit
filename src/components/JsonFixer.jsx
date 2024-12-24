/**
 * JSON修复工具类
 * 提供JSON字符串修复功能
 */
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
        // 如果能成功解析，说明是标准JSON
        console.log('解析成功，标准JSON，无需修复');
        // 返回格式化后的JSON
        const formatted = JSON.stringify(parsed, null, 2);
        const result = {
          success: true,
          result: formatted,
          error: null,
          needsNoFix: true,      // 标准JSON，无需修复
          showDiff: false,       // 不需要打开对比栏
          isDiffMode: false,     // 不需要进入对比模式
          message: '标准JSON，无需修复'  // 用于toast提示的消息
        };
        console.log('返回结果:', {
          needsNoFix: result.needsNoFix,
          showDiff: result.showDiff,
          isDiffMode: result.isDiffMode,
          message: result.message
        });
        return result;
      } catch (e) {
        // 如果解析失败，继续进行修复
        console.log('解析失败，开始修复JSON');
        const result = this.fix(str);
        console.log('修复后:', result);
        
        const response = {
          success: true,
          result: result,
          error: null,
          needsNoFix: false,     // 需要修复
          showDiff: true,        // 需要打开对比栏
          isDiffMode: true,      // 需要进入对比模式
          message: '已修复JSON格式问题'  // 用于toast提示的消息
        };
        console.log('返回结果:', {
          needsNoFix: response.needsNoFix,
          showDiff: response.showDiff,
          isDiffMode: response.isDiffMode,
          message: response.message
        });
        return response;
      }
    } catch (e) {
      console.error('JSON修复过程出错:', e.message);
      const errorResponse = {
        success: false,
        result: str,
        error: '修复过程出错：' + e.message,
        needsNoFix: false,
        showDiff: false,
        isDiffMode: false,
        message: '修复过程出错：' + e.message
      };
      console.log('返回结果:', {
        needsNoFix: errorResponse.needsNoFix,
        showDiff: errorResponse.showDiff,
        isDiffMode: errorResponse.isDiffMode,
        message: errorResponse.message
      });
      return errorResponse;
    }
  }

  /**
   * 内部修复方法
   * @private
   * @param {string} str - 需要修复的JSON字符串
   * @returns {string} - 修复后的JSON字符串
   */
  static fix(str) {
    try {
      // 1. 预处理：处理转义字符和换行符
      let processedStr = str
        .replace(/\\n/g, '\n')          // 将转义的换行符转换为实际换行符
        .replace(/\\"/g, '"')           // 将转义的双引号转换为实际双引号
        .replace(/\\'/g, "'")           // 将转义的单引号转换为实际单引号
        .replace(/\\t/g, '\t')          // 将转义的制表符转换为实际制表符
        .replace(/\\r/g, '\r')          // 将转义的回车符转换为实际回车符
        .replace(/\s+/g, ' ')           // 将多个空白字符替换为单个空格
        .replace(/,\s*[}\]]/g, '}')     // 移除对象和数组末尾的逗号
        .replace(/，/g, ',')            // 替换全角逗号
        .replace(/：/g, ':')            // 替换全角冒号
        .replace(/[""]/g, '"')          // 替换中文双引号
        .replace(/['']/g, '"')          // 替换中文单引号
        .replace(/[}\]]+$/, '}')        // 处理多余的结束括号
        .replace(/[\[\]{}]+(?=\s*["'])/g, '') // 移除键名前的括号
        .replace(/\/+\s*([,}])/g, '$1') // 移除值后面的斜杠
        .replace(/\/+\s*"/g, '"')       // 移除键名前的斜杠
        .trim();                        // 去除首尾空白

      // 2. 尝试直接解析
      try {
        // 尝试直接解析，如果成功就直接返回格式化结果
        const parsed = JSON.parse(processedStr);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        // 3. 如果解析失败，进行更深入的修复
        const pairs = [];
        
        // 将JSON字符串分割成行
        const lines = processedStr
          .replace(/^\s*{\s*/, '')      // 移除开头的 {
          .replace(/\s*[}\]]+\s*$/, '') // 移除结尾的所有括号
          .split(/,\s*/);               // 按逗号分割

        // 处理每一行
        for (let line of lines) {
          line = line.trim()
            .replace(/[\[\]{}]+(?=\s*["'])/g, '') // 移除键名前的括号
            .replace(/\/+\s*([,}])/g, '$1')       // 移除值后面的斜杠
            .replace(/\/+\s*"/g, '"')             // 移除键名前的斜杠
            .replace(/\\n/g, '')                  // 移除转义的换行符
            .replace(/\\"/g, '"')                 // 处理转义的双引号
            .replace(/\\'/g, "'");                // 处理转义的单引号
          if (!line) continue;

          // 匹配键值对
          const match = line.match(/^['"]?(.*?)['"]?\s*:\s*(.+?)(?:\s*[}\]/])*$/);
          if (!match) continue;

          const [, key, value] = match;
          if (!key) continue;

          // 处理键名
          const processedKey = key.trim()
            .replace(/[\[\]{}]+/g, '')  // 移除键名中的所有括号
            .replace(/\/+/g, '')        // 移除键名中的所有斜杠
            .replace(/\\["']/g, '')     // 移除转义字符
            .replace(/^["']+|["']+$/g, ''); // 移除首尾引号
          
          // 处理值
          let processedValue = value.trim()
            .replace(/[}\]]+$/, '')     // 移除值末尾的括号
            .replace(/\/+\s*$/g, '')    // 移除值末尾的斜杠
            .replace(/\\n/g, '')        // 移除转义的换行符
            .replace(/\\["']/g, '')     // 移除转义字符
            .trim();
          
          // 检查值是否是数字
          const isNumber = /^-?\d+\.?\d*$/.test(processedValue);
          
          if (isNumber) {
            // 如果是数字，直接使用
            processedValue = processedValue;
          } else if (processedValue.startsWith('"') || processedValue.startsWith("'")) {
            // 如果值已经有引号，确保使用双引号并移除内部的转义字符
            processedValue = `"${processedValue.slice(1, -1).trim()}"`;
          } else if (!processedValue.startsWith('{') && 
                    !processedValue.startsWith('[') &&
                    !processedValue.match(/^(true|false|null)$/)) { // 不是布尔值或null
            // 如果值没有引号且不是特殊值，添加双引号
            processedValue = `"${processedValue.trim()}"`;
          }
          
          pairs.push([processedKey, processedValue]);
        }

        if (pairs.length === 0) return str;

        // 重建JSON字符串
        const result = '{\n' + pairs.map(([k, v]) => `  "${k}": ${v}`).join(',\n') + '\n}';

        // 尝试解析和格式化
        try {
          const parsed = JSON.parse(result);
          return JSON.stringify(parsed, null, 2);
        } catch (e) {
          return result;
        }
      }
    } catch (e) {
      console.error('修复过程出错:', e);
      return str;
    }
  }
}

module.exports = JsonFixer; 