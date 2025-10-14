const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'tasks_db',
  password: 'linux',
  port: 5433,
});

async function addPreviousStatusColumn() {
  try {
    const client = await pool.connect();
    try {
      const checkColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'previous_status'
      `);

      if (checkColumn.rows.length === 0) {
        await client.query(`ALTER TABLE tasks ADD COLUMN previous_status VARCHAR(20)`);
        console.log('✅ Columna previous_status agregada a la tabla tasks');
      } else {
        console.log('ℹ️ La columna previous_status ya existe en la tabla tasks');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error al agregar columna previous_status:', error.message);
  } finally {
    await pool.end();
  }
}

addPreviousStatusColumn();