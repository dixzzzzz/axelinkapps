const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { findDeviceByTag } = require('../config/addWAN');
const { sendMessage } = require('../config/sendMessage');
const { sendOTPMessage } = require('../config/whatsapp-otp');
const { getSettingsWithCache, getSetting } = require('../config/settingsManager');
const { setParameterValues } = require('../config/genieacs');
const router = express.Router();

// Validasi nomor pelanggan ke GenieACS
async function isValidCustomer(phone) {
  const device = await findDeviceByTag(phone);
  return !!device;
}

// Simpan OTP sementara di memory (bisa diganti redis/db)
const otpStore = {};

// parameterPaths dan getParameterWithPaths dari WhatsApp bot
const parameterPaths = {
  rxPower: [
    'VirtualParameters.rxpower'
  ],
  pppoeIP: [
    'VirtualParameters.pppAddress'
  ],
  pppUsername: [
    'VirtualParameters.pppUsername'
  ],
  uptime: [
    'VirtualParameters.uptime'
  ],
  temperature: [
    'VirtualParameters.temp'
  ],
  userConnected: [
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Hosts.Host'
  ]
};
function getParameterWithPaths(device, paths) {
  for (const path of paths) {
    const parts = path.split('.');
    let value = device;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
        if (value && value._value !== undefined) value = value._value;
      } else {
        value = undefined;
        break;
      }
    }
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return 'N/A';
}

