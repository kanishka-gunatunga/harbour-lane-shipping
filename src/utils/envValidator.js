/**
 * Environment variable validation
 * Ensures all required environment variables are set before starting the server
 */

function validateEnvironment() {
  const required = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'SHOPIFY_STORE_DOMAIN',
    'SHOPIFY_ACCESS_TOKEN',
    'APP_BASE_URL'
  ];

  const missing = [];
  const warnings = [];

  // Check required variables
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check for production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.API_KEY) {
      warnings.push('API_KEY is not set - admin endpoints will be unprotected');
    }

    if (!process.env.APP_BASE_URL.startsWith('https://')) {
      warnings.push('APP_BASE_URL should use HTTPS in production');
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease set these variables in your .env file or environment.\n');
    return false;
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

  return true;
}

module.exports = {
  validateEnvironment
};

