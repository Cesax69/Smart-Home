const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Simular el userService.findByUsernameOrEmail
async function findByUsernameOrEmail(username, email) {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'users_db',
    user: 'postgres',
    password: 'linux'
  });

  try {
    await client.connect();
    
    const query = `
      SELECT id, username, email, password_hash, first_name, last_name, family_role_id, family_sub_role_id, created_at, updated_at
      FROM users
      WHERE username = $1 OR email = $2
      LIMIT 1
    `;
    
    const result = await client.query(query, [username, email || username]);
    
    if (!result.rows.length) return undefined;
    
    const row = result.rows[0];
    return {
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
  } finally {
    await client.end();
  }
}

// Simular el controlador de autenticación
async function simulateAuthController() {
  console.log('=== SIMULANDO AUTH CONTROLLER ===');
  
  // Datos de entrada (simulando req.body)
  const username = 'papa_garcia';
  const password = 'member';
  
  console.log('1. Datos de entrada:');
  console.log('   username:', username);
  console.log('   password:', password);
  
  // Validación de entrada
  if (!username || !password) {
    console.log('❌ Username y password son requeridos');
    return;
  }
  
  console.log('✅ Validación de entrada pasada');
  
  // Buscar usuario
  console.log('\n2. Buscando usuario...');
  const user = await findByUsernameOrEmail(username);
  
  if (!user) {
    console.log('❌ Usuario no encontrado');
    return;
  }
  
  console.log('✅ Usuario encontrado:');
  console.log('   ID:', user.id);
  console.log('   Username:', user.username);
  console.log('   Email:', user.email);
  console.log('   Password hash:', user.password);
  console.log('   Role:', user.role);
  
  // Verificar contraseña
  console.log('\n3. Verificando contraseña...');
  console.log('   Password a verificar:', password);
  console.log('   Hash almacenado:', user.password);
  
  const isValidPassword = await bcrypt.compare(password, user.password);
  console.log('   Resultado bcrypt.compare:', isValidPassword);
  
  if (!isValidPassword) {
    console.log('❌ Credenciales inválidas');
    return;
  }
  
  console.log('✅ Contraseña válida');
  
  // Generar token
  console.log('\n4. Generando token JWT...');
  const tokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role
  };
  console.log('   Token payload:', tokenPayload);
  
  // Remover password de la respuesta
  const { password: _, ...userWithoutPassword } = user;
  
  console.log('\n5. Respuesta exitosa:');
  console.log('   User (sin password):', userWithoutPassword);
  console.log('✅ Login exitoso');
}

simulateAuthController().catch(console.error);