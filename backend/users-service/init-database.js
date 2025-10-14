const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración por defecto (se puede sobreescribir con variables de entorno)
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'users_db',
  password: process.env.DB_PASSWORD || 'linux',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function initUsersDatabase() {
  try {
    const client = await pool.connect();
    try {
      console.log('🔄 Inicializando base de datos de usuarios...');

      const sqlPath = path.join(__dirname, '..', 'setup-users-database.sql');
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');

      // Ejecutar el contenido completo para respetar bloques DO $$ ... $$ y funciones
      await client.query(sqlContent);

      console.log('✅ Base de datos de usuarios configurada correctamente');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error al inicializar base de datos de usuarios:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initUsersDatabase();
}

module.exports = { initUsersDatabase };