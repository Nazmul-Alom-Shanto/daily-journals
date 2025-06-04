// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("ipcRenderer", {
    invoke: (...args) => ipcRenderer.invoke(...args)
});

