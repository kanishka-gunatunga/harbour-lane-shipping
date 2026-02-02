/**
 * Database Reset and Migration Script
 * 
 * This script will:
 * 1. Show current database state
 * 2. Clear ALL existing warehouses and zones
 * 3. Run the NSW/VIC zone migration
 * 
 * WARNING: This will DELETE all existing data!
 * 
 * Usage:
 *   npm run db:reset-migrate
 * 
 * Options:
 *   --confirm    Skip confirmation prompt and proceed
 */

require('dotenv').config();
const { query, pool, testConnection } = require('./config');

// Import zone definitions from migrate script
const NSW_VIC_ZONES = [
  // VICTORIA
  { postcode: '3', prefix: true, note: 'VIC: All Victoria postcodes (3000-3999)' },
  { postcode: '8', prefix: true, note: 'VIC: Victoria LVRs/PO Boxes (8000-8999)' },

  // NSW - 1000-1999
  { postcode: '1', prefix: true, note: 'NSW: LVRs and PO Boxes (1000-1999)' },

  // NSW - 2000-2599
  { postcode: '20', prefix: true, note: 'NSW: Sydney area (2000-2099)' },
  { postcode: '21', prefix: true, note: 'NSW: Sydney suburbs (2100-2199)' },
  { postcode: '22', prefix: true, note: 'NSW: Sydney suburbs (2200-2299)' },
  { postcode: '23', prefix: true, note: 'NSW: Sydney suburbs (2300-2399)' },
  { postcode: '24', prefix: true, note: 'NSW: Central NSW (2400-2499)' },
  { postcode: '25', prefix: true, note: 'NSW: Central NSW (2500-2599)' },

  // NSW - 2619-2899 (avoiding ACT 2600-2618)
  { postcode: '2619', prefix: false, note: 'NSW: Jerrabomberra (exact match)' },
  { postcode: '262', prefix: true, note: 'NSW: Queanbeyan area (2620-2629)' },
  { postcode: '263', prefix: true, note: 'NSW: Southern Tablelands (2630-2639)' },
  { postcode: '264', prefix: true, note: 'NSW: Southern Tablelands (2640-2649)' },
  { postcode: '265', prefix: true, note: 'NSW: Riverina (2650-2659)' },
  { postcode: '266', prefix: true, note: 'NSW: Riverina (2660-2669)' },
  { postcode: '267', prefix: true, note: 'NSW: Riverina (2670-2679)' },
  { postcode: '268', prefix: true, note: 'NSW: Riverina (2680-2689)' },
  { postcode: '269', prefix: true, note: 'NSW: Riverina (2690-2699)' },
  { postcode: '27', prefix: true, note: 'NSW: Western NSW (2700-2799)' },
  { postcode: '28', prefix: true, note: 'NSW: Far Western NSW (2800-2899)' },

  // NSW - 2921-2999 (avoiding ACT 2900-2920)
  { postcode: '2921', prefix: false, note: 'NSW: (exact match)' },
  { postcode: '2922', prefix: false, note: 'NSW: (exact match)' },
  { postcode: '2923', prefix: false, note: 'NSW: (exact match)' },
  { postcode: '2924', prefix: false, note: 'NSW: (exact match)' },
  { postcode: '2925', prefix: false, note: 'NSW: (exact match)' },
  { postcode: '2926', prefix: false, note: 'NSW: (exact match)' },
  { postcode: '2927', prefix: false, note: 'NSW: (exact match)' },
  { postcode: '2928', prefix: false, note: 'NSW: (exact match)' },
  { postcode: '2929', prefix: false, note: 'NSW: (exact match)' },
  { postcode: '293', prefix: true, note: 'NSW: (2930-2939)' },
  { postcode: '294', prefix: true, note: 'NSW: (2940-2949)' },
  { postcode: '295', prefix: true, note: 'NSW: (2950-2959)' },
  { postcode: '296', prefix: true, note: 'NSW: (2960-2969)' },
  { postcode: '297', prefix: true, note: 'NSW: (2970-2979)' },
  { postcode: '298', prefix: true, note: 'NSW: (2980-2989)' },
  { postcode: '299', prefix: true, note: 'NSW: (2990-2999)' },
];

