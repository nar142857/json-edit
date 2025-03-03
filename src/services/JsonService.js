/**
 * JSON语言服务类 - 处理JSON相关的所有操作
 */
import * as monaco from 'monaco-editor'

export default class JsonService {
  constructor() {
    this._worker = null
    this._client = null
    this._lastUsedTime = 0
  }

  /**
   * 验证JSON
   * @param {string} text - JSON文本
   * @returns {Promise<Array>} 验证结果
   */
  async validate(text) {
    const client = await this._getClient()
    return client.doValidation(text)
  }

  /**
   * 处理大数值，防止精度丢失
   * @param {string} text - JSON文本
   * @returns {string} 处理后的JSON文本
   */
  _handleBigNumbers(text) {
    return text.replace(/([:\s]\s*)([-]?\d+\.?\d*[eE]?[-+]?\d*(?=[\s,\n\r\]}]))/g, (match, prefix, number) => {
      // 仅处理超过15位的整数
      if (number.length > 15 && !number.includes('.') && !number.includes('e') && !number.includes('E')) {
        return `${prefix}"${number}"`;
      }
      return match; // 保持原样
    });
  }

  /**
   * 格式化JSON
   * @param {string} text - JSON文本
   * @param {object} options - 格式化选项
   * @returns {Promise<string>} 格式化后的文本
   */
  async format(text, options = {}) {
    console.log('Format input:', text);
    // 先处理大数值
    text = this._handleBigNumbers(text);
    console.log('After handling big numbers:', text);
    const client = await this._getClient()
    const result = await client.format(text, {
      tabSize: 2,
      insertSpaces: true,
      ...options
    });
    console.log('Final formatted result:', result);
    return result;
  }

  /**
   * URL参数转JSON
   * @param {string} params - URL参数字符串
   * @returns {object} JSON对象
   */
  urlParamsToJson(params) {
    const result = {}
    params.split('&').forEach(param => {
      const [key, value] = param.split('=')
      result[decodeURIComponent(key)] = decodeURIComponent(value)
    })
    return result
  }

  /**
   * 在指定上下文中执行JS过滤器
   * @param {string} filter - JS过滤器表达式
   * @param {object} context - 执行上下文
   * @returns {string} 执行结果的JSON字符串
   */
  evalJsInContext(filter, context) {
    try {
      // 处理简单的点号访问
      if (filter.startsWith('.')) {
        const path = filter.split('.').filter(Boolean)
        let result = context
        for (const key of path) {
          result = result[key]
        }
        return JSON.stringify(result, null, 2)
      }

      // 处理数组访问
      if (filter.match(/^\[\d+\]/)) {
        const indices = filter.match(/\d+/g).map(Number)
        let result = context
        for (const index of indices) {
          result = result[index]
        }
        return JSON.stringify(result, null, 2)
      }

      // 处理复杂表达式
      if (filter.includes('map(') || filter.includes('filter(') || filter.includes('reduce(')) {
        const result = (new Function('context', `with(context){return ${filter}}`)).call(null, context)
        return JSON.stringify(result, null, 2)
      }

      // 处理其他情况
      const result = (new Function('context', `with(context){return ${filter}}`)).call(null, context)
      return JSON.stringify(result, null, 2)
    } catch (e) {
      return e.toString()
    }
  }

  async _getClient() {
    this._lastUsedTime = Date.now()
    if (!this._client) {
      this._worker = monaco.editor.createWebWorker({
        moduleId: 'vs/language/json/jsonWorker',
        label: 'json',
        createData: {
          languageSettings: {
            validate: true,
            allowComments: true,
            schemas: []
          },
          languageId: 'json'
        }
      })
      this._client = await this._worker.getProxy()
    }
    return this._client
  }

  /**
   * 将文本转换为Unicode编码
   * @param {string} text - 要转换的文本
   * @returns {string} - Unicode编码后的文本
   */
  encodeToUnicode(text) {
    try {
      return text.replace(/[\u0000-\uffff]/g, char => {
        const hex = char.charCodeAt(0).toString(16).toUpperCase();
        return '\\u' + '0000'.substring(0, 4 - hex.length) + hex;
      });
    } catch (e) {
      console.error('Unicode编码失败:', e);
      throw new Error('Unicode编码失败: ' + e.message);
    }
  }

  /**
   * 将Unicode编码转换回普通文本
   * @param {string} text - Unicode编码的文本
   * @returns {string} - 解码后的文本
   */
  decodeFromUnicode(text) {
    try {
      return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
    } catch (e) {
      console.error('Unicode解码失败:', e);
      throw new Error('Unicode解码失败: ' + e.message);
    }
  }
} 