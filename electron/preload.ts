import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Sending data from React -> Main Process (to go to Python)
  sendToPython: (message: string) => ipcRenderer.send('tcp-send', message),
  
  // Receiving data from Main Process (coming from Python) -> React
  onPythonMessage: (callback: (message: any) => void) => {
    ipcRenderer.on('tcp-receive', (_event, value) => callback(value));
  },

  generateWordsHe: () => ipcRenderer.invoke('genai-generate-words-he'),
});