/**
 * Logger utility for clean console management
 * Only logs in development mode
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isVerbose = import.meta.env.VITE_VERBOSE_LOGS === 'true';

  private log(level: LogLevel, message: string, ...args: any[]) {
    // Always show errors
    if (level === 'error') {
      console.error(`[${level.toUpperCase()}]`, message, ...args);
      return;
    }

    // Show warnings in development
    if (level === 'warn' && this.isDevelopment) {
      console.warn(`[${level.toUpperCase()}]`, message, ...args);
      return;
    }

    // Show info/debug only in verbose mode
    if ((level === 'info' || level === 'debug') && this.isDevelopment && this.isVerbose) {
      console.log(`[${level.toUpperCase()}]`, message, ...args);
      return;
    }
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }

  // For customer auth debugging
  auth(message: string, ...args: any[]) {
    if (this.isDevelopment && this.isVerbose) {
      console.log('🔧', message, ...args);
    }
  }

  // For API success messages
  success(message: string, ...args: any[]) {
    if (this.isDevelopment && this.isVerbose) {
      console.log('✅', message, ...args);
    }
  }

  // For API errors (always show)
  apiError(message: string, ...args: any[]) {
    console.error('❌', message, ...args);
  }
}

export const logger = new Logger();
export default logger;
