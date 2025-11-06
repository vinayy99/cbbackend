import { pool } from './database/config.js';

const addMissingColumns = async () => {
  try {
    console.log('Adding missing columns to users table...');

    // Add avatar column (if it doesn't exist)
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN avatar VARCHAR(255) DEFAULT NULL
      `);
      console.log('✓ avatar column added');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ avatar column already exists');
      } else {
        throw error;
      }
    }

    // Add available column (if it doesn't exist)
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN available BOOLEAN DEFAULT TRUE
      `);
      console.log('✓ available column added');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ available column already exists');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All columns added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }
};

addMissingColumns();