/**
 * BeatBar Extension - Content Script
 * Controls YouTube Music playback and extracts now-playing information
 * @module content
 */

const SELECTORS = {
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

const TIMING = {
  SEARCH_INPUT_DELAY: 60,
  SEARCH_RESULTS_DELAY: 1200,
  SUGGESTION_DELAY: 120,
};

const MESSAGE_TYPES = {
  NOW_PLAYING: 'NOW_PLAYING',
  SEARCH_RESULTS: 'SEARCH_RESULTS',
};

const COMMANDS = {
  PLAY_PAUSE: 'PLAY_PAUSE',
  NEXT: 'NEXT',
  PREVIOUS: 'PREVIOUS',
};

/**
 * Simple logger for content script
 */
const logger = {
  debug: (...args) => {
    // Always log debug in content script (browser context doesn't have process.env)
    console.log('[Content]', ...args);
  },
  warn: (...args) => console.warn('[Content]', ...args),
  error: (...args) => console.error('[Content]', ...args),
  info: (...args) => console.log('[Content]', ...args),
};

/**
 * Validation utilities
 */
const validation = {
  isValidString(str) {
    return typeof str === 'string' && str.trim().length > 0;
  },

  isValidObject(obj) {
    return obj && typeof obj === 'object' && !Array.isArray(obj);
  },
};

/**
 * Playback Controls
 */
class PlaybackController {
  /**
   * Toggles play/pause
   */
  static togglePlayPause() {
    try {
      const button = document.querySelector(SELECTORS.PLAY_PAUSE_BUTTON);
      if (!button) {
        logger.warn('Play/Pause button not found');
        return false;
      }
      button.click();
      logger.debug('Play/Pause toggled');
      return true;
    } catch (error) {
      logger.error('Error toggling play/pause:', error.message);
      return false;
    }
  }

  /**
   * Plays next track
   */
  static nextTrack() {
    try {
      const button = document.querySelector(SELECTORS.NEXT_BUTTON);
      if (!button) {
        logger.warn('Next button not found');
        return false;
      }
      button.click();
      logger.debug('Next track');
      return true;
    } catch (error) {
      logger.error('Error playing next track:', error.message);
      return false;
    }
  }

  /**
   * Plays previous track
   */
  static previousTrack() {
    try {
      const button = document.querySelector(SELECTORS.PREVIOUS_BUTTON);
      if (!button) {
        logger.warn('Previous button not found');
        return false;
      }
      button.click();
      logger.debug('Previous track');
      return true;
    } catch (error) {
      logger.error('Error playing previous track:', error.message);
      return false;
    }
  }
}

/**
 * Now Playing Monitor
 */
class NowPlayingMonitor {
  constructor() {
    this.lastPayload = '';
    this.observer = null;
    this.checkInterval = null;
  }

  /**
   * Starts monitoring now playing information
   */
  start() {
    try {
      this.waitForPlayer();
      logger.info('Now playing monitor started');
    } catch (error) {
      logger.error('Failed to start now playing monitor:', error.message);
    }
  }

  /**
   * Waits for player bar to appear and starts monitoring
   */
  waitForPlayer() {
    const playerBar = document.querySelector(SELECTORS.PLAYER_BAR);
    
    if (!playerBar) {
      requestAnimationFrame(() => this.waitForPlayer());
      return;
    }

    // Initial check
    this.sendNowPlaying();

    // Set up mutation observer
    this.observer = new MutationObserver(() => {
      this.sendNowPlaying();
    });

    this.observer.observe(playerBar, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src', 'aria-label'],
    });

    // Fallback: periodic check
    this.checkInterval = setInterval(() => {
      this.sendNowPlaying();
    }, 2000);

    logger.debug('Player bar found, monitoring started');
  }

  /**
   * Extracts and sends now playing information
   */
  sendNowPlaying() {
    try {
      const data = this.getNowPlaying();
      
      if (!data) {
        return;
      }

      const payload = JSON.stringify(data);
      
      // Avoid sending duplicate data
      if (payload === this.lastPayload) {
        return;
      }

      this.lastPayload = payload;

      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.NOW_PLAYING,
        data,
      }).catch((error) => {
        logger.warn('Failed to send now playing:', error.message);
      });

      logger.debug('Now playing sent:', data.title);
    } catch (error) {
      logger.error('Error sending now playing:', error.message);
    }
  }

  /**
   * Extracts now playing information from DOM
   * @returns {Object|null} Now playing data or null
   */
  getNowPlaying() {
    try {
      const titleEl = document.querySelector(SELECTORS.TITLE);
      const artistEl = document.querySelector(SELECTORS.ARTIST);
      const artEl = document.querySelector(SELECTORS.ART);

      if (!titleEl || !artistEl || !artEl) {
        return null;
      }

      const title = titleEl.textContent?.trim() || '';
      const artist = artistEl.textContent?.trim() || '';
      const art = artEl.src || '';

      if (!title || !artist) {
        return null;
      }

      return {
        title,
        artist,
        art,
      };
    } catch (error) {
      logger.error('Error getting now playing:', error.message);
      return null;
    }
  }

  /**
   * Stops monitoring
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

/**
 * Search Controller
 */
