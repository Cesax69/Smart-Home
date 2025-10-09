const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function debugAuthService() {
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

    const username = 'papa_garcia';
    const password = 'member';

    console.log('Simulando findByUsernameOrEmail...');
    
    // Simular exactamente la query del userService
    const query = `
      SELECT id, username, email, password_hash, first_name, last_name, family_role_id, family_sub_role_id, created_at, updated_at
      FROM users
      WHERE username = $1 OR email = $2
      LIMIT 1
    `;
    
    const result = await client.query(query, [username, username]);
    
    if (!result.rows.length) {
      console.log('Usuario no encontrado');
      return;
    }

    const row = result.rows[0];
    console.log('Row from DB:', row);

    // Simular la transformación del userService
    const user = {
      id: row.id,
      username: row.username,
      email: row.email,
      password: row.password_hash, // Esta es la clave
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.family_role_id === 1 ? 'head_of_household' : 'family_member',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    console.log('User object:', user);
    console.log('Password field:', user.password);
    console.log('Type of password field:', typeof user.password);

    // Simular la comparación del authController
    console.log('\nSimulando bcrypt.compare...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('¿Contraseña válida?', isValidPassword);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

debugAuthService();