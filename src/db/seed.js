/**
 * Seed script to populate initial warehouses and zones
 * Run this after creating the database schema
 * 
 * Usage:
 *   node src/db/seed.js
 * 
 * Or with npm:
 *   npm run seed
 */

require('dotenv').config();
const { query } = require('./config');

// Sample warehouse data
const warehouses = [
  {
    name: 'Melbourne Warehouse',
    address: '123 Harbour Lane',
    suburb: 'Melbourne',
    state: 'VIC',
    postcode: '3000',
    status: 'active'
  },
  {
    name: 'Sydney Warehouse',
    address: '456 Shipping Street',
    suburb: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    status: 'active'
  },
  {
    name: 'Brisbane Warehouse',
    address: '789 Cargo Road',
    suburb: 'Brisbane',
    state: 'QLD',
    postcode: '4000',
    status: 'active'
  }
];

// Sample zone data (postcodes each warehouse serves)
const zones = {
  'Melbourne Warehouse': [
    { postcode: '3000', prefix: false, note: 'Melbourne CBD' },
    { postcode: '3001', prefix: false, note: 'Melbourne East' },
    { postcode: '3002', prefix: false, note: 'East Melbourne' },
    { postcode: '3003', prefix: false, note: 'West Melbourne' },
    { postcode: '3004', prefix: false, note: 'St Kilda Road' },
    { postcode: '30', prefix: true, note: 'Melbourne metro area (prefix)' },
    { postcode: '31', prefix: true, note: 'Outer Melbourne suburbs (prefix)' }
  ],
  'Sydney Warehouse': [
    { postcode: '2000', prefix: false, note: 'Sydney CBD' },
    { postcode: '2001', prefix: false, note: 'Sydney' },
    { postcode: '2002', prefix: false, note: 'East Sydney' },
    { postcode: '2003', prefix: false, note: 'Glebe' },
    { postcode: '20', prefix: true, note: 'Sydney metro area (prefix)' },
    { postcode: '21', prefix: true, note: 'Sydney suburbs (prefix)' }
  ],
  'Brisbane Warehouse': [
    { postcode: '4000', prefix: false, note: 'Brisbane CBD' },
    { postcode: '4001', prefix: false, note: 'Brisbane' },
    { postcode: '4002', prefix: false, note: 'New Farm' },
    { postcode: '4003', prefix: false, note: 'Fortitude Valley' },
    { postcode: '40', prefix: true, note: 'Brisbane metro area (prefix)' },
    { postcode: '41', prefix: true, note: 'Brisbane suburbs (prefix)' }
  ]
};

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n');
    
    // Check if warehouses already exist
    const existingWarehouses = await query('SELECT COUNT(*) as count FROM warehouses');
    if (existingWarehouses[0].count > 0) {
      console.log('⚠️  Warehouses already exist. Skipping seed.');
      console.log('   To re-seed, delete existing data first.\n');
      return;
    }
    
    // Insert warehouses
    console.log('📦 Creating warehouses...');
    const warehouseMap = {};
    
    for (const warehouse of warehouses) {
      const result = await query(`
        INSERT INTO warehouses (name, address, suburb, state, postcode, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        warehouse.name,
        warehouse.address,
        warehouse.suburb,
        warehouse.state,
        warehouse.postcode,
        warehouse.status
      ]);
      
      warehouseMap[warehouse.name] = result.insertId;
      console.log(`   ✅ Created: ${warehouse.name} (ID: ${result.insertId})`);
    }
    
    // Insert zones
    console.log('\n🗺️  Creating zones...');
    let totalZones = 0;
    
    for (const [warehouseName, zoneList] of Object.entries(zones)) {
      const warehouseId = warehouseMap[warehouseName];
      if (!warehouseId) {
        console.log(`   ⚠️  Warehouse not found: ${warehouseName}`);
        continue;
      }
      
      for (const zone of zoneList) {
        await query(`
          INSERT INTO zones (warehouse_id, postcode, prefix, note)
          VALUES (?, ?, ?, ?)
        `, [
          warehouseId,
          zone.postcode,
          zone.prefix ? 1 : 0,
          zone.note || null
        ]);
        totalZones++;
      }
      console.log(`   ✅ Added ${zoneList.length} zones for ${warehouseName}`);
    }
    
    console.log(`\n✅ Seed completed successfully!`);
    console.log(`   Warehouses: ${warehouses.length}`);
    console.log(`   Total zones: ${totalZones}\n`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();

