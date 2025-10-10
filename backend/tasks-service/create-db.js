const { Pool } = require('pg');

// Conectar a la base de datos por defecto para crear tasks_db
const adminPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // Base de datos por defecto
  password: 'linux',
  port: 5433,
});

async function createDatabase() {
  try {
    const client = await adminPool.connect();
    try {
      console.log('🔄 Verificando si existe la base de datos tasks_db...');
      
      // Verificar si la base de datos existe
      const result = await client.query(
        "SELECT 1 FROM pg_database WHERE datname = 'tasks_db'"
      );
      
      if (result.rows.length === 0) {
        // Crear la base de datos
        await client.query('CREATE DATABASE tasks_db');
        console.log('✅ Base de datos tasks_db creada exitosamente');
      } else {
        console.log('ℹ️ La base de datos tasks_db ya existe');
      }
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error al crear base de datos:', error.message);
  } finally {
    await adminPool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createDatabase();
}

module.exports = { createDatabase };