const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'tasks_db',
  password: 'linux',
  port: 5433,
});

async function addProgressColumn() {
  try {
    const client = await pool.connect();
    try {
      // Verificar si la columna ya existe
      const checkColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'progress'
      `);
      
      if (checkColumn.rows.length === 0) {
        // Agregar la columna progress
        await client.query('ALTER TABLE tasks ADD COLUMN progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100)');
        console.log('✅ Columna progress agregada exitosamente a la tabla tasks');
        
        // Actualizar algunas tareas existentes con progreso inicial
        await client.query(`
          UPDATE tasks 
          SET progress = CASE 
            WHEN status = 'pending' THEN 0
            WHEN status = 'in_progress' THEN 50
            WHEN status = 'completed' THEN 100
            ELSE 0
          END
        `);
        console.log('✅ Valores de progreso iniciales establecidos');
      } else {
        console.log('ℹ️ La columna progress ya existe en la tabla tasks');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error al agregar columna progress:', error.message);
  } finally {
    await pool.end();
  }
}

addProgressColumn();