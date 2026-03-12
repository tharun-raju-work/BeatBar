/**
 * Production-ready logging utility
 * @module logger
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production' 
  ? LOG_LEVELS.INFO 
  : LOG_LEVELS.DEBUG;

/**
 * Logger class for structured logging
 */
class Logger {
  /**
   * Creates a logger instance with a context
   * @param {string} context - Context name (e.g., 'Main', 'Renderer', 'WebSocket')
   */
  constructor(context = 'App') {
    this.context = context;
  }

  /**
   * Formats log message with context and timestamp
   * @private
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Array} args - Additional arguments
   * @returns {string} Formatted log message
   */
  _format(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const contextStr = `[${this.context}]`;
    const levelStr = `[${level}]`;
    const argsStr = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `${timestamp} ${contextStr} ${levelStr} ${message}${argsStr}`;
  }

  /**
   * Logs an error message
   * @param {string} message - Error message
   * @param {...any} args - Additional arguments
   */
  error(message, ...args) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
      console.error(this._format('ERROR', message, ...args));
    }
  }

  /**
   * Logs a warning message
   * @param {string} message - Warning message
   * @param {...any} args - Additional arguments
   */
  warn(message, ...args) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
      console.warn(this._format('WARN', message, ...args));
    }
  }

  /**
   * Logs an info message
   * @param {string} message - Info message
   * @param {...any} args - Additional arguments
   */
  info(message, ...args) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      console.log(this._format('INFO', message, ...args));
    }
  }

  /**
   * Logs a debug message
   * @param {string} message - Debug message
   * @param {...any} args - Additional arguments
   */
  debug(message, ...args) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      console.log(this._format('DEBUG', message, ...args));
    }
  }
}

/**
 * Creates a logger instance
 * @param {string} context - Context name
 * @returns {Logger} Logger instance
 */
function createLogger(context) {
  return new Logger(context);
}

module.exports = {
  Logger,
  createLogger,
  LOG_LEVELS,
};
