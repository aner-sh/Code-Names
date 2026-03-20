import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import * as net from 'node:net';
import * as tls from 'node:tls';
import fs from 'node:fs';
import { GoogleGenAI } from '@google/genai';

// --- ESM Fix for __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure paths for Vite/Electron
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;
let tcpClient: net.Socket | null = null;

function getEnvValue(key: string): string | null {
  const direct = process.env[key];
  if (direct && direct.trim()) return direct.trim();

  try {
    const dotenvPath = path.join(app.getAppPath(), '.env');
    if (!fs.existsSync(dotenvPath)) return null;
    const content = fs.readFileSync(dotenvPath, 'utf-8');
    const line = content
      .split(/\r?\n/)
      .map(l => l.trim())
      .find(l => l && !l.startsWith('#') && l.startsWith(`${key}=`));
    if (!line) return null;
    const value = line.substring(key.length + 1).trim();
    return value || null;
  } catch {
    return null;
  }
}

async function generateWordsHe(): Promise<string[]> {
  const apiKey =
    getEnvValue('GEMINI_API_KEY') ??
    getEnvValue('API_KEY') ??
    getEnvValue('GOOGLE_API_KEY');

  if (!apiKey) {
    throw new Error('חסר מפתח API ל-Gemini. הוסיפו `GEMINI_API_KEY=...` לקובץ `.env` ואז אתחלו את האפליקציה.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = [
    'Generate exactly 25 Hebrew words for a Codenames board.',
    'Rules:',
    '- One word per line',
    '- Single Hebrew word (no spaces, no punctuation)',
    '- Common nouns only, avoid proper names',
    '- Avoid duplicates',
    'Return ONLY the 25 lines.'
  ].join('\n');

  let res: any;
  try {
    res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
  } catch (e: any) {
    const status = e?.status ?? e?.error?.code;
    if (status === 429) {
      throw new Error('נגמרה המכסה של Gemini API (429). בדקו תוכנית/חיוב או החליפו מפתח API, ואז נסו שוב.');
    }
    throw new Error('שגיאה ביצירת מילים דרך Gemini API. נסו שוב מאוחר יותר.');
  }

  // SDK response text helper
  const text = (res as any).text ?? (res as any).response?.text?.() ?? '';
  const raw = typeof text === 'function' ? await text() : text;

  const words = String(raw)
    .split(/\r?\n/)
    .map((w: string) => w.trim())
    .filter(Boolean)
    .map((w: string) => w.replace(/[^\u0590-\u05FF]/g, ''))
    .filter(Boolean);

  const unique: string[] = [];
  for (const w of words) {
    if (!unique.includes(w)) unique.push(w);
    if (unique.length === 25) break;
  }

  if (unique.length !== 25) {
    throw new Error('Failed to generate 25 words');
  }
  return unique;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Points to the preload script in the same directory as main.js
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'));
  }

  // Initial connection attempt
  setupTcpClient();

  win.on('closed', () => {
    win = null;
  });
}

function setupTcpClient() {
  const tlsEnabled = (getEnvValue('TLS_ENABLED') ?? '1').toLowerCase() !== '0';
  const host = getEnvValue('TCP_HOST') ?? '127.0.0.1';
  const port = Number(getEnvValue('TCP_PORT') ?? '3000');

  tcpClient = tlsEnabled ? (new tls.TLSSocket(new net.Socket()) as any) : new net.Socket();
  let buffer = '';

  if (tlsEnabled) {
    const rejectUnauthorized = (getEnvValue('TLS_REJECT_UNAUTHORIZED') ?? '1').toLowerCase() === '1';
    const caPath = getEnvValue('TLS_CA_FILE');
    const ca = caPath && fs.existsSync(caPath) ? fs.readFileSync(caPath) : undefined;

    const client = tls.connect(
      { host, port, rejectUnauthorized, ca },
      () => {
        console.log('✅ Connected to Python server (TLS)');
      }
    );
    tcpClient = client as any;
  } else {
    // Connect to the Python Server on Port 3000
    tcpClient.connect(port, host, () => {
      console.log('✅ Successfully connected to Python TCP Server');
    });
  }

  // Handle incoming data stream from Python
  tcpClient.on('data', (chunk) => {
    buffer += chunk.toString('utf-8');
    
    // Process stream using the newline delimiter protocol
    while (buffer.includes('\n')) {
      const boundary = buffer.indexOf('\n');
      const messageStr = buffer.substring(0, boundary).trim();
      buffer = buffer.substring(boundary + 1);

      if (messageStr && win) {
        try {
          // Send raw string to React; parsing usually happens in the UI layer
          const parsedMessage = JSON.parse(messageStr);
          win.webContents.send('tcp-receive', parsedMessage);
        } catch (e) {
          console.error('Failed to parse message from Python:', e);
        }
      }
    }
  });

  tcpClient.on('close', () => {
    console.log('❌ TCP Connection closed. Attempting reconnect in 3s...');
    // Optional: Auto-reconnect logic for better UX
    setTimeout(setupTcpClient, 3000);
  });

  tcpClient.on('error', (err) => {
    console.error('TCP Socket Error:', err.message);
  });
}

// IPC: Listen for messages from React (Renderer) and pipe them to Python (TCP)
ipcMain.on('tcp-send', (_event, message) => {
  if (tcpClient && !tcpClient.destroyed && tcpClient.writable) {
    // Ensure the message is a string and append the newline delimiter
    const msgStr = typeof message === 'string' ? message : JSON.stringify(message);
    tcpClient.write(msgStr + '\n');
  } else {
    console.warn('⚠️ TCP Client not ready. Message dropped.');
  }
});

ipcMain.handle('genai-generate-words-he', async () => {
  return await generateWordsHe();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(createWindow);