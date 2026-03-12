/**
 * Application configuration constants
 * @module config
 */

/**
 * WebSocket server configuration
 */
const WEBSOCKET_CONFIG = {
  PORT: 17345,
  HOST: '127.0.0.1',
  RECONNECT_DELAY: 2000,
  MAX_RECONNECT_ATTEMPTS: 10,
};

/**
 * Window configuration
 */
const WINDOW_CONFIG = {
  WIDTH: 280,
  HEIGHT: {
    DEFAULT: 360,
    WITH_SEARCH: 420,
    RESULT_ITEM_HEIGHT: 68, // Updated for better spacing (48px image + 20px padding)
    MAX_RESULTS: 5,
  },
  POSITION_OFFSET: {
    X: 140,
    Y: 18,
  },
};

/**
 * Search configuration
 */
const SEARCH_CONFIG = {
  DEBOUNCE_MS: 150,
  RESULTS_LIMIT: 10,
  SUGGESTION_DELAY_MS: 1200,
  INPUT_DELAY_MS: 60,
};

/**
 * Global shortcuts configuration
 */
const SHORTCUTS = {
  PLAY_PAUSE: 'Command+Shift+1',
  NEXT: 'Command+Shift+2',
  PREVIOUS: 'Command+Shift+3',
};

/**
 * IPC channel names
 */
const IPC_CHANNELS = {
  PLAYER_COMMAND: 'player-command',
  NOW_PLAYING: 'now-playing',
  SEARCH_RESULTS: 'search-results',
  SEARCH: 'search',
  PLAY_RESULT: 'play-result',
  RESIZE: 'resize',
};

/**
 * WebSocket message types
 */
const WS_MESSAGE_TYPES = {
  NOW_PLAYING: 'NOW_PLAYING',
  SEARCH_RESULTS: 'SEARCH_RESULTS',
  SEARCH: 'SEARCH',
  PLAY_RESULT: 'PLAY_RESULT',
  PLAY_PAUSE: 'PLAY_PAUSE',
  NEXT: 'NEXT',
  PREVIOUS: 'PREVIOUS',
};

/**
 * YouTube Music selectors
 */
const YTM_SELECTORS = {
  PLAY_PAUSE_BUTTON: '#play-pause-button',
  NEXT_BUTTON: 'yt-icon-button[title="Next"], yt-icon-button[aria-label="Next song"]',
  PREVIOUS_BUTTON: 'yt-icon-button[title="Previous"], yt-icon-button[aria-label="Previous song"]',
  TITLE: 'yt-formatted-string.title.ytmusic-player-bar',
  ARTIST: 'yt-formatted-string.byline.ytmusic-player-bar a',
  ART: '.thumbnail-image-wrapper img.image.ytmusic-player-bar',
  PLAYER_BAR: 'ytmusic-player-bar',
  SEARCH_BUTTON: 'ytmusic-search-box button[aria-label="Initiate search"]',
  SEARCH_INPUT: 'ytmusic-search-box input#input',
  SEARCH_RESULTS: 'ytmusic-responsive-list-item-renderer',
};

module.exports = {
  WEBSOCKET_CONFIG,
  WINDOW_CONFIG,
  SEARCH_CONFIG,
  SHORTCUTS,
  IPC_CHANNELS,
  WS_MESSAGE_TYPES,
  YTM_SELECTORS,
};
