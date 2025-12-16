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
 * Handles database errors gracefully with retry logic
 */
async function loadZonesCache(retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
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
      console.log(`✅ Loaded ${zones.length} zones into cache`);
      return zones;
    } catch (error) {
      const isConnectionError =
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNREFUSED' ||
        error.message?.includes('timeout') ||
        error.message?.includes('disconnected');

      if (attempt < retries - 1 && isConnectionError) {
        const delay = Math.min(2000 * (attempt + 1), 5000); // 2s, 4s, 5s
        console.warn(`⚠️  Database connection issue (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Last attempt failed or non-connection error
      console.error(`❌ Error loading zones cache after ${attempt + 1} attempts:`, error.message);
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        console.warn('⚠️  Database connection issue - zones cache not loaded');
        console.warn('   Will retry on next request');
      }

      // Don't overwrite existing cache if we have one
      if (!zonesCache || zonesCache.length === 0) {
        zonesCache = [];
        cacheTimestamp = Date.now();
      }
      return [];
    }
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
 * Optimized for fast response times (< 100ms)
 */
async function findMatchingZone(postcode) {
  const lookupStart = Date.now();

  // Normalize postcode first (fast, no async)
  const normalized = normalizePostcode(postcode);
  if (!normalized) {
    console.warn(`⚠️  Invalid postcode format: ${postcode}`);
    return null;
  }

  // Check cache first (fast path - no database call if cache is fresh)
  const cacheAge = cacheTimestamp ? Date.now() - cacheTimestamp : Infinity;
  const isCacheFresh = zonesCache && zonesCache.length > 0 && cacheAge < CACHE_TTL;

  // If cache is empty or expired, try to load it (with longer timeout for first load)
  if (!isCacheFresh) {
    const cacheState = zonesCache === null ? 'null' : zonesCache.length === 0 ? 'empty' : 'expired';
    console.log(`🔄 Cache is ${cacheState} - attempting refresh...`);

    try {
      // For first load or empty cache, wait longer (5 seconds for serverless)
      // For expired cache, use shorter timeout (2 seconds)
      const timeout = (!zonesCache || zonesCache.length === 0) ? 5000 : 2000;

      // Use Promise.race but don't give up if it times out - let loadZonesCache retry internally
      const refreshPromise = ensureCacheFresh();
      const timeoutPromise = new Promise((resolve) => setTimeout(() => {
        console.warn(`⏱️  Cache refresh taking longer than ${timeout}ms...`);
        resolve('timeout');
      }, timeout));

      await Promise.race([refreshPromise, timeoutPromise]);

      // Check if cache was actually loaded (even if timeout occurred)
      if (!zonesCache || zonesCache.length === 0) {
        console.error(`❌ Cache refresh failed - zones cache still empty`);
        console.error(`   This means NO postcodes will match - all will show inquiry option`);
        console.error(`   Check: 1) Database connection 2) Zones exist in database 3) Warehouses are active`);
        console.error(`   Database may be timing out - check connection settings and firewall`);
        return null;
      } else {
        console.log(`✅ Cache refreshed successfully - ${zonesCache.length} zones loaded`);
      }
    } catch (error) {
      console.error('❌ Error ensuring cache fresh:', error.message);
      // If cache is still empty after error, we can't match anything
      if (!zonesCache || zonesCache.length === 0) {
        console.error('   Cache is empty - all postcodes will return inquiry option');
        return null;
      }
      // If we have an old cache, continue with it (better than nothing)
      console.warn(`   Using existing cache (${zonesCache.length} zones) despite error`);
    }
  }

  // Final check - if cache is still empty, return null
  if (!zonesCache || zonesCache.length === 0) {
    console.error('❌ Zones cache is empty after refresh attempt - returning null (inquiry option)');
    console.error('   This indicates a database or configuration issue');
    return null;
  }

  console.log(`🔍 Searching ${zonesCache.length} zones for postcode ${normalized}`);

  // First try exact matches
  for (const zone of zonesCache) {
    // Check if prefix is 0 (false) or null for exact match
    const isPrefix = zone.prefix === 1 || zone.prefix === true;
    if (!isPrefix && matchesZone(normalized, zone.postcode, false)) {
      console.log(`✅ Found exact match: postcode ${normalized} matches zone ${zone.postcode} (warehouse: ${zone.warehouse_name})`);
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
    const isPrefix = zone.prefix === 1 || zone.prefix === true;
    if (isPrefix && matchesZone(normalized, zone.postcode, true)) {
      console.log(`✅ Found prefix match: postcode ${normalized} matches prefix ${zone.postcode} (warehouse: ${zone.warehouse_name})`);
      return {
        zoneId: zone.id,
        warehouseId: zone.warehouse_id,
        warehouseName: zone.warehouse_name,
        matchType: 'prefix'
      };
    }
  }

  console.log(`❌ No match found for postcode ${normalized} in ${zonesCache.length} zones`);
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