async function showCurrentState() {
  console.log('\n📊 Current Database State:');
  console.log('─'.repeat(50));

  try {
    const warehouses = await query('SELECT id, name, state, status FROM warehouses');
    console.log(`\n   Warehouses: ${warehouses.length}`);
    for (const wh of warehouses) {
      const zones = await query('SELECT COUNT(*) as count FROM zones WHERE warehouse_id = ?', [wh.id]);
      console.log(`   - [${wh.id}] ${wh.name} (${wh.state}, ${wh.status}) - ${zones[0].count} zones`);
    }

    const totalZones = await query('SELECT COUNT(*) as count FROM zones');
    console.log(`\n   Total Zones: ${totalZones[0].count}`);

    const inquiries = await query('SELECT COUNT(*) as count FROM inquiries');
    console.log(`   Inquiries: ${inquiries[0].count}`);

  } catch (error) {
    console.log(`   Error reading data: ${error.message}`);
  }
}

async function resetAndMigrate() {
  const args = process.argv.slice(2);
  const skipConfirm = args.includes('--confirm');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DATABASE RESET & NSW/VIC ZONE MIGRATION');
  console.log('═══════════════════════════════════════════════════════════════');

  // Test connection first
  console.log('\n🔌 Testing database connection...');
  const connResult = await testConnection();

  if (!connResult.success) {
    console.error(`❌ Cannot connect to database: ${connResult.message}`);
    console.log('\n   Please check your .env file has correct database credentials.');
    process.exit(1);
  }

  console.log('   ✅ Connected to database successfully!');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Database: ${process.env.DB_NAME}`);

  // Show current state
  await showCurrentState();

  if (!skipConfirm) {
    console.log('\n⚠️  WARNING: This will DELETE all existing warehouses and zones!');
    console.log('   Inquiries will be preserved.');
    console.log('\n   To proceed, run with --confirm flag:');
    console.log('   npm run db:reset-migrate -- --confirm');
    await pool.end();
    process.exit(0);
  }

  console.log('\n🗑️  Clearing existing data...');

  try {
    // Delete zones first (foreign key constraint)
    const deletedZones = await query('DELETE FROM zones');
    console.log(`   Deleted ${deletedZones.affectedRows} zones`);

    // Delete warehouses
    const deletedWarehouses = await query('DELETE FROM warehouses');
    console.log(`   Deleted ${deletedWarehouses.affectedRows} warehouses`);

    console.log('\n📦 Creating NSW-VIC Delivery warehouse...');

    const warehouseResult = await query(`
      INSERT INTO warehouses (name, address, suburb, state, postcode, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `, ['NSW-VIC Delivery Zone', 'Harbour Lane Distribution', 'Sydney', 'NSW', '2000']);

    const warehouseId = warehouseResult.insertId;
    console.log(`   ✅ Created warehouse (ID: ${warehouseId})`);

    console.log('\n🗺️  Adding zone patterns...');

    let insertedCount = 0;
    for (const zone of NSW_VIC_ZONES) {
      await query(`
        INSERT INTO zones (warehouse_id, postcode, prefix, note)
        VALUES (?, ?, ?, ?)
      `, [
        warehouseId,
        zone.postcode,
        zone.prefix ? 1 : 0,
        zone.note
      ]);
      insertedCount++;
    }

    console.log(`   ✅ Added ${insertedCount} zone patterns`);

    // Show final state
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ MIGRATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════');

    await showCurrentState();

    console.log('\n📋 Coverage Summary:');
    console.log('   ✅ NSW: 1000-1999, 2000-2599, 2619-2899, 2921-2999');
    console.log('   ✅ VIC: 3000-3999, 8000-8999');
    console.log('   ❌ ACT: 2600-2618, 2900-2920 (excluded)');
    console.log('   ❌ QLD, SA, WA, TAS, NT (draft order path)');
    console.log('\n   Shipping Rate: $59 flat rate for NSW/VIC');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error(`\n❌ Error during migration: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetAndMigrate();
