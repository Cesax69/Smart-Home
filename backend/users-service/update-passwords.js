const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function updatePasswords() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'users_db',
    user: 'postgres',
    password: 'linux'
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Generar hash para 'member'
    const memberHash = await bcrypt.hash('member', 10);
    console.log('Hash generado para member:', memberHash);

    // Actualizar todos los usuarios
    const result = await client.query('UPDATE users SET password_hash = $1', [memberHash]);
    console.log('Usuarios actualizados:', result.rowCount);

    // Verificar que el hash funciona
    const testResult = await bcrypt.compare('member', memberHash);
    console.log('Verificación del hash:', testResult);

    await client.end();
    console.log('Contraseñas actualizadas correctamente');
  } catch (error) {
    console.error('Error:', error);
  }
}

updatePasswords();