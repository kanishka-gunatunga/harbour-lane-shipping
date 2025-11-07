/**
 * Start HTTPS tunnel using localtunnel
 * This creates a public HTTPS URL that Shopify can call
 * 
 * Usage:
 *   node src/scripts/startTunnel.js
 * 
 * Or with npm:
 *   npm run tunnel
 */

require('dotenv').config();
const localtunnel = require('localtunnel');
const { writeFileSync, readFileSync } = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;
const TUNNEL_SUBDOMAIN = process.env.TUNNEL_SUBDOMAIN || null; // Optional: use a specific subdomain

async function startTunnel() {
  try {
    console.log('🚇 Starting HTTPS tunnel...');
    console.log(`   Local port: ${PORT}`);
    
    // Check if server is running
    const http = require('http');
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${PORT}/health`, (res) => {
          resolve();
        });
        req.on('error', (err) => {
          reject(err);
        });
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error('Server not responding'));
        });
      });
      console.log('✅ Server is running on port', PORT);
    } catch (err) {
      console.error('\n❌ Server is not running on port', PORT);
      console.error('   Please start your server first: npm start');
      console.error('   Then run this tunnel script again.\n');
      process.exit(1);
    }
    
    const tunnel = await localtunnel({
      port: PORT,
      subdomain: TUNNEL_SUBDOMAIN // null = random subdomain
    });
    
    const tunnelUrl = tunnel.url;
    console.log(`\n✅ Tunnel is active!`);
    console.log(`   Public URL: ${tunnelUrl}`);
    console.log(`   Carrier Rates: ${tunnelUrl}/carrier/rates`);
    
    // Update .env file with new URL
    const envPath = path.join(__dirname, '../../.env');
    try {
      let envContent = '';
      try {
        envContent = readFileSync(envPath, 'utf8');
      } catch (err) {
        // .env doesn't exist, create it
        console.log('\n⚠️  .env file not found. Creating new .env file...');
      }
      
      // Update or add APP_BASE_URL
      if (envContent.includes('APP_BASE_URL=')) {
        envContent = envContent.replace(
          /APP_BASE_URL=.*/,
          `APP_BASE_URL=${tunnelUrl}`
        );
      } else {
        envContent += `\nAPP_BASE_URL=${tunnelUrl}\n`;
      }
      
      writeFileSync(envPath, envContent);
      console.log(`\n✅ Updated .env file with new APP_BASE_URL`);
      console.log(`\n📝 Next steps:`);
      console.log(`   1. Register carrier service: npm run register-carrier`);
      console.log(`   2. Test endpoint: curl -X POST ${tunnelUrl}/carrier/rates -H "Content-Type: application/json" -d '{"rate":{"destination":{"postal_code":"2000","country":"AU"}}}'`);
    } catch (err) {
      console.log(`\n⚠️  Could not update .env file: ${err.message}`);
      console.log(`   Please manually update APP_BASE_URL=${tunnelUrl} in your .env file`);
    }
    
    // Handle tunnel errors
    tunnel.on('error', (err) => {
      console.error('\n❌ Tunnel error:', err.message);
      if (err.message.includes('connection refused') || err.message.includes('ECONNREFUSED')) {
        console.error('   This usually means the server is not running on port', PORT);
        console.error('   Make sure to run: npm start');
      } else if (err.message.includes('firewall')) {
        console.error('   Check your firewall settings or try a different port');
      }
      process.exit(1);
    });
    
    // Handle tunnel close
    tunnel.on('close', () => {
      console.log('\n⚠️  Tunnel closed. Restart this script to get a new URL.');
      process.exit(0);
    });
    
    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Closing tunnel...');
      tunnel.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n\n🛑 Closing tunnel...');
      tunnel.close();
      process.exit(0);
    });
    
    console.log(`\n💡 Keep this terminal open while developing.`);
    console.log(`   Press Ctrl+C to stop the tunnel.\n`);
    
  } catch (error) {
    console.error('\n❌ Error starting tunnel:', error.message);
    if (error.message.includes('subdomain')) {
      console.error('   The subdomain might be taken. Try a different one or leave TUNNEL_SUBDOMAIN empty.');
    }
    process.exit(1);
  }
}

startTunnel();

