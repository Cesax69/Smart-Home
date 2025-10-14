const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'tasks_db',
  password: 'linux',
  port: 5433,
});

async function initDatabase() {
  try {
    const client = await pool.connect();
    try {
      console.log('🔄 Inicializando base de datos...');
      
      // Leer y ejecutar el script SQL
      const sqlPath = path.join(__dirname, '..', 'setup-tasks-database.sql');
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      
      // Ejecutar todo el contenido de una vez para respetar bloques DO $$ ... $$
      await client.query(sqlContent);
      
      console.log('✅ Esquema de tareas creado exitosamente (sin datos de ejemplo)');
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };