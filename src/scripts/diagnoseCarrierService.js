/**
 * Comprehensive Carrier Service Diagnostic Tool
 * Checks all aspects of carrier service configuration and health
 * 
 * Usage:
 *   node src/scripts/diagnoseCarrierService.js
 */

require('dotenv').config();
const axios = require('axios');
const { getCarrierServices, getAdminApiUrl, getAdminHeaders } = require('../services/shopifyService');
const { shopifyConfig } = require('../config/shopify');

async function diagnoseCarrierService() {
    console.log('🔍 Comprehensive Carrier Service Diagnostic\n');
    console.log('='.repeat(60));

    const issues = [];
    const warnings = [];
    const info = [];

    // 1. Check Environment Variables
    console.log('\n1️⃣  Checking Environment Variables...');
    if (!shopifyConfig.storeDomain) {
        issues.push('SHOPIFY_STORE_DOMAIN is not set');
        console.log('   ❌ SHOPIFY_STORE_DOMAIN: NOT SET');
    } else {
        console.log(`   ✅ SHOPIFY_STORE_DOMAIN: ${shopifyConfig.storeDomain}`);
    }

    if (!shopifyConfig.accessToken) {
        issues.push('SHOPIFY_ACCESS_TOKEN is not set');
        console.log('   ❌ SHOPIFY_ACCESS_TOKEN: NOT SET');
    } else {
        console.log(`   ✅ SHOPIFY_ACCESS_TOKEN: ${shopifyConfig.accessToken.substring(0, 10)}...`);
    }

    if (!shopifyConfig.appBaseUrl) {
        issues.push('APP_BASE_URL is not set');
        console.log('   ❌ APP_BASE_URL: NOT SET');
    } else {
        console.log(`   ✅ APP_BASE_URL: ${shopifyConfig.appBaseUrl}`);

        // Check if URL is HTTPS
        if (!shopifyConfig.appBaseUrl.startsWith('https://')) {
            warnings.push('APP_BASE_URL should be HTTPS in production');
            console.log('   ⚠️  APP_BASE_URL is not HTTPS (required for production)');
        }
    }

    // 2. Check Carrier Service Registration
    console.log('\n2️⃣  Checking Carrier Service Registration...');
    try {
        const services = await getCarrierServices();
        const harbourLaneService = services.find(s => s.name === 'Harbour Lane Delivery');

        if (!harbourLaneService) {
            issues.push('Harbour Lane Delivery carrier service not found');
            console.log('   ❌ Harbour Lane Delivery: NOT FOUND');
            console.log('   💡 Run: npm run register-carrier');
        } else {
            console.log(`   ✅ Harbour Lane Delivery: FOUND (ID: ${harbourLaneService.id})`);
            console.log(`   ✅ Active: ${harbourLaneService.active !== false ? 'Yes' : 'No'}`);
            console.log(`   ✅ Callback URL: ${harbourLaneService.callback_url}`);

            // Verify callback URL matches APP_BASE_URL
            const expectedUrl = `${shopifyConfig.appBaseUrl.replace(/\/+$/, '')}/carrier/rates`;
            if (harbourLaneService.callback_url !== expectedUrl) {
                issues.push(`Callback URL mismatch. Expected: ${expectedUrl}, Got: ${harbourLaneService.callback_url}`);
                console.log(`   ❌ Callback URL mismatch!`);
                console.log(`      Expected: ${expectedUrl}`);
                console.log(`      Current:  ${harbourLaneService.callback_url}`);
                console.log('   💡 Run: npm run update-carrier');
            } else {
                console.log(`   ✅ Callback URL matches APP_BASE_URL`);
            }
        }
    } catch (error) {
        issues.push(`Error checking carrier services: ${error.message}`);
        console.log(`   ❌ Error: ${error.message}`);
    }

    // 3. Check Shipping Zones
    console.log('\n3️⃣  Checking Shipping Zones...');
    try {
        const apiUrl = getAdminApiUrl();
        const headers = getAdminHeaders();

        const zonesResponse = await axios.get(`${apiUrl}/shipping_zones.json`, { headers });
        const zones = zonesResponse.data.shipping_zones || [];

        console.log(`   Found ${zones.length} shipping zone(s)`);

        let zonesWithCarrier = 0;
        let zonesWithoutCarrier = 0;

        for (const zone of zones) {
            try {
                const ratesResponse = await axios.get(
                    `${apiUrl}/shipping_zones/${zone.id}/shipping_rates.json`,
                    { headers }
                );

                const rates = ratesResponse.data.shipping_rates || [];
                const hasCarrierRates = rates.some(r => r.carrier_service_id);

                if (hasCarrierRates) {
                    zonesWithCarrier++;
                    console.log(`   ✅ ${zone.name}: Has carrier-calculated rates`);
                } else {
                    zonesWithoutCarrier++;
                    issues.push(`Zone "${zone.name}" does not have carrier-calculated rates enabled`);
                    console.log(`   ❌ ${zone.name}: NO carrier-calculated rates`);
                    console.log(`      💡 Enable carrier service in this zone`);
                }
            } catch (error) {
                warnings.push(`Could not check zone "${zone.name}": ${error.message}`);
                console.log(`   ⚠️  ${zone.name}: Error checking rates`);
            }
        }

        if (zonesWithoutCarrier > 0) {
            console.log(`\n   ⚠️  ${zonesWithoutCarrier} zone(s) without carrier service`);
        }
    } catch (error) {
        issues.push(`Error checking shipping zones: ${error.message}`);
        console.log(`   ❌ Error: ${error.message}`);
    }

    // 4. Check Endpoint Accessibility
    console.log('\n4️⃣  Checking Endpoint Accessibility...');
    if (shopifyConfig.appBaseUrl) {
        const endpointUrl = `${shopifyConfig.appBaseUrl.replace(/\/+$/, '')}/carrier/rates`;

        try {
            // Test with a simple health check first
            const healthUrl = `${shopifyConfig.appBaseUrl.replace(/\/+$/, '')}/health`;
            const healthResponse = await axios.get(healthUrl, { timeout: 5000 });

            if (healthResponse.data.status === 'ok') {
                console.log(`   ✅ Server is accessible`);
                console.log(`   ✅ Health check passed`);
            } else {
                warnings.push('Server health check returned non-ok status');
                console.log(`   ⚠️  Health check returned: ${healthResponse.data.status}`);
            }

            // Test carrier endpoint with sample payload
            const testPayload = {
                rate: {
                    destination: {
                        postal_code: '3000',
                        country: 'AU',
                        province: 'VIC'
                    },
                    currency: 'AUD'
                }
            };

            const endpointResponse = await axios.post(endpointUrl, testPayload, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });

            if (endpointResponse.data && endpointResponse.data.rates) {
                console.log(`   ✅ Carrier endpoint is accessible`);
                console.log(`   ✅ Endpoint returns valid response`);
                console.log(`   ✅ Response time: ${endpointResponse.headers['x-response-time'] || 'N/A'}`);
            } else {
                warnings.push('Carrier endpoint returned invalid response format');
                console.log(`   ⚠️  Endpoint response format may be invalid`);
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                issues.push(`Cannot reach endpoint: ${error.message}`);
                console.log(`   ❌ Endpoint is NOT accessible: ${error.message}`);
                console.log(`   💡 Check if server is running`);
                console.log(`   💡 Check if APP_BASE_URL is correct`);
            } else if (error.response) {
                warnings.push(`Endpoint returned error: ${error.response.status}`);
                console.log(`   ⚠️  Endpoint returned status: ${error.response.status}`);
            } else {
                issues.push(`Error testing endpoint: ${error.message}`);
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
    } else {
        warnings.push('Cannot test endpoint - APP_BASE_URL not set');
    }

    // 5. Check Database Connection
    console.log('\n5️⃣  Checking Database Connection...');
    try {
        const { testConnection } = require('../db/config');
        const dbStatus = await testConnection();

        if (dbStatus.success) {
            console.log(`   ✅ Database connection: OK`);
        } else {
            issues.push(`Database connection failed: ${dbStatus.message}`);
            console.log(`   ❌ Database connection: FAILED`);
            console.log(`      ${dbStatus.message}`);
        }
    } catch (error) {
        warnings.push(`Could not test database: ${error.message}`);
        console.log(`   ⚠️  Could not test database: ${error.message}`);
    }

    // 6. Check Zone Cache
    console.log('\n6️⃣  Checking Zone Cache...');
    try {
        const { getCacheStatus } = require('../services/zoneService');
        const cacheStatus = getCacheStatus();

        if (cacheStatus.loaded) {
            console.log(`   ✅ Zone cache: Loaded (${cacheStatus.count} zones)`);
        } else {
            warnings.push('Zone cache is not loaded');
            console.log(`   ⚠️  Zone cache: NOT LOADED`);
            console.log(`   💡 Cache should load automatically on server start`);
        }
    } catch (error) {
        warnings.push(`Could not check zone cache: ${error.message}`);
        console.log(`   ⚠️  Could not check zone cache: ${error.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 DIAGNOSTIC SUMMARY\n');

    if (issues.length === 0 && warnings.length === 0) {
        console.log('✅ All checks passed! Carrier service should be working correctly.');
    } else {
        if (issues.length > 0) {
            console.log(`❌ CRITICAL ISSUES (${issues.length}):`);
            issues.forEach((issue, i) => {
                console.log(`   ${i + 1}. ${issue}`);
            });
        }

        if (warnings.length > 0) {
            console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
            warnings.forEach((warning, i) => {
                console.log(`   ${i + 1}. ${warning}`);
            });
        }
    }

    console.log('\n💡 RECOMMENDED ACTIONS:\n');

    if (issues.some(i => i.includes('not found'))) {
        console.log('   1. Register carrier service: npm run register-carrier');
    }

    if (issues.some(i => i.includes('mismatch'))) {
        console.log('   2. Update carrier service: npm run update-carrier');
    }

    if (issues.some(i => i.includes('zone') && i.includes('carrier'))) {
        console.log('   3. Enable carrier service in all shipping zones');
        console.log('      Go to: Settings → Shipping and delivery');
    }

    if (issues.some(i => i.includes('accessible'))) {
        console.log('   4. Check server is running and APP_BASE_URL is correct');
    }

    if (issues.length === 0 && warnings.length === 0) {
        console.log('   ✅ No actions needed - everything looks good!');
        console.log('\n   If carrier service still doesn\'t work:');
        console.log('   - Check server logs for incoming requests');
        console.log('   - Verify carrier service is enabled in shipping zones');
        console.log('   - Test with: curl -X POST [APP_BASE_URL]/carrier/rates');
    }

    console.log('\n');
}

diagnoseCarrierService().catch(error => {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
});



