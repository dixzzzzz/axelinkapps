/**
 * Console Suppression Utilities
 * 
 * Suppresses common development warnings and errors that are expected behavior
 */

// Store original console methods
const originalConsole = {
  warn: console.warn,
  error: console.error,
  log: console.log
};

/**
 * Suppress specific console warnings and errors for development and production
 */
export function setupConsoleSuppression() {
  if (typeof console === 'undefined') {
    return;
  }

  // Helper: detect network-related error messages we want to allow through
  const isNetworkErrorMessage = (msg: string) => {
    return (
      msg.includes('Failed to load resource') ||
      msg.includes('NetworkError') ||
      msg.includes('ERR_') ||
      msg.includes('HTTP') ||
      msg.includes('status of') ||
      /\b(4\d\d|5\d\d)\b/.test(msg)
    );
  };

  // Override console.warn to suppress noisy warnings
  console.warn = (...args: any[]) => {
    const message = args[0];
    if (typeof message === 'string') {
      // Suppress Three.js/Vanta deprecation and parameter warnings
      if (message.includes('THREE.Material: parameter') ||
          message.includes('vertexColors') ||
          message.includes('deprecated')) {
        return;
      }
    }
    // Suppress all other warnings in production
    if (import.meta.env.PROD) {
      return;
    }
    originalConsole.warn.apply(console, args);
  };

  // Override console.error to suppress non-network errors
  console.error = (...args: any[]) => {
    const message = args[0];

    if (typeof message === 'string') {
      if (!isNetworkErrorMessage(message)) {
        // Suppress non-network errors in production
        if (import.meta.env.PROD) return;
      }
    }

    if (args[0] instanceof Error) {
      const errorMessage = args[0].message || '';
      if (import.meta.env.PROD && !isNetworkErrorMessage(errorMessage)) {
        return;
      }
    }

    originalConsole.error.apply(console, args);
  };
  
  // Override console.log to no-op in production
  console.log = (...args: any[]) => {
    if (import.meta.env.PROD) return;
    originalConsole.log.apply(console, args);
  };

  // Suppress window error events for non-network errors
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, ...args) {
    if (type === 'error' && typeof listener === 'function') {
      const wrappedListener = function(event: any) {
        const msg = event?.message || '';
        if (import.meta.env.PROD && msg && !isNetworkErrorMessage(msg)) {
          return;
        }
        return listener.call(this, event);
      };
      return originalAddEventListener.call(this, type, wrappedListener, ...args);
    }
    return originalAddEventListener.call(this, type, listener, ...args);
  };
  
  // Console suppressions are now active silently
}

/**
 * Restore original console methods (for cleanup)
 */
export function restoreConsole() {
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.log = originalConsole.log;
}