class SearchController {
  /**
   * Focuses search input and types query
   * @param {string} query - Search query
   */
  static async focusAndTypeSearch(query) {
    if (!validation.isValidString(query)) {
      logger.warn('Invalid search query');
      return false;
    }

    try {
      logger.debug('Starting search for:', query);

      // First check if search input is already visible
      let input = document.querySelector(SELECTORS.SEARCH_INPUT);
      
      if (!input || !input.offsetParent) {
        // Input not visible, click search button to open it
        const searchBtn = document.querySelector(SELECTORS.SEARCH_BUTTON);
        if (searchBtn) {
          searchBtn.click();
          logger.debug('Search button clicked');
        } else {
          logger.warn('Search button not found');
          return false;
        }

        // Wait longer for input to appear and be ready
        await new Promise((resolve) => setTimeout(resolve, 300));
      } else {
        logger.debug('Search input already visible');
      }

      // Try to find input with retries
      for (let i = 0; i < 5; i++) {
        input = document.querySelector(SELECTORS.SEARCH_INPUT);
        if (input && input.offsetParent) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!input || !input.offsetParent) {
        logger.warn('Search input not found or not visible after retries');
        return false;
      }

      logger.debug('Search input found and visible');

      // Focus the input
      input.focus();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Clear existing value
      input.value = '';
      
      // Dispatch multiple events to ensure YouTube Music recognizes the change
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Backspace' }));
      input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Backspace' }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Set the value directly first
      input.value = query;
      
      // Dispatch comprehensive events to ensure YouTube Music recognizes the input
      const events = [
        new Event('input', { bubbles: true, cancelable: true }),
        new Event('change', { bubbles: true, cancelable: true }),
        new Event('keyup', { bubbles: true, cancelable: true }),
      ];
      
      events.forEach(event => {
        input.dispatchEvent(event);
      });

      // Also try setting the value property directly on the input's internal value
      // YouTube Music might use a custom property
      if (input._value !== undefined) {
        input._value = query;
      }
      
      // Trigger input event multiple times to ensure it's caught
      for (let i = 0; i < 3; i++) {
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      
      // Focus again to ensure the input is active
      input.focus();
      
      // Don't trigger Enter - let YouTube Music handle the search automatically
      // The input event should trigger the search suggestions

      logger.debug('Search query typed:', query, 'Value:', input.value);

      // Wait for results and send them
      setTimeout(() => {
        SearchController.sendSearchResults();
      }, TIMING.SEARCH_RESULTS_DELAY);

      return true;
    } catch (error) {
      logger.error('Error focusing search:', error.message, error.stack);
      return false;
    }
  }

  /**
   * Sends search results to background script
   */
  static sendSearchResults() {
    try {
      const results = SearchController.extractSearchResults();

      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.SEARCH_RESULTS,
        data: results,
      }).catch((error) => {
        logger.warn('Failed to send search results:', error.message);
      });

      logger.debug('Search results sent:', results.length);
    } catch (error) {
      logger.error('Error sending search results:', error.message);
    }
  }

  /**
   * Extracts search results from DOM
   * @returns {Array} Array of search result items
   */
  static extractSearchResults() {
    const results = [];

    try {
      const resultElements = document.querySelectorAll(SELECTORS.SEARCH_RESULTS);

      resultElements.forEach((row, index) => {
        try {
          const titleEl = row.querySelector('.title');
          if (!titleEl) {
            return;
          }

          const title = titleEl.textContent?.trim() || '';
          const subtitle = row.querySelector('.secondary-flex-columns')?.innerText?.trim() || '';
          const image = row.querySelector('yt-img-shadow img')?.src || '';
          const id = row.id || `result-${index}`;

          if (!title) {
            return;
          }

          results.push({
            id,
            title,
            subtitle,
            image,
            index,
          });
        } catch (error) {
          logger.warn('Error extracting result item:', error.message);
        }
      });
    } catch (error) {
      logger.error('Error extracting search results:', error.message);
    }

    return results.slice(0, 10); // Limit to 10 results
  }

  /**
   * Plays a search result by ID
   * @param {string} id - Result element ID
   */
  static playSearchResult(id) {
    if (!validation.isValidString(id)) {
      logger.warn('Invalid result ID');
      return false;
    }

    try {
      const row = document.getElementById(id);
      if (!row) {
        logger.warn('Search result not found:', id);
        return false;
      }

      const playBtn = row.querySelector('ytmusic-play-button-renderer');
      if (!playBtn) {
        logger.warn('Play button not found in result');
        return false;
      }

      playBtn.click();
      logger.debug('Playing search result:', id);
      return true;
    } catch (error) {
      logger.error('Error playing search result:', error.message);
      return false;
    }
  }
}

