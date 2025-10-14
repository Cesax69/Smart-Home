const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'users_db',
  password: process.env.DB_PASSWORD || 'linux',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function verify() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT u.username, u.family_role_id,
             (SELECT sub_role_name FROM family_sub_roles fs WHERE fs.id = u.family_sub_role_id) AS sub_role
      FROM users u
      WHERE u.username IN ('papa','mama','hijo1','hija1','hijo2')
      ORDER BY u.username ASC;
    `);
    console.log('🧑‍👩‍👧‍👦 Usuarios insertados:');
    for (const r of rows) {
      console.log(`- ${r.username} | role_id=${r.family_role_id} | sub_role=${r.sub_role}`);
    }
  } catch (e) {
    console.error('Error verificando usuarios:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verify();