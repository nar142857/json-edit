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

  static evalJsInContext(filter, context) {
    try {
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