// Helper: Ambil info perangkat dan user terhubung dari GenieACS
async function getCustomerDeviceData(phone) {
  const device = await findDeviceByTag(phone);
  if (!device) return null;
  // Ambil SSID 2.4GHz dan 5GHz
  const ssid2g = device?.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.['1']?.SSID?._value || '-';
  
  // Cari SSID 5GHz dari berbagai kemungkinan path
  let ssid5g = '-';
  const possiblePaths = [
    // Path standar untuk WiFi 5GHz
    device?.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.['5']?.SSID?._value,
    // Path alternatif untuk beberapa device
    device?.InternetGatewayDevice?.LANDevice?.['2']?.WLANConfiguration?.['1']?.SSID?._value,
    // Path untuk device yang menggunakan struktur berbeda
    device?.InternetGatewayDevice?.WLANConfiguration?.['5']?.SSID?._value,
    device?.InternetGatewayDevice?.WLANConfiguration?.['6']?.SSID?._value,
  ];
  
  // Cari SSID 5GHz yang valid
  for (const ssid5gValue of possiblePaths) {
    if (ssid5gValue && ssid5gValue !== '' && ssid5gValue !== '-') {
      ssid5g = ssid5gValue;
      break;
    }
  }
  
  // Tidak ada fallback auto-append "-5G" - biarkan SSID 5GHz tetap '-' jika tidak ditemukan
  
  // Legacy support untuk backward compatibility
  const ssid = ssid2g;
  // Status online/offline with proper time-based determination
  const lastInformRaw = device?._lastInform 
    ? new Date(device._lastInform)
    : device?.Events?.Inform
      ? new Date(device.Events.Inform)
      : device?.InternetGatewayDevice?.DeviceInfo?.['1']?.LastInform?._value
        ? new Date(device.InternetGatewayDevice.DeviceInfo['1'].LastInform._value)
        : null;
  
  const lastInform = lastInformRaw 
    ? lastInformRaw.toLocaleString('id-ID')
    : '-';
  
  // Calculate time difference to determine actual status
  const now = new Date();
  const timeDiff = lastInformRaw ? (now - lastInformRaw) / (1000 * 60 * 60) : Infinity; // dalam jam
  
  let status = 'Offline';
  if (timeDiff < 1) {
    status = 'Online';
  } else {
    status = 'Offline';
  }
  
  // Debug logging untuk status determination
  console.log(`📱 Status check for ${phone}:`);
  console.log(`   Last Inform: ${lastInform}`);
  console.log(`   Time Diff: ${timeDiff !== Infinity ? timeDiff.toFixed(2) + ' hours' : 'No last inform'}`);
  console.log(`   Status: ${status}`);
  // User terhubung (WiFi) - Menggunakan parameter GenieACS yang benar
  let connectedUsers = [];
  try {
    // Cari hosts dari berbagai kemungkinan path
    const possibleHostPaths = [
      device?.InternetGatewayDevice?.LANDevice?.['1']?.Hosts?.Host,
      device?.InternetGatewayDevice?.LANDevice?.['2']?.Hosts?.Host,
      device?.InternetGatewayDevice?.LANDevice?.['3']?.Hosts?.Host,
      device?.InternetGatewayDevice?.Hosts?.Host
    ];
    
    let hosts = null;
    for (const hostPath of possibleHostPaths) {
      if (hostPath && typeof hostPath === 'object') {
        hosts = hostPath;
        break;
      }
    }
    
    if (hosts && typeof hosts === 'object') {
      for (const key in hosts) {
        if (!isNaN(key)) {
          const entry = hosts[key];
          
          // Gunakan parameter GenieACS yang benar sesuai spesifikasi
          const hostname = (() => {
            if (entry?.HostName?._value) return entry.HostName._value;
            if (entry?.HostName) return entry.HostName;
            return '-';
          })();
          
          const ipAddress = (() => {
            if (entry?.IPAddress?._value) return entry.IPAddress._value;
            if (entry?.IPAddress) return entry.IPAddress;
            return '-';
          })();
          
          const macAddress = (() => {
            if (entry?.MACAddress?._value) return entry.MACAddress._value;
            if (entry?.MACAddress) return entry.MACAddress;
            return '-';
          })();
          
          const layer2Interface = (() => {
            // Coba ambil dari Layer2Interface terlebih dahulu
            let interfaceValue = null;
            if (entry?.Layer2Interface?._value) {
              interfaceValue = entry.Layer2Interface._value;
            } else if (entry?.Layer2Interface) {
              interfaceValue = entry.Layer2Interface;
            } else if (entry?.InterfaceType?._value) {
              interfaceValue = entry.InterfaceType._value;
            } else if (entry?.InterfaceType) {
              interfaceValue = entry.InterfaceType;
            }
            
            // Jika interface value berisi parameter path, coba detect WiFi band
            if (interfaceValue && typeof interfaceValue === 'string') {
              // Cek apakah ini parameter path GenieACS
              if (interfaceValue.includes('WLANConfiguration')) {
                // Extract index dari WLANConfiguration.X
                const wlanMatch = interfaceValue.match(/WLANConfiguration\.(\d+)/);
                if (wlanMatch) {
                  const index = parseInt(wlanMatch[1]);
                  console.log(`🔍 WLANConfiguration index detected: ${index}`);
                  
                  // 2.4GHz: index 1,2,3,4
                  if (index >= 1 && index <= 4) {
                    return 'WiFi 2.4GHz';
                  }
                  // 5GHz: index 5,6,7,8
                  else if (index >= 5 && index <= 8) {
                    return 'WiFi 5GHz';
                  }
                  // Fallback untuk index lain
                  else if (index > 8) {
                    return 'WiFi 5GHz'; // Biasanya untuk 5GHz atau 6GHz
                  }
                }
                
                // Fallback pattern matching jika regex tidak match
                if (interfaceValue.includes('.1.') || interfaceValue.includes('WLANConfiguration.1')) {
                  return 'WiFi 2.4GHz';
                } else if (interfaceValue.includes('.5.') || interfaceValue.includes('WLANConfiguration.5')) {
                  return 'WiFi 5GHz';
                }
              }
              
              // Cek apakah ada indikator WiFi band dalam value
              if (interfaceValue.toLowerCase().includes('2.4') || interfaceValue.toLowerCase().includes('2.4g')) {
                return 'WiFi 2.4GHz';
              } else if (interfaceValue.toLowerCase().includes('5') || interfaceValue.toLowerCase().includes('5g')) {
                return 'WiFI 5GHz';
              } else if (interfaceValue.toLowerCase().includes('ethernet') || interfaceValue.toLowerCase().includes('lan')) {
                return 'Ethernet';
              }
            }
            
            // Jika tidak bisa detect, return value asli atau default
            return interfaceValue || '-';
          })();
          
          const leaseTimeRemaining = (() => {
            if (entry?.LeaseTimeRemaining?._value) {
              const seconds = parseInt(entry.LeaseTimeRemaining._value);
              if (!isNaN(seconds)) {
                if (seconds < 60) return `${seconds} Second`;
                if (seconds < 3600) return `${Math.floor(seconds / 60)} Minute`;
                if (seconds < 86400) return `${Math.floor(seconds / 3600)} Hour`;
                return `${Math.floor(seconds / 86400)} Day`;
              }
              return entry.LeaseTimeRemaining._value;
            }
            if (entry?.LeaseTimeRemaining) {
              const seconds = parseInt(entry.LeaseTimeRemaining);
              if (!isNaN(seconds)) {
                if (seconds < 60) return `${seconds} Second`;
                if (seconds < 3600) return `${Math.floor(seconds / 60)} Minute`;
                if (seconds < 86400) return `${Math.floor(seconds / 3600)} Hour`;
                return `${Math.floor(seconds / 86400)} Day`;
              }
              return entry.LeaseTimeRemaining;
            }
            return '-';
          })();
          
          // Tambahkan status aktif berdasarkan LeaseTimeRemaining
          const isActive = (() => {
            if (entry?.LeaseTimeRemaining?._value) {
              const seconds = parseInt(entry.LeaseTimeRemaining._value);
              return !isNaN(seconds) && seconds > 0;
            }
            if (entry?.LeaseTimeRemaining) {
              const seconds = parseInt(entry.LeaseTimeRemaining);
              return !isNaN(seconds) && seconds > 0;
            }
            // Fallback ke Active jika LeaseTimeRemaining tidak ada
            if (entry?.Active?._value) return entry.Active._value === 'true';
            if (entry?.Active) return entry.Active === 'true';
            return true; // Default ke aktif jika tidak ada info
          })();
          
          // Debug logging untuk interface detection
          console.log(`🔍 Interface detection for ${hostname}:`);
          console.log(`   Raw Layer2Interface: ${entry?.Layer2Interface?._value || entry?.Layer2Interface || 'N/A'}`);
          console.log(`   Raw InterfaceType: ${entry?.InterfaceType?._value || entry?.InterfaceType || 'N/A'}`);
          console.log(`   Detected Interface: ${layer2Interface}`);
          
          connectedUsers.push({
            hostname: hostname,
            ip: ipAddress,
            mac: macAddress,
            iface: layer2Interface,
            waktu: isActive ? 'Active' : 'Not Active',
            leaseTime: leaseTimeRemaining
          });
        }
      }
    }
    
    // Debug logging untuk connected users
        console.log(`📱 Connected users for ${phone}: ${connectedUsers.length} users found`);
        if (connectedUsers.length > 0) {
          connectedUsers.forEach((user, idx) => {
            console.log(`   User ${idx + 1}: ${user.hostname} (${user.ip}) - ${user.mac} - ${user.iface} - ${user.leaseTime}`);
          });
        } else {
          console.log(`   📍 No active connections detected at ${new Date().toLocaleString('id-ID')}`);
        }
  } catch (e) {
    console.error(`❌ Error parsing connected users for ${phone}:`, e);
  }
  // Ambil data dengan helper agar sama dengan WhatsApp
  const rxPower = getParameterWithPaths(device, parameterPaths.rxPower);
  const pppoeIP = getParameterWithPaths(device, parameterPaths.pppoeIP);
  const pppoeUsername = getParameterWithPaths(device, parameterPaths.pppUsername);
  
  // Hitung total user yang terhubung dari connectedUsers array
  const totalConnectedUsers = connectedUsers.length > 0 ? connectedUsers.length : 0;
  const serialNumber =
    device?.DeviceID?.SerialNumber ||
    device?.InternetGatewayDevice?.DeviceInfo?.SerialNumber?._value ||
    device?.InternetGatewayDevice?.DeviceInfo?.['1']?.SerialNumber?._value ||
    device?.SerialNumber ||
    '-';
  const productClass =
    device?.DeviceID?.ProductClass ||
    device?.InternetGatewayDevice?.DeviceInfo?.ProductClass?._value ||
    device?.InternetGatewayDevice?.DeviceInfo?.['1']?.ProductClass?._value ||
    device?.ProductClass ||
    '-';
  const Manufacturer =
    device?.DeviceID?.Manufacturer ||
    device?.InternetGatewayDevice?.DeviceInfo?.Manufacturer?._value ||
    device?.InternetGatewayDevice?.DeviceInfo?.['1']?.Manufacturer?._value ||
    device?.Manufacturer ||
    '-';
  let lokasi = device?.Tags || '-';
  if (Array.isArray(lokasi)) lokasi = lokasi.join(', ');
  const softwareVersion = device?.InternetGatewayDevice?.DeviceInfo?.SoftwareVersion?._value || '-';
  const model =
    device?.InternetGatewayDevice?.DeviceInfo?.ModelName?._value ||
    device?.InternetGatewayDevice?.DeviceInfo?.['1']?.ModelName?._value ||
    device?.ModelName ||
    '-';
  const uptime = getParameterWithPaths(device, parameterPaths.uptime);
  const temperature = getParameterWithPaths(device, parameterPaths.temperature);
  // Gunakan totalConnectedUsers yang sudah dihitung dari array
  const totalAssociations = totalConnectedUsers;
  
  // Add debugging info for dashboard
  console.log(`📋 Dashboard Summary for ${phone}:`);
  console.log(`   Device Model: ${model}`);
  console.log(`   Serial Number: ${serialNumber}`);
  console.log(`   Status: ${status} (Last: ${lastInform})`);
  console.log(`   RX Power: ${rxPower} dBm`);
  console.log(`   SSID 2.4GHz: ${ssid}`);
  console.log(`   SSID 5GHz: ${ssid5g}`);
  console.log(`   Connected Users: ${totalConnectedUsers}`);
  console.log(`   Temperature: ${temperature} °C`);
  console.log(`   PPPoE IP: ${pppoeIP}`);
  console.log(`   PPPoE Username: ${pppoeUsername}`);
  console.log(`   Uptime: ${uptime}`);
  
  return {
    phone,
    ssid,
    ssid2g,
    ssid5g,
    status,
    lastInform,
    connectedUsers,
    rxPower,
    pppoeIP,
    pppoeUsername,
    serialNumber,
    productClass,
    Manufacturer,
    lokasi,
    softwareVersion,
    model,
    uptime,
    temperature,
    totalAssociations
  };
}

