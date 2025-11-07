/**
 * Script to register Carrier Service with Shopify
 * Run this script after deploying your app to get a public HTTPS URL
 * 
 * Usage:
 *   node src/scripts/registerCarrierService.js
 * 
 * Or with npm:
 *   npm run register-carrier
 */

require('dotenv').config();
const { registerCarrierService, getCarrierServices } = require('../services/shopifyService');
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
    
    // Check if carrier service already exists
    console.log('\n📋 Checking existing carrier services...');
    try {
      const existingServices = await getCarrierServices();
      console.log(`Found ${existingServices.length} existing carrier service(s)`);
      
      const harbourLaneService = existingServices.find(
        service => service.name === 'Harbour Lane Delivery'
      );
      
      if (harbourLaneService) {
        console.log(`\n⚠️  Carrier service already exists:`);
        console.log(`   ID: ${harbourLaneService.id}`);
        console.log(`   Name: ${harbourLaneService.name}`);
        console.log(`   Callback URL: ${harbourLaneService.callback_url}`);
        console.log(`\n💡 To update it, delete it from Shopify Admin first, or update it manually.`);
        return;
      }
    } catch (error) {
      console.log('Could not check existing services:', error.message);
    }
    
    // Register carrier service
    // Normalize URL: remove trailing slash if present
    const baseUrl = shopifyConfig.appBaseUrl.replace(/\/+$/, '');
    const callbackUrl = `${baseUrl}/carrier/rates`;
    console.log(`\n📦 Registering carrier service...`);
    console.log(`   Callback URL: ${callbackUrl}`);
    
    const carrierService = await registerCarrierService(callbackUrl);
    
    console.log(`\n✅ Carrier service registered successfully!`);
    console.log(`   ID: ${carrierService.id}`);
    console.log(`   Name: ${carrierService.name}`);
    console.log(`   Callback URL: ${carrierService.callback_url}`);
    console.log(`\n🎉 Your shipping module is now active!`);
    console.log(`   Test it by adding a product to cart and going to checkout.`);
    
  } catch (error) {
    console.error('\n❌ Error registering carrier service:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();

