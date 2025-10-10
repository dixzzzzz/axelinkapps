/**
 * Advanced Security Middleware
 * Environment-aware security implementation
 */

const helmet = require('helmet');
const csrf = require('csurf');
const { body, validationResult } = require('express-validator');
const { logger } = require('../config/logger');
const redis = require('redis');

// Redis client for activity logging
let redisClient = null;

const getRedisClient = () => {
    if (!redisClient) {
        redisClient = redis.createClient({
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379
            },
            password: process.env.REDIS_PASSWORD || undefined,
            database: parseInt(process.env.REDIS_DB) || 0
        });

        redisClient.on('error', (err) => {
            logger.warn('⚠️ Redis error for activity logging (fallback to memory):', err.message);
        });

        redisClient.connect().catch(err => {
            logger.warn('⚠️ Failed to connect Redis for activity logging:', err.message);
        });
    }
    return redisClient;
};

/**
 * Session regeneration middleware
 * Prevents session fixation attacks
 */
const sessionRegeneration = {
    /**
     * Regenerate session after successful login
     */
    afterLogin: (req, res, next, userData, userType = 'user') => {
        req.session.regenerate((err) => {
            if (err) {
                logger.error(`❌ Session regeneration failed for ${userType}:`, err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Session initialization failed' 
                });
            }

            // Set user data after regeneration
            if (userType === 'admin') {
                req.session.isAdmin = true;
                // Store only username string in session for consistency
                req.session.adminUser = userData.username;
            } else if (userType === 'customer') {
                req.session.phone = userData.phone;
                req.session.isVerified = true;
                req.session.customerData = userData;
            }

            req.session.save((err) => {
                if (err) {
                    logger.error(`❌ Session save failed for ${userType}:`, err);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Session save failed' 
                    });
                }

                logger.info(`✅ Session regenerated successfully for ${userType}: ${userData.phone || userData.username}`);

                // Store admin login activity
                if (userType === 'admin') {
                    const activity = {
                        id: `admin-login-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        type: 'user',
                        title: 'Admin login successful',
                        description: `Admin ${userData.username} logged in`,
                        timestamp: new Date().toLocaleString('id-ID'),
                        status: 'success',
                        ip: req.ip,
                        userAgent: req.get('User-Agent'),
                        username: userData.username
                    };

                    // Store in Redis
                    try {
                        const client = getRedisClient();
                        const key = 'admin:activities';
                        client.lPush(key, JSON.stringify(activity)).catch(err => {
                            logger.warn('Failed to store admin login activity in Redis:', err.message);
                        });
                        // Keep only last 100 activities
                        client.lTrim(key, 0, 99).catch(err => {
                            logger.warn('Failed to trim admin activities in Redis:', err.message);
                        });
                    } catch (err) {
                        logger.warn('Redis not available for activity logging:', err.message);
                    }
                }

                next();
            });
        });
    },

    /**
     * Clean session on logout
     */
    onLogout: (req, res, next) => {
        const sessionId = req.sessionID;
        const usernameForLog = req.session?.adminUser || 'admin';
        
        req.session.destroy((err) => {
            if (err) {
                logger.error('❌ Session destruction failed:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Logout failed' 
                });
            }

            res.clearCookie('sessionId'); // Clear the session cookie
            logger.info(`✅ Session destroyed successfully: ${sessionId}`);

            // Best-effort: log admin logout activity to Redis
            try {
                const activity = {
                    id: `admin-logout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'user',
                    title: 'Admin logout',
                    description: `Admin ${usernameForLog} logged out`,
                    timestamp: new Date().toLocaleString('id-ID'),
                    status: 'info',
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    username: usernameForLog
                };
                const client = getRedisClient();
                const key = 'admin:activities';
                client.lPush(key, JSON.stringify(activity)).catch(err => {
                    logger.warn('Failed to store admin logout activity in Redis:', err.message);
                });
                client.lTrim(key, 0, 99).catch(err => {
                    logger.warn('Failed to trim admin activities in Redis:', err.message);
                });
            } catch (e) {
                logger.warn('Redis not available for logout activity logging:', e.message);
            }
            next();
        });
    }
};

/**
 * CSRF Protection Configuration
 * Environment-aware CSRF settings
 */
const csrfConfig = {
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Skip CSRF for these methods
    value: (req) => {
        // Check multiple places for CSRF token
        return req.body._csrf || 
               req.query._csrf || 
               req.headers['csrf-token'] ||
               req.headers['x-csrf-token'];
    }
};

/**
 * Create CSRF protection middleware
 */
const createCSRFProtection = () => {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    const baseConfig = {
        ...csrfConfig,
        cookie: {
            ...csrfConfig.cookie,
            secure: isDevelopment ? false : csrfConfig.cookie.secure,
            sameSite: isDevelopment ? 'lax' : csrfConfig.cookie.sameSite
        }
    };
    
    if (isDevelopment) {
        logger.info('🔧 CSRF Protection: Development mode (HTTP allowed)');
    } else {
        logger.info('🔒 CSRF Protection: Production mode (HTTPS required)');
    }
    
    return csrf(baseConfig);
};

/**
 * Security Headers Configuration
 * Environment-aware helmet settings
 */
