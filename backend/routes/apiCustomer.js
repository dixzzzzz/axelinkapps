const express = require('express');
const router = express.Router();
const security = require('../middleware/security');
const { findDeviceByTag } = require('../config/addWAN');
const { getSetting } = require('../config/settingsManager');
const { createTroubleReport, getTroubleReportsByPhone } = require('../config/troubleReport');

// Apply security middleware
router.use(security.securityLogger);
router.use(security.developmentRateLimitBypass);

// Simple OTP validation function (replace with your logic)
async function validateOTP(phone, otp) {
    // TODO: Implement real OTP validation
    // For now, return true for testing
    console.log(`Validating OTP ${otp} for phone ${phone}`);
    
    // Example: Check against stored OTP in Redis/memory
    // return await checkStoredOTP(phone, otp);
    
    // Temporary: Accept any 4-6 digit OTP for testing
    return /^\d{4,6}$/.test(otp);
}

// OTP verification with security
router.post('/verify-otp', [
    security.validationSchemas.phone,
    security.validationSchemas.otp, 
    security.handleValidationErrors
], async (req, res) => {
    const { phone, otp } = req.body;
    
    // Your existing OTP validation logic here
    const isValid = await validateOTP(phone, otp);
    
    if (isValid) {
        const userData = { phone, verifiedAt: new Date() };
        
        // Use session regeneration middleware
        security.sessionRegeneration.afterLogin(req, res, () => {
            res.json({
                success: true,
                message: 'OTP verified successfully',
                phone: phone,
                csrfToken: req.csrfToken() // Send new CSRF token
            });
        }, userData, 'customer');
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid OTP'
        });
    }
});

// Customer logout
router.post('/logout', (req, res) => {
    security.sessionRegeneration.onLogout(req, res, () => {
        res.json({
            success: true,
            message: 'Logout successful'
        });
    });
});

// Import existing customer functions
const { getCustomerDeviceData } = require('./customerPortal');

// Helper function to get GenieACS configuration
function getGenieacsConfig() {
    return {
        genieacsUrl: getSetting('genieacs_url', 'http://172.10.0.3:7557'),
        genieacsUsername: getSetting('genieacs_username', 'axelink'),
        genieacsPassword: getSetting('genieacs_password', 'axelink@247')
    };
}

// Validasi nomor pelanggan ke GenieACS
async function isValidCustomer(phone) {
  const device = await findDeviceByTag(phone);
  return !!device;
}

