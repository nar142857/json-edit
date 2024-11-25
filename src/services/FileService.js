class FileService {
  constructor() {
    this.utools = window.utools
  }

  async saveFileToPath(buffer, filename, ext, fileType, title) {
    ext = Array.isArray(ext) ? ext : [ext]
    const fullpath = this.utools.showSaveDialog({
      title,
      defaultPath: this.utools.getPath('downloads') + '/' + filename,
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

    await this.utools.writeFile(fullpath, buffer)
    this.utools.shellShowItemInFolder(fullpath)
  }

  async readOpenFileText(ext, fileType, title) {
    ext = Array.isArray(ext) ? ext : [ext]
    const paths = this.utools.showOpenDialog({
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
      const text = await this.utools.readFile(paths[0], { encoding: 'utf-8' })
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