const securityHeaders = () => {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const serverIP = process.env.SERVER_IP || process.env.SERVER_HOST || 'localhost';
    
    const helmetConfig = {
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                scriptSrc: isDevelopment 
                    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Allow dev tools
                    : ["'self'"],
                imgSrc: ["'self'", "data:", "https:", "blob:"],
                connectSrc: isDevelopment
                    ? ["'self'", `http://localhost:3003`, `http://${serverIP}:3003`, "ws:", "wss:"]
                    : ["'self'", "https:", "wss:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'none'"],
                frameSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
            }
        },
        
        // HTTP Strict Transport Security (HTTPS only in production)
        hsts: process.env.NODE_ENV === 'production' ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        } : false,
        
        // X-Frame-Options
        frameguard: { action: 'deny' },
        
        // X-Content-Type-Options
        noSniff: true,
        
        // X-XSS-Protection
        xssFilter: true,
        
        // Referrer Policy
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        
        // Hide X-Powered-By header
        hidePoweredBy: true,
        
        // DNS Prefetch Control
        dnsPrefetchControl: { allow: false },
        
        // Expect-CT (Certificate Transparency)
        expectCt: process.env.NODE_ENV === 'production' ? {
            maxAge: 86400, // 24 hours
            reportUri: '/api/security/ct-report' // Optional: CT violation report endpoint
        } : false
    };

    if (isDevelopment) {
        logger.info('🔧 Security Headers: Development mode (lenient CSP)');
    } else {
        logger.info('🔒 Security Headers: Production mode (strict)');
    }

    return helmet(helmetConfig);
};

/**
 * Input Validation Schemas
 */
const validationSchemas = {
    // Phone validation (international format)
    phone: body('phone')
        .matches(/^(\+62|62|0)[0-9]{8,12}$/)
        .withMessage('Invalid phone number format')
        .customSanitizer(value => {
            // Normalize to +62 format
            let phone = value.replace(/\D/g, '');
            if (phone.startsWith('0')) {
                phone = '62' + phone.slice(1);
            } else if (phone.startsWith('62') && !phone.startsWith('+62')) {
                phone = '+' + phone;
            } else if (!phone.startsWith('+62')) {
                phone = '+62' + phone;
            }
            return phone;
        }),
    
    // OTP validation
    otp: body('otp')
        .isLength({ min: 4, max: 6 })
        .withMessage('OTP must be 4-6 digits')
        .isNumeric()
        .withMessage('OTP must contain only numbers')
        .customSanitizer(value => value.replace(/\D/g, '')),
    
    // Username validation
    username: body('username')
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be 3-50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .trim()
        .escape(),
    
    // Password validation (for admin login) - Enhanced security
    password: body('password')
        .isLength({ min: 12 })
        .withMessage('Password must be at least 12 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
        .not().matches(/^.*(123|abc|password|admin|qwerty).*$/i)
        .withMessage('Password contains common patterns that are easily guessed'),

    // Admin password validator (relaxed) - used for admin login endpoint
    adminPassword: body('password')
        .custom((value, { req }) => {
            // Allow empty check to be handled elsewhere; here accept any string
            if (typeof value !== 'string' || value.length === 0) {
                throw new Error('Password is required');
            }
            // If environment-managed ADMIN_PASSWORD exists, accept shorter/plain passwords
            // This validator simply ensures the field exists and is a string
            return true;
        })
        .withMessage('Password is required'),
    
    // General text sanitization
    text: (field, options = {}) => 
        body(field)
            .isLength({ min: options.min || 1, max: options.max || 500 })
            .withMessage(`${field} length must be between ${options.min || 1}-${options.max || 500} characters`)
            .trim()
            .escape()
};

/**
 * Validation error handler
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        logger.warn('❌ Input validation failed:', {
            path: req.path,
            method: req.method,
            errors: errors.array(),
            ip: req.ip
        });
        
        return res.status(400).json({
            success: false,
            message: 'Input validation failed',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg,
                value: err.value
            }))
        });
    }
    
    next();
};

/**
 * Rate limiting bypass for development
 */
const developmentRateLimitBypass = (req, res, next) => {
    if (process.env.NODE_ENV !== 'production' && req.query.bypassRateLimit === 'dev') {
        logger.debug('🔧 Rate limiting bypassed for development');
        req.rateLimitBypassed = true;
    }
    next();
};

/**
 * Security logging middleware
 */
const securityLogger = (req, res, next) => {
    // Log suspicious activities
    const suspiciousPatterns = [
        /\.\.\//, // Path traversal
        /<script/i, // XSS attempts
        /union.*select/i, // SQL injection
        /javascript:/i, // JavaScript protocol
        /vbscript:/i // VBScript protocol
    ];
    
    const userInput = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params
    });
    
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userInput));
    
    if (isSuspicious) {
        logger.warn('🚨 Suspicious request detected:', {
            ip: req.ip,
            method: req.method,
            path: req.path,
            userAgent: req.get('User-Agent'),
            input: userInput
        });
        
        // In production, you might want to block these requests
        if (process.env.NODE_ENV === 'production') {
            return res.status(400).json({
                success: false,
                message: 'Request blocked due to security policy'
            });
        }
    }
    
    next();
};

module.exports = {
    sessionRegeneration,
    csrfProtection: createCSRFProtection(),
    securityHeaders: securityHeaders(),
    validationSchemas,
    handleValidationErrors,
    developmentRateLimitBypass,
    securityLogger
};
