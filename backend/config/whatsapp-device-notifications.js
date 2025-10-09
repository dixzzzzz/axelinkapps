/**
 * WhatsApp Device Management Notifications Service
 * 
 * Modul ini menyediakan fungsi-fungsi untuk mengirim notifikasi WhatsApp
 * kepada customer setiap kali ada perubahan pada device mereka.
 */

const { logger } = require('./logger');
const { getSetting } = require('./settingsManager');
const { formatPhoneNumber } = require('./whatsapp-otp');

/**
 * Mengirim notifikasi perubahan SSID 2.4GHz
 * 
 * @param {string} phone Nomor telepon customer
 * @param {string} newSSID SSID baru yang telah diset
 * @returns {Promise<Object>} Status pengiriman
 */
async function sendSSID2GChangeNotification(phone, newSSID) {
    try {
        const sock = global.whatsappSock;
        
        if (!sock) {
            logger.error('❌ WhatsApp sock is not available');
            return { 
                success: false, 
                message: 'WhatsApp service not available'
            };
        }
        
        const formattedPhone = formatPhoneNumber(phone);
        const recipient = `${formattedPhone}@s.whatsapp.net`;
        const companyName = getSetting('company_header', 'AxeLink');
        const poweredBy = getSetting('pow_info', 'Powered by AxeLink');
        
        const message = `🏢 *${companyName}*

✅ *SSID 2.4GHz UPDATED*

Your SSID 2.4GHz has been changed to:

🆕 *${newSSID}*

Please reconnect your device to the new SSID

🙏 Thank you for staying connected with us

_${poweredBy}_`;

        await sock.sendMessage(recipient, { text: message });
        
        logger.info(`✅ SSID 2G change notification sent to ${phone}`);
        return {
            success: true,
            message: 'SSID 2G change notification sent successfully'
        };
    } catch (error) {
        logger.error(`❌ Error sending SSID 2G notification to ${phone}:`, error);
        return {
            success: false,
            message: `Failed to send notification: ${error.message}`
        };
    }
}

/**
 * Mengirim notifikasi perubahan SSID 5GHz
 * 
 * @param {string} phone Nomor telepon customer
 * @param {string} newSSID SSID baru yang telah diset
 * @returns {Promise<Object>} Status pengiriman
 */
async function sendSSID5GChangeNotification(phone, newSSID) {
    try {
        const sock = global.whatsappSock;
        
        if (!sock) {
            logger.error('❌ WhatsApp sock is not available');
            return { 
                success: false, 
                message: 'WhatsApp service not available'
            };
        }
        
        const formattedPhone = formatPhoneNumber(phone);
        const recipient = `${formattedPhone}@s.whatsapp.net`;
        const companyName = getSetting('company_header', 'AxeLink');
        const poweredBy = getSetting('pow_info', 'Powered by AxeLink');
        
        const message = `🏢 *${companyName}*

✅ *SSID 5GHz UPDATED*

Your SSID 5GHz has been changed to:

🆕 *${newSSID}*

Please reconnect your device to the new SSID

🙏 Thank you for staying connected with us

_${poweredBy}_`;

        await sock.sendMessage(recipient, { text: message });
        
        logger.info(`✅ SSID 5G change notification sent to ${phone}`);
        return {
            success: true,
            message: 'SSID 5G change notification sent successfully'
        };
    } catch (error) {
        logger.error(`❌ Error sending SSID 5G notification to ${phone}:`, error);
        return {
            success: false,
            message: `Failed to send notification: ${error.message}`
        };
    }
}

/**
 * Mengirim notifikasi perubahan password WiFi 2.4GHz
 * 
 * @param {string} phone Nomor telepon customer
 * @param {string} newPassword Password baru yang telah diset
 * @param {string} ssid SSID yang terkait
 * @returns {Promise<Object>} Status pengiriman
 */
async function sendPassword2GChangeNotification(phone, newPassword, ssid = null) {
    try {
        const sock = global.whatsappSock;
        
        if (!sock) {
            logger.error('❌ WhatsApp sock is not available');
            return { 
                success: false, 
                message: 'WhatsApp service not available'
            };
        }
        
        const formattedPhone = formatPhoneNumber(phone);
        const recipient = `${formattedPhone}@s.whatsapp.net`;
        const companyName = getSetting('company_header', 'AxeLink');
        const poweredBy = getSetting('pow_info', 'Powered by AxeLink');
        
        const ssidInfo = ssid ? `\n📡 *Jaringan: ${ssid}*` : '';
        
        const message = `🏢 *${companyName}*

✅ *PASSWORD 2.4GHz UPDATED*

Your Password 2.4GHz has been changed to:

🆕 *${newPassword}*

Please reconnect your device to the new Password

🙏 Thank you for staying connected with us

_${poweredBy}_`;

        await sock.sendMessage(recipient, { text: message });
        
        logger.info(`✅ Password 2G change notification sent to ${phone}`);
        return {
            success: true,
            message: 'Password 2G change notification sent successfully'
        };
    } catch (error) {
        logger.error(`❌ Error sending Password 2G notification to ${phone}:`, error);
        return {
            success: false,
            message: `Failed to send notification: ${error.message}`
        };
    }
}

/**
 * Mengirim notifikasi perubahan password WiFi 5GHz
 * 
 * @param {string} phone Nomor telepon customer
 * @param {string} newPassword Password baru yang telah diset
 * @param {string} ssid SSID yang terkait
 * @returns {Promise<Object>} Status pengiriman
 */
