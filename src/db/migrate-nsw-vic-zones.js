/**
 * Migration script to add NSW and Victoria postcode zones
 * 
 * Client requirement: Flat $59 delivery to all of NSW and Victoria
 * All other postcodes will go to draft order/inquiry path
 * 
 * Australian Postcode Ranges (Official from Australia Post):
 * 
 * NEW SOUTH WALES (NSW):
 *   - 1000-1999 (LVRs and PO Boxes only)
 *   - 2000-2599
 *   - 2619-2899
 *   - 2921-2999
 * 
 * VICTORIA (VIC):
 *   - 3000-3999
 *   - 8000-8999 (LVRs and PO Boxes only)
 * 
 * EXCLUDED (ACT - these are NOT NSW):
 *   - 0200-0299 (ACT LVRs/PO Boxes)
 *   - 2600-2618 (ACT)
 *   - 2900-2920 (ACT)
 * 
 * Usage:
 *   node src/db/migrate-nsw-vic-zones.js
 * 
 * Options:
 *   --dry-run    Show what would be inserted without making changes
 *   --clear      Clear existing zones before inserting (USE WITH CAUTION)
 */

require('dotenv').config();
const { query, pool } = require('./config');

// Configuration
const WAREHOUSE_NAME = 'NSW-VIC Delivery Zone';
const WAREHOUSE_ADDRESS = 'Harbour Lane Distribution';
const WAREHOUSE_STATE = 'NSW';
const WAREHOUSE_POSTCODE = '2000';

/**
 * Zone definitions using prefix matching for efficiency
 * These cover all NSW and VIC postcodes accurately
 */
const NSW_VIC_ZONES = [
  // =====================
  // VICTORIA - Simple ranges
  // =====================
  { postcode: '3', prefix: true, note: 'VIC: All Victoria postcodes (3000-3999)' },
  { postcode: '8', prefix: true, note: 'VIC: Victoria LVRs/PO Boxes (8000-8999)' },

  // =====================
  // NSW - Range 1000-1999 (LVRs/PO Boxes)
  // =====================
  { postcode: '1', prefix: true, note: 'NSW: LVRs and PO Boxes (1000-1999)' },

  // =====================
  // NSW - Range 2000-2599
  // Using prefixes 20-25 to cover 2000-2599
  // =====================
  { postcode: '20', prefix: true, note: 'NSW: Sydney area (2000-2099)' },
  { postcode: '21', prefix: true, note: 'NSW: Sydney suburbs (2100-2199)' },
  { postcode: '22', prefix: true, note: 'NSW: Sydney suburbs (2200-2299)' },
  { postcode: '23', prefix: true, note: 'NSW: Sydney suburbs (2300-2399)' },
  { postcode: '24', prefix: true, note: 'NSW: Central NSW (2400-2499)' },
  { postcode: '25', prefix: true, note: 'NSW: Central NSW (2500-2599)' },

  // =====================
  // NSW - Range 2619-2899
  // CAREFUL: 2600-2618 is ACT, so we can't use prefix '26'
  // =====================

  // 2619 - Single postcode (Jerrabomberra is NSW, not ACT)
  { postcode: '2619', prefix: false, note: 'NSW: Jerrabomberra (exact match - ACT border)' },

  // 2620-2699 - Use 3-digit prefixes to avoid ACT overlap
  { postcode: '262', prefix: true, note: 'NSW: Queanbeyan area (2620-2629)' },
  { postcode: '263', prefix: true, note: 'NSW: Southern Tablelands (2630-2639)' },
  { postcode: '264', prefix: true, note: 'NSW: Southern Tablelands (2640-2649)' },
  { postcode: '265', prefix: true, note: 'NSW: Riverina (2650-2659)' },
  { postcode: '266', prefix: true, note: 'NSW: Riverina (2660-2669)' },
  { postcode: '267', prefix: true, note: 'NSW: Riverina (2670-2679)' },
  { postcode: '268', prefix: true, note: 'NSW: Riverina (2680-2689)' },
  { postcode: '269', prefix: true, note: 'NSW: Riverina (2690-2699)' },

  // 2700-2899 - Can use 2-digit prefixes
  { postcode: '27', prefix: true, note: 'NSW: Western NSW (2700-2799)' },
  { postcode: '28', prefix: true, note: 'NSW: Far Western NSW (2800-2899)' },

  // =====================
  // NSW - Range 2921-2999
  // CAREFUL: 2900-2920 is ACT, so we can't use prefix '29'
  // =====================

  // 2921-2929 - Individual postcodes (only 9 postcodes)
  { postcode: '2921', prefix: false, note: 'NSW: Currans Hill (exact match - ACT border)' },
  { postcode: '2922', prefix: false, note: 'NSW: (exact match - ACT border)' },
  { postcode: '2923', prefix: false, note: 'NSW: (exact match - ACT border)' },
  { postcode: '2924', prefix: false, note: 'NSW: (exact match - ACT border)' },
  { postcode: '2925', prefix: false, note: 'NSW: (exact match - ACT border)' },
  { postcode: '2926', prefix: false, note: 'NSW: (exact match - ACT border)' },
  { postcode: '2927', prefix: false, note: 'NSW: (exact match - ACT border)' },
  { postcode: '2928', prefix: false, note: 'NSW: (exact match - ACT border)' },
  { postcode: '2929', prefix: false, note: 'NSW: (exact match - ACT border)' },

  // 2930-2999 - Can use 3-digit prefixes
  { postcode: '293', prefix: true, note: 'NSW: (2930-2939)' },
  { postcode: '294', prefix: true, note: 'NSW: (2940-2949)' },
  { postcode: '295', prefix: true, note: 'NSW: (2950-2959)' },
  { postcode: '296', prefix: true, note: 'NSW: (2960-2969)' },
  { postcode: '297', prefix: true, note: 'NSW: (2970-2979)' },
  { postcode: '298', prefix: true, note: 'NSW: (2980-2989)' },
  { postcode: '299', prefix: true, note: 'NSW: (2990-2999)' },
];

