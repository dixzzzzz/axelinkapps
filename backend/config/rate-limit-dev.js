/**
 * Development-friendly Rate Limiting Configuration
 * 
 * Konfigurasi yang lebih lenient untuk development dan testing
 */

const DEVELOPMENT_RATE_LIMIT_CONFIG = {
    // Per IP limits (lebih longgar untuk development)
    ip: {
        maxRequests: 50,        // Max 50 requests per hour per IP (vs 10 di production)
        windowMs: 60 * 60 * 1000, // 1 hour
        blockDurationMs: 10 * 60 * 1000 // Block hanya 10 menit (vs 2 jam di production)
    },
    
    // Per phone number limits (lebih longgar)
    phone: {
        maxRequests: 20,        // Max 20 requests per hour per phone (vs 5 di production)
        windowMs: 60 * 60 * 1000, // 1 hour
        cooldownMs: 10 * 1000,  // 10 detik antara requests (vs 60 detik)
        dailyLimit: 100         // Max 100 requests per day (vs 20)
    },
    
    // Global limits (lebih tinggi)
    global: {
        maxRequestsPerHour: 5000, // Max 5000 OTP requests per hour globally (vs 1000)
        suspiciousThreshold: 500  // Mark suspicious at 500 requests (vs 100)
    },
    
    // Burst detection (lebih tolerant)
    burst: {
        maxRequestsPerMinute: 10, // Max 10 requests per minute (vs 3)
        windowMs: 60 * 1000       // 1 minute window
    }
};

const PRODUCTION_RATE_LIMIT_CONFIG = {
    // Per IP limits (ketat untuk production)
    ip: {
        maxRequests: 10,        // Max 10 requests per hour per IP
        windowMs: 60 * 60 * 1000, // 1 hour
        blockDurationMs: 2 * 60 * 60 * 1000 // Block for 2 hours if exceeded
    },
    
    // Per phone number limits (ketat)
    phone: {
        maxRequests: 5,         // Max 5 requests per hour per phone
        windowMs: 60 * 60 * 1000, // 1 hour
        cooldownMs: 60 * 1000,  // 1 minute between requests
        dailyLimit: 20          // Max 20 requests per day per phone
    },
    
    // Global limits
    global: {
        maxRequestsPerHour: 1000, // Max 1000 OTP requests per hour globally
        suspiciousThreshold: 100  // Mark as suspicious if more than 100 requests per hour from single source
    },
    
    // Burst detection (ketat)
    burst: {
        maxRequestsPerMinute: 3,  // Max 3 requests per minute
        windowMs: 60 * 1000       // 1 minute window
    }
};

/**
 * Get rate limit configuration based on environment
 */
function getRateLimitConfig() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
        console.log('🔧 Using DEVELOPMENT rate limiting config (more lenient)');
        return DEVELOPMENT_RATE_LIMIT_CONFIG;
    } else {
        console.log('🔒 Using PRODUCTION rate limiting config (strict security)');
        return PRODUCTION_RATE_LIMIT_CONFIG;
    }
}

module.exports = {
    DEVELOPMENT_RATE_LIMIT_CONFIG,
    PRODUCTION_RATE_LIMIT_CONFIG,
    getRateLimitConfig
};