// API: Customer Login (JSON response for React)
router.post('/login', async (req, res) => {
    try {
        const { phone, email } = req.body;
        
        // Support both phone and email login
        let customerPhone = phone;
        
        if (email && !phone) {
            // If email provided, simulate customer lookup
            // In real implementation, you'd query your customer database
            const emailToPhoneMap = {
                'customer1@axelink.com': '081234567890',
                'customer2@axelink.com': '081234567891',
                'admin@axelink.com': '081911290961'
            };
            customerPhone = emailToPhoneMap[email];
        }
        
        if (!customerPhone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number or email is required'
            });
        }
        
        // Validate customer exists in GenieACS
        if (!await isValidCustomer(customerPhone)) {
            return res.status(401).json({
                success: false,
                message: 'Customer not found or not registered'
            });
        }
        
        // Get customer device data
        const deviceData = await getCustomerDeviceData(customerPhone);
        
        // Use session regeneration for security
        const userData = { phone: customerPhone, email: email };
        
        security.sessionRegeneration.afterLogin(req, res, () => {
            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    phone: customerPhone,
                    email: email || `${customerPhone}@customer.local`,
                    name: `Customer ${customerPhone}`,
                    isFirstLogin: !deviceData || deviceData.status === 'Not Found',
                    deviceData: deviceData
                },
                csrfToken: req.csrfToken() // Send CSRF token for axios interceptor
            });
        }, userData, 'customer');
        
    } catch (error) {
        console.error('Customer login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// API: Customer Dashboard Data
router.get('/dashboard', async (req, res) => {
    try {
        console.log('🔍 Dashboard request - Session debug:', {
            sessionID: req.sessionID,
            sessionPhone: req.session && req.session.phone,
            sessionData: req.session,
            headers: {
                cookie: req.headers.cookie,
                userAgent: req.headers['user-agent']
            }
        });
        
        const phone = req.session && req.session.phone;
        
        if (!phone) {
            console.log('❌ Dashboard: No phone in session');
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        const data = await getCustomerDeviceData(phone);
        
        if (!data) {
            return res.json({
                success: true,
                data: {
                    phone,
                    ssid: '-',
                    status: 'Not Found',
                    connectedUsers: [],
                    message: 'Device data not found'
                }
            });
        }
        
        res.json({
            success: true,
            data: data
        });
        
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard data'
        });
    }
});

// API: Change Password
router.post('/change-password', [
    security.validationSchemas.password,
    security.handleValidationErrors
], async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const phone = req.session && req.session.phone;
        
        if (!phone) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        if (!currentPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is required'
            });
        }
        
        // In real implementation, you'd validate current password
        // For now, simulate success
        console.log(`Password change request for customer: ${phone}`);
        
        res.json({
            success: true,
            message: 'Password changed successfully',
            csrfToken: req.csrfToken() // Send new CSRF token
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

// In-memory cache for customer device data (1 minute TTL for faster location updates)
const deviceDataCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute (reduced for faster location updates)

// API: Customer Map Data - Optimized version
router.get('/map/data', async (req, res) => {
    try {
        const phone = req.session && req.session.phone;
        const forceRefresh = req.query.refresh === 'true';
        
        if (!phone) {
            return res.status(401).json({
                success: false,
                message: 'Customer not logged in'
            });
        }
        
        console.log(`🗺️ Fetching optimized map data for customer: ${phone} (force refresh: ${forceRefresh})`);
        
        // Check cache first (skip cache if force refresh)
        const cacheKey = `device_${phone}`;
        const cachedData = deviceDataCache.get(cacheKey);
        
        if (!forceRefresh && cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
            console.log(`⚡ Returning cached data for ${phone}`);
            return res.json(cachedData.data);
        }
        
        if (forceRefresh) {
            console.log(`🔄 Force refreshing cache for ${phone}`);
            // Clear location file cache too for complete refresh
            locationFileCache = null;
            locationFileCacheTime = 0;
        }
        
        // Get device data using optimized direct function call
        const deviceData = await getOptimizedCustomerMapData(phone);
        
        if (!deviceData.success) {
            return res.status(404).json(deviceData);
        }
        
        // Cache the result
        deviceDataCache.set(cacheKey, {
            data: deviceData,
            timestamp: Date.now()
        });
        
        console.log(`✅ Map data retrieved and cached for ${phone}`);
        res.json(deviceData);
        
    } catch (error) {
        console.error('❌ Error getting optimized map data:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error getting map data: ' + error.message
        });
    }
});

// Optimized function to get customer map data directly
async function getOptimizedCustomerMapData(phone) {
    try {
        // Validate format
        if (!phone || phone.length < 10) {
            return {
                success: false,
                message: 'Invalid phone number format'
            };
        }
        
        // Single call to get device by phone
        const { findDeviceByTag } = require('../config/addWAN');
        const device = await findDeviceByTag(phone);
        
        if (!device) {
            return {
                success: false,
                message: 'Device not found for this phone number'
            };
        }
        
        const deviceId = device._id;
        
        // Get customer data (for dashboard info)
        const customerData = await getCustomerDeviceData(phone);
        
        if (!customerData) {
            return {
                success: false,
                message: 'Customer device data not available'
            };
        }
        
        // Get location data efficiently
        const location = await getDeviceLocationOptimized(device, deviceId);
        
        if (!location) {
            return {
                success: false,
                message: 'Device location not available. Please contact admin to configure device location.'
            };
        }
        
        // Format response (same structure as before)
        const isOnline = customerData.status === 'Online';
        
        return {
            success: true,
            device: {
                id: deviceId,
                serialNumber: customerData.serialNumber || 'N/A',
                manufacturer: customerData.Manufacturer || 'N/A',
                pppoeUsername: customerData.pppoeUsername || 'N/A',
                customerPhone: phone,
                location: {
                    lat: parseFloat(location.lat),
                    lng: parseFloat(location.lng),
                    address: (location.address && location.address !== 'N/A') 
                        ? location.address 
                        : (customerData.lokasi && customerData.lokasi !== '-') 
                            ? customerData.lokasi 
                            : 'Location address not configured by admin'
                },
                status: {
                    isOnline,
                    lastInform: customerData.lastInform || 'N/A',
                    rxPower: customerData.rxPower !== 'N/A' && customerData.rxPower !== '-' ? parseFloat(customerData.rxPower) : null
                },
                info: {
                    manufacturer: customerData.Manufacturer || 'N/A',
                    modelName: customerData.model || 'N/A',
                    softwareVersion: customerData.softwareVersion || 'N/A',
                    serialNumber: customerData.serialNumber || 'N/A'
                }
            }
        };
        
    } catch (error) {
        console.error('❌ Error in getOptimizedCustomerMapData:', error.message);
        return {
            success: false,
            message: 'Internal error getting device data'
        };
    }
}

// Optimized location getter with file caching (reduced TTL for faster location updates)
let locationFileCache = null;
let locationFileCacheTime = 0;
const LOCATION_FILE_CACHE_TTL = 15 * 1000; // 15 seconds (reduced for faster location updates)

async function getDeviceLocationOptimized(device, deviceId) {
    console.log(`🗺️ Looking for location data for device: ${deviceId}`);
    
    // 1. Try VirtualParameters first
    if (device.VirtualParameters?.location?._value) {
        try {
            const locationData = JSON.parse(device.VirtualParameters.location._value);
            console.log(`✅ Found location in VirtualParameters for ${deviceId}:`, locationData);
            return locationData;
        } catch (e) {
            console.log(`❌ Invalid VirtualParameters location format for ${deviceId}`);
        }
    }
    
    // 2. Try tags
    if (device._tags && Array.isArray(device._tags)) {
        const locationTag = device._tags.find(tag => tag.startsWith('location:'));
        if (locationTag) {
            try {
                const locationData = locationTag.replace('location:', '');
                const parsedLocation = JSON.parse(locationData);
                console.log(`✅ Found location in tags for ${deviceId}:`, parsedLocation);
                return parsedLocation;
            } catch (e) {
                console.log(`❌ Invalid tag location format for ${deviceId}`);
            }
        }
    }
    
    // 3. Try cached file data
    const now = Date.now();
    if (!locationFileCache || (now - locationFileCacheTime) > LOCATION_FILE_CACHE_TTL) {
        // Refresh file cache
        const fs = require('fs');
        const path = require('path');
        const locationsFile = path.join(__dirname, '../logs/onu-locations.json');
        
        if (fs.existsSync(locationsFile)) {
            try {
                const fileData = fs.readFileSync(locationsFile, 'utf8');
                locationFileCache = JSON.parse(fileData);
                locationFileCacheTime = now;
                console.log(`📁 Location file cache refreshed with ${Object.keys(locationFileCache).length} devices`);
            } catch (e) {
                console.log(`❌ Error reading location file: ${e.message}`);
                locationFileCache = {};
            }
        } else {
            console.log(`❌ Location file not found: ${locationsFile}`);
            locationFileCache = {};
        }
    }
    
    // Return cached file data
    const locationFromFile = locationFileCache[deviceId];
    if (locationFromFile && locationFromFile.lat && locationFromFile.lng) {
        console.log(`✅ Found location in file cache for ${deviceId}:`, {
            lat: locationFromFile.lat,
            lng: locationFromFile.lng,
            address: locationFromFile.address
        });
        return {
            lat: locationFromFile.lat,
            lng: locationFromFile.lng,
            // Improved address handling - only use 'Location not configured' if address is specifically 'N/A' or missing
            address: (locationFromFile.address && locationFromFile.address !== 'N/A') 
                ? locationFromFile.address 
                : 'Location not configured by admin'
        };
    } else {
        console.log(`❌ No location data found for device ${deviceId} in file cache. Available devices: ${Object.keys(locationFileCache).slice(0, 5).join(', ')}${Object.keys(locationFileCache).length > 5 ? '...' : ''}`);
    }
    
    return null;
}

// Import WhatsApp OTP service
const { sendOTPMessage } = require('../config/whatsapp-otp');

// Import rate limiting middleware
const { otpRateLimit } = require('../middleware/rateLimiter');

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map();
const OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
const OTP_COOLDOWN = 60 * 1000; // 1 minute between requests

// Lightweight cache for customer validation to avoid repeated GenieACS lookups
const customerValidationCache = new Map();
const CUSTOMER_VALIDATION_TTL = 60 * 1000; // 60 seconds

function getCachedValidCustomer(phone) {
    const entry = customerValidationCache.get(phone);
    if (entry && (Date.now() - entry.ts) < CUSTOMER_VALIDATION_TTL) {
        return entry.value;
    }
    return null;
}

async function isValidCustomerCached(phone) {
    const cached = getCachedValidCustomer(phone);
    if (cached !== null) return cached;
    const valid = await isValidCustomer(phone);
    customerValidationCache.set(phone, { value: valid, ts: Date.now() });
    return valid;
}

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// API: Send OTP with rate limiting
router.post('/otp/send', otpRateLimit(), async (req, res) => {
    try {
        const start = Date.now();
        const { phone } = req.body;
        
        if (!phone || phone.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Valid phone number is required'
            });
        }
        
        // Rate limiting is handled by middleware
        const t1 = Date.now();

        // Validate customer exists in GenieACS (with cache)
        const validCustomer = await isValidCustomerCached(phone);
        const t2 = Date.now();
        if (!validCustomer) {
            return res.status(404).json({
                success: false,
                message: 'Phone number not registered in the system'
            });
        }
        
        // Generate and store OTP
        const otp = generateOTP();
        const otpData = {
            code: otp,
            phone: phone,
            createdAt: Date.now(),
            attempts: 0,
            verified: false
        };
        otpStore.set(phone, otpData);
        const t3 = Date.now();
        console.log(`📱 OTP generated for ${phone}: ${otp} (expires in 5 minutes)`);

        // Fire-and-forget WhatsApp send to avoid blocking response entirely
        const sendPromise = sendOTPMessage(phone, otp, 5)
        .then(r => {
                if (!r?.success) {
                        console.error(`❌ WhatsApp send failed for ${phone}: ${r?.message}`);
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`🔐 Development OTP for ${phone}: ${otp} (WhatsApp failed, shown in console)`);
                    }
                } else {
                    console.log(`✅ WhatsApp send completed for ${phone}`);
                }
            })
            .catch(e => console.error(`❌ WhatsApp send error for ${phone}:`, e));

        const t4 = Date.now();

        // Respond immediately without waiting
        res.json({
            success: true,
            message: 'OTP sent successfully to your WhatsApp',
            data: {
                phone: phone,
                expiresIn: 300,
                method: 'WhatsApp',
                whatsappAvailable: true,
                ...(process.env.NODE_ENV !== 'production' && { otp: otp })
            }
        });

        const tEnd = Date.now();
        console.log(`⏱️ OTP /otp/send timings for ${phone} (ms): validate=${t2 - t1}, generate=${t3 - t2}, send_fire_and_forget=${t4 - t3}, total_until_response=${tEnd - start}`);
        
    } catch (error) {
        console.error('❌ Error sending OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP. Please try again.'
        });
    }
});

