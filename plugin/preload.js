// 确保 window.services 存在
if (typeof window === 'undefined') {
    global.window = {}
}
if (!window.services) {
    window.services = {}
}

const fs = require('fs')
const {ipcRenderer} = require("electron")
const fsPromises = require("fs/promises")
const path = require("path")
const {Buffer, Blob} = require("buffer")
const url = require("url")

// 将 fs 模块挂载到 window.utools 对象
if (!window.utools) {
  window.utools = {}
}
window.utools.fs = fs

// 获取缓存文件路径
const getCachePath = () => {
  const tempPath = window.utools.getPath('temp')
  return path.join(tempPath, 'json-editor-cache.json')
}

// 读取缓存
const readCache = () => {
  try {
    const cachePath = getCachePath()
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, 'utf-8')
      return JSON.parse(content)
    }
  } catch (e) {
    console.error('读取缓存失败:', e)
  }
  return { history: [] }
}

// 写入缓存
const writeCache = (data) => {
  try {
    const cachePath = getCachePath()
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (e) {
    console.error('写入缓存失败:', e)
    return false
  }
}

// 定义服务方法
window.services = {
    readFile: (filePath, encoding = 'utf8') => {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, encoding, (error, data) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(data)
                }
            })
        })
    },
    writeFile: (filePath, content, encoding = 'utf8') => {
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, content, encoding, (error) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(true)
                }
            })
        })
    },
    // 获取应用目录
    getAppDir() {
        return window.utools.getPath('userData')
    },
    // 检查文件是否存在
    existsSync(path) {
        return fs.existsSync(path)
    },
    // 创建目录
    mkdirSync(path, options) {
        return fs.mkdirSync(path, options)
    },
    // 读取文件
    readFileSync(path, encoding) {
        return fs.readFileSync(path, encoding)
    },
    // 写入文件
    writeFileSync(path, data, encoding) {
        return fs.writeFileSync(path, data, encoding)
    }
}

window.ipc = ipcRenderer
window.fs = {
  async saveFileToPath(e, r, t, o, a) {
    t = Array.isArray(t) ? t : [t]
    const i = window.utools.showSaveDialog({
      title: a,
      defaultPath: path.resolve(window.utools.getPath("downloads"), r),
      filters: [{extensions: t, name: o}],
      buttonLabel: "保存"
    })
    if (i) {
      await fsPromises.writeFile(i, Buffer.from(e))
      window.utools.shellShowItemInFolder(i)
    }
  },
  async readOpenFileText(e, r, t) {
    e = Array.isArray(e) ? e : [e]
    const o = window.utools.showOpenDialog({
      title: t,
      properties: ["openFile"],
      buttonLabel: "导入",
      filters: [{extensions: e, name: r}]
    })
    if (!o) throw "未发现合法文件"
    const a = o[0]
    if (!a) throw "未发现合法文件"
    try {
      return {
        text: await fsPromises.readFile(a, {encoding: "utf-8"}),
        path: a,
        name: path.basename(a)
      }
    } catch (e) {
      throw e
    }
  },
  getFilenameFromUrl(e) {
    const r = url.parse(e, !0, !0)
    return path.basename(r.pathname)
  },
  // 获取保存的 JSON 文件列表
  async getJsonFiles() {
    try {
      const downloadsPath = window.utools.getPath('downloads')
      const files = await fsPromises.readdir(downloadsPath)
      const jsonFiles = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(downloadsPath, file)
          const stats = await fsPromises.stat(filePath)
          jsonFiles.push({
            name: file,
            path: filePath,
            modifiedTime: stats.mtime
          })
        }
      }

      // 按修改时间倒序排序
      return jsonFiles.sort((a, b) => b.modifiedTime - a.modifiedTime)
    } catch (e) {
      console.error('获取文件列表失败:', e)
      return []
    }
  },
  // 保存编辑器状态到缓存
  saveEditorState(content, label) {
    const cache = readCache()
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

    // 保存当前状态
    cache.currentContent = content
    cache.currentLabel = label

    return writeCache(cache)
  },
  // 获取编辑器历史记录
  getEditorHistory() {
    const cache = readCache()
    return {
      history: cache.history || [],
      currentContent: cache.currentContent || '',
      currentLabel: cache.currentLabel || ''
    }
  }
}