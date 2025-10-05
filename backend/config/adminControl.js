const { getSetting } = require('./settingsManager');

// Note: This module now primarily uses environment variables through getSetting()
// Some functions may need to be deprecated as settings become environment-only

function setAdminEnabled(status) {
  console.warn('⚠️ setAdminEnabled() is deprecated - admin status is now controlled via environment variables');
  // This function is deprecated as admin control is now environment-based
}

function isAdmin(number) {
  // Get admin numbers from environment variables
  const adminNumbers = getSetting('admins.0', '').toString();
  if (!adminNumbers) return false;
  
  // Pastikan number dan semua admins sudah dalam format string hanya angka (tanpa +, spasi, dsb)
  const clean = n => String(n).replace(/\D/g, '');
  const adminList = adminNumbers.split(',').map(n => clean(n.trim())).filter(n => n);
  
  return adminList.includes(clean(number));
}

function getAdmins() {
  const adminNumbers = getSetting('admins.0', '').toString();
  if (!adminNumbers) return [];
  
  return adminNumbers.split(',').map(n => n.trim()).filter(n => n);
}

function getTechnicianNumbers() {
  const techNumbers0 = getSetting('technician_numbers.0', '').toString();
  const techNumbers1 = getSetting('technician_numbers.1', '').toString();
  
  let numbers = [];
  if (techNumbers0) numbers.push(techNumbers0);
  if (techNumbers1) numbers.push(techNumbers1);
  
  // Also check if TECHNICIAN_NUMBERS contains comma-separated values
  const envTechNumbers = process.env.TECHNICIAN_NUMBERS;
  if (envTechNumbers) {
    const envNumbers = envTechNumbers.split(',').map(n => n.trim()).filter(n => n);
    numbers = [...new Set([...numbers, ...envNumbers])]; // Remove duplicates
  }
  
  // Normalisasi: hanya angka
  return numbers.map(n => String(n).replace(/\D/g, ''));
}

module.exports = {
  getSettings,
  setAdminEnabled,
  isAdmin,
  getAdmins,
  getTechnicianNumbers
};
