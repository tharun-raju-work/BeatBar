/**
 * BeatBar - Main Process
 * Electron main process for YouTube Music menu bar controller
 * @module main
 */

const {
  app,
  Tray,
  Menu,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  nativeImage,
} = require('electron');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const { createLogger } = require('./utils/logger');
const { ValidationError, WebSocketError, WindowError } = require('./utils/errors');
const {
  WEBSOCKET_CONFIG,
  WINDOW_CONFIG,
  SHORTCUTS,
  IPC_CHANNELS,
  WS_MESSAGE_TYPES,
} = require('./config');

const logger = createLogger('Main');

// Application state
let tray = null;
let playerWindow = null;
let wss = null;
let wsClient = null;
let reconnectAttempts = 0;
let connectionCheckInterval = null;

/**
 * WebSocket Server Management
 */
class WebSocketManager {
  /**
   * Starts the WebSocket server
   * @throws {WebSocketError} If server fails to start
   */
  static start() {
    try {
      logger.info('Starting WebSocket server...', {
        port: WEBSOCKET_CONFIG.PORT,
        host: WEBSOCKET_CONFIG.HOST,
      });

      wss = new WebSocket.Server({
        port: WEBSOCKET_CONFIG.PORT,
        host: WEBSOCKET_CONFIG.HOST,
      });

      wss.on('connection', (ws) => {
        logger.info('Extension connected');
        wsClient = ws;
        reconnectAttempts = 0;
        
        // Start connection health monitoring
        WebSocketManager.startConnectionMonitoring(ws);

        ws.on('close', () => {
          logger.warn('Extension disconnected');
          wsClient = null;
          WebSocketManager.stopConnectionMonitoring();
        });

        ws.on('error', (error) => {
          logger.error('WebSocket error:', error.message);
        });

        ws.on('message', (message) => {
          try {
            const messageStr = message.toString();
            
            // Handle ping/pong keepalive
            if (messageStr === 'PING' || messageStr === 'ping') {
              logger.debug('Received PING, sending PONG');
              if (ws.readyState === WebSocket.OPEN) {
                ws.send('PONG');
              }
              return;
            }
            
            WebSocketManager.handleMessage(message);
          } catch (error) {
            logger.error('Error handling WebSocket message:', error.message);
          }
        });
      });

      wss.on('error', (error) => {
        logger.error('WebSocket server error:', error.message);
        throw new WebSocketError(`Failed to start WebSocket server: ${error.message}`);
      });

      logger.info('WebSocket server started successfully', {
        port: WEBSOCKET_CONFIG.PORT,
      });
    } catch (error) {
      logger.error('Failed to start WebSocket server:', error.message);
      throw new WebSocketError(`WebSocket initialization failed: ${error.message}`);
    }
  }

  /**
   * Handles incoming WebSocket messages
   * @param {Buffer|string} message - Raw message from WebSocket
   */
  static handleMessage(message) {
    try {
      const payload = JSON.parse(message.toString());
      
      if (!payload.type || typeof payload.type !== 'string') {
        logger.warn('Invalid message format: missing type');
        return;
      }

      logger.debug('Received WebSocket message:', payload.type);

      switch (payload.type) {
        case WS_MESSAGE_TYPES.NOW_PLAYING:
          WebSocketManager.forwardToRenderer(IPC_CHANNELS.NOW_PLAYING, payload.data);
          break;
        case WS_MESSAGE_TYPES.SEARCH_RESULTS:
          WebSocketManager.forwardToRenderer(IPC_CHANNELS.SEARCH_RESULTS, payload.data);
          break;
        default:
          logger.warn('Unknown message type:', payload.type);
      }
    } catch (error) {
      logger.error('Failed to parse WebSocket message:', error.message);
    }
  }

