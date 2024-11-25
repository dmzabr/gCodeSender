const { contextBridge, ipcRenderer } = require('electron')
const Toastify = require('toastify-js')

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) =>
    ipcRenderer.on(channel, (event, ...args) => func(...args)),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
})

contextBridge.exposeInMainWorld('Toastify', {
  toast: (options) => Toastify(options).showToast(),
})

contextBridge.exposeInMainWorld('electronAPI', {
  uploadGCode: (data) => ipcRenderer.send('upload-gcode', data),
  stopPrint: (data) => ipcRenderer.send('stop-print', data),
  requestPorts: () => ipcRenderer.send('request-ports'),
  receivePorts: (callback) =>
    ipcRenderer.on('port-list', (event, ports) => callback(ports)),
  receiveUploadStatus: (callback) =>
    ipcRenderer.on('upload-status', (event, status) => callback(status)),
  receiveProgressUpdate: (callback) =>
    ipcRenderer.on('progress-update', (event, progress) => callback(progress)),
  showOpenDialog: () => ipcRenderer.invoke('showOpenDialog')
  // Передача версии приложения в интерфейс
  // getVersion: () => app.getVersion(),
});