// Helper: Update SSID 2.4GHz (real ke GenieACS) - Ultra Fast Optimized version
async function updateSSID(phone, newSSID) {
  try {
    const startTime = Date.now();
    const device = await findDeviceByTag(phone);
    if (!device) return false;
    
    const deviceId = device._id;
    
    console.log(`🚀 Fast SSID 2.4GHz update for device ${deviceId} to ${newSSID}`);
    
    // Use optimized setParameterValues with fast mode
    const result = await setParameterValues(deviceId, {
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID': newSSID
    });
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ SSID 2.4GHz update completed in ${totalTime}ms (${result.mode} mode, ${result.onuType} ONU)`);
    
    return {
      success: true,
      processingTime: totalTime,
      onuType: result.onuType,
      mode: result.mode
    };
  } catch (error) {
    console.error('Error updating SSID 2.4GHz:', error.message);
    return { success: false, error: error.message };
  }
}

// Helper: Update SSID 5GHz (real ke GenieACS) - Ultra Fast Optimized version
async function updateSSID5G(phone, newSSID5G) {
  try {
    const startTime = Date.now();
    const device = await findDeviceByTag(phone);
    if (!device) return false;
    
    const deviceId = device._id;
    
    console.log(`🚀 Fast SSID 5GHz update for device ${deviceId} to ${newSSID5G}`);
    
    // Update SSID 5GHz di index 5, 6, 7, 8 (biasanya untuk 5GHz)
    let wifi5GFound = false;
    const ssid5gIndexes = [5];
    
    for (const idx of ssid5gIndexes) {
      if (wifi5GFound) break;
      try {
        const result = await setParameterValues(deviceId, {
          [`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${idx}.SSID`]: newSSID5G
        });
        
        wifi5GFound = true;
        const totalTime = Date.now() - startTime;
        console.log(`✅ SSID 5GHz update completed in ${totalTime}ms (${result.mode} mode, ${result.onuType} ONU)`);
        
        return {
          success: true,
          processingTime: totalTime,
          onuType: result.onuType,
          mode: result.mode
        };
        
      } catch (error) {
        console.error(`Error updating 5GHz SSID with index ${idx}:`, error.message);
      }
    }
    
    if (!wifi5GFound) {
      return { success: false, error: 'Tidak dapat menemukan konfigurasi WiFi 5GHz pada perangkat ini' };
    }
    
  } catch (error) {
    console.error('Error updating SSID 5GHz:', error.message);
    return { success: false, error: error.message };
  }
}
// Helper: Add admin number and company info to customer data
function addAdminNumber(customerData) {
  const adminNumber = getSetting('admins.0', '6281911290961');
  const companyHeader = getSetting('company_header', 'AxeLink');
  
  // Convert to display format (remove country code if present)
  const displayNumber = adminNumber.startsWith('62') ? '0' + adminNumber.slice(2) : adminNumber;
  
  if (customerData && typeof customerData === 'object') {
    customerData.adminNumber = displayNumber;
    customerData.adminNumberWA = adminNumber;
    customerData.companyHeader = companyHeader;
  }
  return customerData;
}

// Helper: Update Password 2.4GHz (real ke GenieACS) - Ultra Fast Optimized version
async function updatePassword(phone, newPassword) {
  try {
    if (newPassword.length < 8) return { success: false, error: 'Password minimal 8 karakter' };
    
    const startTime = Date.now();
    const device = await findDeviceByTag(phone);
    if (!device) return { success: false, error: 'Device tidak ditemukan' };
    
    const deviceId = device._id;
    
    console.log(`🚀 Fast password 2.4GHz update for device ${deviceId}`);
    
    // Use optimized setParameterValues with fast mode
    const result = await setParameterValues(deviceId, {
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase': newPassword
    });
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Password 2.4GHz update completed in ${totalTime}ms (${result.mode} mode, ${result.onuType} ONU)`);
    
    return {
      success: true,
      processingTime: totalTime,
      onuType: result.onuType,
      mode: result.mode
    };
  } catch (error) {
    console.error('Error updating password 2.4GHz:', error.message);
    return { success: false, error: error.message };
  }
}

