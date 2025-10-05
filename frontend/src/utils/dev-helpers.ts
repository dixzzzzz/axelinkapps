/**
 * Development Helper Utilities
 * 
 * Silent helpers for development that don't clutter the console
 */

declare global {
  interface Window {
    __dev_otp?: string;
    __dev_helpers?: {
      getOTP: () => string | undefined;
      showInfo: () => void;
    };
  }
}

/**
 * Setup development helpers silently
 */
export function setupDevHelpers() {
  if (import.meta.env.PROD) return;
  
  // Setup silent development helpers
  window.__dev_helpers = {
    getOTP: () => {
      return window.__dev_otp;
    },
    showInfo: () => {
      console.info(`
🔧 Development Helpers Available:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 OTP Code: ${window.__dev_otp || 'Not available'}
📝 Get OTP: window.__dev_helpers.getOTP()
💡 Fallback OTP: 123456 (when backend unavailable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    }
  };
}
