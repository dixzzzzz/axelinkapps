/**
 * Advanced Rate Limiting Middleware for OTP System
 * 
 * Multi-layer rate limiting:
 * 1. Per-IP rate limiting
 * 2. Per-phone number rate limiting  
 * 3. Global rate limiting
 * 4. Suspicious activity detection
 */

const { logger } = require('../config/logger');

// In-memory store for rate limiting (in production, use Redis)
class RateLimitStore {
    constructor() {
        this.store = new Map();
        this.suspiciousIPs = new Map();
        this.globalStats = {
            requests: 0,
            lastReset: Date.now()
        };
        
        // Cleanup interval every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
        
        // Global stats reset every hour
        setInterval(() => this.resetGlobalStats(), 60 * 60 * 1000);
    }
    
    /**
     * Get rate limit data for a key
     */
    get(key) {
        return this.store.get(key) || {
            count: 0,
            resetTime: Date.now() + (60 * 60 * 1000), // 1 hour from now
            attempts: []
        };
    }
    
    /**
     * Increment counter for a key
     */
    increment(key, windowMs = 60 * 60 * 1000) {
        const now = Date.now();
        let data = this.get(key);
        
        // Reset if window expired
        if (now > data.resetTime) {
            data = {
                count: 0,
                resetTime: now + windowMs,
                attempts: []
            };
        }
        
        data.count++;
        data.attempts.push(now);
        
        // Keep only attempts within window
        data.attempts = data.attempts.filter(time => time > (now - windowMs));
        
        this.store.set(key, data);
        return data;
    }
    
    /**
     * Check if IP is suspicious
     */
    isSuspicious(ip) {
        const suspiciousData = this.suspiciousIPs.get(ip);
        if (!suspiciousData) return false;
        
        // Remove if expired
        if (Date.now() > suspiciousData.expiresAt) {
            this.suspiciousIPs.delete(ip);
            return false;
        }
        
        return true;
    }
    
    /**
     * Mark IP as suspicious
     */
    markSuspicious(ip, reason, durationMs = 24 * 60 * 60 * 1000) {
        this.suspiciousIPs.set(ip, {
            reason,
            markedAt: Date.now(),
            expiresAt: Date.now() + durationMs
        });
        
        logger.warn(`🚨 IP marked as suspicious: ${ip} - Reason: ${reason}`);
    }
    
    /**
     * Update global statistics
     */
    updateGlobalStats() {
        this.globalStats.requests++;
    }
    
    /**
     * Reset global statistics
     */
    resetGlobalStats() {
        logger.info(`📊 Global OTP stats reset - Previous hour: ${this.globalStats.requests} requests`);
        this.globalStats = {
            requests: 0,
            lastReset: Date.now()
        };
    }
    
    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, data] of this.store.entries()) {
            // Remove any entry whose window has expired to prevent unbounded growth
            if (now > data.resetTime) {
                this.store.delete(key);
                cleaned++;
                continue;
            }

            // Bound attempts array to prevent unbounded growth
            if (Array.isArray(data.attempts) && data.attempts.length > 100) {
                data.attempts = data.attempts.slice(-100);
                this.store.set(key, data);
            }
        }

        if (cleaned > 0) {
            logger.debug(`🧹 Rate limiter cleanup: removed ${cleaned} expired entries`);
        }
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            totalKeys: this.store.size,
            suspiciousIPs: this.suspiciousIPs.size,
            globalRequests: this.globalStats.requests,
            globalResetTime: this.globalStats.lastReset
        };
    }
}

const rateLimitStore = new RateLimitStore();

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_CONFIG = {
    // Per IP limits
    ip: {
        maxRequests: 10,        // Max 10 requests per hour per IP
        windowMs: 60 * 60 * 1000, // 1 hour
        blockDurationMs: 2 * 60 * 60 * 1000 // Block for 2 hours if exceeded
    },
    
    // Per phone number limits  
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
    
    // Burst detection
    burst: {
        maxRequestsPerMinute: 3,  // Max 3 requests per minute
        windowMs: 60 * 1000       // 1 minute window
    }
};

/**
 * Analyze request patterns to detect suspicious behavior
 */