  /**
   * Forwards message to renderer process
   * @param {string} channel - IPC channel name
   * @param {any} data - Data to send
   */
  static forwardToRenderer(channel, data) {
    if (!playerWindow || playerWindow.isDestroyed()) {
      logger.warn('Cannot forward message: player window not available');
      return;
    }

    try {
      playerWindow.webContents.send(channel, data);
      logger.debug('Forwarded message to renderer:', channel);
    } catch (error) {
      logger.error('Failed to forward message to renderer:', error.message);
    }
  }

  /**
   * Sends a command to the connected WebSocket client
   * @param {string} command - Command to send
   * @throws {WebSocketError} If client is not connected
   */
  static send(command) {
    if (!command || typeof command !== 'string') {
      logger.warn('Invalid command:', command);
      return;
    }

    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      logger.warn('No extension connected, cannot send command:', command);
      return;
    }

    try {
      wsClient.send(command);
      logger.debug('Sent command to extension:', command);
    } catch (error) {
      logger.error('Failed to send command:', error.message);
      throw new WebSocketError(`Failed to send command: ${error.message}`);
    }
  }

  /**
   * Sends a JSON message to the connected WebSocket client
   * @param {Object} payload - Message payload
   */
  static sendJSON(payload) {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      logger.warn('No extension connected, cannot send JSON message');
      return;
    }

    try {
      const message = JSON.stringify(payload);
      wsClient.send(message);
      logger.debug('Sent JSON message to extension:', payload.type);
    } catch (error) {
      logger.error('Failed to send JSON message:', error.message);
    }
  }

  /**
   * Starts connection health monitoring
   * @param {WebSocket} ws - WebSocket connection to monitor
   */
  static startConnectionMonitoring(ws) {
    WebSocketManager.stopConnectionMonitoring();
    
    // Send periodic ping to keep connection alive (every 30 seconds)
    connectionCheckInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
          logger.debug('Sent WebSocket ping');
        } catch (error) {
          logger.warn('Failed to send ping:', error.message);
        }
      }
    }, 30000);
  }

  /**
   * Stops connection health monitoring
   */
  static stopConnectionMonitoring() {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
      connectionCheckInterval = null;
    }
  }

  /**
   * Closes the WebSocket server
   */
  static close() {
    WebSocketManager.stopConnectionMonitoring();
    
    if (wsClient) {
      wsClient.close();
      wsClient = null;
    }

    if (wss) {
      wss.close(() => {
        logger.info('WebSocket server closed');
      });
      wss = null;
    }
  }
}

/**
 * Window Management
 */
class WindowManager {
  /**
   * Creates the player window if it doesn't exist
   * @throws {WindowError} If window creation fails
   */
  static createWindow() {
    if (playerWindow && !playerWindow.isDestroyed()) {
      logger.warn('Player window already exists');
      return;
    }

    try {
      logger.info('Creating player window');

      playerWindow = new BrowserWindow({
        width: WINDOW_CONFIG.WIDTH,
        height: WINDOW_CONFIG.HEIGHT.DEFAULT,
        frame: false,
        resizable: false,
        show: false,
        type: 'panel',
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: true,
        transparent: true,
        backgroundColor: '#00000000',
        webPreferences: {
          nodeIntegration: true, // TODO: Migrate to contextIsolation + preload for security
          contextIsolation: false, // TODO: Enable for production security
        },
      });

      const htmlPath = path.join(__dirname, 'ui/index.html');
      playerWindow.loadFile(htmlPath);

      playerWindow.on('blur', () => {
        logger.debug('Window blur event');
        if (playerWindow && !playerWindow.isDestroyed()) {
          playerWindow.hide();
        }
      });

      playerWindow.on('closed', () => {
        logger.info('Player window closed');
        playerWindow = null;
      });

      playerWindow.on('error', (error) => {
        logger.error('Window error:', error.message);
      });

      logger.info('Player window created successfully');
    } catch (error) {
      logger.error('Failed to create player window:', error.message);
      throw new WindowError(`Window creation failed: ${error.message}`);
    }
  }

