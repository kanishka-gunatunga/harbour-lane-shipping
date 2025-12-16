/**
 * Warehouse management endpoints
 * CRUD operations for warehouses
 */

const { query } = require('../db/config');
const { refreshCache } = require('../services/zoneService');
const { validatePostcode, sanitizeString } = require('../middleware/security');

/**
 * GET /warehouses
 * Get all warehouses
 */
async function getWarehouses(req, res) {
  try {
    const warehouses = await query(`
      SELECT 
        w.*,
        COUNT(z.id) as zone_count
      FROM warehouses w
      LEFT JOIN zones z ON w.id = z.warehouse_id
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `);
    
    res.json(warehouses);
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ error: 'Failed to fetch warehouses', message: error.message });
  }
}

/**
 * GET /warehouses/:id
 * Get a single warehouse with its zones
 */
async function getWarehouse(req, res) {
  try {
    const { id } = req.params;
    
    // Validate ID
    const warehouseId = parseInt(id);
    if (!warehouseId || warehouseId <= 0 || isNaN(warehouseId)) {
      return res.status(400).json({ error: 'Invalid warehouse ID' });
    }
    
    const warehouses = await query('SELECT * FROM warehouses WHERE id = ?', [warehouseId]);
    if (warehouses.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    const warehouse = warehouses[0];
    const zones = await query('SELECT * FROM zones WHERE warehouse_id = ? ORDER BY postcode', [warehouseId]);
    
    res.json({
      ...warehouse,
      zones
    });
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    res.status(500).json({ error: 'Failed to fetch warehouse', message: error.message });
  }
}

/**
 * POST /warehouses
 * Create a new warehouse
 */
async function createWarehouse(req, res) {
  try {
    let {
      name,
      address,
      suburb,
      state,
      postcode,
      status = 'active',
      shopify_location_id
    } = req.body;
    
    // Validate and sanitize inputs
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Warehouse name is required and must be a non-empty string' });
    }
    
    name = sanitizeString(name.trim()).substring(0, 100); // Limit length
    address = address ? sanitizeString(address).substring(0, 200) : null;
    suburb = suburb ? sanitizeString(suburb).substring(0, 100) : null;
    state = state ? sanitizeString(state).substring(0, 50) : null;
    postcode = postcode ? validatePostcode(postcode) : null;
    
    // Validate status
    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "active" or "inactive"' });
    }
    
    // Validate shopify_location_id if provided
    if (shopify_location_id && (isNaN(shopify_location_id) || shopify_location_id <= 0)) {
      return res.status(400).json({ error: 'Invalid Shopify location ID' });
    }
    
    const result = await query(`
      INSERT INTO warehouses (name, address, suburb, state, postcode, status, shopify_location_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, address, suburb, state, postcode, status, shopify_location_id || null]);
    
    const warehouse = await query('SELECT * FROM warehouses WHERE id = ?', [result.insertId]);
    
    // Refresh cache after creating warehouse
    await refreshCache();
    
    res.status(201).json(warehouse[0]);
  } catch (error) {
    console.error('Error creating warehouse:', error);
    res.status(500).json({ error: 'Failed to create warehouse', message: error.message });
  }
}

/**
 * PUT /warehouses/:id
 * Update a warehouse
 */
async function updateWarehouse(req, res) {
  try {
    const { id } = req.params;
    let {
      name,
      address,
      suburb,
      state,
      postcode,
      status,
      shopify_location_id
    } = req.body;
    
    // Validate warehouse ID
    const warehouseId = parseInt(id);
    if (!warehouseId || warehouseId <= 0 || isNaN(warehouseId)) {
      return res.status(400).json({ error: 'Invalid warehouse ID' });
    }
    
    // Build update query dynamically with validation
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name must be a non-empty string' });
      }
      updates.push('name = ?');
      params.push(sanitizeString(name.trim()).substring(0, 100));
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address ? sanitizeString(address).substring(0, 200) : null);
    }
    if (suburb !== undefined) {
      updates.push('suburb = ?');
      params.push(suburb ? sanitizeString(suburb).substring(0, 100) : null);
    }
    if (state !== undefined) {
      updates.push('state = ?');
      params.push(state ? sanitizeString(state).substring(0, 50) : null);
    }
    if (postcode !== undefined) {
      const validatedPostcode = postcode ? validatePostcode(postcode) : null;
      if (postcode !== null && !validatedPostcode) {
        return res.status(400).json({ error: 'Invalid postcode format. Must be 4 digits.' });
      }
      updates.push('postcode = ?');
      params.push(validatedPostcode);
    }
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Status must be "active" or "inactive"' });
      }
      updates.push('status = ?');
      params.push(status);
    }
    if (shopify_location_id !== undefined) {
      if (shopify_location_id !== null && (isNaN(shopify_location_id) || shopify_location_id <= 0)) {
        return res.status(400).json({ error: 'Invalid Shopify location ID' });
      }
      updates.push('shopify_location_id = ?');
      params.push(shopify_location_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(warehouseId);
    
    await query(`
      UPDATE warehouses SET ${updates.join(', ')} WHERE id = ?
    `, params);
    
    const warehouse = await query('SELECT * FROM warehouses WHERE id = ?', [warehouseId]);
    
    if (warehouse.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    // Refresh zones cache if warehouse status changed or postcode updated
    if (status !== undefined || postcode !== undefined) {
      await refreshCache();
    }
    
    res.json(warehouse[0]);
  } catch (error) {
    console.error('Error updating warehouse:', error);
    res.status(500).json({ error: 'Failed to update warehouse', message: error.message });
  }
}

/**
 * DELETE /warehouses/:id
 * Delete a warehouse (cascades to zones)
 */
async function deleteWarehouse(req, res) {
  try {
    const { id } = req.params;
    
    // Validate warehouse ID
    const warehouseId = parseInt(id);
    if (!warehouseId || warehouseId <= 0 || isNaN(warehouseId)) {
      return res.status(400).json({ error: 'Invalid warehouse ID' });
    }
    
    const warehouses = await query('SELECT * FROM warehouses WHERE id = ?', [warehouseId]);
    if (warehouses.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    await query('DELETE FROM warehouses WHERE id = ?', [warehouseId]);
    
    // Refresh zones cache
    await refreshCache();
    
    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error) {
    console.error('Error deleting warehouse:', error);
    res.status(500).json({ error: 'Failed to delete warehouse', message: error.message });
  }
}

/**
 * POST /warehouses/:id/zones
 * Add zones to a warehouse
 */
async function addZone(req, res) {
  try {
    const { id } = req.params;
    let { postcode, prefix = false, note } = req.body;
    
    // Validate warehouse ID
    const warehouseId = parseInt(id);
    if (!warehouseId || warehouseId <= 0 || isNaN(warehouseId)) {
      return res.status(400).json({ error: 'Invalid warehouse ID' });
    }
    
    // Validate and sanitize postcode
    if (!postcode) {
      return res.status(400).json({ error: 'Postcode is required' });
    }
    
    const validatedPostcode = validatePostcode(postcode);
    if (!validatedPostcode) {
      return res.status(400).json({ error: 'Invalid postcode format. Must be 4 digits.' });
    }
    
    // Validate prefix (must be boolean)
    prefix = Boolean(prefix);
    
    // Sanitize note
    note = note ? sanitizeString(note).substring(0, 500) : null;
    
    // Verify warehouse exists
    const warehouses = await query('SELECT * FROM warehouses WHERE id = ?', [warehouseId]);
    if (warehouses.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    // Check if zone already exists
    const existing = await query(
      'SELECT * FROM zones WHERE warehouse_id = ? AND postcode = ?',
      [warehouseId, validatedPostcode]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Zone already exists for this warehouse and postcode' });
    }
    
    const result = await query(`
      INSERT INTO zones (warehouse_id, postcode, prefix, note)
      VALUES (?, ?, ?, ?)
    `, [warehouseId, validatedPostcode, prefix ? 1 : 0, note]);
    
    const zone = await query('SELECT * FROM zones WHERE id = ?', [result.insertId]);
    
    // Refresh zones cache
    await refreshCache();
    
    res.status(201).json(zone[0]);
  } catch (error) {
    console.error('Error adding zone:', error);
    res.status(500).json({ error: 'Failed to add zone', message: error.message });
  }
}

/**
 * GET /warehouses/:id/zones
 * Get all zones for a warehouse
 */
async function getZones(req, res) {
  try {
    const { id } = req.params;
    
    const zones = await query(
      'SELECT * FROM zones WHERE warehouse_id = ? ORDER BY postcode',
      [id]
    );
    
    res.json(zones);
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ error: 'Failed to fetch zones', message: error.message });
  }
}

/**
 * DELETE /warehouses/:id/zones/:zoneId
 * Delete a zone
 */
async function deleteZone(req, res) {
  try {
    const { id, zoneId } = req.params;
    
    // Validate IDs
    const warehouseId = parseInt(id);
    const validatedZoneId = parseInt(zoneId);
    
    if (!warehouseId || warehouseId <= 0 || isNaN(warehouseId)) {
      return res.status(400).json({ error: 'Invalid warehouse ID' });
    }
    
    if (!validatedZoneId || validatedZoneId <= 0 || isNaN(validatedZoneId)) {
      return res.status(400).json({ error: 'Invalid zone ID' });
    }
    
    const zones = await query('SELECT * FROM zones WHERE id = ? AND warehouse_id = ?', [validatedZoneId, warehouseId]);
    if (zones.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    
    await query('DELETE FROM zones WHERE id = ?', [validatedZoneId]);
    
    // Refresh zones cache
    await refreshCache();
    
    res.json({ message: 'Zone deleted successfully' });
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({ error: 'Failed to delete zone', message: error.message });
  }
}

module.exports = {
  getWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  addZone,
  getZones,
  deleteZone
};

