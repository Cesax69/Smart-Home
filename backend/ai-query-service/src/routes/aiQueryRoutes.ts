import { Router } from 'express';
import { z } from 'zod';
import { getConnectionById, listConnections, DbConnectionConfig } from '../config/connections';
import { introspectSchema } from '../services/schemaIntrospector';
import { buildQueryWithAI } from '../services/aiProvider';
import { isReadOnlyQuery, isReadOnlyMongo } from '../utils/sqlGuard';
import { executeReadQuery } from '../services/queryExecutor';

const router = Router();

router.get('/health', (_req: any, res: any) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

router.get('/ai-query/connections', (_req: any, res: any) => {
  res.json({ success: true, connections: listConnections() });
});

const chatSchema = z.object({
  message: z.string().min(3),
  connectionId: z.string().optional(),
  limit: z.number().min(1).max(500).optional(),
  userId: z.number().int().positive().optional(),
  userRole: z.string().optional(),
  userName: z.string().optional(),
  email: z.string().optional()
});

// Helper: inferir conexión por el contenido del mensaje
function inferConnectionIdFromMessage(message: string): string | undefined {
  const msg = (message || '').toLowerCase();
  const connections = listConnections();
  const usersConn = connections.find(c => c.id.toLowerCase().includes('users') || c.name.toLowerCase().includes('users'));
  const tasksConn = connections.find(c => c.id.toLowerCase().includes('tasks') || c.name.toLowerCase().includes('tasks'));
  const mentionsUsers = (
    msg.includes('usuario') || msg.includes('usuarios') || msg.includes('familia') || msg.includes('miembro') || msg.includes('quien soy') || msg.includes('quién soy') || msg.includes('correo') || msg.includes('email')
  );
  const mentionsTasks = (
    msg.includes('tarea') || msg.includes('tareas') || msg.includes('pendiente') || msg.includes('pendientes') || msg.includes('completada') || msg.includes('completadas')
  );
  if (mentionsUsers && usersConn) return usersConn.id;
  if (mentionsTasks && tasksConn) return tasksConn.id;
  return connections[0]?.id;
}

// Helper: extraer email del mensaje (si está embebido)
function extractEmailFromMessage(message: string): string | undefined {
  const m = (message || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : undefined;
}

// Helper: normalizar rol del mensaje a nuestro dominio
function deriveRoleFromMessage(message: string): string | undefined {
  const msg = (message || '').toLowerCase();
  if (msg.includes('jefe del hogar') || msg.includes('jefe')) return 'head_of_household';
  if (msg.includes('miembro')) return 'family_member';
  return undefined;
}

router.post('/ai-query/chat', async (req: any, res: any) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Parámetros inválidos', errors: parsed.error.issues });
    }

    const { message, connectionId, limit, userId, userRole, userName, email } = parsed.data;
    const derivedEmail = email || extractEmailFromMessage(message);
    const derivedRole = userRole || deriveRoleFromMessage(message);

    let conn = getConnectionById(connectionId);
    if (!conn) {
      const inferredId = inferConnectionIdFromMessage(message);
      conn = inferredId ? getConnectionById(inferredId) : listConnections()[0];
    }
    if (!conn) {
      return res.status(400).json({ success: false, message: 'Conexión no encontrada o no configurada' });
    }

    const schema = await introspectSchema(conn);
    const ai = await buildQueryWithAI({ message, schema, connection: conn, userId, userRole: derivedRole, userName, email: derivedEmail });

    const debug = true;
    if (debug) {
      try {
        const built = conn.type === 'mongo' ? ai.mongo : ai.sql;
        console.log('[AI-Query][Built]', built);
      } catch (e) {
        // ignore logging errors
      }
    }

    if (conn.type === 'mongo') {
      if (!isReadOnlyMongo(ai.mongo)) {
        return res.status(400).json({ success: false, message: 'Solo se permiten consultas de lectura (aggregate/find)' });
      }
    } else {
      if (!isReadOnlyQuery(ai.sql)) {
        return res.status(400).json({ success: false, message: 'Solo se permiten consultas SELECT' });
      }
    }

    const result = await executeReadQuery(conn, ai);
    const queryObj = conn.type === 'mongo' ? { mongo: ai.mongo } : { sql: ai.sql };

    const summary = buildHumanSummary(parsed.data.message, result.rows, conn);
    res.json({
      success: true,
      query: queryObj,
      result: { rows: result.rows, meta: result.meta },
      notes: ai.notes,
      summary
    });
  } catch (error: any) {
    console.error('❌ Error en /ai-query/chat:', error);
    res.status(500).json({ success: false, message: 'Error procesando la consulta', detail: error?.message });
  }
});

export default router;

