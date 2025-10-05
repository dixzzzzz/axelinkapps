// Load environment variables
require('dotenv').config();

// Validate environment variables early
const { validateEnvironment, getEnvironmentInfo } = require('./config/env-validator');
validateEnvironment();

// Log environment info
const envInfo = getEnvironmentInfo();
console.log('🌐 Environment Info:', envInfo);

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { logger } = require('./config/logger');
const whatsapp = require('./config/whatsapp');
const { monitorPPPoEConnections } = require('./config/mikrotik');
const { getSetting } = require('./config/settingsManager');
const EventEmitter = require('events');
const fs = require('fs');

// Inisialisasi aplikasi Express
const app = express();

// Trust reverse proxy so req.secure reflects X-Forwarded-Proto (needed for secure cookies behind HTTPS)
app.set('trust proxy', 1);

// 🔊 Setup global event system untuk settings broadcast
global.appEvents = new EventEmitter();
global.appEvents.setMaxListeners(20);

// Event listener untuk settings update
global.appEvents.on('settings:updated', (newSettings) => {
    logger.info(`📡 Settings update event received: ${Object.keys(newSettings).length} fields`);
});

// Environment variables are now loaded via dotenv at startup
logger.info('✅ Configuration loaded from environment variables');

// 🔧 CORS Configuration
// Dynamic CORS origins based on SERVER_IP environment variable
const serverIP = process.env.SERVER_IP || 'localhost';
const allowedOrigins = [
    'http://localhost:2345',        // Customer portal (local)
    'http://localhost:5432',        // Admin portal (localhost only)
    'http://localhost:4173/u/',     // Admin portal
    'http://localhost:4174/x/',     // Combined portal
    'http://localhost:5173',        // Combined portal (legacy)
    'http://localhost:3003',        // Backend (local)
];

// Add dynamic server IP origins if not localhost
if (serverIP !== 'localhost' && serverIP !== '127.0.0.1') {
    allowedOrigins.push(
        `http://${serverIP}:5432`,      // Admin portal (network IP)
        `http://${serverIP}:2345`,      // Customer portal (network IP) 
        `http://${serverIP}:4173/u/`,      // Admin portal
        `http://${serverIP}:4174/x/`,      // Combined portal
        `http://${serverIP}:3003`       // Backend (network IP)
    );
    
    // Add network pattern for common private networks
    const ipParts = serverIP.split('.');
    if (ipParts.length === 4) {
        const networkBase = `${ipParts[0]}\\.${ipParts[1]}\\.${ipParts[2]}`;
        allowedOrigins.push(new RegExp(`^http://${networkBase}\\.[0-9]+:[0-9]+$`));
    }
}

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'x-csrf-token',  // ← Tambah ini
        'csrf-token'     // ← Dan ini
    ]
}));

// Middleware dasar (URUTAN PENTING!)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== COOKIE PARSER (WAJIB UNTUK CSRF!) =====
app.use(cookieParser(process.env.SESSION_SECRET || 'isp-management-secret-change-this'));

// ===== SESSION CONFIGURATION =====
const session = require('express-session');

// Setup session store - Try Redis first, fallback to memory
let sessionStore;
let sessionStoreType = 'memory';

(async function setupSessionStore() {
    try {
        // Try to load Redis dependencies
        const RedisStore = require('connect-redis').default;
        const redis = require('redis');
        
        logger.info('🔄 Redis modules loaded, creating client...');
        
        // Create Redis client (v4 compatibility)
        const redisClient = redis.createClient({
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379
            },
            password: process.env.REDIS_PASSWORD || undefined,
            database: parseInt(process.env.REDIS_DB) || 0
        });
        
        // Redis event handlers
        redisClient.on('error', (err) => {
            logger.warn('⚠️ Redis error (fallback to memory):', err.message);
            sessionStoreType = 'memory (Redis error)';
        });
        
        redisClient.on('connect', () => {
            logger.info('✅ Redis connected successfully for sessions');
            sessionStoreType = 'Redis';
        });
        
        redisClient.on('ready', () => {
            logger.info('🔄 Redis session store ready');
        });
        
        // Connect to Redis (v4 requires explicit connect)
        await redisClient.connect();
        
        // Use Redis store
        sessionStore = new RedisStore({ client: redisClient });
        sessionStoreType = 'Redis';
        
        logger.info('✅ Redis session store configured successfully!');
        
    } catch (error) {
        logger.warn('⚠️ Redis setup failed:', error.message);
        logger.info('💡 Using memory session store as fallback');
        sessionStore = undefined; // Will use default memory store
        sessionStoreType = 'memory (Redis unavailable)';
    }
    
    logger.info(`📦 Session store: ${sessionStoreType}`);
})();

