const { ipcRenderer } = require('electron')
const fs = require('fs/promises')
const path = require('path')
const { Buffer, Blob } = require('buffer')
const url = require('url')

window.ipc = ipcRenderer

window.fs = {
  async saveFileToPath(buffer, filename, ext, fileType, title) {
    ext = Array.isArray(ext) ? ext : [ext]
    const fullpath = window.utools.showSaveDialog({
      title,
      defaultPath: path.resolve(window.utools.getPath('downloads'), filename),
      filters: [
        {
          extensions: ext,
          name: fileType
        }
      ],
      buttonLabel: '保存'
    })

    if (!fullpath) {
      return
    }

    await fs.writeFile(fullpath, Buffer.from(buffer))

    window.utools.shellShowItemInFolder(fullpath)
  },
  async readOpenFileText(ext, fileType, title) {
    ext = Array.isArray(ext) ? ext : [ext]
    const paths = window.utools.showOpenDialog({
      title,
      properties: ['openFile'],
      buttonLabel: '导入',
      filters: [
        {
          extensions: ext,
          name: fileType
        }
      ]
    })
    if (!paths) {
      throw '未发现合法文件'
    }
    const fullpath = paths[0]
    if (!fullpath) {
      throw '未发现合法文件'
    }
    try {
      const text = await fs.readFile(fullpath, {
        encoding: 'utf-8'
      })
      return {
        text,
        path:fullpath,
        name: path.basename(fullpath)
      }
    } catch (e) {
      throw e
    }
  },
  getFilenameFromUrl(srcUrl) {
    const parsed = url.parse(srcUrl, true, true)
    return path.basename(parsed.pathname)
  },
}