// Helper: Update Password 5GHz (real ke GenieACS) - Ultra Fast Optimized version
async function updatePassword5G(phone, newPassword5G) {
  try {
    if (newPassword5G.length < 8) return { success: false, error: 'Password minimum 8 character' };
    
    const startTime = Date.now();
    const device = await findDeviceByTag(phone);
    if (!device) return { success: false, error: 'Device Not Found' };
    
    const deviceId = device._id;
    
    console.log(`🚀 Fast password 5GHz update for device ${deviceId}`);
    
    // Update Password 5GHz di index 5, 6, 7, 8 (biasanya untuk 5GHz)
    let wifi5GFound = false;
    const ssid5gIndexes = [5, 6, 7, 8];
    
    for (const idx of ssid5gIndexes) {
      if (wifi5GFound) break;
      try {
        const result = await setParameterValues(deviceId, {
          [`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${idx}.KeyPassphrase`]: newPassword5G
        });
        
        wifi5GFound = true;
        const totalTime = Date.now() - startTime;
        console.log(`✅ Password 5GHz update completed in ${totalTime}ms (${result.mode} mode, ${result.onuType} ONU)`);
        
        return {
          success: true,
          processingTime: totalTime,
          onuType: result.onuType,
          mode: result.mode
        };
        
      } catch (error) {
        console.error(`Error updating 5GHz Password with index ${idx}:`, error.message);
      }
    }
    
    if (!wifi5GFound) {
      return { success: false, error: 'Cannot find the 5GHz WiFi configuration on this device' };
    }
    
  } catch (error) {
    console.error('Error updating password 5GHz:', error.message);
    return { success: false, error: error.message };
  }
}

// GET: Login page
router.get('/login', (req, res) => {
  const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '../settings.json'), 'utf8'));
  res.render('login', { settings, error: null });
});

