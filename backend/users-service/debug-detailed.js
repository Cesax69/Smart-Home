const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function debugDetailed() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'users_db',
    user: 'postgres',
    password: 'linux'
  });

  try {
    await client.connect();
    console.log('=== DEBUG DETALLADO ===');

    const username = 'papa_garcia';
    const password = 'member';

    console.log('1. Datos de entrada:');
    console.log('   Username:', username);
    console.log('   Password:', password);

    console.log('\n2. Ejecutando query exacta del userService...');
    const query = `
      SELECT id, username, email, password_hash, first_name, last_name, family_role_id, family_sub_role_id, created_at, updated_at
      FROM users
      WHERE username = $1 OR email = $2
      LIMIT 1
    `;
    
    console.log('   Query:', query.replace(/\s+/g, ' ').trim());
    console.log('   Parámetros:', [username, username]);

    const result = await client.query(query, [username, username]);
    
    console.log('\n3. Resultado de la query:');
    console.log('   Filas encontradas:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('   ❌ Usuario no encontrado');
      return;
    }

    const row = result.rows[0];
    console.log('   ✅ Usuario encontrado');
    console.log('   Raw row:', JSON.stringify(row, null, 2));

    console.log('\n4. Transformación del objeto usuario:');
    const user = {
      id: row.id,
      username: row.username,
      email: row.email,
      password: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.family_role_id === 1 ? 'head_of_household' : 'family_member',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    console.log('   User object:', JSON.stringify(user, null, 2));

    console.log('\n5. Verificación de contraseña:');
    console.log('   Password a verificar:', password);
    console.log('   Hash almacenado:', user.password);
    console.log('   Tipo del hash:', typeof user.password);
    console.log('   Longitud del hash:', user.password.length);

    console.log('\n6. Ejecutando bcrypt.compare...');
    const startTime = Date.now();
    const isValidPassword = await bcrypt.compare(password, user.password);
    const endTime = Date.now();
    
    console.log('   Resultado:', isValidPassword);
    console.log('   Tiempo transcurrido:', endTime - startTime, 'ms');

    console.log('\n7. Verificación adicional:');
    // Generar un hash nuevo para la misma contraseña
    const newHash = await bcrypt.hash(password, 10);
    console.log('   Nuevo hash generado:', newHash);
    
    const newHashValid = await bcrypt.compare(password, newHash);
    console.log('   ¿Nuevo hash válido?', newHashValid);

    // Verificar si el hash actual es válido
    const hashPattern = /^\$2[aby]?\$\d+\$.{53}$/;
    console.log('   ¿Hash tiene formato válido?', hashPattern.test(user.password));

    console.log('\n=== FIN DEBUG ===');

  } catch (error) {
    console.error('❌ Error en debug:', error);
  } finally {
    await client.end();
  }
}

debugDetailed();