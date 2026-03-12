# 🎵 BeatBar

**BeatBar** is a lightweight macOS menu bar controller for **YouTube Music**.

It allows you to see what's currently playing and control playback directly from your menu bar without constantly switching back to your browser.

BeatBar is built using **Electron** and works together with a **Chrome extension** that interacts with the YouTube Music webpage.

---

# ✨ Features

- 🎶 **Now Playing Display**  
  Shows the current song and artist in a clean menu bar popover.

- ⏯ **Playback Controls**  
  Play / Pause, Next, and Previous track.

- 🔍 **Quick Search**  
  Search and play tracks directly from YouTube Music.

- ⌨️ **Global Keyboard Shortcuts**  
  Control playback without opening the app.

- ⚡ **Real-time Updates**  
  Uses WebSockets for fast communication between the extension and the app.

- 🍎 **macOS Menu Bar App**  
  Lightweight and always accessible.

---

# 🧠 How It Works

BeatBar consists of **two main components**.

### 1️⃣ Electron App (`app/`)

Responsible for:

- Menu bar integration  
- Player popover UI  
- Keyboard shortcuts  
- Running the WebSocket server  

### 2️⃣ Chrome Extension (`extension/`)

Responsible for:

- Reading playback information from YouTube Music  
- Sending track updates to the Electron app  
- Executing playback commands  

Both components communicate using a **WebSocket bridge**.

---

# 📂 Project Structure

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

# 🚀 Installation

## Requirements

- Node.js **16+**
- npm
- **macOS**

---

## Clone the Repository

```bash
git clone https://github.com/yourusername/beatbar.git
cd beatbar
```

---

## Install Dependencies

```bash
npm install
```

---

## Run in Development

```bash
npm start
```

---

## Build the App

```bash
npm run dist
```

The packaged application will be generated inside the **`dist/`** directory.

---

# 📦 Prebuilt macOS App (Optional)

If you prefer not to build the project manually, a **prebuilt installer** is also available.

```
BeatBar-0.1.0-arm64.dmg
```

This build is compatible with **Apple Silicon Macs (M1 / M2 / M3)**.

### Installation

1. Open the `.dmg` file
2. Drag **BeatBar.app** into the **Applications** folder
3. Launch the app from Applications

---

# 🧩 Installing the Chrome Extension

1. Open Chrome and go to:

```
chrome://extensions
```

2. Enable **Developer Mode**

3. Click **Load Unpacked**

4. Select the **`extension/`** folder.

---

# ▶️ Using BeatBar

1. Start the Electron app  
2. Open **https://music.youtube.com**  
3. The extension will connect automatically  
4. Click the **menu bar icon** to open the player

---

# ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|--------|--------|
| `Cmd + Shift + 1` | Play / Pause |
| `Cmd + Shift + 2` | Next Track |
| `Cmd + Shift + 3` | Previous Track |

---

# ⚙️ Configuration

Configuration values are defined in:

```
app/config.js
```

This includes:

- WebSocket port
- Window dimensions
- Keyboard shortcuts
- IPC channel names

---

# 🛠 Development Notes

Implementation details:

- WebSocket connection automatically reconnects if lost
- Renderer and main processes communicate through IPC
- Logging is handled via `utils/logger.js`
- Custom error classes are defined in `utils/errors.js`

---

# ⚠️ Known Limitations

The current implementation uses:

```
nodeIntegration: true
contextIsolation: false
```

This simplifies development but is **not ideal for hardened production builds**.

For improved security you may want to migrate to:

- preload scripts
- `contextIsolation: true`

---

# 🐛 Troubleshooting

### Extension not connecting

Check that:

- The Electron app is running
- The Chrome extension is enabled
- YouTube Music is open in Chrome

You can also inspect the **browser console** for WebSocket connection errors.

---

# 🤝 Contributing

Contributions are welcome.

If you add new features, please try to keep the code structure and style consistent with the existing project.

---

# 📄 License

MIT License

---

⭐ If you find this project useful, consider giving it a **star on GitHub**.