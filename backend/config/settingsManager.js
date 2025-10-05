const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const settingsPath = path.join(process.cwd(), 'settings.json');

// Mapping dari settings.json keys ke environment variable names
const envKeyMapping = {
  'admin_username': 'ADMIN_USERNAME',
  'admin_password': 'ADMIN_PASSWORD',
  'genieacs_url': 'GENIEACS_URL',
  'genieacs_username': 'GENIEACS_USERNAME',
  'genieacs_password': 'GENIEACS_PASSWORD',
  'mikrotik_host': 'MIKROTIK_HOST',
  'mikrotik_port': 'MIKROTIK_PORT',
  'mikrotik_user': 'MIKROTIK_USER',
  'mikrotik_password': 'MIKROTIK_PASSWORD',
  'radius_host': 'RADIUS_HOST',
  'radius_user': 'RADIUS_USER',
  'radius_password': 'RADIUS_PASSWORD',
  'radius_database': 'RADIUS_DATABASE',
  'server_port': 'SERVER_PORT',
  'server_host': 'SERVER_HOST',
  'customerPortalOtp': 'CUSTOMER_PORTAL_OTP',
  'otp_length': 'OTP_LENGTH',
  'otp_expiry_minutes': 'OTP_EXPIRY_MINUTES',
  'pppoe_monitor_enable': 'PPPOE_MONITOR_ENABLE',
  'whatsapp_keep_alive': 'WHATSAPP_KEEP_ALIVE',
  'admins.0': 'WHATSAPP_ADMINS',
  'technician_numbers.0': 'TECHNICIAN_NUMBERS',
  'technician_numbers.1': 'TECHNICIAN_NUMBERS',
  'technician_group_id': 'TECHNICIAN_GROUP_ID',
  'whatsapp_restart_on_error': 'WHATSAPP_RESTART_ON_ERROR',
  'rx_power_notification_enable': 'RX_POWER_NOTIFICATION_ENABLE',
  'rx_power_warning': 'RX_POWER_WARNING',
  'rx_power_critical': 'RX_POWER_CRITICAL',
  'rx_power_warning_interval': 'RX_POWER_WARNING_INTERVAL',
  'rxpower_recap_enable': 'RXPOWER_RECAP_ENABLE',
  'rxpower_recap_interval': 'RXPOWER_RECAP_INTERVAL',
  'offline_notification_enable': 'OFFLINE_NOTIFICATION_ENABLE',
  'offline_notification_interval': 'OFFLINE_NOTIFICATION_INTERVAL',
  'pppoe_notifications.enabled': 'PPPOE_NOTIFICATIONS_ENABLED',
  'pppoe_notifications.loginNotifications': 'PPPOE_LOGIN_NOTIFICATIONS',
  'pppoe_notifications.logoutNotifications': 'PPPOE_LOGOUT_NOTIFICATIONS',
  'pppoe_notifications.includeOfflineList': 'PPPOE_INCLUDE_OFFLINE_LIST',
  'pppoe_notifications.maxOfflineListCount': 'PPPOE_MAX_OFFLINE_LIST_COUNT',
  'trouble_report.enabled': 'TROUBLE_REPORT_ENABLED',
  'trouble_report.categories': 'TROUBLE_REPORT_CATEGORIES',
  'trouble_report.auto_ticket': 'TROUBLE_REPORT_AUTO_TICKET',
  'company_header': 'COMPANY_HEADER',
  'footer_info': 'FOOTER_INFO',
  'pow_info': 'POW_INFO',
  'dev_info': 'DEV_INFO',
  'header_maps': 'HEADER_MAPS',
  'main_interface': 'MAIN_INTERFACE',
  'user_auth_mode': 'USER_AUTH_MODE'
};

function getSettingsWithCache() {
  // Untuk kompatibilitas, tetap pakai nama lama, tapi selalu baca ulang file
  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function getSetting(key, defaultValue) {
  // 1. Cek environment variable terlebih dahulu
  const envKey = envKeyMapping[key];
  if (envKey && process.env[envKey] !== undefined) {
    const envValue = process.env[envKey];

    // Handle special cases for array values
    if (key === 'technician_numbers.0' && envKey === 'TECHNICIAN_NUMBERS') {
      const numbers = envValue.split(',').map(n => n.trim());
      return numbers[0] || defaultValue;
    }
    if (key === 'technician_numbers.1' && envKey === 'TECHNICIAN_NUMBERS') {
      const numbers = envValue.split(',').map(n => n.trim());
      return numbers[1] || defaultValue;
    }

    // Convert string values to appropriate types
    if (envValue === 'true') return 'true';
    if (envValue === 'false') return 'false';

    return envValue;
  }

  // 2. Fallback ke settings.json
  const settings = getSettingsWithCache();
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

function setSetting(key, value) {
  try {
    // Baca settings yang ada
    let settings = {};
    try {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(raw);
    } catch (e) {
      // File tidak ada atau corrupt, mulai dengan object kosong
      settings = {};
    }

    // Update setting
    settings[key] = value;

    // Simpan kembali ke file
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

    // Broadcast update event
    if (global.appEvents) {
      global.appEvents.emit('settings:updated', { [key]: value });
    }

    return true;
  } catch (error) {
    console.error('Error setting setting:', error);
    return false;
  }
}

async function setHashedPassword(password) {
  try {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Set di settings.json
    setSetting('admin_password', hashedPassword);

    // Jika ada env var, update juga (untuk production)
    if (process.env.ADMIN_PASSWORD) {
      console.warn('Warning: ADMIN_PASSWORD is set in environment. Update .env file manually for persistence.');
    }

    return true;
  } catch (error) {
    console.error('Error hashing password:', error);
    return false;
  }
}

async function verifyPassword(plainPassword) {
  try {
    const hashedPassword = getSetting('admin_password', '');

    if (!hashedPassword) {
      // Tidak ada password yang tersimpan
      console.error('ERROR: No admin password hash found. Please run setup script.');
      return false;
    }

    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

module.exports = { getSettingsWithCache, getSetting, setSetting, setHashedPassword, verifyPassword };
