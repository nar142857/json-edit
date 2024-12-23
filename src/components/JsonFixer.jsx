import React from 'react';

/**
 * JSON修复工具类
 * 提供JSON字符串修复功能
 */
class JsonFixer {
  /**
   * 修复非标准JSON字符串
   * @param {string} str - 需要修复的JSON字符串
   * @returns {object} - 返回包含修复结果和错误信息的对象
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

      // 2. 处理错误的对象结构
      console.log('2. 处理错误的对象结构...');
      let tokens = [];
      let currentToken = '';
      let inString = false;
      let inValue = false;
      let depth = 0;

      // 标记化JSON字符串
      for (let i = 0; i < processedStr.length; i++) {
        let char = processedStr[i];
        
        if (char === '"' && processedStr[i-1] !== '\\') {
          inString = !inString;
          currentToken += char;
          continue;
        }
        
        if (inString) {
          currentToken += char;
          continue;
        }

        if (char === '{') {
          if (depth > 0 && !inValue) {
            // 如果在对象内部遇到新的{，且不在值中，说明这是一个错误的嵌套
            // 将其替换为逗号
            char = ',';
          }
          depth++;
          if (currentToken) tokens.push(currentToken);
          tokens.push(char);
          currentToken = '';
          inValue = false;
        } else if (char === '}') {
          depth--;
          if (currentToken) tokens.push(currentToken);
          tokens.push(char);
          currentToken = '';
          inValue = false;
        } else if (char === ':') {
          if (currentToken) tokens.push(currentToken);
          tokens.push(char);
          currentToken = '';
          inValue = true;
        } else if (char === ',') {
          if (currentToken) tokens.push(currentToken);
          tokens.push(char);
          currentToken = '';
          inValue = false;
        } else if (!char.trim()) {
          if (currentToken) {
            tokens.push(currentToken);
            currentToken = '';
          }
        } else {
          currentToken += char;
        }
      }
      if (currentToken) tokens.push(currentToken);

      // 重建JSON字符串
      processedStr = '';
      let lastToken = '';
      for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i].trim();
        if (!token) continue;

        // 处理连续的逗号
        if (token === ',' && lastToken === ',') continue;
        
        // 处理对象开始前的逗号
        if (token === '{' && lastToken === ',') {
          processedStr = processedStr.slice(0, -1);
        }
        
        // 处理值之间的分隔
        if (lastToken && !(lastToken === '{' || lastToken === ',' || lastToken === ':' || token === '}' || token === ',' || token === ':')) {
          processedStr += ',';
        }
        
        processedStr += token;
        lastToken = token;
      }
      console.log('处理对象结构后:', processedStr);

      // 3. 处理括号匹配
      console.log('3. 处理括号匹配...');
      let stack = [];
      let chars = processedStr.split('');
      let validBrackets = '';
      inString = false;

      for (let i = 0; i < chars.length; i++) {
        let char = chars[i];
        
        if (char === '"' && chars[i-1] !== '\\') {
          inString = !inString;
          validBrackets += char;
          continue;
        }
        
        if (inString) {
          validBrackets += char;
          continue;
        }

        if (char === '{' || char === '[') {
          stack.push(char);
          validBrackets += char;
        } else if (char === '}' || char === ']') {
          if (stack.length === 0) {
            continue;
          }
          let last = stack.pop();
          if ((char === '}' && last === '{') || (char === ']' && last === '[')) {
            validBrackets += char;
          }
        } else {
          validBrackets += char;
        }
      }

      while (stack.length > 0) {
        let bracket = stack.pop();
        validBrackets += bracket === '{' ? '}' : ']';
      }

      processedStr = validBrackets;
      console.log('处理括号后:', processedStr);

      // 4. 处理多余的逗号
      console.log('4. 处理多余的逗号...');
      processedStr = processedStr
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/,\s*,/g, ',')
        .replace(/\n\s*\n/g, '\n');
      console.log('处理逗号后:', processedStr);

      // 5. 修复基本语法错误
      console.log('5. 修复基本语法错误...');
      processedStr = processedStr
        .replace(/([{,]\s*)([a-zA-Z0-9_$@\-/]+)(\s*):/g, '$1"$2"$3:')
        .replace(/'([^']*)'(\s*[,}\]])/g, '"$1"$2')
        .replace(/'([^']*)'(\s*:)/g, '"$1"$2')
        .replace(/:\s*'([^']*)'/g, ': "$1"')
        .replace(/:\s*True\b/gi, ': true')
        .replace(/:\s*False\b/gi, ': false')
        .replace(/:\s*None\b/gi, ': null')
        .replace(/:\s*undefined\b/gi, ': null')
        .replace(/:\s*NaN\b/g, ': null')
        .replace(/"(-?\d+\.?\d*)"(\s*[,}\]])/g, '$1$2');
      console.log('修复基本语法错误后:', processedStr);

      // 6. 尝试解析和格式化
      console.log('6. 尝试解析和格式化...');
      try {
        const parsed = JSON.parse(processedStr);
        return {
          success: true,
          result: JSON.stringify(parsed, null, 2),
          error: null
        };
      } catch (e) {
        console.log('首次解析失败，进行最后的修复:', e.message);
        
        // 最后的修复尝试
        processedStr = processedStr
          .replace(/\\\\/g, '\\')
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/}(\s*){/g, '},{')
          .replace(/](\s*)\[/g, '],[')
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/,\s*,/g, ',')
          .replace(/,\s*$/g, '')
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
          return {
            success: true,
            result: JSON.stringify(parsed, null, 2),
            error: null
          };
        } catch (e) {
          console.log('所有修复尝试都失败:', e.message);
          let errorMessage = '无法修复JSON，错误原因：';
          if (e.message.includes('Unexpected token')) {
            errorMessage += '发现意外的字符';
            if (e.message.includes('position')) {
              const position = e.message.match(/position (\d+)/)[1];
              const context = processedStr.substring(Math.max(0, position - 10), Math.min(processedStr.length, position + 10));
              errorMessage += `，问题出现在第 ${position} 个字符附近: "${context}"`;
            }
          } else if (e.message.includes('Expected')) {
            errorMessage += e.message.replace('Expected', '缺少').replace('after', '在');
          } else if (e.message.includes('non-whitespace character after JSON')) {
            errorMessage += '在JSON结束后发现多余的字符';
          } else {
            errorMessage += e.message;
          }
          return {
            success: false,
            result: str,
            error: errorMessage
          };
        }
      }
    } catch (e) {
      console.error('JSON修复过程出错:', e.message);
      return {
        success: false,
        result: str,
        error: '修复过程出错：' + e.message
      };
    }
  }
}

export default JsonFixer; 