/**
 * JSON语言服务类 - 处理JSON相关的所有操作
 */
import * as monaco from 'monaco-editor'

class JsonService {
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
   * 格式化JSON
   * @param {string} text - JSON文本
   * @param {object} options - 格式化选项
   * @returns {Promise<string>} 格式化后的文本
   */
  async format(text, options = {}) {
    const client = await this._getClient()
    return client.format(text, {
      tabSize: 2,
      insertSpaces: true,
      ...options
    })
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
}

export default new JsonService() 