// POST: Proses login
router.post('/login', async (req, res) => {
  const { phone } = req.body;
  const settings = getSettingsWithCache();
  if (!await isValidCustomer(phone)) {
    return res.render('login', { settings, error: 'The phone number you entered is not registered' });
  }
  if (settings.customerPortalOtp === 'true') {
    // Generate OTP sesuai jumlah digit di settings
    const otpLength = settings.otp_length || 6;
    const min = Math.pow(10, otpLength - 1);
    const max = Math.pow(10, otpLength) - 1;
    const otp = Math.floor(min + Math.random() * (max - min)).toString();
    otpStore[phone] = { otp, expires: Date.now() + 5 * 60 * 1000 };
    
    // Kirim OTP ke WhatsApp pelanggan menggunakan whatsapp-otp service
    try {
      const otpResult = await sendOTPMessage(phone, otp, 5);
      
      if (otpResult.success) {
        console.log(`✅ OTP successfully sent to ${phone}: ${otp}`);
      } else {
        console.error(`❌ Failed to send OTP to ${phone}:`, otpResult.message);
        // Fallback: gunakan sendMessage biasa jika whatsapp-otp gagal
        const waJid = phone.replace(/^0/, '62') + '@s.whatsapp.net';
        const msg = `🔐 *CUSTOMER PORTAL OTP CODE*\n\n` +
          `Your OTP code is: *${otp}*\n\n` +
          `⏰ This code is valid for 5 minutes.\n` +
          `🔒 Do not share this code with anyone.\n\n`+
          `📝 _Didn't get your OTP code or having issues with this WhatsApp Bot? Please contact the developer, Dikri Nurpadli | Contact Dev: +62 819-1129-0961_`;
        
        await sendMessage(waJid, msg);
        console.log(`✅ OTP sent using fallback method to ${phone}: ${otp}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send OTP to ${phone}:`, error);
    }
    return res.render('otp', { phone, error: null, otp_length: otpLength, settings });
  } else {
    req.session.phone = phone;
    return res.redirect('/customer/dashboard');
  }
});

// GET: Halaman OTP
router.get('/otp', (req, res) => {
  const { phone } = req.query;
  const settings = getSettingsWithCache();
  res.render('otp', { phone, error: null, otp_length: settings.otp_length || 6, settings });
});

// POST: Verifikasi OTP
router.post('/otp', (req, res) => {
  const { phone, otp } = req.body;
  const data = otpStore[phone];
  const settings = getSettingsWithCache();
  if (!data || data.otp !== otp || Date.now() > data.expires) {
    return res.render('otp', { phone, error: 'OTP is incorrect or has expired.', otp_length: settings.otp_length || 6, settings });
  }
  // Sukses login
  delete otpStore[phone];
  req.session = req.session || {};
  req.session.phone = phone;
  return res.redirect('/customer/dashboard');
});

// GET: Dashboard pelanggan
router.get('/dashboard', async (req, res) => {
  const phone = req.session && (req.session.customerPhone || req.session.phone);
  if (!phone) return res.redirect('/customer/login');
  const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '../settings.json'), 'utf8'));
  const data = await getCustomerDeviceData(phone);
  if (!data) {
    const fallbackCustomer = addAdminNumber({ phone, ssid: '-', status: 'Not Found', lastChange: '-' });
    return res.render('dashboard', {
      customer: fallbackCustomer,
      connectedUsers: [],
      notif: 'Device data not found.',
      settings,
      currentPage: 'dashboard'
    });
  }
  const customerWithAdmin = addAdminNumber(data);
  
  // Ambil notifikasi dari session jika ada
  let notificationMessage = null;
  if (req.session.notificationMessage) {
    notificationMessage = req.session.notificationMessage;
    // Hapus notifikasi dari session setelah ditampilkan
    delete req.session.notificationMessage;
  }
  
  res.render('dashboard', {
    customer: customerWithAdmin,
    connectedUsers: data.connectedUsers,
    notif: notificationMessage,
    settings,
    currentPage: 'dashboard'
  });
});

// POST: Ganti SSID 2.4GHz - Optimized Fast Mode
router.post('/change-ssid-2g', async (req, res) => {
  const phone = req.session && req.session.phone;
  if (!phone) return res.redirect('/customer/login');
  const { ssid2g } = req.body;
  
  const result = await updateSSID(phone, ssid2g);
  
  let notificationMessage = 'Failed to change 2.4GHz SSID.';
  
  if (result.success) {
    const timeInfo = result.processingTime ? ` (${result.processingTime}ms, ${result.mode} mode)` : '';
    notificationMessage = `Your 2.4GHz SSID has been successfully changed${timeInfo}.`;
    
    // Kirim notifikasi WhatsApp ke pelanggan
    const waJid = phone.replace(/^0/, '62') + '@s.whatsapp.net';
    const msg = `✅ *SSID 2.4GHz UPDATED*\n\n` +
      `Your SSID 2.4GHz has been changed to:\n\n` +
      `🆕 Your SSID is: *${ssid2g}*\n\n` +
      `⚡ Processed in ${result.processingTime}ms using ${result.mode} mode\n\n` +
      `Please reconnect your device to the new SSID\n\n`+
      `📝 _For more information or any issues on WhatsApp Bot, please contact the developer Dikri Nurpadli | Dev Contact: +62 819-1129-0961_`;
    
    try { 
      await sendMessage(waJid, msg); 
    } catch (e) {
      console.warn('Failed to send WhatsApp notification:', e.message);
    }
  }
  
  // Simpan notifikasi di session dan redirect untuk menghindari form resubmission
  req.session.notificationMessage = notificationMessage;
  res.redirect('/customer/dashboard');
});

