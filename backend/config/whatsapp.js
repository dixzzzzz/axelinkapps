const fs = require('fs');
const path = require('path');
const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    Browsers,
    fetchLatestBaileysVersion
} = require('baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const P = require('pino');

// Global variables
let sock;
const logger = require('./logger');

// Create silent Pino logger for Baileys
const baileyLogger = P({ level: 'silent' });

// Import settings manager
const { getSetting, getSettingsWithCache } = require('./settingsManager');

/**
 * WhatsApp Bot yang disederhanakan untuk:
 * 1. Mengirim OTP ke customer
 * 2. Mengirim notifikasi status perubahan
 * 3. Menerima trouble reports
 */

// Fungsi untuk mendapatkan nomor super admin
function getSuperAdminNumber() {
    return getSetting('admins.0', '628123456789');
}

// Fungsi untuk format nomor telepon
function formatPhoneNumber(number) {
    // Hapus semua karakter non-angka
    let cleanNumber = number.replace(/\D/g, '');
    
    // Jika nomor diawali 0, ganti dengan 62
    if (cleanNumber.startsWith('0')) {
        cleanNumber = '62' + cleanNumber.substring(1);
    } 
    // Jika nomor diawali 8 (tanpa 62), tambahkan 62
    else if (cleanNumber.startsWith('8') && !cleanNumber.startsWith('62')) {
        cleanNumber = '62' + cleanNumber;
    }
    // Jika tidak diawali 62, tambahkan 62
    else if (!cleanNumber.startsWith('62')) {
        cleanNumber = '62' + cleanNumber;
    }
    
    return cleanNumber;
}

// Fungsi untuk format pesan dengan header dan footer
function formatWithHeaderFooter(message) {
    const settings = getSettingsWithCache();
    const header = settings.company_header || 'AxeLink';
    const footer = settings.footer_info || 'Terima kasih telah menggunakan layanan kami';
    
    return `🏢 *${header.toUpperCase()}*\n\n${message}\n\n📞 ${footer}`;
}

// Fungsi untuk mengirim pesan
async function sendMessage(phoneNumber, message, options = {}) {
    if (!sock) {
        console.error('WhatsApp connection not available');
        return false;
    }
    
    try {
        const formattedNumber = formatPhoneNumber(phoneNumber);
        const jid = `${formattedNumber}@s.whatsapp.net`;
        
        const formattedMessage = options.skipFormat ? message : formatWithHeaderFooter(message);
        
        await sock.sendMessage(jid, { text: formattedMessage });
        // Reduced verbose logging - only log to file logger if available
        if (logger && logger.info) {
            logger.info(`Message sent to ${phoneNumber}`);
        }
        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        return false;
    }
}

// Fungsi untuk mengirim OTP
async function sendOTP(phoneNumber, otpCode, purpose = 'Customer Portal Login') {
    // Get settings for company info and developer contact
    const settings = getSettingsWithCache();
    const companyName = settings.company_header || 'AxeLink';
    const poweredBy = settings.pow_info || 'Powered by AxeLink';
    const devInfo = settings.dev_info || 'For more information or any issues, please contact the developer Dikri Nurpadli | Contact Dev: +62 819-1129-0961';
    const otpExpiry = settings.otp_expiry_minutes || '5';
    
    // Format the message exactly as requested
    const message = `🏢 ${companyName}

🔐 *CUSTOMER PORTAL OTP CODE*

Your OTP code is: *${otpCode}*

⏰ This code is valid for ${otpExpiry} minutes.
🔒 Do not share this code with anyone.

📝 _Didn't get your OTP code or having issues with this WhatsApp Bot? Please contact the developer, Dikri Nurpadli | Contact Dev: ‪+62 819-1129-0961‬_

${poweredBy}`;

    // Send OTP with skipFormat to use exact formatting
    const success = await sendMessage(phoneNumber, message, { skipFormat: true });
    
    if (success) {
        // Only log to file logger to reduce console spam
        if (logger && logger.info) {
            logger.info('OTP sent successfully', { phoneNumber, purpose, expiryMinutes: otpExpiry });
        }
    } else {
        // Keep error logs for troubleshooting
        console.error(`❌ Failed to send OTP to ${phoneNumber}`);
        if (logger && logger.error) {
            logger.error('Failed to send OTP', { phoneNumber, purpose });
        }
    }
    
    return success;
}

// Fungsi untuk mengirim notifikasi perubahan WiFi
async function sendWifiChangeNotification(phoneNumber, oldSSID, newSSID, changeType = 'SSID', frequency = '2.4GHz') {
    // Get settings for consistent branding
    const settings = getSettingsWithCache();
    const companyName = settings.company_header || 'AxeLink';
    const poweredBy = settings.pow_info || 'Powered by AxeLink';
    
    // Determine frequency type from changeType or parameter
    let frequencyLabel = '2.4GHz';
    if (changeType.includes('5g') || changeType.includes('5G') || frequency === '5GHz') {
        frequencyLabel = '5GHz';
    }
    
    // Create professional notification message
    let message;
    
    if (changeType.toLowerCase().includes('ssid') || changeType === 'SSID') {
        // SSID Change Notification
        message = `🏢 *${companyName}*

✅ *SSID ${frequencyLabel} UPDATED*

Your SSID ${frequencyLabel} has been changed to:

🆕 *${newSSID}*

Please reconnect your device to the new SSID

📝 _For more information or any issues on WhatsApp Bot, please contact the developer Dikri Nurpadli | Dev Contact: ‪+62 819-1129-0961‬_

${poweredBy}`;
    } else {
        // Password Change Notification
        message = `🏢 *${companyName}*

✅ *PASSWORD ${frequencyLabel} UPDATED*

Your WiFi ${frequencyLabel} password has been successfully changed.

🔐 *Password Status: Updated*

Please reconnect your devices with the new password

📝 _For more information or any issues on WhatsApp Bot, please contact the developer Dikri Nurpadli | Dev Contact: ‪+62 819-1129-0961‬_

${poweredBy}`;
    }

    // Send notification with skipFormat to use exact formatting
    const success = await sendMessage(phoneNumber, message, { skipFormat: true });
    
    if (success) {
        // Only log to file logger to reduce console spam
        if (logger && logger.info) {
            logger.info('WiFi change notification sent', { phoneNumber, changeType, oldSSID, newSSID });
        }
    }
    
    return success;
}

// Fungsi untuk mengirim notifikasi restart device
async function sendDeviceRestartNotification(phoneNumber, customerNumber = '') {
    const message = `🔄 *RESTART PERANGKAT BERHASIL*

Perangkat internet Anda telah berhasil direstart melalui Customer Portal.

📋 *Detail:*
${customerNumber ? `• Nomor Pelanggan: ${customerNumber}` : ''}
• Waktu: ${new Date().toLocaleString('id-ID')}
• Status: Restart berhasil dilakukan

⏳ *Proses:*
• Perangkat sedang booting ulang
• Koneksi internet akan pulih dalam 2-3 menit
• Semua perangkat akan tersambung kembali otomatis

💡 Jika setelah 5 menit koneksi belum pulih, silakan hubungi customer service kami.`;

    const success = await sendMessage(phoneNumber, message);
    
    if (success) {
        // Only log to file logger to reduce console spam
        if (logger && logger.info) {
            logger.info('Device restart notification sent', { phoneNumber, customerNumber });
        }
    }
    
    return success;
}

// Fungsi untuk mengirim notifikasi trouble report
async function sendTroubleReportNotification(phoneNumber, reportData) {
    const { ticketId, category, description, priority = 'Normal' } = reportData;
    
    const message = `🎫 *LAPORAN MASALAH DITERIMA*

Laporan masalah Anda telah berhasil dikirim dan sedang diproses oleh tim teknis kami.

📋 *Detail Laporan:*
• Nomor Tiket: *${ticketId}*
• Kategori: ${category}
• Prioritas: ${priority}
• Waktu: ${new Date().toLocaleString('id-ID')}

📝 *Deskripsi Masalah:*
${description}

⏱️ *Estimasi Penanganan:*
${priority === 'High' ? '• 1-2 jam (prioritas tinggi)' : 
  priority === 'Medium' ? '• 2-4 jam (prioritas sedang)' :
  '• 4-8 jam (prioritas normal)'}

📞 Tim teknis akan menghubungi Anda jika diperlukan informasi tambahan.

💡 Simpan nomor tiket ini untuk referensi.`;

    // Kirim ke customer
    const customerSuccess = await sendMessage(phoneNumber, message);
    
    // Kirim notifikasi ke admin/teknisi
    const adminMessage = `🚨 *LAPORAN MASALAH BARU*

Tiket: *${ticketId}*
Customer: ${phoneNumber}
Kategori: ${category}
Prioritas: ${priority}

Deskripsi:
${description}

Harap segera ditindaklanjuti.`;
    
    const superAdmin = getSuperAdminNumber();
    const adminSuccess = await sendMessage(superAdmin, adminMessage);
    
    if (customerSuccess) {
        // Only log to file logger to reduce console spam
        if (logger && logger.info) {
            logger.info('Trouble report notification sent', { phoneNumber, ticketId, category });
        }
    }
    
    if (adminSuccess && logger && logger.info) {
        logger.info('Trouble report notification sent to admin', { adminPhone: superAdmin });
    }
    
    return customerSuccess && adminSuccess;
}

// Fungsi untuk menangani pesan masuk (disederhanakan)
async function handleIncomingMessage(sock, message) {
    try {
        // Validasi input
        if (!message || !message.key || !message.message) {
            return;
        }
        
        const remoteJid = message.key.remoteJid;
        if (!remoteJid) {
            return;
        }
        
        // Skip pesan dari grup
        if (remoteJid.includes('@g.us')) {
            return;
        }
        
        // Ekstrak teks pesan
        let messageText = '';
        if (message.message.conversation) {
            messageText = message.message.conversation;
        } else if (message.message.extendedTextMessage) {
            messageText = message.message.extendedTextMessage.text;
        } else {
            return;
        }
        
        if (!messageText.trim()) {
            return;
        }
        
        const senderNumber = remoteJid.split('@')[0];
        const command = messageText.trim().toLowerCase();
        
        // Only log important messages to reduce terminal spam
        if (messageText.toLowerCase().includes('ping') || messageText.toLowerCase().includes('help')) {
            console.log(`📨 WhatsApp message from ${senderNumber}: ${messageText}`);
        }
        
        // Perintah dasar yang masih dipertahankan
        if (command === 'ping' || command === 'test') {
            await sock.sendMessage(remoteJid, { 
                text: formatWithHeaderFooter('🏓 Pong!\n\nWhatsApp bot aktif dan siap mengirim OTP serta notifikasi.') 
            });
            return;
        }
        
        if (command === 'help' || command === 'bantuan') {
            const helpMessage = `ℹ️ *BANTUAN WHATSAPP BOT*

Bot ini melayani:
• 📱 Pengiriman kode OTP
• 📊 Notifikasi status perubahan
• 🎫 Penerimaan laporan masalah

Untuk menggunakan layanan:
• Akses Customer Portal di website
• Masukkan nomor WhatsApp Anda
• Terima kode OTP di sini

Perintah tersedia:
• ping - Test koneksi bot
• help - Tampilkan bantuan ini`;

            await sock.sendMessage(remoteJid, { 
                text: formatWithHeaderFooter(helpMessage) 
            });
            return;
        }
        
        // Jika pesan tidak dikenali, berikan info singkat
        if (messageText.length > 10) { // Hindari response untuk pesan pendek
            const autoReply = `👋 Halo!

WhatsApp bot ini melayani pengiriman OTP dan notifikasi status.

Untuk menggunakan layanan internet:
• Buka Customer Portal di website
• Login dengan nomor WhatsApp ini
• Kode OTP akan dikirim ke sini

Ketik *help* untuk bantuan lebih lanjut.`;

            await sock.sendMessage(remoteJid, { 
                text: formatWithHeaderFooter(autoReply) 
            });
        }
        
    } catch (error) {
        console.error('Error handling incoming message:', error);
    }
}

// Fungsi untuk menyaring log WhatsApp yang verbose
function filterWhatsAppLogs(originalWrite) {
    return function(chunk, encoding, callback) {
        const str = chunk.toString();
        
        // Skip verbose WhatsApp session logs with more specific matching
        const line = str.trim();
        if (line.startsWith('Closing') || 
            line.includes('SessionEntry') ||
            line.includes('chainKey:') ||
            line.includes('ephemeralKeyPair:') ||
            line.includes('registrationId:') ||
            line.includes('baseKey:') ||
            line.includes('remoteIdentityKey:') ||
            line.includes('<Buffer') ||
            line.includes('pendingPreKey:') ||
            line.includes('indexInfo:') ||
            line.includes('currentRatchet:') ||
            line.includes('Removing old')) {
            // Skip these logs entirely
            if (callback) callback();
            return;
        }
        
        // Allow other logs through
        return originalWrite.call(this, chunk, encoding, callback);
    };
}

// Fungsi untuk koneksi ke WhatsApp
async function connectToWhatsApp() {
    try {
        // Filter verbose WhatsApp logs if debug is disabled
        const enableDebugLogs = process.env.WHATSAPP_DEBUG_LOGS === 'true';
        let originalStdoutWrite;
        
        if (!enableDebugLogs) {
            // Filter both stdout and stderr to catch all debug output
            originalStdoutWrite = process.stdout.write;
            const originalStderrWrite = process.stderr.write;
            
            process.stdout.write = filterWhatsAppLogs(originalStdoutWrite);
            process.stderr.write = filterWhatsAppLogs(originalStderrWrite);
            
            // Also override console methods to catch direct console calls
            const originalConsoleLog = console.log;
            console.log = function(...args) {
                const str = args.join(' ');
                if (str.includes('Closing') || str.includes('SessionEntry')) {
                    return; // Skip WhatsApp debug logs
                }
                return originalConsoleLog.apply(console, args);
            };
        }
        
        const { state, saveCreds } = await useMultiFileAuthState('whatsapp_session');
        
        // Control debug output via environment variables
        const showQR = process.env.WHATSAPP_SHOW_QR === 'true';
        
        // Ensure we use the latest supported WhatsApp Web version to avoid handshake/405 issues
        const { version } = await fetchLatestBaileysVersion();
        
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: showQR,
            logger: baileyLogger, // Use Pino silent logger
            browser: Browsers.ubuntu("Chrome"),
            version,
            generateHighQualityLinkPreview: false,
            defaultQueryTimeoutMs: 30000,
            // Additional options to reduce debug output
            shouldIgnoreJid: () => false,
            shouldSyncHistoryMessage: () => false,
            syncFullHistory: false
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('\n📱 Scan QR Code berikut dengan WhatsApp:');
                qrcode.generate(qr, { small: true });
                console.log('\n⚠️  QR Code akan expired dalam 1 menit');
                
                // Update global status dengan QR code untuk API
                if (global.whatsappStatus) {
                    global.whatsappStatus.qrCode = qr;
                    global.whatsappStatus.status = 'connecting';
                    global.whatsappStatus.connected = false;
                }
            }
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error && lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('❌ Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
                
                // Clear global whatsappSock saat disconnect
                global.whatsappSock = null;
                console.log('🚫 Global WhatsApp sock cleared due to disconnection');
                
                // Update global status ketika disconnect
                if (global.whatsappStatus) {
                    global.whatsappStatus.connected = false;
                    global.whatsappStatus.status = 'disconnected';
                    global.whatsappStatus.qrCode = null;
                    global.whatsappStatus.connectedSince = null;
                }
                
                if (shouldReconnect) {
                    setTimeout(connectToWhatsApp, 5000);
                }
            } else if (connection === 'open') {
                console.log('✅ WhatsApp Bot Connected Successfully!');
                console.log('🤖 Bot siap mengirim OTP dan notifikasi status');
                
                // Set global whatsappSock untuk digunakan oleh whatsapp-otp.js
                global.whatsappSock = sock;
                
                // Update global status ketika terhubung
                if (global.whatsappStatus) {
                    global.whatsappStatus.connected = true;
                    global.whatsappStatus.status = 'connected';
                    global.whatsappStatus.qrCode = null; // Clear QR code ketika sudah terhubung
                    global.whatsappStatus.connectedSince = new Date().toISOString();
                }
                
                if (logger && logger.info) {
                    logger.info('WhatsApp bot connected and ready');
                }
                
                // Kirim pesan ke super admin bahwa bot sudah aktif
                const superAdmin = getSuperAdminNumber();
                setTimeout(async () => {
                    try {
                        await sendMessage(superAdmin, 
                            `✅ _Bot successfully connected!_\n\nI am ready to assist you with:\n🔐 OTP Delivery\n📢 Status Notifications\n📝 Issue Reporting\n\nℹ️ _This is a system notification for the superuser._`,
                            { skipFormat: true }
                        );
                    } catch (err) {
                        console.error('Failed to send startup message to admin:', err);
                    }
                }, 2000);
            }
        });

        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('messages.upsert', ({ messages }) => {
            messages.forEach(message => {
                if (!message.key.fromMe) {
                    handleIncomingMessage(sock, message);
                }
            });
        });

    } catch (error) {
        console.error('❌ Error connecting to WhatsApp:', error);
        
        // Fallback ke whatsapp-web.js jika Baileys gagal
        console.log('🔄 Trying fallback to whatsapp-web.js...');
        try {
            const { Client, LocalAuth } = require('whatsapp-web.js');
            
            const client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: './auth_data'
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote'
                    ]
                }
            });

            client.on('qr', (qr) => {
                console.log('\n📱 Scan QR Code (Fallback - whatsapp-web.js):');
                qrcode.generate(qr, { small: true });
                
                // Update global status dengan QR code untuk API (fallback)
                if (global.whatsappStatus) {
                    global.whatsappStatus.qrCode = qr;
                    global.whatsappStatus.status = 'connecting';
                    global.whatsappStatus.connected = false;
                }
            });

            client.on('ready', () => {
                console.log('✅ WhatsApp Bot Connected (Fallback)!');
                sock = client; // Use client as sock for compatibility
                global.whatsappSock = client; // Set global for OTP service
                console.log('🔗 Global WhatsApp sock set for fallback connection');
                
                // Update global status ketika fallback terhubung
                if (global.whatsappStatus) {
                    global.whatsappStatus.connected = true;
                    global.whatsappStatus.status = 'connected';
                    global.whatsappStatus.qrCode = null;
                    global.whatsappStatus.connectedSince = new Date().toISOString();
                }
            });

            client.on('message', async (message) => {
                if (!message.fromMe) {
                    // Convert whatsapp-web.js message format to Baileys format
                    const baileyMessage = {
                        key: {
                            remoteJid: message.from,
                            fromMe: false
                        },
                        message: {
                            conversation: message.body
                        }
                    };
                    await handleIncomingMessage(client, baileyMessage);
                }
            });

            await client.initialize();
            
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
            setTimeout(connectToWhatsApp, 30000);
        }
    }
}

