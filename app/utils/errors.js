/**
 * Custom error classes for better error handling
 * @module errors
 */

/**
 * Base application error
 */
class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * WebSocket connection error
 */
class WebSocketError extends AppError {
  constructor(message, code = 'WEBSOCKET_ERROR') {
    super(message, code);
  }
}

/**
 * Validation error
 */
class ValidationError extends AppError {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message, code);
  }
}

/**
 * Window management error
 */
class WindowError extends AppError {
  constructor(message, code = 'WINDOW_ERROR') {
    super(message, code);
  }
}

module.exports = {
  AppError,
  WebSocketError,
  ValidationError,
  WindowError,
};
