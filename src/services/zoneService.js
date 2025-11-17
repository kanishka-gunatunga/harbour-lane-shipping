/**
 * Zone lookup service
 * Handles postcode matching against warehouse zones
 * Uses in-memory cache for fast lookups
 */

const { query } = require('../db/config');
const { normalizePostcode, matchesZone } = require('../utils/postcode');

// In-memory cache for zones
let zonesCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load all zones from database into memory cache
 * Handles database errors gracefully
 */
async function loadZonesCache() {
  try {
    const zones = await query(`
      SELECT 
        z.id,
        z.warehouse_id,
        z.postcode,
        z.prefix,
        w.name as warehouse_name,
        w.status as warehouse_status
      FROM zones z
      INNER JOIN warehouses w ON z.warehouse_id = w.id
      WHERE w.status = 'active'
    `);
    
    zonesCache = zones;
    cacheTimestamp = Date.now();
    console.log(`Loaded ${zones.length} zones into cache`);
    return zones;
  } catch (error) {
    console.error('Error loading zones cache:', error.message);
    // Don't throw - allow server to continue
    // Cache will remain null/empty, and we'll handle it in findMatchingZone
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.warn('⚠️  Database connection issue - zones cache not loaded');
      console.warn('   Will retry on next request');
    }
    // Return empty array so cache is marked as attempted
    zonesCache = [];
    cacheTimestamp = Date.now();
    return [];
  }
}

/**
 * Refresh cache if expired
 * Handles database errors gracefully
 */
async function ensureCacheFresh() {
  if (!zonesCache || !cacheTimestamp || (Date.now() - cacheTimestamp > CACHE_TTL)) {
    try {
      await loadZonesCache();
    } catch (error) {
      console.warn('⚠️  Failed to refresh zones cache:', error.message);
      // Continue with existing cache if available
      if (!zonesCache || zonesCache.length === 0) {
        console.warn('   No zones available - all postcodes will return inquiry option');
      }
    }
  }
}

/**
 * Find matching warehouse zone for a postcode
 * Returns warehouse info if match found, null otherwise
 * Handles database/cache errors gracefully
 */
async function findMatchingZone(postcode) {
  try {
    await ensureCacheFresh();
  } catch (error) {
    console.warn('⚠️  Error ensuring cache fresh:', error.message);
    // Continue with existing cache or empty cache
  }
  
  const normalized = normalizePostcode(postcode);
  if (!normalized) {
    return null;
  }
  
  // If cache is empty or null, return null (will trigger inquiry)
  if (!zonesCache || zonesCache.length === 0) {
    console.warn('⚠️  Zones cache is empty - returning null (inquiry option)');
    return null;
  }
  
  // First try exact matches
  for (const zone of zonesCache) {
    if (!zone.prefix && matchesZone(normalized, zone.postcode, false)) {
      return {
        zoneId: zone.id,
        warehouseId: zone.warehouse_id,
        warehouseName: zone.warehouse_name,
        matchType: 'exact'
      };
    }
  }
  
  // Then try prefix matches
  for (const zone of zonesCache) {
    if (zone.prefix && matchesZone(normalized, zone.postcode, true)) {
      return {
        zoneId: zone.id,
        warehouseId: zone.warehouse_id,
        warehouseName: zone.warehouse_name,
        matchType: 'prefix'
      };
    }
  }
  
  return null;
}

/**
 * Force refresh the zones cache (call after admin updates)
 */
async function refreshCache() {
  await loadZonesCache();
}

/**
 * Get cache status for health checks
 */
function getCacheStatus() {
  return {
    loaded: zonesCache !== null,
    count: zonesCache ? zonesCache.length : 0,
    timestamp: cacheTimestamp
  };
}

module.exports = {
  findMatchingZone,
  loadZonesCache,
  refreshCache,
  ensureCacheFresh,
  getCacheStatus
};

