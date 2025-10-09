const express = require('express');
const router = express.Router();
const security = require('../middleware/security');
const { findDeviceByTag } = require('../config/addWAN');
const { getSetting } = require('../config/settingsManager');
const { getCustomerDeviceData } = require('./customerPortal');
const axios = require('axios');

// Apply security middleware
router.use(security.securityLogger);
router.use(security.developmentRateLimitBypass);

// Debug endpoint: Test GenieACS connection (Admin only)
router.get('/genieacs/connection', async (req, res) => {
    // Admin authentication required for debug endpoints
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    try {
        const genieacsUrl = getSetting('genieacs_url', 'http://localhost:7557');
        const username = getSetting('genieacs_username', 'admin');
        const password = getSetting('genieacs_password', 'admin');
        
        console.log('Testing GenieACS connection...');
        console.log('URL:', genieacsUrl);
        console.log('Username:', username);
        
        const response = await axios.get(`${genieacsUrl}/devices?limit=1`, {
            auth: { username, password },
            timeout: 5000
        });
        
        res.json({
            success: true,
            message: 'GenieACS connection successful',
            url: genieacsUrl,
            status: response.status,
            devicesCount: response.data ? response.data.length : 0,
            sampleData: response.data && response.data.length > 0 ? {
                deviceId: response.data[0]._id,
                tags: response.data[0]._tags || []
            } : null
        });
        
    } catch (error) {
        console.error('GenieACS connection error:', error);
        
        res.status(500).json({
            success: false,
            message: 'GenieACS connection failed',
            error: error.message,
            url: getSetting('genieacs_url', 'http://localhost:7557'),
            details: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : null
        });
    }
});

// Debug endpoint: List all devices with tags (Admin only)
router.get('/genieacs/devices', async (req, res) => {
    // Admin authentication required
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    try {
        const genieacsUrl = getSetting('genieacs_url', 'http://localhost:7557');
        const username = getSetting('genieacs_username', 'admin');
        const password = getSetting('genieacs_password', 'admin');
        
        const response = await axios.get(`${genieacsUrl}/devices`, {
            auth: { username, password },
            timeout: 10000
        });
        
        const devicesWithTags = response.data
            .filter(device => device._tags && device._tags.length > 0)
            .map(device => ({
                id: device._id,
                tags: device._tags,
                lastInform: device._lastInform,
                serialNumber: device['DeviceID.SerialNumber']?._value || 'N/A'
            }));
        
        res.json({
            success: true,
            totalDevices: response.data.length,
            devicesWithTags: devicesWithTags.length,
            devices: devicesWithTags.slice(0, 10), // Show first 10
            allTags: [...new Set(devicesWithTags.flatMap(d => d.tags))] // Unique tags
        });
        
    } catch (error) {
        console.error('Error getting devices:', error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to get devices',
            error: error.message
        });
    }
});

// Debug endpoint: Test customer lookup by phone (Admin only)
router.get('/customer/:phone', [
    security.validationSchemas.phone,
    security.handleValidationErrors
], async (req, res) => {
    // Admin authentication required
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    try {
        const { phone } = req.params;
        
        console.log(`Testing customer lookup for phone: ${phone}`);
        
        // Test findDeviceByTag
        const device = await findDeviceByTag(phone);
        
        let deviceData = null;
        if (device) {
            try {
                deviceData = await getCustomerDeviceData(phone);
            } catch (error) {
                console.log('Error getting device data:', error.message);
            }
        }
        
        res.json({
            success: true,
            phone: phone,
            deviceFound: !!device,
            device: device ? {
                id: device._id,
                tags: device._tags || [],
                lastInform: device._lastInform,
                serialNumber: device['DeviceID.SerialNumber']?._value || 'N/A',
                connectionRequestURL: device['DeviceID.ConnectionRequestURL']?._value || 'N/A'
            } : null,
            deviceData: deviceData
        });
        
    } catch (error) {
        console.error('Customer lookup error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Customer lookup failed',
            error: error.message,
            phone: req.params.phone
        });
    }
});

// Debug endpoint: Test customer login (simplified) (Admin only)
router.post('/customer/test-login', [
    security.validationSchemas.phone,
    security.handleValidationErrors
], async (req, res) => {
    // Admin authentication required
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    try {
        const { phone } = req.body;
        
        console.log(`Testing login for phone: ${phone}`);
        
        // Step 1: Check GenieACS connection
        let genieacsStatus;
        try {
            const genieacsUrl = getSetting('genieacs_url', 'http://localhost:7557');
            const response = await axios.get(`${genieacsUrl}/devices?limit=1`, {
                auth: { 
                    username: getSetting('genieacs_username', 'admin'), 
                    password: getSetting('genieacs_password', 'admin') 
                },
                timeout: 3000
            });
            genieacsStatus = { connected: true, status: response.status };
        } catch (error) {
            genieacsStatus = { connected: false, error: error.message };
        }
        
        // Step 2: Find device
        const device = await findDeviceByTag(phone);
        
        // Step 3: Get device data if found
        let deviceData = null;
        if (device) {
            try {
                deviceData = await getCustomerDeviceData(phone);
            } catch (error) {
                console.log('Device data error:', error.message);
            }
        }
        
        // Step 4: Determine login result
        const canLogin = !!device;
        
        res.json({
            success: canLogin,
            message: canLogin ? 'Login would succeed' : 'Login would fail',
            phone: phone,
            steps: {
                genieacsConnection: genieacsStatus,
                deviceFound: !!device,
                deviceDataRetrieved: !!deviceData
            },
            device: device ? {
                id: device._id,
                tags: device._tags || []
            } : null,
            deviceData: deviceData,
            recommendation: !canLogin ? 
                'Add customer phone number as tag in GenieACS device management' : 
                'Customer can login successfully'
        });
        
    } catch (error) {
        console.error('Test login error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Test login failed',
            error: error.message
        });
    }
});

// Debug endpoint: Add test customer (development only, Admin only)
router.post('/customer/add-test', [
    security.validationSchemas.phone,
    security.handleValidationErrors
], async (req, res) => {
    // Admin authentication required
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            success: false,
            message: 'This endpoint is only available in development mode'
        });
    }
    
    try {
        const { phone, deviceId } = req.body;
        
        if (!phone || !deviceId) {
            return res.status(400).json({
                success: false,
                message: 'Phone and deviceId are required'
            });
        }
        
        const genieacsUrl = getSetting('genieacs_url', 'http://localhost:7557');
        const username = getSetting('genieacs_username', 'admin');
        const password = getSetting('genieacs_password', 'admin');
        
        // Try to add tag to device
        const response = await axios.post(
            `${genieacsUrl}/devices/${deviceId}/tags/${phone}`,
            {},
            {
                auth: { username, password }
            }
        );
        
        res.json({
            success: true,
            message: `Tag '${phone}' added to device ${deviceId}`,
            status: response.status
        });
        
    } catch (error) {
        console.error('Add test customer error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to add test customer',
            error: error.message,
            details: error.response ? error.response.data : null
        });
    }
});

module.exports = router;