// POST: Ganti SSID 5GHz - Optimized Fast Mode
router.post('/change-ssid-5g', async (req, res) => {
  const phone = req.session && req.session.phone;
  if (!phone) return res.redirect('/customer/login');
  const { ssid5g } = req.body;
  
  const result = await updateSSID5G(phone, ssid5g);
  
  let notificationMessage = 'Failed to change 5GHz SSID.';
  
  if (result.success) {
    const timeInfo = result.processingTime ? ` (${result.processingTime}ms, ${result.mode} mode)` : '';
    notificationMessage = `Your 5GHz SSID has been successfully changed${timeInfo}.`;
    
    // Kirim notifikasi WhatsApp ke pelanggan
    const waJid = phone.replace(/^0/, '62') + '@s.whatsapp.net';
    const msg = `✅ *SSID 5GHz UPDATED*\n\n` +
      `Your SSID 5GHz has been changed to:\n\n` +
      `🆕 Your SSID is: *${ssid5g}*\n\n` +
      `⚡ Processed in ${result.processingTime}ms using ${result.mode} mode\n\n` +
      `Please reconnect your device to the new SSID\n\n`+
      `📝 _For more information or any issues on WhatsApp Bot, please contact the developer Dikri Nurpadli | Dev Contact: +62 819-1129-0961_`;    

    try { 
      await sendMessage(waJid, msg); 
    } catch (e) {
      console.warn('Failed to send WhatsApp notification:', e.message);
    }
  }
  
  const data = await getCustomerDeviceData(phone);
  const customerWithAdmin = addAdminNumber(data || { phone, ssid: '-', status: '-', lastChange: '-' });
  
  req.session.notificationMessage = notificationMessage;
  return res.redirect('/customer/dashboard');
});

// POST: Ganti Password 2.4GHz - Optimized Fast Mode
router.post('/change-password-2g', async (req, res) => {
  const phone = req.session && req.session.phone;
  if (!phone) return res.redirect('/customer/login');
  const { password2g } = req.body;
  
  const result = await updatePassword(phone, password2g);
  
  let notificationMessage = result.error || 'Failed to change 2.4GHz Password.';
  
  if (result.success) {
    const timeInfo = result.processingTime ? ` (${result.processingTime}ms, ${result.mode} mode)` : '';
    notificationMessage = `Your 2.4GHz Password has been successfully changed${timeInfo}.`;
    
    // Kirim notifikasi WhatsApp ke pelanggan
    const waJid = phone.replace(/^0/, '62') + '@s.whatsapp.net';
    const msg = `✅ *PASSWORD 2.4GHz UPDATED*\n\n` +
      `Your Password 2.4GHz has been changed to:\n\n` +
      `🆕 Your Password is: *${password2g}*\n\n` +
      `⚡ Processed in ${result.processingTime}ms using ${result.mode} mode\n\n` +
      `Please reconnect your device to the new SSID\n\n`+
      `📝 _For more information or any issues on WhatsApp Bot, please contact the developer Dikri Nurpadli | Dev Contact: +62 819-1129-0961_`;

    try { 
      await sendMessage(waJid, msg); 
    } catch (e) {
      console.warn('Failed to send WhatsApp notification:', e.message);
    }
  }
  
  const data = await getCustomerDeviceData(phone);
  const customerWithAdmin = addAdminNumber(data || { phone, ssid: '-', status: '-', lastChange: '-' });
  
  req.session.notificationMessage = notificationMessage;
  return res.redirect('/customer/dashboard');
});

// POST: Ganti Password 5GHz - Optimized Fast Mode
router.post('/change-password-5g', async (req, res) => {
  const phone = req.session && req.session.phone;
  if (!phone) return res.redirect('/customer/login');
  const { password5g } = req.body;
  
  const result = await updatePassword5G(phone, password5g);
  
  let notificationMessage = result.error || 'Failed to change 5GHz Password.';
  
  if (result.success) {
    const timeInfo = result.processingTime ? ` (${result.processingTime}ms, ${result.mode} mode)` : '';
    notificationMessage = `Your 5GHz Password has been successfully changed${timeInfo}.`;
    
    // Kirim notifikasi WhatsApp ke pelanggan
    const waJid = phone.replace(/^0/, '62') + '@s.whatsapp.net';
    const msg = `✅ *PASSWORD 5GHz UPDATED*\n\n` +
      `Your Password 5GHz has been changed to:\n\n` +
      `🆕 Your Password is: *${password5g}*\n\n` +
      `⚡ Processed in ${result.processingTime}ms using ${result.mode} mode\n\n` +
      `Please reconnect your device to the new SSID\n\n`+
      `📝 _For more information or any issues on WhatsApp Bot, please contact the developer Dikri Nurpadli | Dev Contact: +62 819-1129-0961_`;

    try { 
      await sendMessage(waJid, msg); 
    } catch (e) {
      console.warn('Failed to send WhatsApp notification:', e.message);
    }
  }
  
  const data = await getCustomerDeviceData(phone);
  const customerWithAdmin = addAdminNumber(data || { phone, ssid: '-', status: '-', lastChange: '-' });
  
  req.session.notificationMessage = notificationMessage;
  return res.redirect('/customer/dashboard');
});

