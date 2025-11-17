/**
 * Vercel Cron Job - Automated Health Check
 * Runs every 5 minutes to monitor carrier service
 * 
 * This endpoint is called automatically by Vercel Cron
 * You can also call it manually for testing
 */

const { healthCheck } = require('../../src/scripts/healthCheckCarrierService');

module.exports = async (req, res) => {
  // Only allow GET requests (Vercel Cron uses GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('🏥 Health check triggered by Vercel Cron');
    
    const results = await healthCheck();
    
    // Determine if everything is OK
    const allGood = results.carrierServiceExists && 
                   results.carrierServiceActive && 
                   results.callbackUrlCorrect && 
                   results.endpointAccessible;
    
    // Log results for monitoring
    console.log('Health check results:', JSON.stringify(results, null, 2));
    
    // Return results
    res.status(allGood ? 200 : 503).json({
      success: allGood,
      timestamp: new Date().toISOString(),
      results: {
        carrierServiceExists: results.carrierServiceExists,
        carrierServiceActive: results.carrierServiceActive,
        callbackUrlCorrect: results.callbackUrlCorrect,
        endpointAccessible: results.endpointAccessible,
        autoFixed: results.autoFixed
      },
      message: allGood 
        ? 'All systems operational' 
        : 'Some issues detected - check results'
    });
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Health check encountered an error'
    });
  }
};



