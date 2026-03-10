// Define the shape of our Electron API so TypeScript doesn't complain
declare global {
  interface Window {
    electronAPI: {
      sendToPython: (message: string) => void;
      onPythonMessage: (callback: (message: any) => void) => void;
      generateWordsHe: () => Promise<string[]>;
    };
  }
}

class ElectronSocketMock {
  private messageListeners: ((event: { data: string }) => void)[] = [];

  constructor() {
    // Listen for messages arriving from the Electron Main Process
    if (window.electronAPI) {
      window.electronAPI.onPythonMessage((parsedMessage: any) => {
        // Wrap it in an event-like object to mimic how standard WebSockets work
        const event = { data: JSON.stringify(parsedMessage) };
        this.messageListeners.forEach(listener => listener(event));
      });
    } else {
      console.warn("electronAPI not found! Are you running in the browser instead of Electron?");
    }
  }

  // Mimic the WebSocket .send() method
  send(data: string) {
    if (window.electronAPI) {
      window.electronAPI.sendToPython(data);
    }
  }

  // Mimic the WebSocket event listeners
  addEventListener(type: string, listener: any) {
    if (type === 'message') {
      this.messageListeners.push(listener);
    }
  }

  removeEventListener(type: string, listener: any) {
    if (type === 'message') {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    }
  }
}

// Export our fake socket! Your .tsx files will import this and won't know the difference.
export const socket = new ElectronSocketMock();