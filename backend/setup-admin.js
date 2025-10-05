#!/usr/bin/env node

/**
 * Setup script for initial admin configuration
 * This script helps set up secure admin credentials for first-time use
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function generateSecureSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function question(prompt) {
  return new Promise((resolve, reject) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      rl.close();
      reject(new Error('Setup timeout - using default values'));
    }, 30000);
  });
}

async function setupAdmin() {
  console.log('🔐 Admin Setup Script');
  console.log('=====================\n');

  try {
    // Check if .env exists
    let envExists = fs.existsSync(envPath);
    let envContent = '';

    if (envExists) {
      envContent = fs.readFileSync(envPath, 'utf-8');
      console.log('✅ Found existing .env file');
    } else {
      console.log('📝 Creating new .env file from template...');
      const exampleContent = fs.readFileSync(envExamplePath, 'utf-8');
      fs.writeFileSync(envPath, exampleContent);
      envContent = exampleContent;
      envExists = true;
    }

    // Parse current env content
    const envLines = envContent.split('\n');
    const envVars = {};

    envLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=');
        }
      }
    });

    // Generate secure session secret
    console.log('\n🔑 Generating secure session secret...');
    const sessionSecret = generateSecureSecret(32);
    envVars['SESSION_SECRET'] = sessionSecret;
    console.log('✅ Session secret generated');

    // Setup admin password
    console.log('\n👤 Admin Password Setup');
    console.log('----------------------');

    let passwordSet = false;
    if (envVars['ADMIN_PASSWORD'] && envVars['ADMIN_PASSWORD'] !== 'LetmeKnow@247') {
      console.log('⚠️  Admin password already set. Do you want to change it?');
      const change = await question('Change admin password? (y/N): ');
      if (change.toLowerCase() === 'y' || change.toLowerCase() === 'yes') {
        passwordSet = true;
      }
    } else {
      passwordSet = true;
    }

    if (passwordSet) {
      while (true) {
        const password = await question('Enter new admin password (min 8 characters): ');
        const confirmPassword = await question('Confirm admin password: ');

        if (password !== confirmPassword) {
          console.log('❌ Passwords do not match. Please try again.');
          continue;
        }

        if (password.length < 8) {
          console.log('❌ Password must be at least 8 characters long.');
          continue;
        }

        console.log('🔒 Hashing password...');
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        envVars['ADMIN_PASSWORD'] = hashedPassword;
        console.log('✅ Admin password hashed and set');
        break;
      }
    }

    // Update .env file
    console.log('\n💾 Updating .env file...');

    const updatedLines = envLines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('SESSION_SECRET=')) {
        return `SESSION_SECRET=${sessionSecret}`;
      }
      if (trimmed.startsWith('ADMIN_PASSWORD=') && passwordSet) {
        return `ADMIN_PASSWORD=${envVars['ADMIN_PASSWORD']}`;
      }
      return line;
    });

    fs.writeFileSync(envPath, updatedLines.join('\n'));
    console.log('✅ .env file updated successfully');

    // Create settings.json with hashed password for backward compatibility
    const settingsPath = path.join(__dirname, 'settings.json');
    let settings = {};

    try {
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      }
    } catch (e) {
      // Ignore parse errors
    }

    if (passwordSet) {
      settings['admin_password'] = envVars['ADMIN_PASSWORD'];
      settings['admin_username'] = envVars['ADMIN_USERNAME'] || 'administrator';
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log('✅ settings.json updated with hashed password');

    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Session Secret: Generated (${sessionSecret.length} chars)`);
    if (passwordSet) {
      console.log('   - Admin Password: Set and hashed');
    }
    console.log('\n🚀 You can now start the application with: npm run dev');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup if called directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔐 Admin Setup Script

Usage:
  node setup-admin.js                    # Interactive setup
  node setup-admin.js --auto [password]  # Auto setup with password
  node setup-admin.js --generate-secret  # Generate session secret only

Examples:
  node setup-admin.js
  node setup-admin.js --auto MySecurePass123
  node setup-admin.js --generate-secret

This script will:
- Generate a secure session secret
- Set up admin password with bcrypt hashing
- Update .env and settings.json files
`);
    process.exit(0);
  }

  if (args.includes('--generate-secret')) {
    console.log('🔑 Generated Session Secret:', generateSecureSecret(32));
    process.exit(0);
  }

  if (args.includes('--auto')) {
    const passwordIndex = args.indexOf('--auto') + 1;
    const autoPassword = args[passwordIndex];

    if (!autoPassword || autoPassword.length < 8) {
      console.error('❌ Auto setup requires a password of at least 8 characters');
      console.log('Example: node setup-admin.js --auto MySecurePass123');
      process.exit(1);
    }

    // Auto setup mode
    console.log('🔐 Auto Admin Setup');
    console.log('===================');

    try {
      // Check if .env exists
      let envExists = fs.existsSync(envPath);
      let envContent = '';

      if (envExists) {
        envContent = fs.readFileSync(envPath, 'utf-8');
        console.log('✅ Found existing .env file');
      } else {
        console.log('📝 Creating new .env file from template...');
        const exampleContent = fs.readFileSync(envExamplePath, 'utf-8');
        fs.writeFileSync(envPath, exampleContent);
        envContent = exampleContent;
        envExists = true;
      }

      // Parse current env content
      const envLines = envContent.split('\n');
      const envVars = {};

      envLines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            envVars[key] = valueParts.join('=');
          }
        }
      });

      // Generate secure session secret
      console.log('🔑 Generating secure session secret...');
      const sessionSecret = generateSecureSecret(32);
      envVars['SESSION_SECRET'] = sessionSecret;
      console.log('✅ Session secret generated');

      // Hash password
      console.log('🔒 Hashing password...');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(autoPassword, saltRounds);
      envVars['ADMIN_PASSWORD'] = hashedPassword;
      console.log('✅ Admin password hashed and set');

      // Update .env file
      console.log('💾 Updating .env file...');
      const updatedLines = envLines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('SESSION_SECRET=')) {
          return `SESSION_SECRET=${sessionSecret}`;
        }
        if (trimmed.startsWith('ADMIN_PASSWORD=')) {
          return `ADMIN_PASSWORD=${hashedPassword}`;
        }
        return line;
      });

      fs.writeFileSync(envPath, updatedLines.join('\n'));
      console.log('✅ .env file updated successfully');

      // Create settings.json with hashed password
      const settingsPath = path.join(__dirname, 'settings.json');
      let settings = {};

      try {
        if (fs.existsSync(settingsPath)) {
          settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        }
      } catch (e) {
        // Ignore parse errors
      }

      settings['admin_password'] = hashedPassword;
      settings['admin_username'] = envVars['ADMIN_USERNAME'] || 'administrator';

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      console.log('✅ settings.json updated with hashed password');

      console.log('\n🎉 Auto setup completed successfully!');
      console.log('\n📋 Summary:');
      console.log(`   - Session Secret: Generated (${sessionSecret.length} chars)`);
      console.log('   - Admin Password: Set and hashed');
      console.log('\n🚀 You can now start the application with: npm run dev');

    } catch (error) {
      console.error('❌ Auto setup failed:', error.message);
      process.exit(1);
    }
  } else {
    // Interactive mode
    setupAdmin().catch(error => {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    });
  }
}

module.exports = { setupAdmin, generateSecureSecret };