// Fungsi untuk mendapatkan status WhatsApp
function getWhatsAppStatus() {
    return sock ? 'connected' : 'disconnected';
}

// Fungsi untuk delete session WhatsApp
async function deleteWhatsAppSession() {
    try {
        if (sock) {
            await sock.logout();
            sock = null;
            global.whatsappSock = null;
            console.log('🚫 Global WhatsApp sock cleared after logout');
        }
        
        // Update global status
        if (global.whatsappStatus) {
            global.whatsappStatus.connected = false;
            global.whatsappStatus.status = 'disconnected';
            global.whatsappStatus.qrCode = null;
            global.whatsappStatus.connectedSince = null;
        }
        
        // Hapus folder whatsapp_session
        const authPath = path.join(__dirname, '../whatsapp_session');
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
        }
        
        // Hapus folder auth_data (untuk whatsapp-web.js)
        const authDataPath = path.join(__dirname, '../auth_data');
        if (fs.existsSync(authDataPath)) {
            fs.rmSync(authDataPath, { recursive: true, force: true });
        }
        
        console.log('✅ WhatsApp session deleted successfully');
        console.log('🔄 Starting reconnection in 2 seconds...');
        
        // Start reconnection after a short delay
        setTimeout(() => {
            connectToWhatsApp();
        }, 2000);
        
        return true;
    } catch (error) {
        console.error('❌ Error deleting WhatsApp session:', error);
        return false;
    }
}

// Set sock instance untuk digunakan dari modul lain
function setSock(newSock) {
    sock = newSock;
    global.whatsappSock = newSock;
    console.log('🔗 WhatsApp sock instance updated globally for OTP service');
}

// Get sock instance
function getSock() {
    return sock;
}

// Export semua fungsi yang diperlukan
module.exports = {
    // Core functions
    connectToWhatsApp,
    setSock,
    getSock,
    getWhatsAppStatus,
    deleteWhatsAppSession,
    
    // Messaging functions
    sendMessage,
    formatWithHeaderFooter,
    
    // OTP and notification functions
    sendOTP,
    sendWifiChangeNotification,
    sendDeviceRestartNotification,
    sendTroubleReportNotification,
    
    // Utility functions
    formatPhoneNumber
};
