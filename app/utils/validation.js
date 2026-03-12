/**
 * Input validation utilities
 * @module validation
 */

/**
 * Validates a search query
 * @param {string} query - Search query to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidSearchQuery(query) {
  if (typeof query !== 'string') return false;
  const trimmed = query.trim();
  return trimmed.length > 0 && trimmed.length <= 200;
}

/**
 * Validates a WebSocket message payload
 * @param {any} payload - Payload to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidWebSocketPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!payload.type || typeof payload.type !== 'string') return false;
  return true;
}

/**
 * Validates a search result item
 * @param {any} item - Search result item to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidSearchResult(item) {
  if (!item || typeof item !== 'object') return false;
  if (!item.id || typeof item.id !== 'string') return false;
  if (!item.title || typeof item.title !== 'string') return false;
  return true;
}

/**
 * Sanitizes a string to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validates window dimensions
 * @param {number} width - Window width
 * @param {number} height - Window height
 * @returns {boolean} True if valid, false otherwise
 */
function isValidWindowDimensions(width, height) {
  return (
    typeof width === 'number' &&
    typeof height === 'number' &&
    width > 0 &&
    height > 0 &&
    width <= 2000 &&
    height <= 2000
  );
}

module.exports = {
  isValidSearchQuery,
  isValidWebSocketPayload,
  isValidSearchResult,
  sanitizeString,
  isValidWindowDimensions,
};
