/**
 * BeatBar - Renderer Process
 * UI controller for the player window
 * @module renderer
 */

const { ipcRenderer } = require('electron');

// Import utilities (Note: These need to be available in renderer context)
// For now, we'll use inline validation since renderer has limited access
const IPC_CHANNELS = {
  PLAYER_COMMAND: 'player-command',
  NOW_PLAYING: 'now-playing',
  SEARCH_RESULTS: 'search-results',
  SEARCH: 'search',
  PLAY_RESULT: 'play-result',
  RESIZE: 'resize',
};

const SEARCH_CONFIG = {
  DEBOUNCE_MS: 150,
  RESULTS_LIMIT: 10,
};

const WINDOW_CONFIG = {
  HEIGHT: {
    DEFAULT: 360,
    WITH_SEARCH: 420,
    RESULT_ITEM_HEIGHT: 52,
    MAX_RESULTS: 5,
  },
};

/**
 * Simple logger for renderer (console-based)
 */
const logger = {
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Renderer]', ...args);
    }
  },
  warn: (...args) => console.warn('[Renderer]', ...args),
  error: (...args) => console.error('[Renderer]', ...args),
  info: (...args) => console.log('[Renderer]', ...args),
};

/**
 * Validation utilities
 */
const validation = {
  isValidSearchQuery(query) {
    return typeof query === 'string' && query.trim().length > 0 && query.trim().length <= 200;
  },

  isValidSearchResult(item) {
    return item && typeof item === 'object' && item.id && item.title;
  },

  sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

/**
 * Player UI Controller
 */
class PlayerController {
  constructor() {
    this.elements = {};
    this.searchState = {
      isOpen: false,
      debounceTimer: null,
    };
    this.currentResults = [];
  }

  /**
   * Initializes the controller and sets up event listeners
   */
  init() {
    try {
      this.cacheElements();
      this.setupEventListeners();
      this.setupIPCListeners();
      logger.info('Player controller initialized');
    } catch (error) {
      logger.error('Failed to initialize player controller:', error.message);
    }
  }

  /**
   * Caches DOM elements for performance
   */
  cacheElements() {
    const elementIds = [
      'title',
      'artist',
      'art',
      'play',
      'next',
      'prev',
      'search',
      'search-box',
      'search-input',
      'results',
    ];

    elementIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) {
        logger.warn(`Element not found: ${id}`);
        return;
      }
      this.elements[id] = element;
    });

    // Validate critical elements
    if (!this.elements.title || !this.elements.artist || !this.elements.art) {
      throw new Error('Critical UI elements missing');
    }
  }

  /**
   * Sets up DOM event listeners
   */
  setupEventListeners() {
    // Playback controls
    if (this.elements.play) {
      this.elements.play.addEventListener('click', () => this.handlePlayPause());
    }

    if (this.elements.next) {
      this.elements.next.addEventListener('click', () => this.handleNext());
    }

    if (this.elements.prev) {
      this.elements.prev.addEventListener('click', () => this.handlePrevious());
    }

    // Search toggle
    if (this.elements.search) {
      this.elements.search.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        logger.debug('Search button clicked');
        this.toggleSearch();
      });
    } else {
      logger.warn('Search button element not found');
    }

    // Search input
    if (this.elements['search-input']) {
      this.elements['search-input'].addEventListener('input', (e) => this.handleSearchInput(e));
      this.elements['search-input'].addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.performSearch(e.target.value);
        }
      });
    }

    // ESC key to close search
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.searchState.isOpen) {
        this.collapseSearch();
      }
    });

    logger.debug('Event listeners set up');
  }

  /**
   * Sets up IPC message listeners
   */
  setupIPCListeners() {
    ipcRenderer.on(IPC_CHANNELS.NOW_PLAYING, (event, data) => {
      try {
        this.updateNowPlaying(data);
      } catch (error) {
        logger.error('Error handling now-playing:', error.message);
      }
    });

    ipcRenderer.on(IPC_CHANNELS.SEARCH_RESULTS, (event, results) => {
      try {
        this.renderSearchResults(results);
      } catch (error) {
        logger.error('Error handling search-results:', error.message);
      }
    });

    logger.debug('IPC listeners set up');
  }

  /**
   * Updates the now playing display
   * @param {Object} data - Now playing data
   */
  updateNowPlaying(data) {
    if (!data || typeof data !== 'object') {
      logger.warn('Invalid now-playing data');
      return;
    }

    try {
      if (this.elements.title) {
        this.elements.title.textContent = data.title || '—';
      }

      if (this.elements.artist) {
        this.elements.artist.textContent = data.artist || '—';
      }

      if (this.elements.art && data.art) {
        // Validate image URL
        if (typeof data.art === 'string' && data.art.startsWith('http')) {
          this.elements.art.src = data.art;
          this.elements.art.onerror = () => {
            logger.warn('Failed to load album art:', data.art);
            this.elements.art.src = '';
          };
        }
      }

      logger.debug('Now playing updated:', data.title);
    } catch (error) {
      logger.error('Error updating now playing:', error.message);
    }
  }

  /**
   * Handles play/pause button click
   */
  handlePlayPause() {
    try {
      ipcRenderer.send(IPC_CHANNELS.PLAYER_COMMAND, 'PLAY_PAUSE');
      logger.debug('Play/pause command sent');
    } catch (error) {
      logger.error('Error sending play/pause command:', error.message);
    }
  }

  /**
   * Handles next button click
   */
  handleNext() {
    try {
      ipcRenderer.send(IPC_CHANNELS.PLAYER_COMMAND, 'NEXT');
      logger.debug('Next command sent');
    } catch (error) {
      logger.error('Error sending next command:', error.message);
    }
  }

  /**
   * Handles previous button click
   */
  handlePrevious() {
    try {
      ipcRenderer.send(IPC_CHANNELS.PLAYER_COMMAND, 'PREVIOUS');
      logger.debug('Previous command sent');
    } catch (error) {
      logger.error('Error sending previous command:', error.message);
    }
  }

  /**
   * Toggles search panel visibility
   */
  toggleSearch() {
    try {
      this.searchState.isOpen = !this.searchState.isOpen;

      // Update button active state
      if (this.elements.search) {
        if (this.searchState.isOpen) {
          this.elements.search.classList.add('active');
        } else {
          this.elements.search.classList.remove('active');
        }
      }

      if (this.searchState.isOpen) {
        this.openSearch();
      } else {
        this.collapseSearch();
      }

      logger.debug('Search toggled:', this.searchState.isOpen);
    } catch (error) {
      logger.error('Error toggling search:', error.message);
    }
  }

  /**
   * Opens the search panel
   */
  openSearch() {
    try {
      if (!this.elements['search-box'] || !this.elements['search-input']) {
        logger.warn('Search elements not available');
        return;
      }

      // Show search box with animation
      this.elements['search-box'].hidden = false;
      this.elements['search-box'].style.opacity = '0';
      this.elements['search-box'].style.transform = 'translateY(-8px)';
      this.elements['search-box'].style.transition = 'all 0.2s ease-out';
      
      // Trigger animation
      setTimeout(() => {
        this.elements['search-box'].style.opacity = '1';
        this.elements['search-box'].style.transform = 'translateY(0)';
      }, 10);

      this.elements['search-input'].value = '';
      this.currentResults = [];

      if (this.elements.results) {
        this.elements.results.innerHTML = '';
        this.elements.results.classList.remove('loading');
      }

      // Focus input after animation
      setTimeout(() => {
        this.elements['search-input'].focus();
      }, 200);

      this.resizeWindow(WINDOW_CONFIG.HEIGHT.WITH_SEARCH);
      logger.debug('Search opened');
    } catch (error) {
      logger.error('Error opening search:', error.message);
    }
  }

  /**
   * Collapses the search panel
   */
  collapseSearch() {
    try {
      this.searchState.isOpen = false;

      // Remove active state from button
      if (this.elements.search) {
        this.elements.search.classList.remove('active');
      }

      if (this.elements['search-box']) {
        // Fade out animation
        this.elements['search-box'].style.opacity = '0';
        this.elements['search-box'].style.transform = 'translateY(-8px)';
        setTimeout(() => {
          this.elements['search-box'].hidden = true;
        }, 200);
      }

      if (this.elements['search-input']) {
        this.elements['search-input'].value = '';
        this.elements['search-input'].blur();
      }

      if (this.elements.results) {
        this.elements.results.innerHTML = '';
        this.elements.results.classList.remove('loading');
      }

      this.currentResults = [];

      if (this.searchState.debounceTimer) {
        clearTimeout(this.searchState.debounceTimer);
        this.searchState.debounceTimer = null;
      }

      this.resizeWindow(WINDOW_CONFIG.HEIGHT.DEFAULT);
      logger.debug('Search collapsed');
    } catch (error) {
      logger.error('Error collapsing search:', error.message);
    }
  }

  /**
   * Handles search input changes with debouncing
   * @param {Event} event - Input event
   */
  handleSearchInput(event) {
    try {
      const query = event.target.value.trim();

      // Clear existing debounce timer
      if (this.searchState.debounceTimer) {
        clearTimeout(this.searchState.debounceTimer);
      }

    if (!query) {
        if (this.elements.results) {
          this.elements.results.innerHTML = '';
          this.elements.results.classList.remove('loading');
        }
        this.currentResults = [];
        this.resizeWindow(WINDOW_CONFIG.HEIGHT.WITH_SEARCH);
        return;
      }

      // Validate query
      if (!validation.isValidSearchQuery(query)) {
        logger.warn('Invalid search query:', query);
        return;
      }

      // Show loading state
      if (this.elements.results) {
        this.elements.results.innerHTML = '';
        this.elements.results.classList.add('loading');
      }

      // Debounce search
      this.searchState.debounceTimer = setTimeout(() => {
        this.performSearch(query);
      }, SEARCH_CONFIG.DEBOUNCE_MS);
    } catch (error) {
      logger.error('Error handling search input:', error.message);
    }
  }

  /**
   * Performs a search query
   * @param {string} query - Search query
   */
  performSearch(query) {
    try {
      if (!validation.isValidSearchQuery(query)) {
        logger.warn('Invalid search query:', query);
        return;
      }

      logger.debug('Performing search:', query);
      ipcRenderer.send(IPC_CHANNELS.SEARCH, query);
    } catch (error) {
      logger.error('Error performing search:', error.message);
    }
  }

  /**
   * Renders search results
   * @param {Array} results - Array of search result items
   */
  renderSearchResults(results) {
    try {
      if (!this.elements.results) {
        logger.warn('Results element not available');
        return;
      }

      // Validate results
      if (!Array.isArray(results)) {
        logger.warn('Invalid results format:', typeof results);
        results = [];
      }

      this.currentResults = results;
      
      // Remove loading class if present
      this.elements.results.classList.remove('loading');
      
      // Clear results with fade out effect
      if (this.elements.results.children.length > 0) {
        this.elements.results.style.opacity = '0';
        setTimeout(() => {
          this.elements.results.innerHTML = '';
          this.elements.results.style.opacity = '1';
          this.renderResultsContent(results);
        }, 150);
      } else {
        this.renderResultsContent(results);
      }
    } catch (error) {
      logger.error('Error rendering search results:', error.message);
    }
  }

  /**
   * Renders the actual results content
   * @param {Array} results - Array of search result items
   */
  renderResultsContent(results) {
    if (results.length === 0) {
      this.resizeWindow(WINDOW_CONFIG.HEIGHT.WITH_SEARCH);
      return;
    }

    // Render each result with stagger animation
    results.forEach((item, index) => {
      if (!validation.isValidSearchResult(item)) {
        logger.warn('Invalid search result item:', item);
        return;
      }

      const row = this.createResultRow(item);
      if (row) {
        // Stagger animation
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        this.elements.results.appendChild(row);
        
        // Animate in
        setTimeout(() => {
          row.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          row.style.opacity = '1';
          row.style.transform = 'translateY(0)';
        }, index * 30);
      }
    });

    // Calculate and set window height
    const resultCount = Math.min(results.length, WINDOW_CONFIG.HEIGHT.MAX_RESULTS);
    const height = WINDOW_CONFIG.HEIGHT.WITH_SEARCH + resultCount * WINDOW_CONFIG.HEIGHT.RESULT_ITEM_HEIGHT;
    this.resizeWindow(height);

    logger.debug('Search results rendered:', results.length);
  }

  /**
   * Creates a DOM element for a search result
   * @param {Object} item - Search result item
   * @returns {HTMLElement|null} Result row element
   */
  createResultRow(item) {
    try {
      if (!validation.isValidSearchResult(item)) {
        return null;
      }

      const row = document.createElement('div');
      row.className = 'result';

      // Sanitize content
      const title = validation.sanitizeHTML(item.title || '');
      const subtitle = validation.sanitizeHTML(item.subtitle || '');
      const imageUrl = item.image && typeof item.image === 'string' && item.image.trim() !== '' 
        ? item.image 
        : '';

      // Create image element with better error handling
      const img = document.createElement('img');
      if (imageUrl) {
        img.src = imageUrl;
        img.alt = title;
        img.onerror = () => {
          // Hide broken images gracefully
          img.style.display = 'none';
        };
        img.onload = () => {
          img.style.opacity = '0';
          setTimeout(() => {
            img.style.transition = 'opacity 0.3s ease';
            img.style.opacity = '1';
          }, 10);
        };
      } else {
        // Create placeholder
        img.style.display = 'none';
      }

      // Create content wrapper
      const content = document.createElement('div');
      content.className = 'result-content';

      const titleEl = document.createElement('div');
      titleEl.className = 'result-title';
      titleEl.textContent = title;

      const subtitleEl = document.createElement('div');
      subtitleEl.className = 'result-sub';
      subtitleEl.textContent = subtitle || '';

      content.appendChild(titleEl);
      if (subtitle) {
        content.appendChild(subtitleEl);
      }

      row.appendChild(img);
      row.appendChild(content);

      // Add click handler with visual feedback
      row.addEventListener('click', (e) => {
        e.preventDefault();
        row.style.transform = 'scale(0.97)';
        setTimeout(() => {
          this.playResult(item);
        }, 100);
      });

      // Add keyboard support
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `Play ${title}`);
      
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.playResult(item);
        }
      });

      return row;
    } catch (error) {
      logger.error('Error creating result row:', error.message);
      return null;
    }
  }

  /**
   * Handles playing a search result
   * @param {Object} item - Search result item to play
   */
  playResult(item) {
    try {
      if (!validation.isValidSearchResult(item)) {
        logger.warn('Invalid result item for playback:', item);
        return;
      }

      logger.debug('Playing result:', item.id || item.title);
      ipcRenderer.send(IPC_CHANNELS.PLAY_RESULT, item);
      this.collapseSearch();
    } catch (error) {
      logger.error('Error playing result:', error.message);
    }
  }

  /**
   * Resizes the window
   * @param {number} height - New window height
   */
  resizeWindow(height) {
    try {
      if (typeof height !== 'number' || height <= 0) {
        logger.warn('Invalid window height:', height);
        return;
      }

      ipcRenderer.send(IPC_CHANNELS.RESIZE, height);
      logger.debug('Window resize requested:', height);
    } catch (error) {
      logger.error('Error resizing window:', error.message);
    }
  }
}

// Initialize controller when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  try {
    logger.info('DOM loaded, initializing player controller');
    const controller = new PlayerController();
    controller.init();
    
    // Make controller available globally for debugging (dev only)
    if (process.env.NODE_ENV !== 'production') {
      window.playerController = controller;
    }
  } catch (error) {
    logger.error('Failed to initialize application:', error.message);
  }
});

// Handle uncaught errors
window.addEventListener('error', (event) => {
  logger.error('Uncaught error:', event.error?.message || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection:', event.reason);
});
