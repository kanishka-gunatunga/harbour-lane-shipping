/**
 * Update existing Carrier Service URL with Shopify
 * Use this when your tunnel URL changes
 * 
 * Usage:
 *   node src/scripts/updateCarrierService.js
 * 
 * Or with npm:
 *   npm run update-carrier
 */

require('dotenv').config();
const { updateCarrierService, getCarrierServices } = require('../services/shopifyService');
const { shopifyConfig } = require('../config/shopify');

async function main() {
  try {
    console.log('🔍 Checking Shopify configuration...');
    
    if (!shopifyConfig.storeDomain) {
      throw new Error('SHOPIFY_STORE_DOMAIN is not set in .env');
    }
    
    if (!shopifyConfig.accessToken) {
      throw new Error('SHOPIFY_ACCESS_TOKEN is not set in .env');
    }
    
    if (!shopifyConfig.appBaseUrl) {
      throw new Error('APP_BASE_URL is not set in .env');
    }
    
    console.log(`✅ Store: ${shopifyConfig.storeDomain}`);
    console.log(`✅ App URL: ${shopifyConfig.appBaseUrl}`);
    
    // Find existing carrier service
    console.log('\n📋 Finding existing carrier service...');
    const existingServices = await getCarrierServices();
    console.log(`Found ${existingServices.length} existing carrier service(s)`);
    
    const harbourLaneService = existingServices.find(
      service => service.name === 'Harbour Lane Delivery'
    );
    
    if (!harbourLaneService) {
      console.log('\n❌ Harbour Lane Delivery carrier service not found.');
      console.log('   Run "npm run register-carrier" to create it first.');
      return;
    }
    
    console.log(`\n📦 Found carrier service:`);
    console.log(`   ID: ${harbourLaneService.id}`);
    console.log(`   Name: ${harbourLaneService.name}`);
    console.log(`   Current URL: ${harbourLaneService.callback_url}`);
    
    // Update carrier service
    // Normalize URL: remove trailing slash if present
    const baseUrl = shopifyConfig.appBaseUrl.replace(/\/+$/, '');
    const callbackUrl = `${baseUrl}/carrier/rates`;
    
    if (harbourLaneService.callback_url === callbackUrl) {
      console.log(`\n✅ Carrier service URL is already up to date!`);
      console.log(`   URL: ${callbackUrl}`);
      return;
    }
    
    console.log(`\n🔄 Updating carrier service...`);
    console.log(`   New URL: ${callbackUrl}`);
    
    const updatedService = await updateCarrierService(harbourLaneService.id, callbackUrl);
    
    console.log(`\n✅ Carrier service updated successfully!`);
    console.log(`   ID: ${updatedService.id}`);
    console.log(`   Name: ${updatedService.name}`);
    console.log(`   Callback URL: ${updatedService.callback_url}`);
    console.log(`\n🎉 Your shipping module is now active with the new URL!`);
    
  } catch (error) {
    console.error('\n❌ Error updating carrier service:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();