async function sendPassword5GChangeNotification(phone, newPassword, ssid = null) {
    try {
        const sock = global.whatsappSock;
        
        if (!sock) {
            logger.error('❌ WhatsApp sock is not available');
            return { 
                success: false, 
                message: 'WhatsApp service not available'
            };
        }
        
        const formattedPhone = formatPhoneNumber(phone);
        const recipient = `${formattedPhone}@s.whatsapp.net`;
        const companyName = getSetting('company_header', 'AxeLink');
        const poweredBy = getSetting('pow_info', 'Powered by AxeLink');
        
        const ssidInfo = ssid ? `\n📡 *Jaringan: ${ssid}*` : '';
        
        const message = `🏢 *${companyName}*

✅ *PASSWORD 5GHz UPDATED*

Your Password 5GHz has been changed to:

🆕 *${newPassword}*

Please reconnect your device to the new Password


🙏 Thank you for staying connected with us

_${poweredBy}_`;

        await sock.sendMessage(recipient, { text: message });
        
        logger.info(`✅ Password 5G change notification sent to ${phone}`);
        return {
            success: true,
            message: 'Password 5G change notification sent successfully'
        };
    } catch (error) {
        logger.error(`❌ Error sending Password 5G notification to ${phone}:`, error);
        return {
            success: false,
            message: `Failed to send notification: ${error.message}`
        };
    }
}

/**
 * Mengirim notifikasi restart device
 * 
 * @param {string} phone Nomor telepon customer
 * @param {string} deviceModel Model perangkat jika tersedia
 * @returns {Promise<Object>} Status pengiriman
 */
async function sendDeviceRestartNotification(phone, deviceModel = null) {
    try {
        const sock = global.whatsappSock;
        
        if (!sock) {
            logger.error('❌ WhatsApp sock is not available');
            return { 
                success: false, 
                message: 'WhatsApp service not available'
            };
        }
        
        const formattedPhone = formatPhoneNumber(phone);
        const recipient = `${formattedPhone}@s.whatsapp.net`;
        const companyName = getSetting('company_header', 'AxeLink');
        const poweredBy = getSetting('pow_info', 'Powered by AxeLink');
        
        const message = `🏢 *${companyName}*

🔄 *RESTART DEVICE*

The restart command has been successfully sent to your device.

⏰ The restart process takes 1-3 minutes
📶 The internet connection will be temporarily disconnected.
✅ The internet will return to normal once the restart is complete.

🙏 Thank you for your patience and staying connected with us.

_${poweredBy}_`;

        await sock.sendMessage(recipient, { text: message });
        
        logger.info(`✅ Device restart notification sent to ${phone}`);
        return {
            success: true,
            message: 'Device restart notification sent successfully'
        };
    } catch (error) {
        logger.error(`❌ Error sending device restart notification to ${phone}:`, error);
        return {
            success: false,
            message: `Failed to send notification: ${error.message}`
        };
    }
}

/**
 * Mengirim notifikasi gabungan untuk multiple perubahan
 * 
 * @param {string} phone Nomor telepon customer
 * @param {Object} changes Objek berisi perubahan yang dilakukan
 * @returns {Promise<Object>} Status pengiriman
 */
async function sendMultipleChangesNotification(phone, changes = {}) {
    try {
        const sock = global.whatsappSock;
        
        if (!sock) {
            logger.error('❌ WhatsApp sock is not available');
            return { 
                success: false, 
                message: 'WhatsApp service not available'
            };
        }
        
        const formattedPhone = formatPhoneNumber(phone);
        const recipient = `${formattedPhone}@s.whatsapp.net`;
        const companyName = getSetting('company_header', 'AxeLink');
        
        let changesList = [];
        if (changes.ssid2g) changesList.push(`📡 SSID 2.4GHz → ${changes.ssid2g}`);
        if (changes.ssid5g) changesList.push(`📡 SSID 5GHz → ${changes.ssid5g}`);
        if (changes.password2g) changesList.push(`🔐 Password WiFi 2.4GHz → Diperbarui`);
        if (changes.password5g) changesList.push(`🔐 Password WiFi 5GHz → Diperbarui`);
        if (changes.restart) changesList.push(`🔄 Perangkat → Di-restart`);
        
        const changesText = changesList.join('\n');
        
        const message = `🔧 *PERUBAHAN PERANGKAT*

Halo Pelanggan ${companyName}!

Berikut adalah ringkasan perubahan yang baru saja dilakukan pada perangkat Anda:

${changesText}

📋 *Informasi Penting:*
• Perubahan telah berhasil diterapkan
• Perangkat yang terhubung mungkin terputus sementara
• Silahkan sambungkan kembali jika diperlukan
• Semua perubahan langsung berlaku

💡 *Tips Setelah Perubahan:*
• Restart perangkat WiFi jika koneksi bermasalah
• Gunakan informasi terbaru untuk koneksi
• Pastikan semua perangkat menggunakan setting baru

🔧 Perubahan ini dilakukan melalui portal pelanggan Anda.

Terima kasih atas kepercayaan Anda menggunakan layanan ${companyName}.`;

        await sock.sendMessage(recipient, { text: message });
        
        logger.info(`✅ Multiple changes notification sent to ${phone}`);
        return {
            success: true,
            message: 'Multiple changes notification sent successfully'
        };
    } catch (error) {
        logger.error(`❌ Error sending multiple changes notification to ${phone}:`, error);
        return {
            success: false,
            message: `Failed to send notification: ${error.message}`
        };
    }
}

module.exports = {
    sendSSID2GChangeNotification,
    sendSSID5GChangeNotification,
    sendPassword2GChangeNotification,
    sendPassword5GChangeNotification,
    sendDeviceRestartNotification,
    sendMultipleChangesNotification
};
