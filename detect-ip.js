const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Auto-detect server IP address
 * Prioritas: Ethernet > WiFi > lainnya
 */
function detectServerIP() {
    const interfaces = os.networkInterfaces();
    let serverIP = null;
    
    // Priority order: Ethernet, Wi-Fi, lainnya
    const priorityOrder = ['Ethernet', 'Wi-Fi', 'Wireless'];
    
    console.log('🔍 Available network interfaces:');
    for (const [name, addrs] of Object.entries(interfaces)) {
        console.log(`  ${name}:`);
        if (addrs) {
            addrs.forEach(addr => {
                if (addr.family === 'IPv4' && !addr.internal) {
                    console.log(`    - ${addr.address} (${addr.family})`);
                }
            });
        }
    }
    
    // Try to find best interface
    for (const priority of priorityOrder) {
        for (const [name, addrs] of Object.entries(interfaces)) {
            if (name.includes(priority) && addrs) {
                for (const addr of addrs) {
                    if (addr.family === 'IPv4' && !addr.internal) {
                        serverIP = addr.address;
                        console.log(`✅ Selected: ${name} - ${serverIP}`);
                        break;
                    }
                }
                if (serverIP) break;
            }
        }
        if (serverIP) break;
    }
    
    // Fallback: first non-internal IPv4
    if (!serverIP) {
        for (const [name, addrs] of Object.entries(interfaces)) {
            if (addrs) {
                for (const addr of addrs) {
                    if (addr.family === 'IPv4' && !addr.internal) {
                        serverIP = addr.address;
                        console.log(`📌 Fallback selected: ${name} - ${serverIP}`);
                        break;
                    }
                }
            }
            if (serverIP) break;
        }
    }
    
    return serverIP || 'localhost';
}

/**
 * Update .env file dengan SERVER_IP yang terdeteksi
 */
function updateEnvFile(detectedIP) {
    const envPath = path.join(__dirname, 'backend', '.env');
    
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env file not found at:', envPath);
        return false;
    }
    
    try {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update or add SERVER_IP
        if (envContent.includes('SERVER_IP=')) {
            envContent = envContent.replace(/SERVER_IP=.*/g, `SERVER_IP=${detectedIP}`);
        } else {
            envContent += `\nSERVER_IP=${detectedIP}\n`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log(`✅ Updated .env file: SERVER_IP=${detectedIP}`);
        return true;
    } catch (error) {
        console.error('❌ Error updating .env file:', error.message);
        return false;
    }
}

/**
 * Main function
 */
function main() {
    console.log('🚀 Auto-detecting server IP address...\n');
    
    const detectedIP = detectServerIP();
    
    if (detectedIP === 'localhost') {
        console.log('⚠️  Could not detect a suitable IP address. Using localhost.');
        console.log('💡 You may need to manually set SERVER_IP in .env file.');
    } else {
        console.log(`\n📍 Detected server IP: ${detectedIP}`);
        
        if (process.argv.includes('--update-env')) {
            updateEnvFile(detectedIP);
        } else {
            console.log('💡 To update .env file, run: node detect-ip.js --update-env');
        }
    }
    
    console.log('\n📝 Access URLs:');
    console.log(`   Admin Portal:    http://${detectedIP}:5432/admin/login`);
    console.log(`   Customer Portal: http://${detectedIP}:2345`);
    console.log(`   Backend API:     http://${detectedIP}:3003/api/health`);
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { detectServerIP, updateEnvFile };
