/**
 * Health Check and Auto-Recovery for Carrier Service
 * Monitors carrier service status and attempts automatic recovery
 * 
 * Usage:
 *   node src/scripts/healthCheckCarrierService.js
 * 
 * Or run periodically (cron job):
 *   Every 5 minutes: node /path/to/src/scripts/healthCheckCarrierService.js
 */

require('dotenv').config();
const axios = require('axios');
const { getCarrierServices, updateCarrierService, registerCarrierService } = require('../services/shopifyService');
const { shopifyConfig } = require('../config/shopify');

async function healthCheck() {
    const startTime = Date.now();
    const results = {
        carrierServiceExists: false,
        carrierServiceActive: false,
        callbackUrlCorrect: false,
        endpointAccessible: false,
        autoFixed: []
    };

    try {
        console.log('🏥 Carrier Service Health Check\n');

        // 1. Check if carrier service exists
        const services = await getCarrierServices();
        const harbourLaneService = services.find(s => s.name === 'Harbour Lane Delivery');

        if (!harbourLaneService) {
            console.log('❌ Carrier service not found - attempting to register...');

            if (!shopifyConfig.appBaseUrl) {
                console.log('❌ Cannot register - APP_BASE_URL not set');
                return results;
            }

            try {
                const callbackUrl = `${shopifyConfig.appBaseUrl.replace(/\/+$/, '')}/carrier/rates`;
                await registerCarrierService(callbackUrl);
                console.log('✅ Carrier service registered successfully');
                results.autoFixed.push('Registered carrier service');
                results.carrierServiceExists = true;
                results.carrierServiceActive = true;
                results.callbackUrlCorrect = true;
            } catch (error) {
                console.log(`❌ Failed to register: ${error.message}`);
                return results;
            }
        } else {
            results.carrierServiceExists = true;
            console.log(`✅ Carrier service found (ID: ${harbourLaneService.id})`);

            // 2. Check if active
            if (harbourLaneService.active !== false) {
                results.carrierServiceActive = true;
                console.log('✅ Carrier service is active');
            } else {
                console.log('⚠️  Carrier service is not active');
            }

            // 3. Check callback URL
            const expectedUrl = `${shopifyConfig.appBaseUrl.replace(/\/+$/, '')}/carrier/rates`;
            if (harbourLaneService.callback_url === expectedUrl) {
                results.callbackUrlCorrect = true;
                console.log('✅ Callback URL is correct');
            } else {
                console.log(`⚠️  Callback URL mismatch`);
                console.log(`   Expected: ${expectedUrl}`);
                console.log(`   Current:  ${harbourLaneService.callback_url}`);
                console.log('   Attempting to fix...');

                try {
                    await updateCarrierService(harbourLaneService.id, expectedUrl);
                    console.log('✅ Callback URL updated successfully');
                    results.autoFixed.push('Updated callback URL');
                    results.callbackUrlCorrect = true;
                } catch (error) {
                    console.log(`❌ Failed to update: ${error.message}`);
                }
            }
        }

        // 4. Check endpoint accessibility
        if (shopifyConfig.appBaseUrl) {
            const endpointUrl = `${shopifyConfig.appBaseUrl.replace(/\/+$/, '')}/carrier/rates`;

            try {
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

                const response = await axios.post(endpointUrl, testPayload, {
                    timeout: 10000,
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.data && response.data.rates) {
                    results.endpointAccessible = true;
                    console.log('✅ Endpoint is accessible and responding correctly');
                } else {
                    console.log('⚠️  Endpoint responded but format may be invalid');
                }
            } catch (error) {
                console.log(`❌ Endpoint not accessible: ${error.message}`);
            }
        }

        // Summary
        const allGood = results.carrierServiceExists &&
            results.carrierServiceActive &&
            results.callbackUrlCorrect &&
            results.endpointAccessible;

        const duration = Date.now() - startTime;

        console.log(`\n📊 Health Check Summary (${duration}ms):`);
        console.log(`   Carrier Service: ${results.carrierServiceExists ? '✅' : '❌'}`);
        console.log(`   Active: ${results.carrierServiceActive ? '✅' : '❌'}`);
        console.log(`   Callback URL: ${results.callbackUrlCorrect ? '✅' : '❌'}`);
        console.log(`   Endpoint: ${results.endpointAccessible ? '✅' : '❌'}`);

        if (results.autoFixed.length > 0) {
            console.log(`\n🔧 Auto-fixed issues:`);
            results.autoFixed.forEach(fix => console.log(`   - ${fix}`));
        }

        if (allGood) {
            console.log('\n✅ All systems operational!');
        } else {
            console.log('\n⚠️  Some issues detected - review above');
        }

        return results;

    } catch (error) {
        console.error('\n❌ Health check failed:', error.message);
        return results;
    }
}

// Run health check
if (require.main === module) {
    healthCheck().then(results => {
        // Exit with error code if critical issues
        if (!results.carrierServiceExists || !results.endpointAccessible) {
            process.exit(1);
        }
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { healthCheck };

