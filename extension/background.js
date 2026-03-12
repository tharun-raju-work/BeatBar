/**
 * BeatBar Extension - Background Service Worker
 * Manages WebSocket connection between extension and Electron app
 * @module background
 */

const WEBSOCKET_CONFIG = {
  HOST: '127.0.0.1',
  PORT: 17345,
  RECONNECT_DELAY: 2000,
  MAX_RECONNECT_ATTEMPTS: 10,
  PING_INTERVAL: 25000, // 25 seconds - keep service worker alive
  CONNECTION_CHECK_INTERVAL: 30000, // 30 seconds - check connection health
};

const MESSAGE_TYPES = {
  NOW_PLAYING: 'NOW_PLAYING',
  SEARCH_RESULTS: 'SEARCH_RESULTS',
};

/**
 * Simple logger for extension background
 */
const logger = {
  debug: (...args) => console.log('[Background]', ...args),
  warn: (...args) => console.warn('[Background]', ...args),
  error: (...args) => console.error('[Background]', ...args),
  info: (...args) => console.log('[Background]', ...args),
};

/**
 * WebSocket Connection Manager
 */
class WebSocketManager {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.isConnecting = false;
    this.pingInterval = null;
    this.connectionCheckInterval = null;
    this.lastActivityTime = Date.now();
  }

  /**
   * Connects to the Electron WebSocket server
   */
  connect() {
    if (this.isConnecting || (this.socket && this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const url = `ws://${WEBSOCKET_CONFIG.HOST}:${WEBSOCKET_CONFIG.PORT}`;

    try {
      logger.info('Connecting to Electron app...', url);

      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        logger.info('Connected to Electron app');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.lastActivityTime = Date.now();
        this.startKeepAlive();
        this.startConnectionCheck();
      };

      this.socket.onmessage = (event) => {
        try {
          this.lastActivityTime = Date.now();
          
          // Handle ping/pong for keepalive
          if (event.data === 'PONG' || event.data === 'pong') {
            logger.debug('Received PONG');
            return;
          }
          
          this.handleMessage(event.data);
        } catch (error) {
          logger.error('Error handling message:', error.message);
        }
      };

      this.socket.onclose = () => {
        logger.warn('Connection closed');
        this.isConnecting = false;
        this.socket = null;
        this.stopKeepAlive();
        this.stopConnectionCheck();
        this.scheduleReconnect();
      };

      this.socket.onerror = (error) => {
        logger.error('WebSocket error:', error);
        this.isConnecting = false;
        // Close will trigger reconnect
        if (this.socket) {
          this.socket.close();
        }
      };
    } catch (error) {
      logger.error('Failed to create WebSocket:', error.message);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Handles incoming messages from Electron
   * @param {string} message - Raw message string
   */
  handleMessage(message) {
    if (!message || typeof message !== 'string') {
      logger.warn('Invalid message format');
      return;
    }

    try {
      // Forward commands to content script
      this.forwardToContentScript(message);
    } catch (error) {
      logger.error('Error handling message:', error.message);
    }
  }

  /**
   * Forwards message to content script
   * @param {string} message - Message to forward
   */
  async forwardToContentScript(message) {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://music.youtube.com/*' });
      
      if (!tabs || tabs.length === 0) {
        logger.debug('No YouTube Music tabs found');
        return;
      }

      // Send to all matching tabs
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, message);
          logger.debug('Message forwarded to tab:', tab.id);
        } catch (error) {
          logger.warn('Failed to send message to tab:', tab.id, error.message);
        }
      }
    } catch (error) {
      logger.error('Error forwarding message:', error.message);
    }
  }

  /**
   * Sends a message to Electron
   * @param {Object} payload - Message payload
   */
  send(payload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      logger.warn('WebSocket not connected, cannot send message');
      return;
    }

    try {
      const message = JSON.stringify(payload);
      this.socket.send(message);
      logger.debug('Sent message to Electron:', payload.type);
    } catch (error) {
      logger.error('Error sending message:', error.message);
    }
  }

  /**
   * Schedules a reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = WEBSOCKET_CONFIG.RECONNECT_DELAY * this.reconnectAttempts;

    logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Starts keepalive ping mechanism to prevent service worker termination
   */
  startKeepAlive() {
    this.stopKeepAlive();
    
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send('PING');
          logger.debug('Sent PING keepalive');
        } catch (error) {
          logger.warn('Failed to send PING:', error.message);
          this.scheduleReconnect();
        }
      }
    }, WEBSOCKET_CONFIG.PING_INTERVAL);
  }

  /**
   * Stops keepalive ping mechanism
   */
  stopKeepAlive() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Starts periodic connection health check
   */
  startConnectionCheck() {
    this.stopConnectionCheck();
    
    this.connectionCheckInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      
      // If no activity for too long, check connection
      if (timeSinceLastActivity > WEBSOCKET_CONFIG.CONNECTION_CHECK_INTERVAL * 2) {
        logger.warn('No activity detected, checking connection...');
        
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
          logger.warn('Connection appears dead, reconnecting...');
          this.scheduleReconnect();
        }
      }
    }, WEBSOCKET_CONFIG.CONNECTION_CHECK_INTERVAL);
  }

  /**
   * Stops connection health check
   */
  stopConnectionCheck() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  /**
   * Closes the WebSocket connection
   */
  close() {
    this.stopKeepAlive();
    this.stopConnectionCheck();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.isConnecting = false;
  }
}

