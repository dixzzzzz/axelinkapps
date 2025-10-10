const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const security = require('../middleware/security');
const { getSetting } = require('../config/settingsManager');
const { getRateLimitStats, resetRateLimit, clearSuspiciousIP, RATE_LIMIT_CONFIG } = require('../middleware/rateLimiter');
const { getDevices, setParameterValues, reboot } = require('../config/genieacs');
const { getActivePPPoEConnections, getInactivePPPoEUsers } = require('../config/mikrotik');
const { 
  getAllTroubleReports, 
  getTroubleReportById, 
  updateTroubleReportStatus 
} = require('../config/troubleReport');
const axios = require('axios');

// Apply security middleware
router.use(security.securityLogger);

// Admin login with security
router.post('/login', [
    security.validationSchemas.username,
    security.validationSchemas.adminPassword,
    security.handleValidationErrors
], (req, res) => {
    const { username, password } = req.body;
    
    // Your existing login validation logic here
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const userData = { username, loginTime: new Date() };
        
        // Use session regeneration middleware
        security.sessionRegeneration.afterLogin(req, res, () => {
            res.json({
                success: true,
                message: 'Login successful',
                user: { username },
                csrfToken: req.csrfToken() // Send new CSRF token
            });
        }, userData, 'admin');
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }
});

// Admin logout with security
router.post('/logout', (req, res) => {
    security.sessionRegeneration.onLogout(req, res, () => {
        res.json({
            success: true,
            message: 'Logout successful'
        });
    });
});