// Session middleware configuration
app.use(session({
    store: sessionStore, // Redis store or default memory store
    secret: process.env.SESSION_SECRET || 'isp-management-secret-change-this',
    name: 'sessionId', // Change from default 'connect.sid'
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production' || process.env.FORCE_HTTPS === 'true', // HTTPS in production or forced
        httpOnly: true, // Prevent XSS
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Allow cross-site for HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    rolling: true // Extend session on activity
}));

// ===== SECURITY MIDDLEWARE (SETELAH SESSION!) =====
const security = require('./middleware/security');

// Apply security headers
app.use(security.securityHeaders);

// Apply security logging  
app.use(security.securityLogger);

// Apply rate limit bypass for development
app.use(security.developmentRateLimitBypass);

// Remove X-Powered-By header manually (fallback)
app.disable('x-powered-by');

// Initialize CSRF protection middleware
const csrf = require('csurf');
const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
    value: (req) => {
        return req.body._csrf || 
               req.query._csrf || 
               req.headers['csrf-token'] ||
               req.headers['x-csrf-token'];
    }
});

// Apply CSRF protection to API routes (with exemptions)
// CSRF exemption configuration - Grouped by purpose for better security management
const csrfExemptPatterns = {
    // Public endpoints that don't require CSRF protection
    publicEndpoints: [
        '/api/health',
        '/api/csrf-token'
    ],
    
    // Authentication related endpoints
    authEndpoints: [
        '/api/admin/verify',
        '/api/admin/logout',
        '/api/customer/otp/send',
        '/api/customer/otp/verify',
        '/api/customer/logout'
    ],
    
    // Read-only endpoints that don't modify data
    readOnlyEndpoints: [
        '/api/debug/session',
        '/api/whatsapp/status',
        '/api/admin/map/data',
        '/api/customer/dashboard',
        '/api/customer/map/data',
        '/api/customer/trouble/reports',
        '/api/admin/genieacs/devices',
        '/api/admin/genieacs/locations',
        '/api/admin/infrastructure/odp',
        '/api/admin/infrastructure/odc',
        '/api/admin/settings/data',
        '/api/admin/settings/whatsapp-status'
    ],
    
    // Endpoints that require special handling
    specialCases: [
        '/api/customer/trouble/report',
        '/api/customer/restart-device',
        '/api/customer/change-ssid-2g',
        '/api/customer/change-ssid-5g',
        '/api/customer/change-password-2g',
        '/api/customer/change-password-5g',
        '/api/admin/genieacs/edit',
        '/api/admin/genieacs/locations/add',
        '/api/admin/genieacs/locations/{deviceId}',
        '/api/admin/infrastructure/odp/:id',
        '/api/admin/infrastructure/odc/:id',
        '/api/admin/settings/save',
        '/api/admin/settings/whatsapp-refresh',
        '/api/admin/settings/whatsapp-delete'
    ]
};

// Flatten the patterns for use in middleware
const csrfExemptRoutes = Object.values(csrfExemptPatterns).flat();

app.use((req, res, next) => {
    // Skip CSRF for exempt routes (support exact and prefix matches)
    const isCsrfExempt = csrfExemptRoutes.some(route => {
        return req.path === route || req.path.startsWith(route + '/');
    });
    if (isCsrfExempt) {
        return next();
    }

    // Skip CSRF for GET requests
    if (req.method === 'GET') {
        return next();
    }

    // Apply CSRF protection
    csrfProtection(req, res, next);
});

