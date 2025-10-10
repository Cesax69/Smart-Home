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
      
      // Dividir el contenido en comandos individuales
      const commands = sqlContent.split(';').filter(cmd => cmd.trim().length > 0);
      
      for (const command of commands) {
        if (command.trim()) {
          await client.query(command.trim());
        }
      }
      
      console.log('✅ Tablas creadas exitosamente');
      
      // Insertar datos de prueba
      const insertTestData = `
        INSERT INTO tasks (title, description, assigned_to, status, priority, due_date, created_at, updated_at) 
        VALUES 
          ('Limpiar la cocina', 'Limpiar todos los electrodomésticos y superficies', 1, 'pending', 'high', '2024-12-31', NOW(), NOW()),
          ('Aspirar la sala', 'Aspirar alfombras y limpiar muebles', 1, 'pending', 'medium', '2024-12-30', NOW(), NOW()),
          ('Lavar la ropa', 'Lavar, secar y doblar la ropa', 2, 'in_progress', 'low', '2024-12-29', NOW(), NOW()),
          ('Regar las plantas', 'Regar todas las plantas del jardín', 2, 'pending', 'medium', '2024-12-28', NOW(), NOW()),
          ('Organizar el armario', 'Organizar y limpiar el armario principal', 1, 'completed', 'low', '2024-12-27', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `;
      
      await client.query(insertTestData);
      console.log('✅ Datos de prueba insertados');
      
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