// API: Admin Verify (untuk memvalidasi session admin)
router.get('/verify', async (req, res) => {
    try {
        // Periksa session admin
        if (!req.session || !req.session.isAdmin || !req.session.adminUser) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        // Jika ada token Bearer header, periksa juga (optional)
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
            // Bisa ditambah validasi token JWT jika diperlukan di masa depan
            console.log('🔍 Admin verify with token:', token.slice(0, 10) + '...');
        }
        
        // Return user info jika terautentikasi
        res.json({
            success: true,
            user: {
                username: req.session.adminUser,
                role: 'admin',
                loginTime: new Date().toISOString(),
                sessionId: req.sessionID
            }
        });
        
    } catch (error) {
        console.error('Admin verify error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// API: Get Recent Admin Activities
router.get('/activities', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }

    try {
        const redis = require('redis');
        const client = redis.createClient({
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379
            },
            password: process.env.REDIS_PASSWORD || undefined,
            database: parseInt(process.env.REDIS_DB) || 0
        });

        await client.connect();

        const key = 'admin:activities';
        const activitiesRaw = await client.lRange(key, 0, 99);
        await client.disconnect();

        // Parse JSON and reverse to show newest first (lPush adds to head, so reverse)
        const activities = activitiesRaw
            .map(raw => {
                try {
                    return JSON.parse(raw);
                } catch (err) {
                    console.warn('Failed to parse activity JSON:', raw);
                    return null;
                }
            })
            .filter(activity => activity !== null)
            .reverse();

        res.json({
            success: true,
            activities: activities,
            count: activities.length,
            message: `Loaded ${activities.length} recent admin activities`
        });

    } catch (error) {
        console.error('Error fetching admin activities:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin activities',
            activities: [],
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Shared cache for GenieACS devices (60 seconds cache)
let genieacsDevicesCache = {
    data: null,
    timestamp: 0,
    ttl: 60 * 1000 // 60 seconds - longer cache for expensive GenieACS calls
};

// Cache for dashboard data (30 seconds cache)
let dashboardCache = {
    data: null,
    timestamp: 0,
    ttl: 30 * 1000 // 30 seconds
};

// Settings management configuration
const settingsPath = path.join(__dirname, '../settings.json');

// Cache for settings data
let cachedSettings = null;
let settingsCacheTime = null;
const SETTINGS_CACHE_DURATION = 30000; // 30 seconds

// Multer configuration for logo uploads - write directly to frontend/public/assets
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        try {
            const assetsDir = path.join(__dirname, '..', '..', 'frontend', 'public', 'assets');
            if (!fs.existsSync(assetsDir)) {
                fs.mkdirSync(assetsDir, { recursive: true });
            }
            cb(null, assetsDir);
        } catch (e) {
            cb(e);
        }
    },
    filename: function (req, file, cb) {
        // Always overwrite logo.png (stable import path)
        cb(null, 'logo.png');
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/') || file.originalname.toLowerCase().endsWith('.svg')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Default settings
const defaultSettings = {
    admin_username: 'admin',
    admin_password: 'admin',
    genieacs_url: 'http://localhost:7557',
    genieacs_username: 'admin',
    genieacs_password: 'password',
    mikrotik_host: '192.168.1.1',
    mikrotik_port: '8728',
    mikrotik_user: 'admin',
    mikrotik_password: 'password',
    main_interface: 'ether1',
    company_header: 'ISP Monitor',
    footer_info: 'Powered by Gembok',
    server_port: '3001',
    server_host: 'localhost',
    customerPortalOtp: 'false',
    otp_length: '6',
    pppoe_monitor_enable: 'true',
    rx_power_warning: '-27',
    rx_power_critical: '-30',
    whatsapp_keep_alive: 'true'
};

// Helper function to get cached GenieACS devices
async function getCachedGenieACSDevices() {
    const now = Date.now();
    
    // Check if cache is still valid
    if (genieacsDevicesCache.data && (now - genieacsDevicesCache.timestamp) < genieacsDevicesCache.ttl) {
        return genieacsDevicesCache.data;
    }
    
    // Fetch fresh data from GenieACS
    console.log('🔄 Fetching fresh GenieACS devices data...');
    const devices = await getDevices();
    
    // Cache the result
    genieacsDevicesCache.data = devices;
    genieacsDevicesCache.timestamp = now;
    
    return devices;
}

// Helper function to invalidate GenieACS cache (call after device edits)
function invalidateGenieACSCache() {
    genieacsDevicesCache.data = null;
    genieacsDevicesCache.timestamp = 0;
    console.log('🗑️ GenieACS devices cache invalidated');
}

// API: Admin Dashboard Analytics Data
router.get('/dashboard', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }
    
    // Check cache first
    const now = Date.now();
    if (dashboardCache.data && (now - dashboardCache.timestamp) < dashboardCache.ttl) {
        return res.json(dashboardCache.data);
    }
    
    try {
        // Initialize counters
        let genieacsTotal = 0, genieacsOnline = 0, genieacsOffline = 0, genieacsWithLocation = 0;
        let mikrotikTotal = 0, mikrotikActive = 0, mikrotikInactive = 0;
        
        // Get GenieACS device statistics using shared cache
        try {
            const devices = await getCachedGenieACSDevices();
            genieacsTotal = devices.length;
            
            // Calculate online/offline status (device is online if _lastInform within 30 minutes)
            // Consistent with GenieACSManagement detection
            const currentTime = Date.now();
            const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
            
            for (const device of devices) {
                const lastInform = device._lastInform ? new Date(device._lastInform).getTime() : 0;
                const timeDiff = currentTime - lastInform;
                
                if (device._lastInform && timeDiff < thirtyMinutes) {
                    genieacsOnline++;
                } else {
                    genieacsOffline++;
                }
                
                // Check if device has location data
                let hasLocation = false;
                
                // Check VirtualParameters.location
                if (device.VirtualParameters?.location?._value) {
                    try {
                        JSON.parse(device.VirtualParameters.location._value);
                        hasLocation = true;
                    } catch (e) {}
                }
                
                // Check tags for location
                if (!hasLocation && device._tags && Array.isArray(device._tags)) {
                    const locationTag = device._tags.find(tag => tag.startsWith('location:'));
                    if (locationTag) {
                        try {
                            JSON.parse(locationTag.replace('location:', ''));
                            hasLocation = true;
                        } catch (e) {}
                    }
                }
                
                if (hasLocation) {
                    genieacsWithLocation++;
                }
            }
        } catch (error) {
            console.warn('Error fetching GenieACS devices:', error.message);
        }
        
        // Get Mikrotik PPPoE statistics
        try {
            const activeResult = await getActivePPPoEConnections();
            mikrotikActive = activeResult.success ? activeResult.data.length : 0;
            
            const inactiveResult = await getInactivePPPoEUsers();
            mikrotikInactive = inactiveResult.success ? inactiveResult.totalInactive : 0;
            mikrotikTotal = inactiveResult.success ? inactiveResult.totalSecrets : 0;
        } catch (error) {
            console.warn('Error fetching Mikrotik statistics:', error.message);
        }
        
        // Prepare dashboard response
        const dashboardResponse = {
            success: true,
            stats: {
                genieacs: {
                    total: genieacsTotal,
                    online: genieacsOnline,
                    offline: genieacsOffline,
                    withLocation: genieacsWithLocation,
                    uptime: genieacsTotal > 0 ? Math.round((genieacsOnline / genieacsTotal) * 100) : 0
                },
                mikrotik: {
                    total: mikrotikTotal,
                    active: mikrotikActive,
                    inactive: mikrotikInactive,
                    utilization: mikrotikTotal > 0 ? Math.round((mikrotikActive / mikrotikTotal) * 100) : 0
                }
            },
            meta: {
                username: req.session.adminUser,
                role: 'admin',
                timestamp: new Date().toISOString(),
                settings: {
                    companyHeader: getSetting('company_header', 'AxeLink'),
                    serverPort: getSetting('server_port', '3003'),
                    genieacsUrl: getSetting('genieacs_url', 'http://172.10.0.3:7557')
                }
            }
        };
        
        // Cache the response
        dashboardCache.data = dashboardResponse;
        dashboardCache.timestamp = now;
        
        // Return comprehensive dashboard data
        res.json(dashboardResponse);
        
    } catch (error) {
        console.error('Error loading dashboard analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard analytics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Rate Limiting Statistics (Admin only)
router.get('/rate-limit/stats', (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const stats = getRateLimitStats();
        res.json({
            success: true,
            data: {
                ...stats,
                config: RATE_LIMIT_CONFIG,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error getting rate limit stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve rate limiting statistics'
        });
    }
});

// API: Reset Rate Limit for specific key (Admin only)
router.post('/rate-limit/reset', (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const { key } = req.body;
        
        if (!key) {
            return res.status(400).json({
                success: false,
                message: 'Rate limit key is required'
            });
        }
        
        resetRateLimit(key);
        
        res.json({
            success: true,
            message: `Rate limit reset for key: ${key}`
        });
    } catch (error) {
        console.error('Error resetting rate limit:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset rate limit'
        });
    }
});

// API: Clear Suspicious IP (Admin only)
router.post('/rate-limit/clear-suspicious', (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const { ip } = req.body;
        
        if (!ip) {
            return res.status(400).json({
                success: false,
                message: 'IP address is required'
            });
        }
        
        clearSuspiciousIP(ip);
        
        res.json({
            success: true,
            message: `Suspicious status cleared for IP: ${ip}`
        });
    } catch (error) {
        console.error('Error clearing suspicious IP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear suspicious IP'
        });
    }
});

// API: GenieACS Device List
router.get('/genieacs/devices', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        // Get devices from GenieACS using shared cache
        const devicesRaw = await getCachedGenieACSDevices();
        
        // Helper function to get parameter with multiple possible paths
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
            return '-';
        }
        
        // Helper to count connected users
        function getConnectedUsers(device) {
            let totalUsers = 0;
            const deviceId = device._id || device.DeviceID?.SerialNumber || 'Unknown';
            
            // Method 1: Check LANDevice.Hosts.Host structure
            if (device.InternetGatewayDevice?.LANDevice) {
                for (const lanDeviceKey in device.InternetGatewayDevice.LANDevice) {
                    const lanDevice = device.InternetGatewayDevice.LANDevice[lanDeviceKey];
                    if (lanDevice?.Hosts?.Host) {
                        for (const hostKey in lanDevice.Hosts.Host) {
                            const host = lanDevice.Hosts.Host[hostKey];
                            if (host?.HostName?._value || host?.IPAddress?._value || host?.MACAddress?._value) {
                                totalUsers++;
                            }
                        }
                    }
                }
            }
            
            // Method 2: Check direct Hosts.Host structure
            if (device.InternetGatewayDevice?.Hosts?.Host) {
                for (const hostKey in device.InternetGatewayDevice.Hosts.Host) {
                    const host = device.InternetGatewayDevice.Hosts.Host[hostKey];
                    if (host?.HostName?._value || host?.IPAddress?._value || host?.MACAddress?._value) {
                        totalUsers++;
                    }
                }
            }
            
            // Method 3: Check TotalAssociations as fallback
            if (totalUsers === 0) {
                for (let i = 1; i <= 8; i++) {
                    const associations = device.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.[i]?.TotalAssociations?._value;
                    if (associations && !isNaN(associations)) {
                        totalUsers += parseInt(associations);
                    }
                }
            }
            
            return totalUsers > 0 ? totalUsers.toString() : '-';
        }
        
        // Map devices to frontend format
        const devices = devicesRaw.map((device) => {
            const now = Date.now();
            const lastInformTime = device._lastInform ? new Date(device._lastInform).getTime() : 0;
            const timeDiff = now - lastInformTime;
            const minutesDiff = timeDiff / (1000 * 60);
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            // Determine status - responsive approach for 15-minute inform interval
            let isOnline = false;
            
            if (device._lastInform) {
                // Device is online if informed within last 30 minutes (2x inform interval)
                // GenieACS inform interval = 15 minutes, so 30 minutes gives tolerance for network delays
                if (minutesDiff < 30) {
                    isOnline = true;
                }
            } else {
                // No lastInform data - consider offline by default
                // This ensures we only show online devices that actually inform regularly
                isOnline = false;
            }
            
            return {
                id: device._id || device.DeviceID?.SerialNumber || '-',
                serialNumber: device.DeviceID?.SerialNumber || device.InternetGatewayDevice?.DeviceInfo?.SerialNumber?._value || device._id || '-',
                manufacturer: device.DeviceID?.Manufacturer || device.InternetGatewayDevice?.DeviceInfo?.Manufacturer?._value || '-',
                model: device.DeviceID?.ProductClass || device.InternetGatewayDevice?.DeviceInfo?.ModelName?._value || '-',
                lastInform: device._lastInform ? new Date(device._lastInform).toLocaleString('id-ID') : '-',
                pppoeUsername: getParameterWithPaths(device, [
                    'VirtualParameters.pppUsername',
                    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
                    'InternetGatewayDevice.WANDevice.0.WANConnectionDevice.0.WANPPPConnection.0.Username'
                ]),
                ssid: device.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.['1']?.SSID?._value || '-',
                ssid2g: device.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.['1']?.SSID?._value || '-',
                ssid5g: (() => {
                    // Look for 5GHz SSID in different indices
                    const possibleIndices = [5, 6, 7, 8];
                    for (const idx of possibleIndices) {
                        const ssid5g = device.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.[idx]?.SSID?._value;
                        if (ssid5g && ssid5g !== '') return ssid5g;
                    }
                    return '-';
                })(),
                password: getParameterWithPaths(device, [
                    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
                    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey',
                    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
                    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.WEPKey.1.WEPKey'
                ]),
                password2g: getParameterWithPaths(device, [
                    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
                    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey',
                    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
                    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.WEPKey.1.WEPKey'
                ]),
                password5g: (() => {
                    // Look for 5GHz password - based on debug output, index 5 is 5GHz
                    const possibleIndices = [5, 6, 7, 8]; // Focus on 5GHz indices
                    
                    for (const idx of possibleIndices) {
                        // Try the actual paths found in device structure
                        const paths = [
                            device.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.[idx]?.KeyPassphrase?._value,
                            device.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.[idx]?.PreSharedKey?._value,
                            device.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.[idx]?.PreSharedKey?.['1']?.KeyPassphrase?._value
                        ];
                        
                        for (const pass5g of paths) {
                            if (pass5g && pass5g !== '') {
                                console.log(`🔍 Found 5GHz password at index ${idx} for device ${device._id}`);
                                return pass5g;
                            }
                        }
                    }
                    
                    // Fallback: if 5GHz SSID exists at index 5, use same password as 2.4GHz (common setup)
                    const ssid5g = device.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.['5']?.SSID?._value;
                    if (ssid5g && ssid5g !== '') {
                        const password2g = getParameterWithPaths(device, [
                            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
                            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey'
                        ]);
                        if (password2g && password2g !== '-') {
                            return password2g;
                        }
                    }
                    
                    return '-';
                })(),
                userKonek: getConnectedUsers(device),
                rxPower: getParameterWithPaths(device, [
                    'VirtualParameters.rxpower',
                    'VirtualParameters.redaman',
                    'InternetGatewayDevice.WANDevice.1.WANPONInterfaceConfig.RXPower'
                ]),
                tag: (Array.isArray(device._tags) && device._tags.length > 0)
                    ? device._tags.join(', ')
                    : (typeof device._tags === 'string' && device._tags)
                        ? device._tags
                        : '-',
                status: isOnline ? 'online' : 'offline',
                // Additional device info
                info: {
                    softwareVersion: device.InternetGatewayDevice?.DeviceInfo?.SoftwareVersion?._value || 
                                    device.DeviceID?.SoftwareVersion || 
                                    device.VirtualParameters?.softwareVersion || 'N/A',
                    manufacturer: device.DeviceID?.Manufacturer || 
                                 device.InternetGatewayDevice?.DeviceInfo?.Manufacturer?._value || 'N/A',
                    productClass: device.DeviceID?.ProductClass || 
                                 device.InternetGatewayDevice?.DeviceInfo?.ProductClass?._value || 'N/A'
                },
                // Debug info
                debugInfo: {
                    lastInform: device._lastInform,
                    minutesDiff: minutesDiff.toFixed(1),
                    hoursDiff: hoursDiff.toFixed(2),
                    hasSSID: !!(device.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.['1']?.SSID?._value)
                }
            };
        });
        
        res.json({
            success: true,
            devices: devices,
            stats: {
                total: devices.length,
                online: devices.filter(d => d.status === 'online').length,
                offline: devices.filter(d => d.status === 'offline').length
            },
            message: `Successfully loaded ${devices.length} devices`
        });
        
    } catch (error) {
        console.error('❌ Error getting GenieACS devices:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load GenieACS devices',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Edit GenieACS Device Parameters
router.post('/genieacs/edit', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const { deviceId, field, value } = req.body;
        
        if (!deviceId || !field || value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Device ID, field, and value are required'
            });
        }
        
        console.log(`🔧 Admin editing device ${deviceId}, field: ${field}`);
        
        let parameters = {};
        let result;
        
        switch (field) {
            case 'ssid2g':
                parameters['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID'] = value;
                result = await setParameterValues(deviceId, parameters);
                break;
                
            case 'ssid5g':
                // Try different indices for 5GHz
                const ssid5gIndices = [5, 6, 7, 8];
                let ssidUpdated = false;
                
                for (const idx of ssid5gIndices) {
                    try {
                        parameters = {};
                        parameters[`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${idx}.SSID`] = value;
                        result = await setParameterValues(deviceId, parameters);
                        ssidUpdated = true;
                        break;
                    } catch (error) {
                        console.log(`Failed to update 5GHz SSID at index ${idx}`);
                    }
                }
                
                if (!ssidUpdated) {
                    throw new Error('Failed to update 5GHz SSID - no valid 5GHz configuration found');
                }
                break;
                
            case 'password2g':
                if (value.length < 8) {
                    return res.status(400).json({
                        success: false,
                        message: 'Password must be at least 8 characters long'
                    });
                }
                parameters['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase'] = value;
                result = await setParameterValues(deviceId, parameters);
                break;
                
            case 'password5g':
                if (value.length < 8) {
                    return res.status(400).json({
                        success: false,
                        message: 'Password must be at least 8 characters long'
                    });
                }
                
                // Try different indices for 5GHz password
                const pass5gIndices = [5, 6, 7, 8];
                let passUpdated = false;
                
                for (const idx of pass5gIndices) {
                    try {
                        parameters = {};
                        parameters[`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${idx}.KeyPassphrase`] = value;
                        result = await setParameterValues(deviceId, parameters);
                        passUpdated = true;
                        break;
                    } catch (error) {
                        console.log(`Failed to update 5GHz password at index ${idx}`);
                    }
                }
                
                if (!passUpdated) {
                    throw new Error('Failed to update 5GHz password - no valid 5GHz configuration found');
                }
                break;
                
            case 'tag':
                // Update device tag using GenieACS API
                const genieacsUrl = getSetting('genieacs_url', 'http://localhost:7557');
                const genieacsUsername = getSetting('genieacs_username', 'admin');
                const genieacsPassword = getSetting('genieacs_password', 'password');
                
                // Remove old tags
                try {
                    const deviceResp = await axios.get(`${genieacsUrl}/devices/${encodeURIComponent(deviceId)}`, {
                        auth: { username: genieacsUsername, password: genieacsPassword }
                    });
                    const oldTags = deviceResp.data._tags || [];
                    
                    // Remove all old tags
                    for (const oldTag of oldTags) {
                        if (oldTag) {
                            try {
                                await axios.delete(`${genieacsUrl}/devices/${encodeURIComponent(deviceId)}/tags/${encodeURIComponent(oldTag)}`, {
                                    auth: { username: genieacsUsername, password: genieacsPassword }
                                });
                            } catch (e) {
                                console.log(`Could not delete old tag: ${oldTag}`);
                            }
                        }
                    }
                } catch (e) {
                    console.log('Could not retrieve old tags');
                }
                
                // Add new tag
                await axios.post(`${genieacsUrl}/devices/${encodeURIComponent(deviceId)}/tags/${encodeURIComponent(value)}`, {}, {
                    auth: { username: genieacsUsername, password: genieacsPassword }
                });
                
                result = { success: true, message: 'Tag updated successfully' };
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    message: `Unsupported field: ${field}`
                });
        }
        
        console.log(`✅ Device ${deviceId} field ${field} updated successfully`);
        
        // Invalidate GenieACS cache after successful edit
        invalidateGenieACSCache();
        
        res.json({
            success: true,
            message: `Successfully updated ${field}`,
            result: result
        });
        
    } catch (error) {
        console.error(`❌ Error editing device:`, error);
        res.status(500).json({
            success: false,
            message: `Failed to update device: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Restart GenieACS Device
router.post('/genieacs/restart', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const { deviceId } = req.body;
        
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'Device ID is required'
            });
        }
        
        console.log(`🔄 Admin restarting device: ${deviceId}`);
        
        const result = await reboot(deviceId);
        
        // Invalidate GenieACS cache after restart command
        invalidateGenieACSCache();
        
        res.json({
            success: true,
            message: 'Restart command sent successfully',
            result: result
        });
        
    } catch (error) {
        console.error(`❌ Error restarting device:`, error);
        res.status(500).json({
            success: false,
            message: `Failed to restart device: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Helper functions for location file operations
function readLocationsFile() {
    const fs = require('fs');
    const path = require('path');
    const locationsFile = path.join(__dirname, '../logs/onu-locations.json');
    
    try {
        if (fs.existsSync(locationsFile)) {
            const data = fs.readFileSync(locationsFile, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('Error reading locations file:', error);
        return {};
    }
}

function writeLocationsFile(locations) {
    const fs = require('fs');
    const path = require('path');
    const locationsFile = path.join(__dirname, '../logs/onu-locations.json');
    
    try {
        // Ensure logs directory exists
        const logsDir = path.dirname(locationsFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        fs.writeFileSync(locationsFile, JSON.stringify(locations, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing locations file:', error);
        return false;
    }
}

function validateLocationData(data) {
    const { deviceId, lat, lng, address } = data;
    
    if (!deviceId || typeof deviceId !== 'string') {
        return { valid: false, message: 'Device ID is required and must be a string' };
    }
    
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
        return { valid: false, message: 'Latitude must be a valid number between -90 and 90' };
    }
    
    if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
        return { valid: false, message: 'Longitude must be a valid number between -180 and 180' };
    }
    
    return { valid: true };
}

// API: GenieACS Devices Locations
router.get('/genieacs/locations', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        console.log('📍 Getting device locations for map monitoring...');
        
        const locations = readLocationsFile();
        console.log(`📍 Found ${Object.keys(locations).length} saved device locations`);
        
        res.json({
            success: true,
            locations: locations,
            count: Object.keys(locations).length,
            message: `Successfully loaded ${Object.keys(locations).length} device locations`
        });
        
    } catch (error) {
        console.error('❌ Error getting device locations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load device locations',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Add/Update Device Location
router.post('/genieacs/locations/add', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        console.log('📍 Adding/updating device location...');
        
        const { deviceId, lat, lng, address, tag } = req.body;
        
        // Validate input data
        const validation = validateLocationData({ deviceId, lat, lng, address });
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }
        
        // Read current locations
        let locations = readLocationsFile();
        
        // Create location entry
        const locationData = {
            deviceId: deviceId,
            serial: deviceId, // Assuming deviceId is serial number
            tag: tag || 'Admin Map Location',
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            address: address || 'N/A',
            lastUpdated: new Date().toISOString(),
            updatedBy: req.session.adminUser || 'admin'
        };
        
        // Add/update location
        locations[deviceId] = locationData;
        
        // Write back to file
        const writeSuccess = writeLocationsFile(locations);
        if (!writeSuccess) {
            throw new Error('Failed to save location data to file');
        }
        
        console.log(`✅ Device location ${locations[deviceId] ? 'updated' : 'added'} for ${deviceId}`);
        
        res.json({
            success: true,
            message: `Location ${locations[deviceId] ? 'updated' : 'added'} successfully`,
            data: locationData,
            totalLocations: Object.keys(locations).length
        });
        
    } catch (error) {
        console.error('❌ Error adding/updating device location:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add/update device location',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Delete Device Location
router.delete('/genieacs/locations/:deviceId', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        console.log('🗑️ Deleting device location...');
        
        const { deviceId } = req.params;
        
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'Device ID is required'
            });
        }
        
        // Read current locations
        let locations = readLocationsFile();
        
        // Check if location exists
        if (!locations[deviceId]) {
            return res.status(404).json({
                success: false,
                message: 'Device location not found'
            });
        }
        
        // Store deleted location data for response
        const deletedLocation = locations[deviceId];
        
        // Delete location
        delete locations[deviceId];
        
        // Write back to file
        const writeSuccess = writeLocationsFile(locations);
        if (!writeSuccess) {
            throw new Error('Failed to save location data to file');
        }
        
        console.log(`✅ Device location deleted for ${deviceId}`);
        
        res.json({
            success: true,
            message: 'Location deleted successfully',
            deletedLocation: deletedLocation,
            totalLocations: Object.keys(locations).length
        });
        
    } catch (error) {
        console.error('❌ Error deleting device location:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete device location',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =========================
// Infrastructure API Routes
// =========================

// Helper functions for ODP/ODC data
function readInfrastructureFile(type) {
    try {
        const filePath = path.join(__dirname, '..', 'logs', `${type}-location.json`);
        if (!fs.existsSync(filePath)) {
            console.log(`📄 ${type.toUpperCase()} location file not found, returning empty array`);
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`❌ Error reading ${type.toUpperCase()} locations:`, error);
        return [];
    }
}

function writeInfrastructureFile(type, data) {
    try {
        const filePath = path.join(__dirname, '..', 'logs', `${type}-location.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`❌ Error writing ${type.toUpperCase()} locations:`, error);
        return false;
    }
}

// API: Get ODP Locations
router.get('/infrastructure/odp', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        console.log('📍 Loading ODP locations...');
        const locations = readInfrastructureFile('odp');
        
        res.json({
            success: true,
            locations: locations,
            totalCount: locations.length
        });
        
    } catch (error) {
        console.error('❌ Error loading ODP locations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load ODP locations',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Get ODC Locations
router.get('/infrastructure/odc', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        console.log('📍 Loading ODC locations...');
        const locations = readInfrastructureFile('odc');
        
        res.json({
            success: true,
            locations: locations,
            totalCount: locations.length
        });
        
    } catch (error) {
        console.error('❌ Error loading ODC locations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load ODC locations',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Add ODP Location
router.post('/infrastructure/odp', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const { id, name, lat, lng, address, capacity, notes, selectedCustomers, selected_customers, selectedCustomersInfo } = req.body;
        
        if (!id || !name || lat === undefined || lng === undefined) {
            return res.status(400).json({
                success: false,
                message: 'ID, name, latitude, and longitude are required'
            });
        }
        
        let locations = readInfrastructureFile('odp');
        
        // Check if ID already exists
        const existingIndex = locations.findIndex(loc => loc.id === id);
        
        // Normalize initial selected customers if provided
        const initialSelectedCustomers = Array.isArray(selectedCustomers)
            ? selectedCustomers
            : (Array.isArray(selected_customers) ? selected_customers : []);
        const initialSelectedInfo = Array.isArray(selectedCustomersInfo)
            ? selectedCustomersInfo.map(info => ({
                id: info.id,
                pppoeUsername: info.pppoeUsername,
                manufacturer: info.manufacturer,
                modelName: info.modelName
            }))
            : [];
        
        const odpData = {
            id: id,
            name: name,
            type: 'ODP',
            location: {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            },
            address: address || 'N/A',
            capacity: parseInt(capacity) || 8,
            used: initialSelectedCustomers.length || 0,
            status: 'active',
            installation_date: new Date().toISOString().split('T')[0],
            notes: notes || '',
            activePorts: initialSelectedCustomers.length || 0,
            selected_customers: initialSelectedCustomers,
            selected_customer_info: initialSelectedInfo
        };
        
        if (existingIndex >= 0) {
            locations[existingIndex] = odpData;
        } else {
            locations.push(odpData);
        }
        
        const writeSuccess = writeInfrastructureFile('odp', locations);
        if (!writeSuccess) {
            throw new Error('Failed to save ODP location data to file');
        }
        
        console.log('✅ ODP added/updated:', {
            id: odpData.id,
            activePorts: odpData.activePorts,
            used: odpData.used,
            selected_customers: odpData.selected_customers?.length || 0
        });
        
        res.json({
            success: true,
            message: `ODP location ${existingIndex >= 0 ? 'updated' : 'added'} successfully`,
            data: odpData,
            totalCount: locations.length
        });
        
    } catch (error) {
        console.error('❌ Error adding/updating ODP location:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add/update ODP location',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Add ODC Location
router.post('/infrastructure/odc', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const { id, name, lat, lng, address, capacity, notes, served_odps } = req.body;
        
        if (!id || !name || lat === undefined || lng === undefined) {
            return res.status(400).json({
                success: false,
                message: 'ID, name, latitude, and longitude are required'
            });
        }
        
        let locations = readInfrastructureFile('odc');
        
        // Check if ID already exists
        const existingIndex = locations.findIndex(loc => loc.id === id);
        
        // Handle served_odps
        const initialServedODPs = Array.isArray(served_odps) ? served_odps : [];
        
        const odcData = {
            id: id,
            name: name,
            type: 'ODC',
            location: {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            },
            address: address || 'N/A',
            capacity: parseInt(capacity) || 144,
            used: initialServedODPs.length, // Calculate used from served_odps length
            status: 'active',
            installation_date: new Date().toISOString().split('T')[0],
            notes: notes || '',
            served_odps: initialServedODPs
        };
        
        if (existingIndex >= 0) {
            locations[existingIndex] = odcData;
        } else {
            locations.push(odcData);
        }
        
        const writeSuccess = writeInfrastructureFile('odc', locations);
        if (!writeSuccess) {
            throw new Error('Failed to save ODC location data to file');
        }
        
        console.log('✅ ODC added/updated:', {
            id: odcData.id,
            used: odcData.used,
            served_odps: odcData.served_odps?.length || 0
        });
        
        res.json({
            success: true,
            message: `ODC location ${existingIndex >= 0 ? 'updated' : 'added'} successfully`,
            data: odcData,
            totalCount: locations.length
        });
        
    } catch (error) {
        console.error('❌ Error adding/updating ODC location:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add/update ODC location',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Update ODP Location (PATCH)
router.patch('/infrastructure/odp/:id', async (req, res) => {
    console.log('🔄 PATCH /infrastructure/odp/:id endpoint called');
    console.log('🔐 Session check:', {
        hasSession: !!req.session,
        isAdmin: req.session?.isAdmin,
        adminUser: req.session?.adminUser
    });
    console.log('📬 Request body:', req.body);
    
    if (!req.session || !req.session.isAdmin) {
        console.log('❌ Authentication failed for ODP PATCH');
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const { id } = req.params;
        const { name, lat, lng, address, capacity, notes, activePorts, status, selectedCustomers, selected_customers, selectedCustomersInfo } = req.body;
        
        console.log(`🔄 PATCH ODP ${id} - Received data:`, {
            name, lat, lng, address, capacity, notes, activePorts, status, selectedCustomers, selectedCustomersInfo
        });
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ODP ID is required'
            });
        }
        
        let locations = readInfrastructureFile('odp');
        
        // Find the ODP to update
        const odpIndex = locations.findIndex(loc => loc.id === id);
        
        if (odpIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'ODP location not found'
            });
        }
        
        // Get existing ODP data
        const existingODP = locations[odpIndex];
        
        // Update only provided fields
        const updatedODP = {
            ...existingODP,
            ...(name !== undefined && { name }),
            ...(lat !== undefined && { location: { ...existingODP.location, lat: parseFloat(lat) } }),
            ...(lng !== undefined && { location: { ...existingODP.location, lng: parseFloat(lng) } }),
            ...(address !== undefined && { address }),
            ...(capacity !== undefined && { capacity: parseInt(capacity) }),
            ...(notes !== undefined && { notes }),
            ...(status !== undefined && { status }),
            lastUpdated: new Date().toISOString(),
            updatedBy: req.session.adminUser || 'admin'
        };
        
        // Handle selected customers if provided
        const incomingSelected = Array.isArray(selectedCustomers) ? selectedCustomers : (Array.isArray(selected_customers) ? selected_customers : undefined);
        if (incomingSelected !== undefined) {
            updatedODP.selected_customers = incomingSelected;
            if (Array.isArray(selectedCustomersInfo)) {
                updatedODP.selected_customer_info = selectedCustomersInfo.map(info => ({
                    id: info.id,
                    pppoeUsername: info.pppoeUsername,
                    manufacturer: info.manufacturer,
                    modelName: info.modelName
                }));
            }
            const cnt = incomingSelected.length;
            updatedODP.activePorts = cnt;
            updatedODP.used = cnt; // Sync used with count
        } else if (activePorts !== undefined) {
            // Handle activePorts and sync with used field
            const activePortsValue = parseInt(activePorts) || 0;
            updatedODP.activePorts = activePortsValue;
            updatedODP.used = activePortsValue; // Sync used field with activePorts
        }
        
        // Handle lat/lng updates properly
        if (lat !== undefined || lng !== undefined) {
            updatedODP.location = {
                lat: lat !== undefined ? parseFloat(lat) : existingODP.location.lat,
                lng: lng !== undefined ? parseFloat(lng) : existingODP.location.lng
            };
        }
        
        // Update the ODP in array
        locations[odpIndex] = updatedODP;
        
        console.log(`💾 Updated ODP data before saving:`, updatedODP);
        
        const writeSuccess = writeInfrastructureFile('odp', locations);
        if (!writeSuccess) {
            throw new Error('Failed to save updated ODP location data to file');
        }
        
        console.log(`✅ ODP location updated: ${id}`);
        console.log(`💾 File saved successfully - activePorts: ${updatedODP.activePorts}, used: ${updatedODP.used}`);
        
        res.json({
            success: true,
            message: 'ODP location updated successfully',
            data: updatedODP,
            totalCount: locations.length
        });
        
    } catch (error) {
        console.error('❌ Error updating ODP location:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ODP location',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Delete ODP Location
router.delete('/infrastructure/odp/:id', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ODP ID is required'
            });
        }
        
        let locations = readInfrastructureFile('odp');
        
        // Find the ODP to delete
        const odpIndex = locations.findIndex(loc => loc.id === id);
        
        if (odpIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'ODP location not found'
            });
        }
        
        // Store deleted ODP data for response
        const deletedODP = locations[odpIndex];
        
        // Remove ODP from array
        locations.splice(odpIndex, 1);
        
        const writeSuccess = writeInfrastructureFile('odp', locations);
        if (!writeSuccess) {
            throw new Error('Failed to save ODP location data to file');
        }
        
        console.log(`✅ ODP location deleted: ${id}`);
        
        res.json({
            success: true,
            message: 'ODP location deleted successfully',
            deletedLocation: deletedODP,
            totalCount: locations.length
        });
        
    } catch (error) {
        console.error('❌ Error deleting ODP location:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete ODP location',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Update ODC Location (PATCH)
router.patch('/infrastructure/odc/:id', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const { id } = req.params;
        const { name, lat, lng, address, capacity, notes, served_odps, status } = req.body;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ODC ID is required'
            });
        }
        
        let locations = readInfrastructureFile('odc');
        
        // Find the ODC to update
        const odcIndex = locations.findIndex(loc => loc.id === id);
        
        if (odcIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'ODC location not found'
            });
        }
        
        // Get existing ODC data
        const existingODC = locations[odcIndex];
        
        // Update only provided fields
        const updatedODC = {
            ...existingODC,
            ...(name !== undefined && { name }),
            ...(lat !== undefined && { location: { ...existingODC.location, lat: parseFloat(lat) } }),
            ...(lng !== undefined && { location: { ...existingODC.location, lng: parseFloat(lng) } }),
            ...(address !== undefined && { address }),
            ...(capacity !== undefined && { capacity: parseInt(capacity) }),
            ...(notes !== undefined && { notes }),
            ...(served_odps !== undefined && { served_odps: Array.isArray(served_odps) ? served_odps : [] }),
            ...(status !== undefined && { status }),
            lastUpdated: new Date().toISOString(),
            updatedBy: req.session.adminUser || 'admin'
        };
        
        // Update 'used' field if served_odps was provided
        if (served_odps !== undefined) {
            const finalServedODPs = Array.isArray(served_odps) ? served_odps : [];
            updatedODC.used = finalServedODPs.length;
        }
        
        // Handle lat/lng updates properly
        if (lat !== undefined || lng !== undefined) {
            updatedODC.location = {
                lat: lat !== undefined ? parseFloat(lat) : existingODC.location.lat,
                lng: lng !== undefined ? parseFloat(lng) : existingODC.location.lng
            };
        }
        
        // Update the ODC in array
        locations[odcIndex] = updatedODC;
        
        const writeSuccess = writeInfrastructureFile('odc', locations);
        if (!writeSuccess) {
            throw new Error('Failed to save updated ODC location data to file');
        }
        
        console.log(`✅ ODC location updated: ${id}`, {
            used: updatedODC.used,
            served_odps: updatedODC.served_odps?.length || 0
        });
        
        res.json({
            success: true,
            message: 'ODC location updated successfully',
            data: updatedODC,
            totalCount: locations.length
        });
        
    } catch (error) {
        console.error('❌ Error updating ODC location:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ODC location',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Delete ODC Location
router.delete('/infrastructure/odc/:id', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ODC ID is required'
            });
        }
        
        let locations = readInfrastructureFile('odc');
        
        // Find the ODC to delete
        const odcIndex = locations.findIndex(loc => loc.id === id);
        
        if (odcIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'ODC location not found'
            });
        }
        
        // Store deleted ODC data for response
        const deletedODC = locations[odcIndex];
        
        // Remove ODC from array
        locations.splice(odcIndex, 1);
        
        const writeSuccess = writeInfrastructureFile('odc', locations);
        if (!writeSuccess) {
            throw new Error('Failed to save ODC location data to file');
        }
        
        console.log(`✅ ODC location deleted: ${id}`);
        
        res.json({
            success: true,
            message: 'ODC location deleted successfully',
            deletedLocation: deletedODC,
            totalCount: locations.length
        });
        
    } catch (error) {
        console.error('❌ Error deleting ODC location:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete ODC location',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ========== SETTINGS MANAGEMENT ROUTES ==========

// API: Get Settings Data
router.get('/settings/data', (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        // Use cache if available and still valid
        const now = Date.now();
        if (cachedSettings && settingsCacheTime && (now - settingsCacheTime) < SETTINGS_CACHE_DURATION) {
            console.log('🚀 Returning cached settings data');
            return res.json({
                success: true,
                ...cachedSettings,
                _cached: true,
                _loadTime: now - settingsCacheTime
            });
        }
        
        // Get settings from environment variables
        const envSettings = {
            admin_username: getSetting('admin_username', 'admin'),
            admin_password: getSetting('admin_password', 'admin'),
            genieacs_url: getSetting('genieacs_url', 'http://localhost:7557'),
            genieacs_username: getSetting('genieacs_username', 'admin'),
            genieacs_password: getSetting('genieacs_password', 'password'),
            mikrotik_host: getSetting('mikrotik_host', '192.168.1.1'),
            mikrotik_port: getSetting('mikrotik_port', '8728'),
            mikrotik_user: getSetting('mikrotik_user', 'admin'),
            mikrotik_password: getSetting('mikrotik_password', 'password'),
            main_interface: getSetting('main_interface', 'ether1'),
            company_header: getSetting('company_header', 'ISP Monitor'),
            footer_info: getSetting('footer_info', 'Powered by Gembok'),
            server_port: getSetting('server_port', '3001'),
            server_host: getSetting('server_host', 'localhost'),
            customerPortalOtp: getSetting('customerPortalOtp', 'false'),
            otp_length: getSetting('otp_length', '6'),
            pppoe_monitor_enable: getSetting('pppoe_monitor_enable', 'true'),
            rx_power_warning: getSetting('rx_power_warning', '-27'),
            rx_power_critical: getSetting('rx_power_critical', '-30'),
            whatsapp_keep_alive: getSetting('whatsapp_keep_alive', 'true')
        };
        
        // Update cache
        cachedSettings = envSettings;
        settingsCacheTime = now;
        
        console.log('📋 Settings loaded from environment variables');
        res.json({
            success: true,
            ...envSettings,
            _cached: false,
            _source: 'environment',
            _loadTime: 0
        });
        
    } catch (error) {
        console.error('❌ Error in settings data endpoint:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// API: Save Settings
router.post('/settings/save', (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const newSettings = { ...req.body };
        
        // Validate required admin credential fields only if one of them is provided.
        // This allows saving a session_secret alone (regenerate secret) without
        // forcing admin_username/admin_password to be present in the request.
        if ((newSettings.admin_username || newSettings.admin_password) && (!newSettings.admin_username || !newSettings.admin_password)) {
            return res.status(400).json({
                success: false,
                message: 'Admin username and password are required when updating credentials.'
            });
        }
        
        console.log('⚠️ Settings save attempt - Configuration is now managed via .env file');

        // Update cache for current session
        cachedSettings = { ...newSettings };
        settingsCacheTime = Date.now();

        // Emit settings update event for any listeners
        if (global.appEvents) {
            global.appEvents.emit('settings:updated', newSettings);
        }

        // If frontend requested writing to .env, perform a safe update with backup
        const writeEnv = req.body.writeEnv === true || req.query.writeEnv === 'true';
        if (writeEnv) {
            // Debug logging to help diagnose why ADMIN_PASSWORD may not be persisted
                try {
                    const debugSummary = {
                        has_admin_username: !!newSettings.admin_username,
                        admin_username_len: newSettings.admin_username ? String(newSettings.admin_username).length : 0,
                        has_admin_password: !!newSettings.admin_password,
                        admin_password_len: newSettings.admin_password ? String(newSettings.admin_password).length : 0,
                        has_session_secret: !!newSettings.session_secret,
                        session_secret_len: newSettings.session_secret ? String(newSettings.session_secret).length : 0
                    };
                    console.log('🔍 writeEnv debug:', JSON.stringify(debugSummary));
                    try {
                        const presentKeys = Object.keys(newSettings || {});
                        console.log('🔍 writeEnv keys present:', presentKeys.join(', '));
                    } catch (keysErr) {
                        console.warn('Failed to list writeEnv keys:', keysErr.message);
                    }
                } catch (dbgErr) {
                    console.warn('Failed to log writeEnv debug:', dbgErr.message);
                }
            // Map UI setting keys -> environment variable names for persisting
            const keyMap = {
                admin_username: 'ADMIN_USERNAME',
                admin_password: 'ADMIN_PASSWORD',
                session_secret: 'SESSION_SECRET',
                genieacs_url: 'GENIEACS_URL',
                genieacs_username: 'GENIEACS_USERNAME',
                genieacs_password: 'GENIEACS_PASSWORD',
                mikrotik_host: 'MIKROTIK_HOST',
                mikrotik_port: 'MIKROTIK_PORT',
                mikrotik_user: 'MIKROTIK_USER',
                mikrotik_password: 'MIKROTIK_PASSWORD',
                main_interface: 'MAIN_INTERFACE',
                company_header: 'COMPANY_HEADER',
                footer_info: 'FOOTER_INFO',
                server_port: 'SERVER_PORT',
                server_host: 'SERVER_HOST',
                customerPortalOtp: 'CUSTOMER_PORTAL_OTP',
                otp_length: 'OTP_LENGTH',
                pppoe_monitor_enable: 'PPPOE_MONITOR_ENABLE',
                rx_power_warning: 'RX_POWER_WARNING',
                rx_power_critical: 'RX_POWER_CRITICAL',
                whatsapp_keep_alive: 'WHATSAPP_KEEP_ALIVE'
            };

            const envPath = path.join(__dirname, '..', '.env');

            try {
                // Read existing .env (or create from example if missing)
                let envContent = '';
                if (fs.existsSync(envPath)) {
                    envContent = fs.readFileSync(envPath, 'utf-8');
                } else if (fs.existsSync(path.join(__dirname, '..', '.env.example'))) {
                    envContent = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf-8');
                }

                const lines = envContent ? envContent.split('\n') : [];

                // Track which env keys we replaced
                const replaced = {};
                Object.values(keyMap).forEach(k => replaced[k] = false);

                // Build a lookup of env key -> new value (stringified)
                const pending = {};
                for (const [uiKey, envKey] of Object.entries(keyMap)) {
                    if (Object.prototype.hasOwnProperty.call(newSettings, uiKey) && newSettings[uiKey] !== undefined && newSettings[uiKey] !== null) {
                        // Convert booleans to 'true'/'false' and ensure string
                        let v = newSettings[uiKey];
                        if (typeof v === 'boolean') v = v ? 'true' : 'false';
                        else v = String(v);
                        pending[envKey] = v;
                    }
                }

                // Replace existing lines where applicable
                const updatedLines = lines.map(line => {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) return line;
                    const [k, ...vParts] = trimmed.split('=');
                    const key = k && k.trim();
                    if (!key) return line;

                    if (pending[key] !== undefined) {
                        replaced[key] = true;
                        return `${key}=${pending[key]}`;
                    }

                    return line;
                });

                // Append any pending keys that were not replaced
                for (const [envKey, value] of Object.entries(pending)) {
                    if (!replaced[envKey]) {
                        updatedLines.push(`${envKey}=${value}`);
                        replaced[envKey] = true;
                    }
                }

                // Write updated .env (join with newline, ensure trailing newline)
                // Log a masked preview of the lines we will write so we can debug missing keys
                try {
                    const preview = updatedLines.map(l => {
                        if (l.startsWith('ADMIN_PASSWORD=')) return 'ADMIN_PASSWORD=****(masked)****';
                        if (l.startsWith('SESSION_SECRET=')) return 'SESSION_SECRET=****(masked)****';
                        return l;
                    });
                    console.log('🔍 writeEnv final lines preview:\n' + preview.join('\n'));
                } catch (pvErr) {
                    console.warn('Failed to create writeEnv preview:', pvErr.message);
                }

                fs.writeFileSync(envPath, updatedLines.join('\n') + '\n', 'utf-8');

                console.log('✅ .env updated in-place');
            } catch (err) {
                console.error('Failed to write .env:', err);
                return res.status(500).json({ success: false, message: 'Failed to persist settings to .env', error: err.message });
            }
        }

        res.json({
            success: true,
            message: 'Settings updated for current session.' + (writeEnv ? ' Changes persisted to .env.' : ' Note: restart required for permanent changes.'),
            data: newSettings,
            warning: writeEnv ? undefined : 'Settings are now managed via environment variables (.env file). Changes will only persist for the current session.'
        });
        
    } catch (error) {
        console.error('❌ Error processing settings:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// API: Upload Logo
router.post('/settings/upload-logo', upload.single('logo'), (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        
        const logoPath = `/assets/logo.png`;
        
        res.json({
            success: true,
            message: 'Logo uploaded successfully',
            logoPath: logoPath,
            filename: req.file.filename
        });
        
    } catch (error) {
        console.error('❌ Error uploading logo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload logo',
            error: error.message
        });
    }
});

// API: WhatsApp Status
router.get('/settings/whatsapp-status', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const whatsappStatus = global.whatsappStatus || {
            connected: false,
            qrCode: null,
            phoneNumber: null,
            status: 'disconnected'
        };
        
        // Convert QR code to data URL if available
        let qrCodeDataUrl = null;
        if (whatsappStatus.qrCode) {
            const QRCode = require('qrcode');
            try {
                // Generate QR code as data URL for frontend display
                qrCodeDataUrl = await QRCode.toDataURL(whatsappStatus.qrCode, {
                    type: 'image/png',
                    quality: 0.92,
                    margin: 1,
                    width: 256,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
            } catch (qrError) {
                console.warn('Failed to generate QR code data URL:', qrError.message);
            }
        }
        
        res.json({
            success: true,
            status: whatsappStatus.status,
            connected: whatsappStatus.connected,
            qrCode: qrCodeDataUrl,
            phoneNumber: whatsappStatus.phoneNumber,
            connectedSince: whatsappStatus.connectedSince
        });
        
    } catch (error) {
        console.error('❌ Error getting WhatsApp status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get WhatsApp status',
            error: error.message
        });
    }
});

// API: Refresh WhatsApp Session
router.post('/settings/whatsapp-refresh', (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        // Import WhatsApp function
        const { connectToWhatsApp } = require('../config/whatsapp');
        
        // Reset WhatsApp status to trigger reconnection
        if (global.whatsappStatus) {
            global.whatsappStatus.connected = false;
            global.whatsappStatus.status = 'connecting';
            global.whatsappStatus.qrCode = null;
        }
        
        // Close existing connection if available
        if (global.whatsappSock) {
            try {
                global.whatsappSock.end();
                global.whatsappSock = null;
                console.log('🚫 WhatsApp socket closed for refresh');
            } catch (e) {
                console.warn('WhatsApp socket close warning:', e.message);
            }
        }
        
        // Immediately start new connection
        console.log('🔄 Starting WhatsApp reconnection for refresh...');
        setTimeout(() => {
            connectToWhatsApp();
        }, 1000); // Short delay to ensure cleanup
        
        res.json({
            success: true,
            message: 'WhatsApp session refresh initiated. New QR code will be generated shortly.'
        });
        
    } catch (error) {
        console.error('❌ Error refreshing WhatsApp session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh WhatsApp session',
            error: error.message
        });
    }
});

// API: Delete WhatsApp Session
router.post('/settings/whatsapp-delete', (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        // Import WhatsApp function
        const { connectToWhatsApp } = require('../config/whatsapp');
        
        // Reset WhatsApp status
        if (global.whatsappStatus) {
            global.whatsappStatus.connected = false;
            global.whatsappStatus.status = 'connecting'; // Set to connecting so new QR will be generated
            global.whatsappStatus.qrCode = null;
            global.whatsappStatus.phoneNumber = null;
            global.whatsappStatus.connectedSince = null;
        }
        
        // Close WhatsApp socket
        if (global.whatsappSock) {
            try {
                global.whatsappSock.end();
                global.whatsappSock = null;
                console.log('🚫 WhatsApp socket closed for delete');
            } catch (e) {
                console.warn('WhatsApp socket close warning:', e.message);
            }
        }
        
        // Clear session files if they exist
        const authPath = path.join(__dirname, '../whatsapp_session');
        try {
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log('🗑️ WhatsApp session files deleted');
            }
        } catch (e) {
            console.warn('Session file deletion warning:', e.message);
        }
        
        // Also clear whatsapp-web.js auth folder
        const authDataPath = path.join(__dirname, '../auth_data');
        try {
            if (fs.existsSync(authDataPath)) {
                fs.rmSync(authDataPath, { recursive: true, force: true });
                console.log('🗑️ WhatsApp web auth data deleted');
            }
        } catch (e) {
            console.warn('Auth data deletion warning:', e.message);
        }
        
        // Immediately start new connection to generate new QR
        console.log('🔄 Starting WhatsApp reconnection for fresh session...');
        setTimeout(() => {
            connectToWhatsApp();
        }, 2000); // Slightly longer delay to ensure file cleanup
        
        res.json({
            success: true,
            message: 'WhatsApp session deleted successfully. New QR code will be generated shortly.'
        });
        
    } catch (error) {
        console.error('❌ Error deleting WhatsApp session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete WhatsApp session',
            error: error.message
        });
    }
});

// API: Get All Trouble Reports
router.get('/trouble/reports', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        console.log('📋 Loading all trouble reports for admin...');
        const reports = getAllTroubleReports();
        
        // Calculate statistics
        const stats = {
            total: reports.length,
            open: reports.filter(r => r.status === 'open').length,
            inProgress: reports.filter(r => r.status === 'in_progress').length,
            resolved: reports.filter(r => r.status === 'resolved').length,
            closed: reports.filter(r => r.status === 'closed').length
        };
        
        res.json({
            success: true,
            reports: reports,
            stats: stats,
            totalCount: reports.length
        });
        
    } catch (error) {
        console.error('❌ Error loading trouble reports:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load trouble reports',
            reports: [],
            stats: { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 },
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Get Single Trouble Report Details
router.get('/trouble/reports/:id', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const reportId = req.params.id;
        console.log(`📋 Loading trouble report details: ${reportId}`);
        
        const report = getTroubleReportById(reportId);
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Trouble report not found'
            });
        }
        
        res.json({
            success: true,
            report: report
        });
        
    } catch (error) {
        console.error('❌ Error loading trouble report details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load trouble report details',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Update Trouble Report Status
router.post('/trouble/reports/:id/status', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const reportId = req.params.id;
        const { status, notes, sendNotification } = req.body;
        
        console.log(`📋 Updating trouble report ${reportId} status to: ${status}`);
        
        // Validate status
        const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
            });
        }
        
        // Update status
        const updatedReport = updateTroubleReportStatus(reportId, status, notes, sendNotification);
        
        if (!updatedReport) {
            return res.status(404).json({
                success: false,
                message: 'Trouble report not found or failed to update status'
            });
        }
        
        res.json({
            success: true,
            message: `Status updated to ${status} successfully`,
            report: updatedReport
        });
        
    } catch (error) {
        console.error('❌ Error updating trouble report status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update trouble report status',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API: Add Note to Trouble Report
router.post('/trouble/reports/:id/notes', async (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const reportId = req.params.id;
        const { notes } = req.body;
        
        console.log(`📋 Adding note to trouble report: ${reportId}`);
        
        if (!notes || notes.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Notes cannot be empty'
            });
        }
        
        // Get current report to preserve status
        const report = getTroubleReportById(reportId);
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Trouble report not found'
            });
        }
        
        // Update report with new note (without changing status)
        const updatedReport = updateTroubleReportStatus(reportId, report.status, notes, false);
        
        if (!updatedReport) {
            return res.status(500).json({
                success: false,
                message: 'Failed to add note to trouble report'
            });
        }
        
        res.json({
            success: true,
            message: 'Note added successfully',
            report: updatedReport
        });
        
    } catch (error) {
        console.error('❌ Error adding note to trouble report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add note to trouble report',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
