/**
 * Find all shipping rates in Shopify
 * This script queries the Shopify API to find all shipping rates
 * 
 * Usage:
 *   node src/scripts/findShippingRates.js
 */

require('dotenv').config();
const axios = require('axios');
const { getAdminApiUrl, getAdminHeaders } = require('../config/shopify');

async function findShippingRates() {
  try {
    console.log('🔍 Searching for all shipping rates in Shopify...\n');
    
    const apiUrl = getAdminApiUrl();
    const headers = getAdminHeaders();
    
    // Get all shipping zones
    console.log('📦 Fetching shipping zones...');
    const zonesResponse = await axios.get(
      `${apiUrl}/shipping_zones.json`,
      { headers }
    );
    
    const zones = zonesResponse.data.shipping_zones || [];
    console.log(`Found ${zones.length} shipping zone(s)\n`);
    
    let foundRate = false;
    
    // Check each zone
    for (const zone of zones) {
      console.log(`\n📍 Zone: ${zone.name}`);
      console.log(`   ID: ${zone.id}`);
      console.log(`   Countries: ${zone.countries?.map(c => c.name).join(', ') || 'N/A'}`);
      
      // Get shipping rates for this zone
      try {
        const ratesResponse = await axios.get(
          `${apiUrl}/shipping_zones/${zone.id}/shipping_rates.json`,
          { headers }
        );
        
        const rates = ratesResponse.data.shipping_rates || [];
        
        if (rates.length === 0) {
          console.log(`   ⚠️  No shipping rates found in this zone`);
        } else {
          console.log(`   📊 Found ${rates.length} shipping rate(s):`);
          
          for (const rate of rates) {
            const price = rate.price ? (parseFloat(rate.price) / 100).toFixed(2) : 'N/A';
            const currency = rate.currency || 'N/A';
            
            console.log(`      • ${rate.name || 'Unnamed'}: $${price} ${currency}`);
            console.log(`        ID: ${rate.id}`);
            console.log(`        Type: ${rate.carrier_service_id ? 'Carrier Service' : 'Manual Rate'}`);
            
            if (price === '30.27' || price === '39.00') {
              console.log(`        ⚠️  FOUND THE RATE! This is the $${price} rate you're looking for!`);
              foundRate = true;
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Error fetching rates: ${error.message}`);
      }
    }
    
    // Get carrier services
    console.log(`\n\n📦 Fetching carrier services...`);
    try {
      const carrierResponse = await axios.get(
        `${apiUrl}/carrier_services.json`,
        { headers }
      );
      
      const carriers = carrierResponse.data.carrier_services || [];
      console.log(`Found ${carriers.length} carrier service(s):`);
      
      for (const carrier of carriers) {
        console.log(`   • ${carrier.name}`);
        console.log(`     ID: ${carrier.id}`);
        console.log(`     Callback URL: ${carrier.callback_url}`);
      }
    } catch (error) {
      console.log(`   ❌ Error fetching carrier services: ${error.message}`);
    }
    
    if (!foundRate) {
      console.log(`\n\n⚠️  Could not find $30.27 or $39.00 rate in shipping zones.`);
      console.log(`   The rate might be:`);
      console.log(`   • Coming from a shipping app`);
      console.log(`   • Calculated dynamically (weight/distance based)`);
      console.log(`   • A default Shopify rate`);
      console.log(`   • In market-specific settings`);
      console.log(`\n   Solution: Use CSS/JavaScript to hide it (see FIND_THEME_RATE.md)`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

findShippingRates();

