/**
 * Environment Variable Validator
 * Validates required environment variables on startup
 */

const { logger } = require('./logger');

/**
 * Required environment variables for different modes
 */
const requiredVars = {
    development: [
        'SERVER_PORT',
        'SERVER_HOST', 
        'SESSION_SECRET',
        'ADMIN_USERNAME',
        'ADMIN_PASSWORD'
    ],
    production: [
        'NODE_ENV',
        'SERVER_PORT',
        'SERVER_HOST',
        'SERVER_IP',
        'SESSION_SECRET',
        'ADMIN_USERNAME', 
        'ADMIN_PASSWORD',
        'GENIEACS_URL',
        'GENIEACS_USERNAME',
        'GENIEACS_PASSWORD',
        'MIKROTIK_HOST',
        'MIKROTIK_USER',
        'MIKROTIK_PASSWORD'
    ]
};

/**
 * Optional but recommended variables
 */
const recommendedVars = [
    'REDIS_HOST',
    'REDIS_PORT', 
    'WHATSAPP_ADMINS',
    'TECHNICIAN_NUMBERS',
    'COMPANY_HEADER'
];

/**
 * Validate environment variables
 */
function validateEnvironment() {
    const env = process.env.NODE_ENV || 'development';
    const required = requiredVars[env] || requiredVars.development;
    
    logger.info(`🔍 Validating environment variables for ${env} mode...`);
    
    const missing = [];
    const missingRecommended = [];
    
    // Check required variables
    required.forEach(varName => {
        if (!process.env[varName] || process.env[varName].trim() === '') {
            missing.push(varName);
        }
    });
    
    // Check recommended variables
    recommendedVars.forEach(varName => {
        if (!process.env[varName] || process.env[varName].trim() === '') {
            missingRecommended.push(varName);
        }
    });
    
    // Report results
    if (missing.length > 0) {
        logger.error('❌ Missing required environment variables:', missing);
        logger.error('💡 Please check your .env file and ensure these variables are set');
        process.exit(1);
    }
    
    if (missingRecommended.length > 0 && env === 'production') {
        logger.warn('⚠️ Missing recommended environment variables:', missingRecommended);
        logger.warn('💡 These are not critical but recommended for full functionality');
    }
    
    // Validate specific values
    validateSpecificValues();
    
    logger.info('✅ Environment validation passed');
}

/**
 * Validate specific environment variable values
 */
function validateSpecificValues() {
    // Validate ports
    const port = parseInt(process.env.SERVER_PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
        logger.error('❌ SERVER_PORT must be a valid port number (1-65535)');
        process.exit(1);
    }
    
    // Validate SESSION_SECRET strength
    const sessionSecret = process.env.SESSION_SECRET;
    if (sessionSecret && sessionSecret.length < 32) {
        logger.warn('⚠️ SESSION_SECRET should be at least 32 characters long for security');
    }
    
    // Validate production specific settings
    if (process.env.NODE_ENV === 'production') {
        if (!process.env.SERVER_IP || process.env.SERVER_IP === 'localhost') {
            logger.warn('⚠️ SERVER_IP should be set to actual IP address in production');
        }
        
        if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.includes('change-this')) {
            logger.error('❌ Please change default SESSION_SECRET in production');
            process.exit(1);
        }
        
        if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD === 'admin') {
            logger.error('❌ Please change default ADMIN_PASSWORD in production');
            process.exit(1);
        }
    }
    
    logger.info('✅ Environment values validation passed');
}

/**
 * Get environment info for logging
 */
function getEnvironmentInfo() {
    return {
        mode: process.env.NODE_ENV || 'development',
        port: process.env.SERVER_PORT,
        host: process.env.SERVER_HOST,
        serverIP: process.env.SERVER_IP,
        redisEnabled: !!(process.env.REDIS_HOST && process.env.REDIS_PORT),
        whatsappEnabled: !!(process.env.WHATSAPP_ADMINS),
        httpsForced: process.env.FORCE_HTTPS === 'true'
    };
}

module.exports = {
    validateEnvironment,
    getEnvironmentInfo
};
