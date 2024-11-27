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
  }
}