// Session debugging middleware (development only)
if (process.env.NODE_ENV !== 'production') {
    app.use('/api/customer', (req, res, next) => {
        if (req.path.includes('debug') || req.path.includes('dashboard')) {
            console.log(`🔍 Session Debug [${req.method} ${req.path}]:`, {
                sessionID: req.sessionID,
                sessionPhone: req.session?.phone,
                hasCookie: !!req.headers.cookie,
                userAgent: req.headers['user-agent']?.substring(0, 50)
            });
        }
        next();
    });
    
    // Admin session debugging
    app.use('/api/admin', (req, res, next) => {
        console.log(`🔍 Admin Session Debug [${req.method} ${req.path}]:`, {
            sessionID: req.sessionID,
            isAdmin: req.session?.isAdmin,
            adminUser: req.session?.adminUser,
            hasCookie: !!req.headers.cookie,
            origin: req.headers.origin,
            userAgent: req.headers['user-agent']?.substring(0, 50)
        });
        next();
    });
}

// 🚀 SERVE REACT BUILD AS STATIC FILES (Production Mode)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
}

// ===== CSRF TOKEN ENDPOINT (SPECIAL HANDLING) =====
// This endpoint needs special handling to generate tokens without requiring one
app.get('/api/csrf-token', (req, res) => {
    try {
        // Temporarily apply CSRF middleware to generate token
        csrfProtection(req, res, () => {
            const token = req.csrfToken();
            console.log('🔑 CSRF Token generated successfully:', token ? 'YES' : 'NO');
            res.json({ 
                csrfToken: token 
            });
        });
    } catch (error) {
        console.error('❌ CSRF token generation error:', error);
        // In development, provide fallback token
        if (process.env.NODE_ENV !== 'production') {
            res.json({ 
                csrfToken: 'development-fallback-token' 
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'CSRF token generation failed',
                error: error.message
            });
        }
    }
});

// 🎯 API ROUTES
const apiAdminRouter = require('./routes/apiAdmin');
const apiCustomerRouter = require('./routes/apiCustomer');
const apiDashboardRouter = require('./routes/apiDashboard');
const adminSettingRouter = require('./routes/adminSetting');
const adminGenieacsRouter = require('./routes/adminGenieacs');

app.use('/api/admin', apiAdminRouter);
app.use('/api/admin', adminGenieacsRouter);
app.use('/admin', adminGenieacsRouter);
app.use('/api/customer', apiCustomerRouter);
app.use('/api/dashboard', apiDashboardRouter);
app.use('/admin/setting', adminSettingRouter);

