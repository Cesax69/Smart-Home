const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function debugLogin() {
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

    // Obtener el usuario papa_garcia
    const result = await client.query(
      'SELECT id, username, email, password_hash, first_name, last_name, family_role_id FROM users WHERE username = $1',
      ['papa_garcia']
    );

    if (result.rows.length === 0) {
      console.log('Usuario no encontrado');
      return;
    }

    const user = result.rows[0];
    console.log('Usuario encontrado:', {
      id: user.id,
      username: user.username,
      email: user.email,
      password_hash: user.password_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      family_role_id: user.family_role_id
    });

    // Probar la comparación de contraseña
    const password = 'member';
    console.log('\nProbando contraseña:', password);
    console.log('Hash en BD:', user.password_hash);
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log('¿Contraseña válida?', isValid);

    // Generar un nuevo hash para comparar
    const newHash = await bcrypt.hash(password, 10);
    console.log('\nNuevo hash generado:', newHash);
    
    const isNewHashValid = await bcrypt.compare(password, newHash);
    console.log('¿Nuevo hash válido?', isNewHashValid);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

debugLogin();