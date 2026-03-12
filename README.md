# BeatBar

BeatBar is a macOS menu bar controller for **YouTube Music**.

It runs as an Electron app and communicates with a Chrome extension to control playback and show the current track directly from the menu bar. The goal is to make it easy to manage YouTube Music without constantly switching browser tabs.

---

## Features

- Shows **currently playing track** in a menu bar popover
- **Play / Pause / Next / Previous** controls
- **Search and play tracks** from YouTube Music
- **Global keyboard shortcuts**
- Clean macOS-style UI
- Real-time communication between the extension and the app using WebSockets

---

## How it Works

BeatBar has two main components.

### Electron App (`app/`)
Responsible for:
- Menu bar integration
- Player popover UI
- Keyboard shortcuts
- Running the WebSocket server

### Chrome Extension (`extension/`)
Responsible for:
- Reading playback information from YouTube Music
- Sending track updates to the Electron app
- Executing playback commands from the app

Both communicate through a **WebSocket bridge**.

---

## Project Structure

```
beatBar/
├── app/
│   ├── main.js
│   ├── config.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── validation.js
│   │   └── errors.js
│   └── ui/
│       ├── index.html
│       ├── renderer.js
│       └── styles.css
│
├── extension/
│   ├── manifest.json
│   ├── background.js
│   └── content.js
│
└── package.json
```

---

## Installation

### Requirements

- Node.js 16+
- npm
- macOS

---

## Setup

Clone the repository:

```bash
git clone https://github.com/yourusername/beatbar.git
cd beatbar
```

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm start
```

Build the packaged application:

```bash
npm run dist
```

The built app will appear in the `dist/` folder.

---

## Installing the Chrome Extension

1. Open Chrome and navigate to:

```
chrome://extensions
```

2. Enable **Developer Mode**
3. Click **Load Unpacked**
4. Select the `extension/` folder

---

## Using BeatBar

1. Start the Electron app
2. Open **https://music.youtube.com**
3. The extension will connect automatically
4. Click the **menu bar icon** to open the player window

---

## Keyboard Shortcuts

| Shortcut | Action |
|--------|--------|
| Cmd + Shift + 1 | Play / Pause |
| Cmd + Shift + 2 | Next Track |
| Cmd + Shift + 3 | Previous Track |

---

## Configuration

Most configuration values are defined in:

```
app/config.js
```

This includes:

- WebSocket port
- Window dimensions
- Shortcut bindings
- IPC channel names

---

## Development Notes

Some implementation details:

- WebSocket connections automatically reconnect if interrupted
- Renderer and main processes communicate through IPC
- Logging is handled through `utils/logger.js`
- Errors use custom classes defined in `utils/errors.js`

---

## Known Limitations

The current setup uses:

```
nodeIntegration: true
contextIsolation: false
```

This keeps development simple, but a production setup should ideally move to **preload scripts with context isolation enabled**.

---

## Troubleshooting

### Extension not connecting

Check that:

- The Electron app is running
- The Chrome extension is enabled
- YouTube Music is open in Chrome

You can also check the browser console for WebSocket connection errors.

---

## Contributing

Contributions are welcome. If you add new functionality, try to keep the structure and coding style consistent with the existing codebase.

---

## License

MIT