function analyzeRequestPattern(attempts, ip, phone) {
    const now = Date.now();
    const recentAttempts = attempts.filter(time => time > (now - 5 * 60 * 1000)); // Last 5 minutes
    
    const issues = [];
    
    // Check for rapid fire requests
    if (recentAttempts.length >= 5) {
        issues.push('rapid_fire');
    }
    
    // Check for consistent interval pattern (bot behavior)
    if (recentAttempts.length >= 3) {
        const intervals = [];
        for (let i = 1; i < recentAttempts.length; i++) {
            intervals.push(recentAttempts[i] - recentAttempts[i-1]);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        
        // If variance is very low, it might be automated
        if (variance < 1000 && intervals.length >= 3) {
            issues.push('consistent_pattern');
        }
    }
    
    return issues;
}

/**
 * Main rate limiting middleware
 */
function otpRateLimit(options = {}) {
    const config = { ...RATE_LIMIT_CONFIG, ...options };
    
    return async (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const phone = req.body.phone;
        const now = Date.now();
        
        try {
            // Update global statistics
            rateLimitStore.updateGlobalStats();
            
            // Check if IP is marked as suspicious
            if (rateLimitStore.isSuspicious(ip)) {
                logger.warn(`🚫 Blocked request from suspicious IP: ${ip}`);
                return res.status(429).json({
                    success: false,
                    message: 'Your IP has been temporarily blocked due to suspicious activity. Please try again later.',
                    retryAfter: 3600 // 1 hour
                });
            }
            
            // Global rate limiting check
            if (rateLimitStore.globalStats.requests > config.global.maxRequestsPerHour) {
                logger.warn(`🌍 Global rate limit exceeded: ${rateLimitStore.globalStats.requests} requests this hour`);
                return res.status(429).json({
                    success: false,
                    message: 'Service is currently experiencing high demand. Please try again later.',
                    retryAfter: 1800 // 30 minutes
                });
            }
            
            // Per-IP rate limiting
            const ipKey = `ip:${ip}`;
            const ipData = rateLimitStore.increment(ipKey, config.ip.windowMs);
            
            if (ipData.count > config.ip.maxRequests) {
                // Mark IP as suspicious if excessive requests
                if (ipData.count > config.global.suspiciousThreshold) {
                    rateLimitStore.markSuspicious(ip, `Excessive requests: ${ipData.count} in one hour`);
                }
                
                logger.warn(`🚫 IP rate limit exceeded: ${ip} - ${ipData.count} requests`);
                return res.status(429).json({
                    success: false,
                    message: 'Too many requests from your IP address. Please try again later.',
                    retryAfter: Math.ceil((ipData.resetTime - now) / 1000)
                });
            }
            
            // Burst detection for IP
            const ipBurstKey = `burst:${ip}`;
            const ipBurstData = rateLimitStore.increment(ipBurstKey, config.burst.windowMs);
            
            if (ipBurstData.count > config.burst.maxRequestsPerMinute) {
                logger.warn(`🚫 IP burst limit exceeded: ${ip} - ${ipBurstData.count} requests in 1 minute`);
                return res.status(429).json({
                    success: false,
                    message: 'Too many requests too quickly. Please wait a moment and try again.',
                    retryAfter: 60
                });
            }
            
            // If phone number is provided, check phone-specific limits
            if (phone) {
                const phoneKey = `phone:${phone}`;
                const phoneData = rateLimitStore.increment(phoneKey, config.phone.windowMs);
                
                // Check hourly limit for phone
                if (phoneData.count > config.phone.maxRequests) {
                    logger.warn(`🚫 Phone rate limit exceeded: ${phone} - ${phoneData.count} requests`);
                    return res.status(429).json({
                        success: false,
                        message: 'Too many OTP requests for this phone number. Please try again later.',
                        retryAfter: Math.ceil((phoneData.resetTime - now) / 1000)
                    });
                }
                
                // Check cooldown period between requests
                const lastAttempt = phoneData.attempts[phoneData.attempts.length - 2]; // Second to last
                if (lastAttempt && (now - lastAttempt) < config.phone.cooldownMs) {
                    const remainingCooldown = Math.ceil((config.phone.cooldownMs - (now - lastAttempt)) / 1000);
                    return res.status(429).json({
                        success: false,
                        message: `Please wait ${remainingCooldown} seconds before requesting another OTP.`,
                        retryAfter: remainingCooldown
                    });
                }
                
                // Analyze request patterns
                const suspiciousPatterns = analyzeRequestPattern(phoneData.attempts, ip, phone);
                if (suspiciousPatterns.length > 0) {
                    logger.warn(`🔍 Suspicious patterns detected for ${phone}: ${suspiciousPatterns.join(', ')}`);
                    
                    // Add extra delay for suspicious patterns
                    if (suspiciousPatterns.includes('rapid_fire')) {
                        return res.status(429).json({
                            success: false,
                            message: 'Please wait a few minutes before requesting another OTP.',
                            retryAfter: 300 // 5 minutes
                        });
                    }
                }
            }
            
            // Add rate limit headers
            res.set({
                'X-RateLimit-Limit': config.ip.maxRequests,
                'X-RateLimit-Remaining': Math.max(0, config.ip.maxRequests - ipData.count),
                'X-RateLimit-Reset': new Date(ipData.resetTime).toISOString()
            });
            
            // Log successful request
            logger.debug(`✅ Rate limit check passed - IP: ${ip}, Phone: ${phone || 'N/A'}`);
            
            next();
            
        } catch (error) {
            logger.error(`❌ Rate limiter error: ${error.message}`);
            // In case of error, allow the request to proceed but log it
            next();
        }
    };
}

/**
 * Get rate limit statistics (for monitoring)
 */
function getRateLimitStats() {
    return rateLimitStore.getStats();
}

/**
 * Reset rate limit for a specific key (admin function)
 */
function resetRateLimit(key) {
    rateLimitStore.store.delete(key);
    logger.info(`🔄 Rate limit reset for key: ${key}`);
}

/**
 * Clear suspicious IP (admin function)
 */
function clearSuspiciousIP(ip) {
    rateLimitStore.suspiciousIPs.delete(ip);
    logger.info(`🔄 Cleared suspicious status for IP: ${ip}`);
}

module.exports = {
    otpRateLimit,
    getRateLimitStats,
    resetRateLimit,
    clearSuspiciousIP,
    RATE_LIMIT_CONFIG
};
