const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tasks_db',
  password: process.env.DB_PASSWORD || 'linux',
  port: process.env.DB_PORT_OUTSIDE || 5433, // puerto expuesto en host
});

async function applyTaskCommentsMigration() {
  const client = await pool.connect();
  try {
    console.log('🔎 Verificando existencia de tabla task_comments...');
    const checkRes = await client.query("SELECT to_regclass('public.task_comments') IS NOT NULL AS exists");
    const exists = checkRes.rows[0]?.exists === true;

    if (exists) {
      console.log('ℹ️ La tabla task_comments ya existe. No se aplica migración.');
      return;
    }

    console.log('➡️ Aplicando migración 001_add_task_comments.sql...');
    const sqlPath = path.join(__dirname, '..', 'migrations', '001_add_task_comments.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    for (const command of commands) {
      await client.query(command);
    }

    console.log('✅ Migración aplicada: tabla task_comments creada correctamente.');
  } catch (error) {
    console.error('❌ Error aplicando migración de comentarios:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  applyTaskCommentsMigration();
}

module.exports = { applyTaskCommentsMigration };