// Initialize WebSocket manager
const wsManager = new WebSocketManager();

// Connect when service worker starts
wsManager.connect();

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (!message || typeof message !== 'object') {
      logger.warn('Invalid message format');
      return false;
    }

    // Forward NOW_PLAYING updates to Electron
    if (message.type === MESSAGE_TYPES.NOW_PLAYING) {
      wsManager.send({
        type: MESSAGE_TYPES.NOW_PLAYING,
        data: message.data,
      });
    }

    // Forward SEARCH_RESULTS to Electron
    if (message.type === MESSAGE_TYPES.SEARCH_RESULTS) {
      wsManager.send({
        type: MESSAGE_TYPES.SEARCH_RESULTS,
        data: message.data,
      });
    }

    return false; // Async response not needed
  } catch (error) {
    logger.error('Error handling runtime message:', error.message);
    return false;
  }
});

// Handle extension lifecycle
chrome.runtime.onInstalled.addListener(() => {
  logger.info('Extension installed');
  wsManager.connect();
  
  // Set up alarm to keep service worker alive
  setupKeepAliveAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  logger.info('Extension startup');
  wsManager.connect();
  setupKeepAliveAlarm();
});

// Handle service worker wake-up from alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    logger.debug('Service worker woken by keepalive alarm');
    
    // Ensure connection is active
    if (!wsManager.socket || wsManager.socket.readyState !== WebSocket.OPEN) {
      logger.info('Reconnecting after service worker wake-up');
      wsManager.connect();
    } else {
      // Update activity time to prevent termination
      wsManager.lastActivityTime = Date.now();
    }
  }
});

/**
 * Sets up a periodic alarm to keep the service worker alive
 * Chrome extensions service workers are terminated after ~30 seconds of inactivity
 */
function setupKeepAliveAlarm() {
  // Clear existing alarm
  chrome.alarms.clear('keepalive');
  
  // Create alarm that fires every 20 seconds to keep service worker alive
  chrome.alarms.create('keepalive', {
    periodInMinutes: 0.33, // ~20 seconds
  });
  
  logger.debug('Keepalive alarm set up');
}

// Periodic activity to prevent service worker termination
// Chrome keeps service workers alive if they have pending work
setInterval(() => {
  // This interval keeps the service worker alive
  // The actual work is done by the alarm and WebSocket ping
  if (wsManager.socket && wsManager.socket.readyState === WebSocket.OPEN) {
    wsManager.lastActivityTime = Date.now();
  }
}, 15000); // Every 15 seconds

// Cleanup on shutdown
self.addEventListener('beforeunload', () => {
  wsManager.close();
  chrome.alarms.clear('keepalive');
});