function buildHumanSummary(message: string, rows: any[], conn: DbConnectionConfig): string {
  const msg = (message || '').toLowerCase();
  const count = rows?.length || 0;
  const pickField = (...candidates: string[]): string | undefined => {
    const keys = rows && rows.length ? Object.keys(rows[0]) : [];
    const found = candidates.find(c => keys.includes(c));
    return found;
  };

  // Atajo para conteos (COUNT(*), total)
  const countField = pickField('count', 'total');
  if (rows && rows.length === 1 && countField) {
    const n = Number(rows[0][countField]) || 0;
    // Priorizar contexto de tareas si ambos aparecen
    if (msg.includes('tarea')) {
      return `Existen ${n} tareas registradas.`;
    }
    if (msg.includes('usuario')) {
      return `Hay ${n} usuarios en la base de datos.`;
    }
    return `Total: ${n}.`;
  }

  // Caso usuario: "qué usuario soy", "mi usuario"
  const msgNorm = msg.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const msgFolded = msgNorm.replace(/[^a-z0-9\s]/gi, '');
  const includes = (s: string, t: string) => s.includes(t);
  const isIdentity = (
    includes(msg, 'quien soy') || includes(msg, 'quién soy') ||
    includes(msgNorm, 'quien soy') || includes(msgFolded, 'quien soy') ||
    includes(msg, 'mi usuario') || includes(msgNorm, 'mi usuario') || includes(msgFolded, 'mi usuario') ||
    includes(msg, 'mi correo') || includes(msgNorm, 'mi correo') ||
    includes(msg, 'mi email') || includes(msgNorm, 'mi email') ||
    includes(msg, ' para mi') || includes(msgNorm, ' para mi') ||
    includes(msg, ' para mí') || includes(msgNorm, ' para mi') ||
    includes(msg, ' mis ') || includes(msgNorm, ' mis ') ||
    msg.startsWith('mi ') || msgNorm.startsWith('mi ') || msgFolded.startsWith('mi ') ||
    includes(msg, 'eres ') || includes(msgNorm, 'eres ') || includes(msgFolded, 'eres ')
  );
  if (isIdentity) {
    if (count === 0) return 'No se encontró información del usuario.';
    const r = rows[0] || {};
    const firstName = r['first_name'] || r['firstName'] || '';
    const lastName = r['last_name'] || r['lastName'] || '';
    const username = r['username'] || '';
    const email = r['email'] || '';
    const roleRaw = r['role'] || r['family_role'] || r['family_role_id'];
    const roleText = typeof roleRaw === 'number' ? (roleRaw === 1 ? 'Jefe del hogar' : 'Miembro') : (String(roleRaw || '').trim());
    const namePart = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : username || 'Usuario';
    const rolePart = roleText ? ` — rol: ${roleText}` : '';
    const emailPart = email ? ` — email: ${email}` : '';
    return `Eres ${namePart}${rolePart}${emailPart}`;
  }

  // Listado/Gestión de usuarios (no identidad)
  if (msg.includes('usuario') || msg.includes('usuarios')) {
    if (count === 0) return 'No se encontraron usuarios.';
    const names = rows.slice(0, 5).map((r: any) => {
      const fn = r['first_name'] || r['firstName'] || '';
      const ln = r['last_name'] || r['lastName'] || '';
      const un = r['username'] || '';
      const em = r['email'] || '';
      const name = (fn || ln) ? `${fn} ${ln}`.trim() : un;
      return name || em || 'Usuario';
    });
    const head = `Encontré ${count} ${count === 1 ? 'usuario' : 'usuarios'}.`;
    const lines = names.map((n, i) => `${i + 1}. ${n}`);
    return `${head}${lines.length ? '\n' + lines.join('\n') : ''}`;
  }

  // Casos comunes: tareas
  const isTareas = msg.includes('tarea');
  const titleKey = pickField('title', 'name', 'descripcion', 'description');
  const statusKey = pickField('status', 'estado');
  const dueKey = pickField('due_date', 'fecha', 'fecha_limite');

  if (isTareas) {
    if (count === 0) {
      if (msg.includes('hoy')) return 'No tienes tareas para hoy.';
      if (msg.includes('mañana')) return 'No tienes tareas para mañana.';
      return 'No se encontraron tareas para tu consulta.';
    }
    const head = `Encontré ${count} ${count === 1 ? 'tarea' : 'tareas'}${msg.includes('hoy') ? ' para hoy' : ''}.`;
    const lines = rows.slice(0, 5).map((r: any, i: number) => {
      const title = titleKey ? r[titleKey] : undefined;
      const status = statusKey ? r[statusKey] : undefined;
      const due = dueKey ? r[dueKey] : undefined;
      const parts = [title, status, due].filter(Boolean);
      return parts.length ? `${i + 1}. ${parts.join(' — ')}` : `${i + 1}. (sin detalles)`;
    });
    return `${head}${lines.length ? '\n' + lines.join('\n') : ''}`;
  }

  // Genérico
  if (count === 0) return 'No se encontraron resultados para tu consulta.';
  const lines = rows.slice(0, 5).map((r: any, i: number) => {
    const keys = Object.keys(r);
    const firstStrKey = keys.find(k => typeof r[k] === 'string');
    const val = firstStrKey ? r[firstStrKey] : JSON.stringify(r);
    return `${i + 1}. ${val}`;
  });
  return `Encontré ${count} resultados. ${lines.length ? '\n' + lines.join('\n') : ''}`;
}