// POST: Ganti SSID - Optimized Fast Mode (Legacy support)
router.post('/change-ssid', async (req, res) => {
  const phone = req.session && req.session.phone;
  if (!phone) return res.redirect('/customer/login');
  const { ssid } = req.body;
  
  const result = await updateSSID(phone, ssid);
  
  let notificationMessage = 'Failed to change SSID.';
  
  if (result.success) {
    const timeInfo = result.processingTime ? ` (${result.processingTime}ms, ${result.mode} mode)` : '';
    notificationMessage = `Your SSID has been successfully changed${timeInfo}.`;
    
    // Kirim notifikasi WhatsApp ke pelanggan
    const waJid = phone.replace(/^0/, '62') + '@s.whatsapp.net';
    const msg = `✅ *SSID UPDATED*\n\n` +
      `Your SSID has been changed to:\n\n` +
      `🆕 Your SSID 2.4GHz is: *${ssid}*\n` +
      `🆕 Your SSID 5GHz is: *${ssid}-5G*\n\n` +
      `⚡ Processed in ${result.processingTime}ms using ${result.mode} mode\n\n` +
      `Please reconnect your device to the new SSID\n\n`+
      `📝 _For more information or any issues on WhatsApp Bot, please contact the developer Dikri Nurpadli | Dev Contact: +62 819-1129-0961_`;

    try { 
      await sendMessage(waJid, msg); 
    } catch (e) {
      console.warn('Failed to send WhatsApp notification:', e.message);
    }
  }
  
  const data = await getCustomerDeviceData(phone);
  const customerWithAdmin = addAdminNumber(data || { phone, ssid: '-', status: '-', lastChange: '-' });
  
  req.session.notificationMessage = notificationMessage;
  return res.redirect('/customer/dashboard');
});

// POST: Ganti Password - Optimized Fast Mode
router.post('/change-password', async (req, res) => {
  const phone = req.session && req.session.phone;
  if (!phone) return res.redirect('/customer/login');
  const { password } = req.body;
  
  const result = await updatePassword(phone, password);
  
  let notificationMessage = result.error || 'Failed to change Password.';
  
  if (result.success) {
    const timeInfo = result.processingTime ? ` (${result.processingTime}ms, ${result.mode} mode)` : '';
    notificationMessage = `Your Password has been successfully changed${timeInfo}.`;
    
    // Kirim notifikasi WhatsApp ke pelanggan
    const waJid = phone.replace(/^0/, '62') + '@s.whatsapp.net';
    const msg = `✅ *PASSWORD UPDATED*\n\n` +
      `Your Password has been changed to:\n\n` +
      `🆕 Your Password is: *${password}*\n\n` +
      `⚡ Processed in ${result.processingTime}ms using ${result.mode} mode\n\n` +
      `Please reconnect your device to the new SSID\n\n`+
      `📝 _For more information or any issues on WhatsApp Bot, please contact the developer Dikri Nurpadli | Dev Contact: +62 819-1129-0961_`;

    try { 
      await sendMessage(waJid, msg); 
    } catch (e) {
      console.warn('Failed to send WhatsApp notification:', e.message);
    }
  }
  
  const data = await getCustomerDeviceData(phone);
  const customerWithAdmin = addAdminNumber(data || { phone, ssid: '-', status: '-', lastChange: '-' });
  
  req.session.notificationMessage = notificationMessage;
  return res.redirect('/customer/dashboard');
});

