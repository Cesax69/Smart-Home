import { Router } from 'express';
import { z } from 'zod';
import { getConnectionById, listConnections, DbConnectionConfig } from '../config/connections';
import { introspectSchema } from '../services/schemaIntrospector';
import { buildQueryWithAI } from '../services/aiProvider';
import { isReadOnlyQuery, isReadOnlyMongo } from '../utils/sqlGuard';
import { executeReadQuery } from '../services/queryExecutor';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

router.get('/ai-query/connections', (_req, res) => {
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

router.post('/ai-query/chat', async (req, res) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Parámetros inválidos', errors: parsed.error.issues });
    }

    const { message, connectionId, limit, userId, userRole, userName, email } = parsed.data;
    const conn = getConnectionById(connectionId);
    if (!conn) {
      return res.status(400).json({ success: false, message: 'Conexión no encontrada o no configurada' });
    }

    const schema = await introspectSchema(conn);
    const ai = await buildQueryWithAI({ message, schema, connection: conn, userId, userRole, userName, email });

    const debug = process.env.AI_QUERY_DEBUG === '1' || process.env.NODE_ENV !== 'production';
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

  // Caso usuario: "qué usuario soy", "mi usuario"
  const isUsuario = (
    msg.includes('usuario') || msg.includes('quien soy') || msg.includes('quién soy') ||
    msg.includes('miembro') || msg.includes('miebro') || msg.includes('rol') || msg.includes('role') || msg.includes('member')
  );
  if (isUsuario) {
    if (count === 0) return 'No se encontró información del usuario.';
    const r = rows[0] || {};
    const firstName = r['first_name'] || r['firstName'] || '';
    const lastName = r['last_name'] || r['lastName'] || '';
    const username = r['username'] || '';
    const email = r['email'] || '';
    const role = r['role'] || r['family_role'] || r['family_role_id'] || '';
    const namePart = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : username || 'Usuario';
    const rolePart = role ? ` — rol: ${role}` : '';
    const emailPart = email ? ` — email: ${email}` : '';
    return `Eres ${namePart}${rolePart}${emailPart}`;
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