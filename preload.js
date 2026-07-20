const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('akaora', {
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});