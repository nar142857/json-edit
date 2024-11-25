const { ipcRenderer } = require('electron')

window.onIpcTopInit = (callback) => {
  ipcRenderer.on('ai-lite', (e, data) => {
    callback?.({
      ...data,
      senderId: e.senderId
    })
  })
}

window.ipc = ipcRenderer
