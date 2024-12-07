class FileService {
  constructor() {
    this.utools = window.utools
  }

  async saveFileToPath(buffer, filename, ext, fileType, title) {
    ext = Array.isArray(ext) ? ext : [ext]
    const fullpath = window.utools.showSaveDialog({
      title,
      defaultPath: window.utools.getPath('downloads') + '/' + filename,
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

    await window.services.writeFile(fullpath, buffer)
    window.utools.shellShowItemInFolder(fullpath)
  }

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

    if (!paths || !paths[0]) {
      throw '未发现合法文件'
    }

    try {
      // 使用 preload.js 中的文件读取方法
      const text = await window.services.readFile(paths[0])
      return {
        text,
        path: paths[0],
        name: paths[0].split('/').pop()
      }
    } catch (e) {
      throw e
    }
  }

  getFilenameFromUrl(srcUrl) {
    try {
      const url = new URL(srcUrl)
      return url.pathname.split('/').pop()
    } catch (e) {
      return ''
    }
  }
}

export default new FileService() 