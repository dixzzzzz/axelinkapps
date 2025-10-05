/**
 * Direct Rate Limit Reset Tool
 * 
 * Akses langsung ke rate limiter untuk development purposes
 */

const path = require('path');

// Import rate limiter directly
const rateLimiterPath = path.join(__dirname, 'middleware', 'rateLimiter.js');

try {
    const { getRateLimitStats, resetRateLimit, clearSuspiciousIP } = require(rateLimiterPath);
    
    async function directReset() {
        console.log('🔧 Direct Rate Limit Reset Tool (Development)');
        console.log('==============================================\n');
        
        // Get current stats first
        console.log('📊 Current Rate Limit Statistics:');
        try {
            const stats = getRateLimitStats();
            console.log('- Total active keys:', stats.totalKeys);
            console.log('- Suspicious IPs:', stats.suspiciousIPs);
            console.log('- Global requests this hour:', stats.globalRequests);
            console.log('');
        } catch (error) {
            console.log('⚠️ Could not get stats:', error.message);
        }
        
        // Reset common rate limit keys for localhost development
        console.log('🔄 Resetting rate limits for development...');
        
        const keysToReset = [
            'ip:::1',              // IPv6 localhost
            'ip:127.0.0.1',        // IPv4 localhost
            'ip:unknown',          // Unknown IP fallback
            'burst:::1',           // Burst detection IPv6
            'burst:127.0.0.1',     // Burst detection IPv4  
            'burst:unknown',       // Burst detection fallback
            'phone:081911290961',  // Test phone number
            'phone:6281911290961', // Formatted test phone
        ];
        
        for (const key of keysToReset) {
            try {
                resetRateLimit(key);
                console.log(`✅ Reset: ${key}`);
            } catch (error) {
                console.log(`⚠️ Could not reset ${key}:`, error.message);
            }
        }
        
        // Clear suspicious IPs
        console.log('\\n🔄 Clearing suspicious IP status...');
        const ipsToReset = ['::1', '127.0.0.1', 'unknown'];
        
        for (const ip of ipsToReset) {
            try {
                clearSuspiciousIP(ip);
                console.log(`✅ Cleared suspicious: ${ip}`);
            } catch (error) {
                console.log(`⚠️ Could not clear ${ip}:`, error.message);
            }
        }
        
        console.log('\\n✅ Rate limit reset completed!');
        console.log('\\n📊 Updated Statistics:');
        try {
            const updatedStats = getRateLimitStats();
            console.log('- Total active keys:', updatedStats.totalKeys);
            console.log('- Suspicious IPs:', updatedStats.suspiciousIPs);
            console.log('- Global requests this hour:', updatedStats.globalRequests);
        } catch (error) {
            console.log('⚠️ Could not get updated stats:', error.message);
        }
        
        console.log('\n🧪 You should now be able to test OTP requests again!');
        console.log('Try making an OTP request from your frontend now.');
    }
    
    directReset();
    
} catch (error) {
    console.error('❌ Error accessing rate limiter:', error.message);
    console.log('\\n🔧 Alternative: Manual Server Restart');
    console.log('=====================================');
    console.log('If direct access fails, you can restart the backend server:');
    console.log('1. Stop the current backend server (Ctrl+C)');
    console.log('2. Run: npm start');
    console.log('3. This will clear all in-memory rate limits');
    
    console.log('\\n⏰ Or wait for automatic expiry:');
    console.log('- Burst detection: ~1 minute');
    console.log('- Phone cooldown: ~1 minute between requests'); 
    console.log('- IP rate limit: ~1 hour');
    console.log('- Global stats: reset every hour');
}