  /**
   * Toggles the player window visibility
   */
  static toggleWindow() {
    try {
      if (playerWindow && playerWindow.isDestroyed()) {
        logger.debug('Window destroyed, resetting reference');
        playerWindow = null;
      }

      if (playerWindow && playerWindow.isVisible()) {
        logger.debug('Hiding player window');
        playerWindow.hide();
        return;
      }

      if (!playerWindow) {
        WindowManager.createWindow();
      }

      const position = WindowManager.calculateWindowPosition();
      playerWindow.setPosition(position.x, position.y, false);
      playerWindow.show();
      logger.debug('Showing player window', position);
    } catch (error) {
      logger.error('Failed to toggle window:', error.message);
    }
  }

  /**
   * Calculates optimal window position based on cursor location
   * @returns {{x: number, y: number}} Window position coordinates
   */
  static calculateWindowPosition() {
    try {
      const cursor = screen.getCursorScreenPoint();
      const display = screen.getDisplayNearestPoint(cursor);
      const bounds = display.workArea;

      const x = Math.round(cursor.x - WINDOW_CONFIG.POSITION_OFFSET.X);
      const y = Math.round(bounds.y + WINDOW_CONFIG.POSITION_OFFSET.Y);

      return { x, y };
    } catch (error) {
      logger.error('Failed to calculate window position:', error.message);
      return { x: 100, y: 100 };
    }
  }

  /**
   * Resizes the player window
   * @param {number} height - New window height
   */
  static resizeWindow(height) {
    if (!playerWindow || playerWindow.isDestroyed()) {
      logger.warn('Cannot resize: window not available');
      return;
    }

    if (typeof height !== 'number' || height <= 0 || height > 2000) {
      logger.warn('Invalid height value:', height);
      return;
    }

    try {
      const [width] = playerWindow.getSize();
      playerWindow.setSize(width, height, true);
      logger.debug('Window resized', { width, height });
    } catch (error) {
      logger.error('Failed to resize window:', error.message);
    }
  }
}

/**
 * Tray Management
 */
class TrayManager {
  /**
   * Creates and configures the system tray
   * @throws {Error} If tray icon is not found
   */
  static createTray() {
    const iconPath = path.join(__dirname, 'icon.png');
    logger.debug('Tray icon path:', iconPath);

    if (!fs.existsSync(iconPath)) {
      const error = new Error(`Tray icon not found: ${iconPath}`);
      logger.error(error.message);
      throw error;
    }

    try {
      const trayImage = nativeImage.createFromPath(iconPath);
      trayImage.setTemplateImage(true);

      tray = new Tray(trayImage);
      logger.info('Tray created successfully');

      const menu = Menu.buildFromTemplate([
        { label: 'BeatBar', enabled: false },
        { type: 'separator' },
        {
          label: 'Play / Pause',
          click: () => WebSocketManager.send(WS_MESSAGE_TYPES.PLAY_PAUSE),
        },
        {
          label: 'Next',
          click: () => WebSocketManager.send(WS_MESSAGE_TYPES.NEXT),
        },
        {
          label: 'Previous',
          click: () => WebSocketManager.send(WS_MESSAGE_TYPES.PREVIOUS),
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => {
            logger.info('Quit requested from tray menu');
            app.quit();
          },
        },
      ]);

      tray.on('click', () => WindowManager.toggleWindow());
      tray.on('right-click', () => tray.popUpContextMenu(menu));
      tray.on('error', (error) => {
        logger.error('Tray error:', error.message);
      });

      logger.info('Tray configured successfully');
    } catch (error) {
      logger.error('Failed to create tray:', error.message);
      throw error;
    }
  }
}

/**
 * Global Shortcuts Management
 */
