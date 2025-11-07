/**
 * Postcode normalization and matching utilities
 * Handles Australian postcode format (4 digits)
 */

/**
 * Normalize a postcode string
 * - Trim whitespace
 * - Convert to uppercase
 * - Remove non-digit characters (keep only digits)
 * - Ensure 4-digit format
 */
function normalizePostcode(postcode) {
  if (!postcode) return null;
  
  // Convert to string and trim
  let normalized = String(postcode).trim().toUpperCase();
  
  // Remove all non-digit characters
  normalized = normalized.replace(/\D/g, '');
  
  // Australian postcodes are 4 digits
  if (normalized.length !== 4) {
    return null; // Invalid format
  }
  
  return normalized;
}

/**
 * Check if a postcode matches a zone pattern
 * Supports exact match and prefix matching (e.g., "30*" matches "3000", "3001", etc.)
 */
function matchesZone(postcode, zonePostcode, isPrefix) {
  const normalized = normalizePostcode(postcode);
  if (!normalized) return false;
  
  if (isPrefix) {
    // Remove * from zone postcode if present
    const prefixPattern = zonePostcode.replace(/\*/g, '');
    return normalized.startsWith(prefixPattern);
  } else {
    // Exact match
    const normalizedZone = normalizePostcode(zonePostcode);
    return normalized === normalizedZone;
  }
}

/**
 * Extract postcode from Shopify carrier request payload
 * Handles various payload structures
 */
function extractPostcodeFromPayload(payload) {
  try {
    // Shopify carrier service payload structure
    if (payload?.rate?.destination?.postal_code) {
      return payload.rate.destination.postal_code;
    }
    
    // Alternative structure
    if (payload?.destination?.postal_code) {
      return payload.destination.postal_code;
    }
    
    // Direct postcode field
    if (payload?.postal_code) {
      return payload.postal_code;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting postcode from payload:', error);
    return null;
  }
}

module.exports = {
  normalizePostcode,
  matchesZone,
  extractPostcodeFromPayload
};

