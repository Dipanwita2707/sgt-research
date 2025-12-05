require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');

const migrate = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migration...');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schema);
    
    console.log('✅ Database migration completed successfully');
    console.log('📊 Tables created:');
    console.log('   - users');
    console.log('   - students');
    console.log('   - staff');
    console.log('   - modules');
    console.log('   - permissions');
    console.log('   - user_permissions');
    console.log('   - role_templates');
    console.log('   - role_template_permissions');
    console.log('   - audit_logs');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