// API: Verify OTP
router.post('/otp/verify', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        
        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP are required'
            });
        }
        
        // Get stored OTP data
        const otpData = otpStore.get(phone);
        
        if (!otpData) {
            return res.status(404).json({
                success: false,
                message: 'No OTP found for this phone number. Please request a new one.'
            });
        }
        
        // Check if OTP is expired
        if (Date.now() - otpData.createdAt > OTP_EXPIRY_TIME) {
            otpStore.delete(phone);
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }
        
        // Check if already verified
        if (otpData.verified) {
            return res.status(400).json({
                success: false,
                message: 'OTP already used. Please request a new one.'
            });
        }
        
        // Increment attempts
        otpData.attempts++;
        
        // Check max attempts
        if (otpData.attempts > 3) {
            otpStore.delete(phone);
            return res.status(400).json({
                success: false,
                message: 'Maximum attempts exceeded. Please request a new OTP.'
            });
        }
        
        // Verify OTP
        if (otpData.code !== otp) {
            otpStore.set(phone, otpData); // Update attempts
            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${3 - otpData.attempts} attempts remaining.`
            });
        }
        
        // OTP is valid - mark as verified and create session
        otpData.verified = true;
        otpStore.set(phone, otpData);
        
        // Create customer session
        req.session.phone = phone;
        req.session.customerEmail = `${phone}@customer.local`;
        
        // Force session save and debug
        req.session.save((err) => {
            if (err) {
                console.error('❌ Session save error:', err);
            } else {
                console.log('✅ Session saved successfully:', {
                    sessionID: req.sessionID,
                    phone: req.session.phone,
                    sessionKeys: Object.keys(req.session)
                });
            }
        });
        
        // Get customer device data for session
        const deviceData = await getCustomerDeviceData(phone);
        
        console.log(`✅ OTP verified successfully for ${phone}`, {
            sessionID: req.sessionID,
            sessionPhone: req.session.phone,
            hasDeviceData: !!deviceData
        });
        
        // Clean up OTP after successful verification
        setTimeout(() => {
            otpStore.delete(phone);
        }, 10000); // Clean up after 10 seconds
        
        res.json({
            success: true,
            message: 'OTP verified successfully',
            user: {
                phone: phone,
                email: `${phone}@customer.local`,
                name: `Customer ${phone}`,
                isFirstLogin: !deviceData || deviceData.status === 'Not Found',
                deviceData: deviceData
            }
        });
        
    } catch (error) {
        console.error('❌ Error verifying OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP. Please try again.'
        });
    }
});

// API: Debug Session (for development/debugging)
router.get('/debug/session', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    
    try {
        res.json({
            success: true,
            sessionID: req.sessionID,
            sessionData: req.session,
            phone: req.session && req.session.phone,
            cookies: req.headers.cookie,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting session debug info',
            error: error.message
        });
    }
});

// API: Clear Session (for development/debugging)
router.post('/debug/clear-session', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    
    try {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to clear session',
                    error: err.message
                });
            }
            
            res.clearCookie('connect.sid');
            res.json({
                success: true,
                message: 'Session cleared successfully'
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error clearing session',
            error: error.message
        });
    }
});

// API: Check OTP Status (for development/debugging)
router.get('/otp/status/:phone', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    
    try {
        const { phone } = req.params;
        const otpData = otpStore.get(phone);
        
        if (!otpData) {
            return res.json({
                success: true,
                data: { hasOTP: false }
            });
        }
        
        const timeLeft = Math.max(0, OTP_EXPIRY_TIME - (Date.now() - otpData.createdAt));
        
        res.json({
            success: true,
            data: {
                hasOTP: true,
                code: otpData.code,
                attempts: otpData.attempts,
                verified: otpData.verified,
                timeLeftMs: timeLeft,
                timeLeftSeconds: Math.ceil(timeLeft / 1000)
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking OTP status'
        });
    }
});

// API: Submit Trouble Report
router.post('/trouble-report', async (req, res) => {
    try {
        const phone = req.session && req.session.phone;
        
        if (!phone) {
            return res.status(401).json({
                success: false,
                message: 'Customer not logged in'
            });
        }
        
        const { issueType, description, contactName, location: locationFromBody } = req.body;
        
        // Map frontend data to backend format
        const category = issueType || 'Other Issues';
        const name = contactName || `Customer ${phone}`;
        
        // Determine location preference: client-provided > device-derived > default
        let location = (locationFromBody && String(locationFromBody).trim()) || 'Location not available';
        if (location === 'Location not available') {
            try {
                const device = await findDeviceByTag(phone);
                if (device) {
                    // Prefer structured location data if available
                    if (device.VirtualParameters?.location?._value) {
                        try {
                            const vpLoc = JSON.parse(device.VirtualParameters.location._value);
                            if (vpLoc?.address) {
                                location = vpLoc.address;
                            }
                        } catch (_) { /* ignore JSON parse errors */ }
                    }
                    // Fallback to human-readable tag value
                    if (location === 'Location not available' && Array.isArray(device._tags)) {
                        const tagLocation = device._tags.find(tag => typeof tag === 'string' && !/^\d+$/.test(tag) && !tag.startsWith('location:'));
                        if (tagLocation) {
                            location = tagLocation;
                        }
                        const locTag = device._tags.find(tag => typeof tag === 'string' && tag.startsWith('location:'));
                        if (location === 'Location not available' && locTag) {
                            try {
                                const parsed = JSON.parse(locTag.replace('location:', ''));
                                if (parsed?.address) {
                                    location = parsed.address;
                                }
                            } catch (_) { /* ignore */ }
                        }
                    }
                }
            } catch (err) {
                console.warn('Could not get device location:', err.message);
            }
        }
        
        // Validate required fields
        if (!phone || !category || !description) {
            return res.status(400).json({
                success: false,
                message: 'Phone, category, and description are required'
            });
        }
        
        console.log(`🎫 New trouble report from customer portal:`, {
            phone,
            name,
            location,
            category,
            description: description.substring(0, 100) + '...'
        });
        
        // Create trouble report using the existing function
        const report = createTroubleReport({
            phone,
            name,
            location,
            category,
            description
        });
        
        if (!report) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create trouble report'
            });
        }
        
        console.log(`✅ Trouble report created successfully: ${report.id}`);
        
        res.json({
            success: true,
            message: 'Trouble report submitted successfully. Our technical team will contact you soon.',
            reportId: report.id,
            data: {
                ticketId: report.id,
                status: report.status,
                estimatedResponse: '2-4 hours',
                category
            }
        });
        
    } catch (error) {
        console.error('❌ Error submitting trouble report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit trouble report. Please try again.'
        });
    }
});

// API: Test Trouble Report (Fallback endpoint)
router.get('/trouble/test', async (req, res) => {
    try {
        const phone = req.session && req.session.phone;
        
        if (!phone) {
            return res.status(401).json({
                success: false,
                message: 'Customer not logged in'
            });
        }
        
        const { name, location, category, description } = req.query;
        
        // Validate required fields
        if (!name || !phone || !location || !category || !description) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        // Generate test report ID
        const reportId = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        console.log(`🧪 Test trouble report submitted (fallback):`, {
            reportId,
            phone,
            name,
            category
        });
        
        res.json({
            success: true,
            message: 'Test report submitted successfully via fallback endpoint.',
            reportId: reportId
        });
        
    } catch (error) {
        console.error('❌ Error in test trouble report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit test report'
        });
    }
});

// API: Get Customer Trouble Reports  
router.get('/trouble-reports/:phone', async (req, res) => {
    try {
        const sessionPhone = req.session && req.session.phone;
        const requestPhone = req.params.phone;
        
        if (!sessionPhone) {
            return res.status(401).json({
                success: false,
                message: 'Customer not logged in'
            });
        }
        
        // Security check: ensure customer can only access their own reports
        if (sessionPhone !== requestPhone) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        console.log(`📋 Fetching trouble reports for customer: ${sessionPhone}`);
        
        // Use the real function to get reports from JSON file
        const reports = getTroubleReportsByPhone(sessionPhone);
        
        // Map to frontend expected format (include raw status, Indonesian label, notes)
        const mappedReports = reports.map(report => ({
            id: report.id,
            phone: report.phone,
            issueType: report.category,
            description: report.description,
            status: mapStatusToFrontend(report.status),
            statusRaw: report.status,
            statusLabel: mapStatusLabelId(report.status),
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
            resolvedAt: report.status === 'resolved' || report.status === 'closed' ? report.updatedAt : undefined,
            notes: Array.isArray(report.notes) ? report.notes : []
        }));
        
        res.json({
            success: true,
            reports: mappedReports,
            total: mappedReports.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching trouble reports:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reports'
        });
    }
});

// Helper function to map backend status to frontend status
function mapStatusToFrontend(backendStatus) {
    const statusMap = {
        'open': 'pending',
        'in_progress': 'in-progress', 
        'resolved': 'resolved',
        'closed': 'resolved'
    };
    return statusMap[backendStatus] || 'pending';
}

// Helper: Indonesian status label
function mapStatusLabelId(backendStatus) {
    const labelMap = {
        'open': 'Belum Ditangani',
        'in_progress': 'Sedang Ditangani',
        'resolved': 'Terselesaikan',
        'closed': 'Ditutup'
    };
    return labelMap[backendStatus] || 'Belum Ditangani';
}

// API: Restart Device
router.post('/restart-device', async (req, res) => {
    try {
        const phone = req.session && req.session.phone;
        
        if (!phone) {
            return res.status(401).json({
                success: false,
                message: 'Customer not logged in'
            });
        }
        
        console.log(`🔄 Device restart requested for customer: ${phone}`);
        
        // Find device by phone
        const device = await findDeviceByTag(phone);
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found for this customer'
            });
        }
        
        const deviceId = device._id;
        console.log(`🔄 Sending reboot task for device: ${deviceId}`);
        
        console.log(`📦 Using reboot function from genieacs.js`);
        
        // Gunakan fungsi reboot yang sudah ada dan teruji
        const { reboot } = require('../config/genieacs');
        const result = await reboot(deviceId);
        
        if (result.success) {
            console.log(`✅ Restart task sent successfully:`, result);
            
            // Kirim notifikasi WhatsApp
            try {
                const { sendDeviceRestartNotification } = require('../config/whatsapp-device-notifications');
                // Ambil model device jika tersedia
                const deviceModel = device?.InternetGatewayDevice?.DeviceInfo?.ModelName?._value || 'Unknown';
                const notificationResult = await sendDeviceRestartNotification(phone, deviceModel);
                console.log(`📩 WhatsApp notification result:`, notificationResult);
            } catch (notifError) {
                console.warn(`⚠️  Failed to send WhatsApp notification:`, notifError);
                // Jangan gagalkan request karena notifikasi error
            }
            
            res.json({
                success: true,
                message: 'Device restart initiated successfully. Please wait 2-3 minutes for the device to come back online.',
                taskId: result.taskId,
                processingTime: result.processingTime
            });
        } else {
            throw new Error('Failed to send restart command to device');
        }
        
    } catch (error) {
        console.error('❌ Error restarting device:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to restart device. Please try again later.'
        });
    }
});

// API: Change SSID 2G
router.post('/change-ssid-2g', async (req, res) => {
    try {
        const phone = req.session && req.session.phone;
        const { ssid2g } = req.body;
        
        if (!phone) {
            return res.status(401).json({
                success: false,
                message: 'Customer not logged in'
            });
        }
        
        if (!ssid2g || ssid2g.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'SSID 2G cannot be empty'
            });
        }
        
        if (ssid2g.length > 32) {
            return res.status(400).json({
                success: false,
                message: 'SSID 2G must be 32 characters or less'
            });
        }
        
        console.log(`📶 SSID 2G change requested for customer ${phone}: ${ssid2g}`);
        
        // Find device by phone
        const device = await findDeviceByTag(phone);
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found for this customer'
            });
        }
        
        // Send setParameterValues task to GenieACS
        const { genieacsUrl, genieacsUsername, genieacsPassword } = getGenieacsConfig();
        const deviceId = device._id;
        
        console.log(`🔧 GenieACS Config: ${genieacsUrl}, User: ${genieacsUsername}`);
        console.log(`🎠 Device ID: ${deviceId}`);
        
        console.log(`📦 Using setParameterValues function from genieacs.js`);
        console.log(`📦 Parameters:`, { 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID': ssid2g });
        
        // Gunakan setParameterValues yang sudah ada dan teruji
        const { setParameterValues } = require('../config/genieacs');
        const result = await setParameterValues(deviceId, {
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID': ssid2g
        });
        
        if (result.success) {
            console.log(`✅ SSID 2G change task sent successfully:`, result);
            
            // Kirim notifikasi WhatsApp
            try {
                const { sendSSID2GChangeNotification } = require('../config/whatsapp-device-notifications');
                const notificationResult = await sendSSID2GChangeNotification(phone, ssid2g);
                console.log(`📩 WhatsApp notification result:`, notificationResult);
            } catch (notifError) {
                console.warn(`⚠️  Failed to send WhatsApp notification:`, notifError);
                // Jangan gagalkan request karena notifikasi error
            }
            
            res.json({
                success: true,
                message: `SSID 2G changed to "${ssid2g}" successfully. Please reconnect your devices.`,
                processingTime: result.processingTime,
                mode: result.mode,
                onuType: result.onuType
            });
        } else {
            throw new Error('Failed to send SSID change command to device');
        }
        
    } catch (error) {
        console.error('❌ Error changing SSID 2G:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change SSID 2G. Please try again later.'
        });
    }
});

// API: Change SSID 5G
router.post('/change-ssid-5g', async (req, res) => {
    try {
        const phone = req.session && req.session.phone;
        const { ssid5g } = req.body;
        
        if (!phone) {
            return res.status(401).json({
                success: false,
                message: 'Customer not logged in'
            });
        }
        
        if (!ssid5g || ssid5g.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'SSID 5G cannot be empty'
            });
        }
        
        if (ssid5g.length > 32) {
            return res.status(400).json({
                success: false,
                message: 'SSID 5G must be 32 characters or less'
            });
        }
        
        console.log(`📶 SSID 5G change requested for customer ${phone}: ${ssid5g}`);
        
        // Find device by phone
        const device = await findDeviceByTag(phone);
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found for this customer'
            });
        }
        
        const deviceId = device._id;
        console.log(`🔧 SSID 5G change for device: ${deviceId}, SSID: ${ssid5g}`);
        
        console.log(`📦 Using setParameterValues function from genieacs.js`);
        console.log(`📦 Parameters:`, { 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID': ssid5g });
        
        // Gunakan setParameterValues yang sudah ada dan teruji
        const { setParameterValues } = require('../config/genieacs');
        const result = await setParameterValues(deviceId, {
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID': ssid5g
        });
        
        if (result.success) {
            console.log(`✅ SSID 5G change task sent successfully:`, result);
            
            // Kirim notifikasi WhatsApp
            try {
                const { sendSSID5GChangeNotification } = require('../config/whatsapp-device-notifications');
                const notificationResult = await sendSSID5GChangeNotification(phone, ssid5g);
                console.log(`📩 WhatsApp notification result:`, notificationResult);
            } catch (notifError) {
                console.warn(`⚠️  Failed to send WhatsApp notification:`, notifError);
                // Jangan gagalkan request karena notifikasi error
            }
            
            res.json({
                success: true,
                message: `SSID 5G changed to "${ssid5g}" successfully. Please reconnect your devices.`,
                processingTime: result.processingTime,
                mode: result.mode,
                onuType: result.onuType
            });
        } else {
            throw new Error('Failed to send SSID 5G change command to device');
        }
        
    } catch (error) {
        console.error('❌ Error changing SSID 5G:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change SSID 5G. Please try again later.'
        });
    }
});

// API: Change Password 2G
router.post('/change-password-2g', async (req, res) => {
    try {
        const phone = req.session && req.session.phone;
        const { password2g } = req.body;
        
        if (!phone) {
            return res.status(401).json({
                success: false,
                message: 'Customer not logged in'
            });
        }
        
        if (!password2g || password2g.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Password 2G cannot be empty'
            });
        }
        
        if (password2g.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password 2G must be at least 8 characters long'
            });
        }
        
        if (password2g.length > 32) {
            return res.status(400).json({
                success: false,
                message: 'Password 2G must be 32 characters or less'
            });
        }
        
        console.log(`🔐 Password 2G change requested for customer ${phone}`);
        
        // Find device by phone
        const device = await findDeviceByTag(phone);
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found for this customer'
            });
        }
        
        const deviceId = device._id;
        console.log(`🔐 Password 2G change for device: ${deviceId}`);
        
        console.log(`📦 Using setParameterValues function from genieacs.js (password hidden for security)`);
        
        // Gunakan setParameterValues yang sudah ada dan teruji
        const { setParameterValues } = require('../config/genieacs');
        const result = await setParameterValues(deviceId, {
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase': password2g
        });
        
        if (result.success) {
            console.log(`✅ Password 2G change task sent successfully:`, { ...result, parameters: '***hidden***' });
            
            // Kirim notifikasi WhatsApp
            try {
                const { sendPassword2GChangeNotification } = require('../config/whatsapp-device-notifications');
                const notificationResult = await sendPassword2GChangeNotification(phone, password2g);
                console.log(`📩 WhatsApp notification result:`, notificationResult);
            } catch (notifError) {
                console.warn(`⚠️  Failed to send WhatsApp notification:`, notifError);
                // Jangan gagalkan request karena notifikasi error
            }
            
            res.json({
                success: true,
                message: 'Password 2G changed successfully. Please reconnect your devices with the new password.',
                processingTime: result.processingTime,
                mode: result.mode,
                onuType: result.onuType
            });
        } else {
            throw new Error('Failed to send password 2G change command to device');
        }
        
    } catch (error) {
        console.error('❌ Error changing password 2G:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password 2G. Please try again later.'
        });
    }
});

// API: Change Password 5G
router.post('/change-password-5g', async (req, res) => {
    try {
        const phone = req.session && req.session.phone;
        const { password5g } = req.body;
        
        if (!phone) {
            return res.status(401).json({
                success: false,
                message: 'Customer not logged in'
            });
        }
        
        if (!password5g || password5g.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Password 5G cannot be empty'
            });
        }
        
        if (password5g.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password 5G must be at least 8 characters long'
            });
        }
        
        if (password5g.length > 32) {
            return res.status(400).json({
                success: false,
                message: 'Password 5G must be 32 characters or less'
            });
        }
        
        console.log(`🔐 Password 5G change requested for customer ${phone}`);
        
        // Find device by phone
        const device = await findDeviceByTag(phone);
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found for this customer'
            });
        }
        
        const deviceId = device._id;
        console.log(`🔐 Password 5G change for device: ${deviceId}`);
        
        console.log(`📦 Using setParameterValues function from genieacs.js (password hidden for security)`);
        
        // Gunakan setParameterValues yang sudah ada dan teruji
        const { setParameterValues } = require('../config/genieacs');
        const result = await setParameterValues(deviceId, {
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase': password5g
        });
        
        if (result.success) {
            console.log(`✅ Password 5G change task sent successfully:`, { ...result, parameters: '***hidden***' });
            
            // Kirim notifikasi WhatsApp
            try {
                const { sendPassword5GChangeNotification } = require('../config/whatsapp-device-notifications');
                const notificationResult = await sendPassword5GChangeNotification(phone, password5g);
                console.log(`📩 WhatsApp notification result:`, notificationResult);
            } catch (notifError) {
                console.warn(`⚠️  Failed to send WhatsApp notification:`, notifError);
                // Jangan gagalkan request karena notifikasi error
            }
            
            res.json({
                success: true,
                message: 'Password 5G changed successfully. Please reconnect your devices with the new password.',
                processingTime: result.processingTime,
                mode: result.mode,
                onuType: result.onuType
            });
        } else {
            throw new Error('Failed to send password 5G change command to device');
        }
        
    } catch (error) {
        console.error('❌ Error changing password 5G:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password 5G. Please try again later.'
        });
    }
});

// API: Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Failed to logout'
            });
        }
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    });
});

module.exports = router;
