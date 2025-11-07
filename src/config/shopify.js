/**
 * Shopify API configuration
 */

require('dotenv').config();

const shopifyConfig = {
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,
  apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01',
  appBaseUrl: process.env.APP_BASE_URL || 'https://your-app-domain.com'
};

/**
 * Get Shopify Admin API base URL
 */
function getAdminApiUrl() {
  if (!shopifyConfig.storeDomain) {
    throw new Error('SHOPIFY_STORE_DOMAIN is not set');
  }
  const domain = shopifyConfig.storeDomain.replace(/^https?:\/\//, '');
  return `https://${domain}/admin/api/${shopifyConfig.apiVersion}`;
}

/**
 * Get Shopify Admin API headers
 */
function getAdminHeaders() {
  if (!shopifyConfig.accessToken) {
    throw new Error('SHOPIFY_ACCESS_TOKEN is not set');
  }
  return {
    'X-Shopify-Access-Token': shopifyConfig.accessToken,
    'Content-Type': 'application/json'
  };
}

module.exports = {
  shopifyConfig,
  getAdminApiUrl,
  getAdminHeaders
};