// POST: Restart Device
router.post('/restart-device', async (req, res) => {
  const phone = req.session && req.session.phone;
  if (!phone) return res.status(401).json({ success: false, message: 'Session tidak valid' });
  
  try {
    console.log(`🔄 Restart device request from phone: ${phone}`);
    
    // Cari device berdasarkan nomor pelanggan
    const device = await findDeviceByTag(phone);
    if (!device) {
      console.log(`❌ Device not found for phone: ${phone}`);
      return res.status(404).json({ success: false, message: 'Device tidak ditemukan' });
    }

    console.log(`✅ Device found: ${device._id}`);

    // Cek status device (online/offline) - gunakan threshold yang lebih longgar
    const lastInform = device._lastInform ? new Date(device._lastInform) : null;
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000; // 30 menit
    
    const isOnline = lastInform && (now - lastInform.getTime()) < thirtyMinutes;
    
    if (!isOnline) {
      const minutesAgo = lastInform ? Math.round((now - lastInform.getTime()) / 60000) : 'Unknown';
      console.log(`⚠️ Device is offline. Last inform: ${lastInform ? lastInform.toLocaleString() : 'Never'}`);
      console.log(`⏰ Time since last inform: ${minutesAgo} minutes`);
      
      let offlineMessage = 'Is the device offline';
      if (minutesAgo !== 'Unknown' && minutesAgo > 60) {
        offlineMessage = `Device has been offline for ${Math.floor(minutesAgo / 60)} Hour ${minutesAgo % 60} minutes.`;
      } else if (minutesAgo !== 'Unknown') {
        offlineMessage = `Device has been offline for ${minutesAgo} minutes.`;
      }
      
      return res.status(400).json({ 
        success: false, 
        message: offlineMessage + ' Please try again in a few minutes after the device is back online.' 
      });
    }
    
    console.log(`✅ Device is online. Last inform: ${lastInform.toLocaleString()}`);

    const genieacsUrl = getSetting('genieacs_url', 'http://localhost:7557');
    const genieacsUsername = getSetting('genieacs_username', 'admin');
    const genieacsPassword = getSetting('genieacs_password', 'password');

    console.log(`🔗 GenieACS URL: ${genieacsUrl}`);

    // Gunakan device ID asli (tidak di-decode) karena GenieACS memerlukan format yang di-encode
    const deviceId = device._id;
    console.log(`🔧 Using original device ID: ${deviceId}`);

    // Kirim perintah restart ke GenieACS menggunakan endpoint yang benar
    const taskData = {
      name: 'reboot'
    };

    console.log(`📤 Sending restart task to GenieACS for device: ${deviceId}`);

    // Gunakan endpoint yang benar sesuai dokumentasi GenieACS
    // Pastikan device ID di-encode dengan benar untuk menghindari masalah karakter khusus
    const encodedDeviceId = encodeURIComponent(deviceId);
    console.log(`🔧 Using encoded device ID: ${encodedDeviceId}`);

    try {
      const response = await axios.post(`${genieacsUrl}/devices/${encodedDeviceId}/tasks?connection_request`, taskData, {
        auth: { username: genieacsUsername, password: genieacsPassword },
        headers: { 'Content-Type': 'application/json' }
      });

      console.log(`✅ GenieACS response:`, response.data);

      // Jika task berhasil dibuat, berarti restart command berhasil dikirim
      // Device akan offline selama proses restart (1-2 menit)
      console.log(`🔄 Restart command sent successfully. Device will be offline during restart process.`);
      
    } catch (taskError) {
      console.error(`❌ Error sending restart task:`, taskError.response?.data || taskError.message);
      
      // Jika device tidak ditemukan saat mengirim task, berarti device baru saja offline
      if (taskError.response?.status === 404) {
        throw new Error('The device cannot receive the restart command. It may have just gone offline or is currently restarting.');
      }
      
      throw taskError;
    }

    // Kirim notifikasi WhatsApp ke pelanggan
    try {
      const waJid = phone.replace(/^0/, '62') + '@s.whatsapp.net';
      const msg = `🔄 *RESTART DEVICE*\n\n` +
        `The restart command has been successfully sent to your device.\n\n` +
        `⏰ The restart process takes 1-2 minutes\n` +
        `📶 The internet connection will be temporarily disconnected.\n` +
        `✅ The internet will return to normal once the restart is complete.\n\n` +
        `Thank you for your patience.`;
      await sendMessage(waJid, msg);
      console.log(`✅ WhatsApp notification sent to ${phone}`);
    } catch (e) {
      console.error('❌ Failed to send restart notification:', e);
    }

    res.json({ success: true, message: 'Restart command sent successfully' });
  } catch (err) {
    console.error('❌ Error restart device:', err.message);
    console.error('❌ Error details:', err.response?.data || err);
    
    let errorMessage = 'Failed to send restart command';
    
    // Berikan pesan yang lebih informatif berdasarkan error
    if (err.response?.status === 404) {
      errorMessage = 'Device not found or currently offline. Please try again in a few minutes.';
    } else if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage
    });
  }
});

// POST: Logout pelanggan
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/customer/login');
  });
});

// GET: Logout pelanggan (untuk link navigasi)
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/customer/login');
  });
});

// Import dan gunakan route laporan gangguan
const troubleReportRouter = require('./troubleReport');
router.use('/trouble', troubleReportRouter);

// Route form trouble report simpel (tanpa session)
router.get('/trouble/simple', (req, res) => {
  res.render('customer-trouble-simple');
});

// GET: Halaman Map untuk pelanggan
router.get('/map', async (req, res) => {
  try {
    // Cek apakah pelanggan sudah login
    if (!req.session.phone) {
      return res.redirect('/customer/login?redirect=/customer/map');
    }

    const customerPhone = req.session.phone;

    // Cek apakah nomor valid
    if (!await isValidCustomer(customerPhone)) {
      req.session.destroy();
      return res.redirect('/customer/login?error=invalid');
    }

    // Ambil data device pelanggan
    const customerData = await getCustomerDeviceData(customerPhone);
    if (!customerData) {
      return res.render('error', {
        message: 'Device data not found',
        error: { status: 404 }
      });
    }

    // Render halaman map
    res.render('customer-map', {
      customerPhone,
      customerData,
      companyHeader: getSetting('company_header', 'ISP Monitor'),
      headerMaps: getSetting('header_maps', 'Lokasi Perangkat'),
      footerInfo: getSetting('footer_info', ''),
      currentPage: 'map'
    });

  } catch (error) {
    console.error('Error loading map page:', error);
    res.render('error', {
      message: 'An error occurred while loading the map page',
      error: { status: 500 }
    });
  }
});

// GET: API untuk data map pelanggan (JSON response untuk AJAX)
router.get('/map/data', async (req, res) => {
  try {
    // Cek apakah pelanggan sudah login
    if (!req.session.phone) {
      return res.status(401).json({
        success: false,
        message: 'Customer not logged in'
      });
    }

    const customerPhone = req.session.phone;

    // Cek apakah nomor valid
    if (!await isValidCustomer(customerPhone)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid customer number'
      });
    }

    // Panggil API map customer
    const axios = require('axios');
    const apiUrl = `${req.protocol}://${req.get('host')}/api/map/customer/${customerPhone}`;

    const response = await axios.get(apiUrl);

    res.json(response.data);

  } catch (error) {
    console.error('Error getting map data:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting map data: ' + error.message
    });
  }
});

module.exports = router;
module.exports.getCustomerDeviceData = getCustomerDeviceData; 
