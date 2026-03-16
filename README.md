# Hebrew Codenames (Cyber) — Electron + Python TCP

A Hebrew-themed Codenames-style party game with a cyber UI.

- **Frontend**: React + Vite, running inside **Electron**
- **Backend**: a small **Python TCP server** (`backend/server.py`)
- **Transport**: Electron main process bridges **IPC ↔ TCP** (newline-delimited JSON)
- **Optional**: “Generate new words” uses the **Gemini API** from Electron main (Node), so the API key is not exposed to the renderer.

---

## Features

- **Rooms**: create / join using a 6‑character code
- **Roles**: Red/Blue spymaster + operative
- **Gameplay**:
  - Spymaster broadcasts a clue with a number \(N\)
  - Operatives may guess **up to \(N\)** cards
  - Turn ends automatically on the \(N\)-th guess, or immediately on a mistake
- **Mission log**: “לוח שידורים” shows team-colored events (red/blue)
- **Local mode**: single-screen local play

---

## Project structure

- `src/components/` — UI screens (`LoginScreen`, `RoomManager`, `SetupScreen`, `GameScreen`, `GameOverScreen`)
- `src/types/` — shared TS types + the Electron socket wrapper (`src/types/socket.ts`)
- `services/` — helper services (includes `services/geminiService.ts`)
- `electron/` — Electron main + preload
  - `electron/main.ts` — connects to Python TCP server and exposes IPC handlers
  - `electron/preload.ts` — exposes a minimal, safe `window.electronAPI`
- `backend/` — Python TCP server + game logic
  - `backend/server.py` — newline-delimited JSON TCP protocol on port `3000`
  - `backend/game_logic.py` — game rules/state

---

## Requirements

- Node.js (LTS recommended)
- Python 3.10+ (any modern 3.x should work)
- (Optional) Gemini API key if you want “Generate new words”

---

## Setup

Install Node dependencies:

```bash
npm install
```

---

## Run (development)

### 1) Start the Python backend (TCP server)

In one terminal:

```bash
cd backend
python server.py
```

You should see something like:

- `TCP Server running on 3000`

### 2) Start the Electron + Vite app

In another terminal (project root):

```bash
npm run dev
```

If the app connects successfully you’ll see:

- `Successfully connected to Python TCP Server`

---

## Gemini API (optional word generation)

The “Generate new words” button runs Gemini from **Electron main** (Node). Configure an API key in a local `.env` file in the project root:

```env
GEMINI_API_KEY=YOUR_KEY_HERE
```

Notes:

- `.env` is ignored by git (see `.gitignore`) and **should not be committed**.
- If you get a `429` / quota error, your key/project likely has no quota enabled. Use a key from a project with Gemini API access + quota/billing configured.

---

## How the client ↔ server connection works

This project does not use an HTTP proxy. Instead:

- React code imports `socket` from `src/types/socket.ts`.
- `socket` is an `ElectronSocketMock` that provides a WebSocket-like API:
  - `.send(string)` forwards to Electron via `window.electronAPI.sendToPython(...)`
  - `.addEventListener('message', cb)` receives messages from Electron
- Electron main (`electron/main.ts`) maintains a TCP connection to `127.0.0.1:3000` and:
  - writes outbound JSON messages with a `\n` delimiter
  - reads inbound data, splits by newline, parses JSON, and forwards to renderer

Protocol shape:

```json
{ "type": "message_type", "payload": [ ... ] }
```

---

## Common issues

### “Could not resolve bufferutil imported by ws”

This is a build/bundling issue related to optional native dependencies of `ws`. The Electron main build externalizes these optional modules so the app can run without them.

### Backend changes not taking effect

If you edit Python files, you must **stop and restart** `python server.py`.

---

## Publishing to GitHub

Typical flow:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```

---

## Security notes

- Do **not** commit `.env` (API keys).
- If a key was ever committed accidentally, rotate it immediately.