/**
 * Verify the zone patterns are correct by testing sample postcodes
 */
function verifyZonePatterns() {
  console.log('\n🔍 Verifying zone patterns...\n');

  // Test cases: [postcode, shouldMatch, description]
  const testCases = [
    // Victoria - should match
    ['3000', true, 'Melbourne CBD (VIC)'],
    ['3999', true, 'Regional VIC'],
    ['8000', true, 'VIC LVR'],
    ['8999', true, 'VIC LVR'],

    // NSW - should match
    ['1000', true, 'NSW LVR'],
    ['1999', true, 'NSW LVR'],
    ['2000', true, 'Sydney CBD (NSW)'],
    ['2599', true, 'NSW'],
    ['2619', true, 'Jerrabomberra (NSW - border)'],
    ['2620', true, 'Queanbeyan (NSW)'],
    ['2650', true, 'Wagga Wagga (NSW)'],
    ['2899', true, 'Far Western NSW'],
    ['2921', true, 'NSW (border)'],
    ['2999', true, 'NSW'],

    // ACT - should NOT match
    ['2600', false, 'Canberra (ACT - should NOT match)'],
    ['2601', false, 'Canberra (ACT - should NOT match)'],
    ['2618', false, 'ACT (should NOT match)'],
    ['2900', false, 'ACT (should NOT match)'],
    ['2920', false, 'ACT (should NOT match)'],

    // Other states - should NOT match
    ['4000', false, 'Brisbane (QLD - should NOT match)'],
    ['5000', false, 'Adelaide (SA - should NOT match)'],
    ['6000', false, 'Perth (WA - should NOT match)'],
    ['7000', false, 'Hobart (TAS - should NOT match)'],
    ['0800', false, 'Darwin (NT - should NOT match)'],
  ];

  let passed = 0;
  let failed = 0;

  for (const [postcode, shouldMatch, description] of testCases) {
    const matches = checkPostcodeMatch(postcode);
    const result = matches === shouldMatch;

    if (result) {
      passed++;
      console.log(`  ✅ ${postcode} - ${description}`);
    } else {
      failed++;
      console.log(`  ❌ ${postcode} - ${description} (Expected: ${shouldMatch ? 'MATCH' : 'NO MATCH'}, Got: ${matches ? 'MATCH' : 'NO MATCH'})`);
    }
  }

  console.log(`\n📊 Verification: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Check if a postcode matches any of our zone patterns
 */
function checkPostcodeMatch(postcode) {
  for (const zone of NSW_VIC_ZONES) {
    if (zone.prefix) {
      if (postcode.startsWith(zone.postcode)) {
        return true;
      }
    } else {
      if (postcode === zone.postcode) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Main migration function
 */
async function migrateNswVicZones() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const shouldClear = args.includes('--clear');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  NSW & Victoria Postcode Zone Migration');
  console.log('  Flat $59 delivery to all NSW and VIC postcodes');
  console.log('═══════════════════════════════════════════════════════════════');

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made to the database\n');
  }

  // Verify patterns first
  const patternsValid = verifyZonePatterns();
  if (!patternsValid) {
    console.error('\n❌ Zone pattern verification failed! Please fix before proceeding.');
    process.exit(1);
  }

  console.log('\n✅ All zone patterns verified correctly!\n');

  if (isDryRun) {
    console.log('📋 Zones that would be created:');
    console.log(`   Total: ${NSW_VIC_ZONES.length} zone entries`);
    console.log('\n   Breakdown:');
    console.log(`   - Prefix patterns: ${NSW_VIC_ZONES.filter(z => z.prefix).length}`);
    console.log(`   - Exact matches: ${NSW_VIC_ZONES.filter(z => !z.prefix).length}`);
    console.log('\n   Coverage:');
    console.log('   - VIC: 3000-3999, 8000-8999');
    console.log('   - NSW: 1000-1999, 2000-2599, 2619-2899, 2921-2999');
    console.log('   - Excluded: ACT (2600-2618, 2900-2920)');
    console.log('\nRun without --dry-run to apply changes.');
    process.exit(0);
  }

  try {
    // Check for existing warehouse
    console.log('🔍 Checking for existing warehouse...');
    let warehouseId;

    const existingWarehouses = await query(
      'SELECT id, name FROM warehouses WHERE name = ? OR name LIKE ?',
      [WAREHOUSE_NAME, '%NSW%VIC%']
    );

    if (existingWarehouses.length > 0) {
      warehouseId = existingWarehouses[0].id;
      console.log(`   Found existing warehouse: ${existingWarehouses[0].name} (ID: ${warehouseId})`);

      if (shouldClear) {
        console.log('\n⚠️  Clearing existing zones for this warehouse...');
        const deleteResult = await query('DELETE FROM zones WHERE warehouse_id = ?', [warehouseId]);
        console.log(`   Deleted ${deleteResult.affectedRows} existing zones`);
      } else {
        // Check existing zone count
        const existingZones = await query('SELECT COUNT(*) as count FROM zones WHERE warehouse_id = ?', [warehouseId]);
        if (existingZones[0].count > 0) {
          console.log(`\n⚠️  Warehouse already has ${existingZones[0].count} zones.`);
          console.log('   Use --clear flag to remove existing zones first.');
          console.log('   Or manually review and update as needed.');

          // Ask if should proceed
          console.log('\n   Proceeding will ADD new zones (may create duplicates)...');
        }
      }
    } else {
      // Create new warehouse
      console.log('   No existing warehouse found. Creating new one...');
      const result = await query(`
        INSERT INTO warehouses (name, address, suburb, state, postcode, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `, [WAREHOUSE_NAME, WAREHOUSE_ADDRESS, 'Sydney', WAREHOUSE_STATE, WAREHOUSE_POSTCODE]);

      warehouseId = result.insertId;
      console.log(`   ✅ Created warehouse: ${WAREHOUSE_NAME} (ID: ${warehouseId})`);
    }

    // Insert zones
    console.log('\n📦 Inserting zone patterns...');
    let insertedCount = 0;
    let skippedCount = 0;

    for (const zone of NSW_VIC_ZONES) {
      try {
        // Check if zone already exists
        const existing = await query(
          'SELECT id FROM zones WHERE warehouse_id = ? AND postcode = ?',
          [warehouseId, zone.postcode]
        );

        if (existing.length > 0) {
          skippedCount++;
          continue;
        }

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
      } catch (err) {
        console.error(`   ❌ Error inserting zone ${zone.postcode}: ${err.message}`);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Inserted: ${insertedCount} zones`);
    console.log(`   Skipped (already exist): ${skippedCount} zones`);

    // Verify final count
    const finalCount = await query('SELECT COUNT(*) as count FROM zones WHERE warehouse_id = ?', [warehouseId]);
    console.log(`   Total zones for warehouse: ${finalCount[0].count}`);

    // Show summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Warehouse ID: ${warehouseId}`);
    console.log(`  Warehouse Name: ${WAREHOUSE_NAME}`);
    console.log(`  Total Zones: ${finalCount[0].count}`);
    console.log('');
    console.log('  Coverage:');
    console.log('  ✅ Victoria: 3000-3999, 8000-8999');
    console.log('  ✅ NSW: 1000-1999, 2000-2599, 2619-2899, 2921-2999');
    console.log('  ❌ ACT excluded: 2600-2618, 2900-2920');
    console.log('  ❌ All other states: Draft order path');
    console.log('');
    console.log('  Shipping Rate: $59 flat rate');
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run migration
migrateNswVicZones();