// Debug endpoint to check cookies and session
app.get('/api/debug/session', (req, res) => {
    res.json({
        sessionID: req.sessionID,
        session: req.session,
        cookies: req.headers.cookie,
        headers: {
            origin: req.headers.origin,
            referer: req.headers.referer,
            'user-agent': req.headers['user-agent']?.substring(0, 50)
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        mode: 'api-server',
        environment: process.env.NODE_ENV || 'development',
        port: getSetting('server_port', '3003'),
        cors: 'enabled'
    });
});

// WhatsApp status endpoint
app.get('/api/whatsapp/status', (req, res) => {
    const waStatus = whatsapp.getWhatsAppStatus();
    res.json({
        status: waStatus,
        connected: waStatus === 'connected',
        global_status: global.whatsappStatus ? global.whatsappStatus.status : 'unknown',
        sock_exists: !!global.whatsappSock
    });
});

// WhatsApp test OTP endpoint
app.post('/api/whatsapp/test-otp', async (req, res) => {
    try {
        const { phoneNumber, otpCode, purpose } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }
        
        const testOTP = otpCode || Math.floor(100000 + Math.random() * 900000).toString();
        const testPurpose = purpose || 'testing dari API';
        
        console.log(`Testing OTP send to ${phoneNumber} with code ${testOTP}`);
        
        const result = await whatsapp.sendOTP(phoneNumber, testOTP, testPurpose);
        
        res.json({
            success: result,
            message: result ? 'OTP sent successfully' : 'Failed to send OTP',
            phoneNumber: phoneNumber,
            otpCode: testOTP,
            whatsappStatus: whatsapp.getWhatsAppStatus()
        });
        
    } catch (error) {
        console.error('Error testing OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// WhatsApp test message endpoint
app.post('/api/whatsapp/test-message', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;
        
        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and message are required'
            });
        }
        
        console.log(`Testing message send to ${phoneNumber}`);
        
        const result = await whatsapp.sendMessage(phoneNumber, message);
        
        res.json({
            success: result,
            message: result ? 'Message sent successfully' : 'Failed to send message',
            phoneNumber: phoneNumber,
            whatsappStatus: whatsapp.getWhatsAppStatus()
        });
        
    } catch (error) {
        console.error('Error testing message:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Map settings endpoint (moved to API namespace)
app.get('/api/map-settings', (req, res) => {
    try {
        const mapSettings = {
            googleMapsApiKey: getSetting('google_maps_api_key', ''),
            defaultCenter: { lat: -6.2088, lng: 106.8456 },
            defaultZoom: 15,
            jakartaCenter: { lat: -6.2088, lng: 106.8456 }
        };
        res.json({ success: true, settings: mapSettings });
    } catch (error) {
        logger.error('Error getting map settings:', error);
        res.status(500).json({ success: false, message: 'Gagal mendapatkan settings peta' });
    }
});

// 🎯 REACT ROUTER FALLBACK (Production Mode Only)
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        // Don't serve React for API routes
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        // Serve React app for all other routes
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
}

// Development mode - API only
if (process.env.NODE_ENV !== 'production') {
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        res.json({
            message: 'API Server Running in Development Mode',
            frontend: 'Frontend running on http://localhost:2345',
            api_base: `http://localhost:${getSetting('server_port', 3003)}/api`,
            available_endpoints: [
                '/api/health',
                '/api/admin/*',
                '/api/customer/*',
                '/api/dashboard/*',
                '/api/tools/*',
                '/api/whatsapp/status',
                '/api/map-settings'
            ]
        });
    });
}

// Error handling middleware
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path
    });
});

// Initialize global variables
global.whatsappStatus = {
    connected: false,
    qrCode: null,
    phoneNumber: null,
    connectedSince: null,
    status: 'disconnected'
};

global.appSettings = {
    port: getSetting('server_port', 3003),
    host: getSetting('server_host', 'localhost'),
    adminUsername: getSetting('admin_username', 'admin'),
    adminPassword: getSetting('admin_password', 'admin'),
    genieacsUrl: getSetting('genieacs_url', 'http://172.10.0.3:7557'),
    genieacsUsername: getSetting('genieacs_username', 'axelink'),
    genieacsPassword: getSetting('genieacs_password', 'axelink@247'),
    mikrotikHost: getSetting('mikrotik_host', '172.10.0.1'),
    mikrotikPort: getSetting('mikrotik_port', '8728'),
    mikrotikUser: getSetting('mikrotik_user', 'axelink'),
    mikrotikPassword: getSetting('mikrotik_password', 'LetmeKnow@247'),
    companyHeader: getSetting('company_header', 'AxeLink'),
    footerInfo: getSetting('footer_info', 'Powered by AxeLink'),
};

// Initialize services
(async function initializeServices() {
    try {
        // Initialize WhatsApp
        const sock = await whatsapp.connectToWhatsApp();
        if (sock) {
            whatsapp.setSock(sock);
            // Store sock instance globally for OTP service
            global.whatsappSock = sock;
            logger.info('✅ WhatsApp connected successfully');
        }
        
        // Initialize monitoring
        monitorPPPoEConnections();
        
        // Start server
        const port = global.appSettings.port;
        const host = global.appSettings.host;
        
        app.listen(port, () => {
            logger.info(`🚀 API Server running on http://${host}:${port}`);
            logger.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🔗 Health check: http://${host}:${port}/api/health`);
            
            if (process.env.NODE_ENV !== 'production') {
            }
        });
        
    } catch (error) {
        logger.error('❌ Failed to initialize services:', error);
        process.exit(1);
    }
})();

module.exports = app;
