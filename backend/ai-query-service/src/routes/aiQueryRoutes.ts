/**
 * AI Query Routes (Simple Postgres)
 * Propósito: Endpoints de lectura para múltiples conexiones Postgres.
 * Flujo: carga conexiones -> selecciona builder -> ejecuta SQL -> responde.
 * Seguridad: solo lectura; límites de filas; validación de entrada básica.
 */
import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

// === Soporte simple para múltiples conexiones (Postgres) ===
// Modelo de conexión: describe una DB destino para consultas de solo lectura.
// type: solo 'postgres' soportado en modo simple. readOnly: informativo.
interface AiConnection {
  id: string;
  type: 'postgres';
  name: string;
  url: string;
  readOnly?: boolean;
}

/**
 * parseConnections
 * Lee AI_DB_CONNECTIONS (JSON) y construye conexiones iniciales.
 * Fallback: si no hay JSON, crea conexión tasks-pg con variables TASKS_PG_*.
 * Retorna conexiones válidas (con id y url).
 */
const parseConnections = (): AiConnection[] => {
  try {
    const raw = process.env.AI_DB_CONNECTIONS;
    if (raw) {
      const parsed = JSON.parse(raw);
      const list: AiConnection[] = (Array.isArray(parsed) ? parsed : []).filter(c => c && c.type === 'postgres' && c.id && c.url);
      if (list.length) return list;
    }
  } catch {}

  // Fallback a Tasks DB por variables simples
  const PG_HOST = process.env.TASKS_PG_HOST || 'smart-home-postgres-tasks';
  const PG_PORT = parseInt(process.env.TASKS_PG_PORT || '5432');
  const PG_DB = process.env.TASKS_PG_DATABASE || 'tasks_db';
  const PG_USER = process.env.TASKS_PG_USER || 'postgres';
  const PG_PASSWORD = process.env.TASKS_PG_PASSWORD || 'linux';
  const url = `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DB}`;
  return [{ id: 'tasks-pg', type: 'postgres', name: 'Tasks DB (Postgres)', url, readOnly: true }];
};

const connections: AiConnection[] = parseConnections();
const pools: Record<string, Pool> = {};
for (const c of connections) {
  pools[c.id] = new Pool({ connectionString: c.url });
}

// === Endpoints mínimos ===
router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

router.get('/ai-query/connections', (_req, res) => {
  res.json({ success: true, connections: connections.map(({ id, type, name }) => ({ id, type, name })) });
});

// Permitir agregar conexiones en memoria (simple, no persistente)
router.post('/ai-query/connections', async (req, res) => {
  try {
    const { id, type, name, url, readOnly } = req.body || {};
    if (!id || !type || !name || !url) {
      return res.status(400).json({ success: false, message: 'Faltan campos: id, type, name, url' });
    }
    if (type !== 'postgres') {
      return res.status(400).json({ success: false, message: 'Solo se soporta type=postgres en modo simple' });
    }
    if (connections.find(c => c.id === id)) {
      return res.status(409).json({ success: false, message: `La conexión '${id}' ya existe` });
    }

    const testPool = new Pool({ connectionString: url });
    try {
      await testPool.query('SELECT 1');
    } catch (e: any) {
      return res.status(400).json({ success: false, message: 'No se pudo conectar a la base de datos', detail: e?.message });
    }

    connections.push({ id, type: 'postgres', name, url, readOnly: !!readOnly });
    pools[id] = testPool;

    res.status(201).json({ success: true, connections: connections.map(({ id, type, name }) => ({ id, type, name })) });
  } catch (error: any) {
    console.error('❌ Error agregando conexión:', error);
    res.status(500).json({ success: false, message: 'Error interno al agregar conexión', detail: error?.message });
  }
});

