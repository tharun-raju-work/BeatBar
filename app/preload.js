/**
 * BeatBar - Preload Script
 * Secure bridge between main and renderer processes
 * @module preload
 * 
 * Note: Currently not used, but prepared for migration to contextIsolation: true
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exposes safe IPC methods to renderer process
 * This prevents direct Node.js access while maintaining functionality
 */
const electronAPI = {
  /**
   * Sends a player command to main process
   * @param {string} command - Command to send
   */
  sendPlayerCommand: (command) => {
    if (typeof command !== 'string') {
      throw new Error('Command must be a string');
    }
    ipcRenderer.send('player-command', command);
  },

  /**
   * Sends a search query to main process
   * @param {string} query - Search query
   */
  sendSearch: (query) => {
    if (typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }
    ipcRenderer.send('search', query.trim());
  },

  /**
   * Sends a play result request to main process
   * @param {Object} item - Result item to play
   */
  sendPlayResult: (item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Item must be a valid object');
    }
    ipcRenderer.send('play-result', item);
  },

  /**
   * Requests window resize
   * @param {number} height - New window height
   */
  requestResize: (height) => {
    if (typeof height !== 'number' || height <= 0) {
      throw new Error('Height must be a positive number');
    }
    ipcRenderer.send('resize', height);
  },

  /**
   * Registers a listener for now-playing updates
   * @param {Function} callback - Callback function
   */
  onNowPlaying: (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    ipcRenderer.on('now-playing', (event, data) => callback(data));
  },

  /**
   * Registers a listener for search results
   * @param {Function} callback - Callback function
   */
  onSearchResults: (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    ipcRenderer.on('search-results', (event, data) => callback(data));
  },

  /**
   * Removes all listeners for a channel
   * @param {string} channel - IPC channel name
   */
  removeAllListeners: (channel) => {
    if (typeof channel !== 'string') {
      throw new Error('Channel must be a string');
    }
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose API to renderer when contextIsolation is enabled
// Currently commented out as we're using nodeIntegration: true
// Uncomment and update main.js when migrating to secure mode:
// contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// For now, expose directly for compatibility
if (typeof window !== 'undefined') {
  window.electronAPI = electronAPI;
}