class ShortcutManager {
  /**
   * Registers global keyboard shortcuts
   */
  static register() {
    try {
      const shortcuts = [
        {
          accelerator: SHORTCUTS.PLAY_PAUSE,
          action: () => WebSocketManager.send(WS_MESSAGE_TYPES.PLAY_PAUSE),
        },
        {
          accelerator: SHORTCUTS.NEXT,
          action: () => WebSocketManager.send(WS_MESSAGE_TYPES.NEXT),
        },
        {
          accelerator: SHORTCUTS.PREVIOUS,
          action: () => WebSocketManager.send(WS_MESSAGE_TYPES.PREVIOUS),
        },
      ];

      shortcuts.forEach(({ accelerator, action }) => {
        const registered = globalShortcut.register(accelerator, action);
        if (registered) {
          logger.info('Registered shortcut:', accelerator);
        } else {
          logger.warn('Failed to register shortcut:', accelerator);
        }
      });
    } catch (error) {
      logger.error('Failed to register shortcuts:', error.message);
    }
  }

  /**
   * Unregisters all global shortcuts
   */
  static unregisterAll() {
    try {
      globalShortcut.unregisterAll();
      logger.info('All shortcuts unregistered');
    } catch (error) {
      logger.error('Failed to unregister shortcuts:', error.message);
    }
  }
}

/**
 * IPC Handlers
 */
class IPCHandler {
  /**
   * Registers all IPC handlers
   */
  static register() {
    ipcMain.on(IPC_CHANNELS.PLAYER_COMMAND, (event, cmd) => {
      if (typeof cmd !== 'string') {
        logger.warn('Invalid player command:', cmd);
        return;
      }
      logger.debug('IPC player command:', cmd);
      WebSocketManager.send(cmd);
    });

    ipcMain.on(IPC_CHANNELS.RESIZE, (event, height) => {
      if (typeof height !== 'number') {
        logger.warn('Invalid resize height:', height);
        return;
      }
      WindowManager.resizeWindow(height);
    });

    ipcMain.on(IPC_CHANNELS.SEARCH, (event, query) => {
      if (typeof query !== 'string' || query.trim().length === 0) {
        logger.warn('Invalid search query:', query);
        return;
      }
      logger.debug('IPC search query:', query);
      WebSocketManager.sendJSON({
        type: WS_MESSAGE_TYPES.SEARCH,
        query: query.trim(),
      });
    });

    ipcMain.on(IPC_CHANNELS.PLAY_RESULT, (event, item) => {
      if (!item || typeof item !== 'object') {
        logger.warn('Invalid play result item:', item);
        return;
      }
      logger.debug('IPC play result:', item.id || 'unknown');
      WebSocketManager.sendJSON({
        type: WS_MESSAGE_TYPES.PLAY_RESULT,
        item,
      });
    });

    logger.info('IPC handlers registered');
  }
}

/**
 * Application initialization
 */
async function initializeApp() {
  try {
    logger.info('Initializing application...');

    // Start WebSocket server
    WebSocketManager.start();

    // Create system tray
    TrayManager.createTray();

    // Register global shortcuts
    ShortcutManager.register();

    // Register IPC handlers
    IPCHandler.register();

    // Hide dock icon (macOS)
    if (app.dock) {
      app.dock.hide();
    }

    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application:', error.message);
    app.quit();
  }
}

/**
 * Application cleanup
 */
function cleanup() {
  logger.info('Cleaning up application resources...');
  
  try {
    ShortcutManager.unregisterAll();
    WebSocketManager.close();
    
    if (playerWindow && !playerWindow.isDestroyed()) {
      playerWindow.close();
    }
    
    if (tray) {
      tray.destroy();
    }
    
    logger.info('Cleanup completed');
  } catch (error) {
    logger.error('Error during cleanup:', error.message);
  }
}

// Application lifecycle handlers
app.whenReady().then(() => {
  logger.info('Electron app ready');
  initializeApp();
});

app.on('will-quit', () => {
  logger.info('Application will quit');
  cleanup();
});

app.on('window-all-closed', (event) => {
  // Prevent default behavior - we want the app to stay running
  event.preventDefault();
});

app.on('before-quit', () => {
  logger.info('Application before quit');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error.message);
  logger.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection:', reason);
});