// === Heurísticas simples ===
function buildSimpleTasksQuery(message: string, limit: number = 100, userId?: number | string) {
  const msg = (message || '').toLowerCase();
  const msgNoAccent = msg.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const conditions: string[] = [];
  const params: any[] = [];

  if (msg.includes('pendiente')) conditions.push("LOWER(status) = 'pending'");
  else if (msg.includes('progreso') || msg.includes('in_progress')) conditions.push("LOWER(status) = 'in_progress'");
  else if (msg.includes('complet')) conditions.push("LOWER(status) = 'completed'");

  if (msg.includes('hoy')) conditions.push('(due_date::date = CURRENT_DATE)');
  else if (msg.includes('mañana')) conditions.push("(due_date::date = (CURRENT_DATE + INTERVAL '1 day'))");
  else if (msg.includes('semana')) conditions.push("(due_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')");

  if (typeof userId !== 'undefined' && userId !== null && `${userId}`.length > 0) {
    params.push(Number(userId));
    const idx = params.length;
    conditions.push(`((tasks.user_id = $${idx}) OR EXISTS (SELECT 1 FROM task_assignments ta WHERE ta.task_id = tasks.id AND ta.user_id = $${idx}))`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const tokens = msgNoAccent.replace(/[^a-z0-9\s]/g, ' ');
  const words = tokens.split(/\s+/).filter(Boolean);
  const isCount = words.some(w => ['cuantas','cuantos','numero','total','cantidad'].includes(w));

  if (isCount) return { sql: `SELECT COUNT(*) AS total FROM tasks ${where};`, params, mode: 'count' as const };
  const safeLimit = Math.max(1, Math.min(500, limit || 100));
  return { sql: `SELECT id, title, status, priority, due_date, created_at FROM tasks ${where} ORDER BY created_at DESC LIMIT ${safeLimit};`, params, mode: 'list' as const };
}

function buildSimpleUsersQuery(message: string, limit: number = 100) {
  const msg = (message || '').toLowerCase();
  const msgNoAccent = msg.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const conditions: string[] = [];

  if (msg.includes('activo') || msg.includes('activos')) conditions.push('is_active = true');
  if (msg.includes('inactivo') || msg.includes('inactivos')) conditions.push('is_active = false');
  if (msg.includes('hoy')) conditions.push('(created_at::date = CURRENT_DATE)');
  else if (msg.includes('semana')) conditions.push("(created_at::date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE)");

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const tokens = msgNoAccent.replace(/[^a-z0-9\s]/g, ' ');
  const words = tokens.split(/\s+/).filter(Boolean);
  const isCount = words.some(w => ['cuantas','cuantos','numero','total','cantidad'].includes(w));

  if (isCount) return { sql: `SELECT COUNT(*) AS total FROM users ${where};`, params: [], mode: 'count' as const };
  const safeLimit = Math.max(1, Math.min(500, limit || 100));
  return { sql: `SELECT id, username, email, first_name, last_name, is_active, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ${safeLimit};`, params: [], mode: 'list' as const };
}

function isUsersConnection(c: AiConnection): boolean {
  const s = `${c.id} ${c.name} ${c.url}`.toLowerCase();
  return /user|usuario|usuarios/.test(s) || /users_db/.test(s);
}
function isTasksConnection(c: AiConnection): boolean {
  const s = `${c.id} ${c.name} ${c.url}`.toLowerCase();
  return /task|tarea|tasks/.test(s) || /tasks_db/.test(s);
}
function inferConnectionId(message: string): string | undefined {
  const msg = (message || '').toLowerCase();
  const preferUsers = /usuario|usuarios|email|correo|nombre|apellido/.test(msg);
  if (preferUsers) {
    const uc = connections.find(isUsersConnection);
    if (uc) return uc.id;
  }
  const tc = connections.find(isTasksConnection);
  if (tc) return tc.id;
  return connections[0]?.id;
}

router.post('/ai-query/chat', async (req, res) => {
  try {
    const { message, connectionId, limit, userId } = req.body || {};
    const targetId = (connectionId && connections.find(c => c.id === connectionId)) ? connectionId : inferConnectionId(message);
    if (!targetId) return res.status(400).json({ success: false, message: 'No hay conexiones disponibles' });

    const conn = connections.find(c => c.id === targetId);
    const pool = pools[targetId];
    if (!pool || !conn) return res.status(400).json({ success: false, message: `Conexión no soportada: ${targetId}` });

    const useUsers = isUsersConnection(conn);
    const builder = useUsers ? buildSimpleUsersQuery(message, limit) : buildSimpleTasksQuery(message, limit, userId);
    const built = builder as any;
    const result = await pool.query(built.sql, built.params || []);

    let summary = '';
    if (built.mode === 'count') {
      const total = Number(((result.rows?.[0] as any)?.total) ?? 0);
      summary = useUsers ? `Existen ${total} usuarios` : `Existen ${total} tareas`;
    } else {
      summary = useUsers ? `Encontré ${result.rows?.length || 0} usuarios` : `Encontré ${result.rows?.length || 0} tareas`;
    }

    res.json({
      success: true,
      query: { sql: built.sql },
      result: { rows: result.rows },
      notes: `Conexión: ${targetId} (solo lectura). Modo simple.`,
      summary
    });
  } catch (error: any) {
    console.error('❌ Error en /ai-query/chat (simple multi):', error);
    res.status(500).json({ success: false, message: 'Error procesando la consulta (simple)', detail: error?.message });
  }
});

export default router;