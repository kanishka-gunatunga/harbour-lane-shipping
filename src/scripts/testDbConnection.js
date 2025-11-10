/**
 * Test database connection script
 * Run this to verify your database credentials are correct
 * 
 * Usage:
 *   node src/scripts/testDbConnection.js
 */

require('dotenv').config();
const { testConnection, query } = require('../db/config');

async function testDatabase() {
  console.log('🔍 Testing database connection...\n');
  
  // Display connection info (without password)
  console.log('Connection Details:');
  console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  User: ${process.env.DB_USER || 'root'}`);
  console.log(`  Database: ${process.env.DB_NAME || 'harbour_lane_shipping'}`);
  console.log(`  Password: ${process.env.DB_PASSWORD ? '***' : '(not set)'}`);
  console.log('');
  
  // Test connection
  try {
    const result = await testConnection();
    
    if (result.success) {
      console.log('✅ Database connection successful!\n');
      
      // Test query to verify database structure
      console.log('🔍 Verifying database structure...');
      
      try {
        // Check if tables exist
        const tables = await query(`
          SELECT TABLE_NAME 
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = ?
        `, [process.env.DB_NAME || 'harbour_lane_shipping']);
        
        const tableNames = tables.map(t => t.TABLE_NAME);
        const expectedTables = ['warehouses', 'zones', 'inquiries'];
        
        console.log(`\n📊 Found ${tables.length} table(s):`);
        tableNames.forEach(name => console.log(`  - ${name}`));
        
        const missingTables = expectedTables.filter(t => !tableNames.includes(t));
        if (missingTables.length > 0) {
          console.log(`\n⚠️  Missing expected tables: ${missingTables.join(', ')}`);
          console.log('   Run the schema: mysql -u root -p < src/db/schema.sql');
        } else {
          console.log('\n✅ All expected tables are present');
        }
        
        // Check warehouse count
        try {
          const warehouseCount = await query('SELECT COUNT(*) as count FROM warehouses');
          console.log(`\n📦 Warehouses: ${warehouseCount[0].count}`);
        } catch (err) {
          console.log('\n⚠️  Could not count warehouses (table may be empty)');
        }
        
        // Check zones count
        try {
          const zonesCount = await query('SELECT COUNT(*) as count FROM zones');
          console.log(`📦 Zones: ${zonesCount[0].count}`);
        } catch (err) {
          console.log('⚠️  Could not count zones (table may be empty)');
        }
        
        // Check inquiries count
        try {
          const inquiriesCount = await query('SELECT COUNT(*) as count FROM inquiries');
          console.log(`📦 Inquiries: ${inquiriesCount[0].count}`);
        } catch (err) {
          console.log('⚠️  Could not count inquiries (table may be empty)');
        }
        
      } catch (queryError) {
        console.log(`\n⚠️  Connection works, but query failed: ${queryError.message}`);
        console.log('   This might mean the database schema is not set up yet.');
        console.log('   Run: mysql -u root -p < src/db/schema.sql');
      }
      
      console.log('\n✅ Database is ready to use!');
      process.exit(0);
      
    } else {
      console.error('❌ Database connection failed!');
      console.error(`   Error: ${result.message}\n`);
      
      console.log('Troubleshooting:');
      console.log('1. Verify your .env file has correct credentials:');
      console.log('   - DB_HOST');
      console.log('   - DB_USER');
      console.log('   - DB_PASSWORD');
      console.log('   - DB_NAME');
      console.log('');
      console.log('2. Check if database server is accessible:');
      console.log(`   mysql -h ${process.env.DB_HOST} -u ${process.env.DB_USER} -p`);
      console.log('');
      console.log('3. Verify database exists:');
      console.log(`   mysql -h ${process.env.DB_HOST} -u ${process.env.DB_USER} -p -e "SHOW DATABASES;"`);
      console.log('');
      console.log('4. Check firewall rules if using remote database');
      
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the test
testDatabase();

