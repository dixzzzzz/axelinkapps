/**
 * WhatsApp OTP Service Helper
 * 
 * Modul ini menyediakan fungsi-fungsi untuk mengirim OTP melalui WhatsApp
 * dan memvalidasi OTP yang dikirim.
 */

const { logger } = require('./logger');
const { getSetting } = require('./settingsManager');

// Utility function untuk memformat nomor telepon menjadi format WhatsApp yang benar
function formatPhoneNumber(phone) {
    // Bersihkan nomor dari karakter non-digit
    let cleanNumber = phone.replace(/\D/g, '');
    
    // Pastikan nomor dimulai dengan 62 (kode negara Indonesia)
    if (cleanNumber.startsWith('0')) {
        cleanNumber = '62' + cleanNumber.substring(1);
    }
    
    if (!cleanNumber.startsWith('62')) {
        cleanNumber = '62' + cleanNumber;
    }
    
    return cleanNumber;
}

/**
 * Mengirim pesan OTP ke nomor yang ditentukan
 * 
 * @param {string} phone Nomor telepon penerima
 * @param {string} otp Kode OTP yang akan dikirim
 * @param {number} expiryMinutes Waktu kedaluwarsa OTP dalam menit
 * @returns {Promise<Object>} Status pengiriman
 */
async function sendOTPMessage(phone, otp, expiryMinutes = 5) {
    try {
        // Referensikan objek whatsapp global
        const sock = global.whatsappSock;
        
        if (!sock) {
            logger.error('❌ WhatsApp sock is not available. Make sure WhatsApp is connected.');
            return { 
                success: false, 
                message: 'WhatsApp service not available'
            };
        }
        
        // Format nomor telepon untuk WhatsApp
        const formattedPhone = formatPhoneNumber(phone);
        const recipient = `${formattedPhone}@s.whatsapp.net`;
        
        // Buat pesan OTP dengan format profesional yang diminta
        const settings = global.preloadedSettings || {};
        const companyName = settings.company_header || 'AxeLink';
        const poweredBy = settings.pow_info || 'Powered by AxeLink';
        const otpMessage = `🏢 ${companyName}

🔐 CUSTOMER PORTAL OTP CODE

Your OTP code is: ${otp}

⏰ This code is valid for ${expiryMinutes} minutes.
🔒 Do not share this code with anyone.

📝 Didn't get your OTP code or having issues with this WhatsApp Bot? Please contact the developer, Dikri Nurpadli | Contact Dev: ‪+62 819-1129-0961‬

${poweredBy}`;

        // Kirim pesan OTP
        await sock.sendMessage(recipient, { text: otpMessage });
        
        logger.info(`✅ OTP sent to ${phone} via WhatsApp`);
        return {
            success: true,
            message: 'OTP sent successfully'
        };
    } catch (error) {
        logger.error(`❌ Error sending OTP via WhatsApp to ${phone}:`, error);
        return {
            success: false,
            message: `Failed to send OTP: ${error.message}`
        };
    }
}

/**
 * Mengirim pesan OTP dengan informasi lebih lengkap
 * 
 * @param {string} phone Nomor telepon penerima
 * @param {string} otp Kode OTP yang akan dikirim
 * @param {Object} options Opsi tambahan
 * @returns {Promise<Object>} Status pengiriman
 */
async function sendEnhancedOTPMessage(phone, otp, options = {}) {
    try {
        // Referensikan objek whatsapp global
        const sock = global.whatsappSock;
        
        if (!sock) {
            logger.error('❌ WhatsApp sock is not available');
            return { 
                success: false, 
                message: 'WhatsApp service not available'
            };
        }
        
        // Format nomor telepon untuk WhatsApp
        const formattedPhone = formatPhoneNumber(phone);
        const recipient = `${formattedPhone}@s.whatsapp.net`;
        
        // Default options
        const defaultOptions = {
            expiryMinutes: 5,
            companyName: getSetting('company_header', 'AxeLink'),
            loginUrl: process.env.CUSTOMER_PORTAL_URL || 'https://portal.axelink.com',
            includeFooter: true
        };
        
        // Gabungkan default options dengan options yang diberikan
        const mergedOptions = { ...defaultOptions, ...options };
        
        // Buat pesan OTP dengan format profesional yang konsisten
        const poweredBy = getSetting('pow_info', 'Powered by AxeLink');
        const otpMessage = `🏢 ${mergedOptions.companyName}

🔐 *CUSTOMER PORTAL OTP CODE*

Your OTP code is: *${otp}*

⏰ This code is valid for ${mergedOptions.expiryMinutes} minutes.
🔒 Do not share this code with anyone.

📝 _Didn't get your OTP code or having issues with this WhatsApp Bot? Please contact the developer, Dikri Nurpadli | Contact Dev: ‪+62 819-1129-0961‬_

${poweredBy}`;

        // Kirim pesan OTP
        await sock.sendMessage(recipient, { text: otpMessage });
        
        logger.info(`✅ Enhanced OTP sent to ${phone} via WhatsApp`);
        return {
            success: true,
            message: 'OTP sent successfully'
        };
    } catch (error) {
        logger.error(`❌ Error sending enhanced OTP via WhatsApp to ${phone}:`, error);
        return {
            success: false,
            message: `Failed to send OTP: ${error.message}`
        };
    }
}

module.exports = {
    sendOTPMessage,
    sendEnhancedOTPMessage,
    formatPhoneNumber
};