// Initialize now playing monitor
const nowPlayingMonitor = new NowPlayingMonitor();
nowPlayingMonitor.start();

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    console.log("message", message);
    // All messages come as strings (even JSON is stringified)
    if (typeof message !== 'string') {
      logger.warn('Invalid message format: expected string, got', typeof message);
      return false;
    }

    // Try to parse as JSON first
    let parsedMessage = null;
    try {
      parsedMessage = JSON.parse(message);
    } catch (e) {
      // Not JSON, treat as plain string command
      parsedMessage = null;
    }
    console.log("parsedMessage", parsedMessage);
    console.log("message", message);
    console.log("typeof message", typeof message);
   
    // Handle JSON messages
    if (parsedMessage && validation.isValidObject(parsedMessage)) {
      logger.debug('Parsed message type:', parsedMessage.type);
      
      if (parsedMessage.type === 'SEARCH' && validation.isValidString(parsedMessage.query)) {
        logger.debug('Handling SEARCH command with query:', parsedMessage.query);
        SearchController.focusAndTypeSearch(parsedMessage.query).then((success) => {
          if (success) {
            setTimeout(() => {
              SearchController.sendSearchResults();
            }, TIMING.SUGGESTION_DELAY);
          } else {
            logger.warn('Failed to type search query');
          }
        });
        return false;
      } else if (parsedMessage.type === 'PLAY_RESULT' && validation.isValidObject(parsedMessage.item)) {
        logger.debug('Handling PLAY_RESULT command');
        SearchController.playSearchResult(parsedMessage.item.id);
        return false;
      }
    }

    // Handle plain string commands
    switch (message) {
      case COMMANDS.PLAY_PAUSE:
        PlaybackController.togglePlayPause();
        break;
      case COMMANDS.NEXT:
        PlaybackController.nextTrack();
        break;
      case COMMANDS.PREVIOUS:
        PlaybackController.previousTrack();
        break;
      default:
        logger.warn('Unknown command:', message);
    }

    return false;
  } catch (error) {
    logger.error('Error handling message:', error.message);
    return false;
  }
});

logger.info('BeatBar content script loaded');
