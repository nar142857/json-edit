class EditorStateService {
  /**
   * 获取缓存文件路径
   */
  getCachePath() {
    const appDir = window.services.getAppDir()
    return appDir + '/cache/json-editor-cache.json'
  }

  /**
   * 确保缓存目录存在
   */
  ensureCacheDir() {
    try {
      const appDir = window.services.getAppDir()
      const cacheDir = appDir + '/cache'
      if (!window.services.existsSync(cacheDir)) {
        window.services.mkdirSync(cacheDir, { recursive: true })
      }
    } catch (e) {
      console.error('创建缓存目录失败:', e)
    }
  }

  /**
   * 读取缓存
   */
  readCache() {
    try {
      this.ensureCacheDir()
      const cachePath = this.getCachePath()
      if (window.services.existsSync(cachePath)) {
        const content = window.services.readFileSync(cachePath, 'utf-8')
        return JSON.parse(content)
      }
    } catch (e) {
      console.error('读取缓存失败:', e)
    }
    return { history: [] }
  }

  /**
   * 写入缓存
   */
  writeCache(data) {
    try {
      this.ensureCacheDir()
      const cachePath = this.getCachePath()
      window.services.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8')
      return true
    } catch (e) {
      console.error('写入缓存失败:', e)
      return false
    }
  }

  /**
   * 保存编辑器状态
   */
  saveEditorState(content, label) {
    const cache = this.readCache()
    const timestamp = new Date().getTime()
    
    // 添加新记录到历史
    cache.history = cache.history || []
    cache.history.unshift({
      content,
      label,
      timestamp,
      id: timestamp.toString()
    })

    // 只保留最近50条记录
    cache.history = cache.history.slice(0, 50)

    return this.writeCache(cache)
  }

  /**
   * 获取编辑器历史记录
   */
  getEditorHistory() {
    const cache = this.readCache()
    return {
      history: cache.history || []
    }
  }
}

export default new EditorStateService() 