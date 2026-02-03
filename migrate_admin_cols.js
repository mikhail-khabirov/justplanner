
import pool from './server/config/db.js';

const migrate = async () => {
    try {
        console.log('🔄 Starting migration...');

        // Add session_count column
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 0;
        `);
        console.log('✅ Added session_count column');

        // Add registration_source column
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS registration_source VARCHAR(255);
        `);
        console.log('✅ Added registration_source column');

        console.log('🎉 Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
