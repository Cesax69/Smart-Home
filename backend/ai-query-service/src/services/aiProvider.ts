import axios from 'axios';
import { DbConnectionConfig } from '../config/connections';

interface BuildQueryParams {
  message: string;
  schema: any;
  connection: DbConnectionConfig;
  userId?: number;
  userRole?: string; // 'head_of_household' | 'family_member' | otros
  userName?: string;
  email?: string;
}

export const buildQueryWithAI = async ({ message, schema, connection, userId, userRole, userName, email }: BuildQueryParams): Promise<{ sql?: string; mongo?: { collection: string; pipeline?: any[]; filter?: any }, notes?: string }> => {
  const system = `
Eres un asistente que convierte lenguaje natural a consultas de solo lectura.
- Para SQL (Postgres/MySQL/MSSQL): SOLO SELECT o WITH.
- Para MongoDB: usar aggregate (pipeline) o find con filtros.
- No escribir, actualizar ni borrar.
- Usa el esquema provisto para elegir tablas/campos.
- IMPORTANTE (Postgres tareas): La tabla de tareas no tiene assigned_user_id ni progress. Las asignaciones están en task_assignments (task_id, user_id). Para tareas asignadas a un usuario, usa un EXISTS sobre task_assignments.
Respuesta en JSON:
{ "dialect": "<postgres|mysql|mssql|mongo>", "sql": "<consulta>", "mongo": { "collection": "<col>", "pipeline": [...], "filter": {...} }, "notes": "<breve explicación>" }
`;

  const payload = {
    model: (globalThis as any).process?.env?.AI_MODEL || 'general-nl2sql',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Esquema:\n${JSON.stringify(schema).slice(0, 8000)}\n\nPregunta:\n${message}\n` }
    ]
  };

  const url = (globalThis as any).process?.env?.AI_API_URL;
  const apiKey = (globalThis as any).process?.env?.AI_API_KEY;

  // Fallback local cuando no hay proveedor externo configurado
  if (!url || !apiKey) {
    return await buildHeuristicQuery({ message, schema, connection, userId, userRole, userName, email });
  }

  const resp = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  });

  const data = resp.data?.choices?.[0]?.message?.content || resp.data?.result || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(data);
  } catch {
    const match = data.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  }

  if (connection.type === 'mongo') {
    const collection = parsed?.mongo?.collection || inferMongoCollection(schema, message);
    return { mongo: { collection, pipeline: parsed?.mongo?.pipeline, filter: parsed?.mongo?.filter }, notes: parsed?.notes };
  }
  return { sql: parsed.sql, notes: parsed?.notes };
};

const inferMongoCollection = (schema: any, message: string): string => {
  const names = Object.keys(schema?.schema || {});
  const picked = names.find(n => message.toLowerCase().includes(n.toLowerCase())) || names[0] || 'items';
  return picked;
};

// Resolver externo del userId usando users-service cuando la tabla users no está en la misma BD
const resolveUserIdFromUsersService = async (userName?: string, email?: string): Promise<number | undefined> => {
  try {
    const base = (globalThis as any).process?.env?.USERS_SERVICE_URL || 'http://localhost:3001/api';
    // No hay endpoint directo de búsqueda; obtenemos todos y filtramos.
    const { data } = await axios.get(`${base}/users`);
    const list = Array.isArray(data?.data) ? data.data : [];
    const uName = (userName || '').toLowerCase();
    const uEmail = (email || '').toLowerCase();
    const found = list.find((u: any) =>
      (uName && String(u.username || '').toLowerCase() === uName) ||
      (uEmail && String(u.email || '').toLowerCase() === uEmail)
    );
    return found?.id;
  } catch (err) {
    return undefined;
  }
};

// Heurística básica para convertir preguntas comunes en SELECT seguros
const buildHeuristicQuery = async ({ message, schema, connection, userId, userRole, userName, email }: BuildQueryParams): Promise<{ sql?: string; mongo?: { collection: string; pipeline?: any[]; filter?: any }, notes?: string }> => {
  const msg = message.toLowerCase();
  const tables = Object.keys(schema?.schema || {});
  const hasTable = (name: string) => tables.some(t => t.toLowerCase() === name.toLowerCase());
  const pickTable = (predicate: (t: string) => boolean, fallback: string): string => {
    const found = tables.find(predicate);
    return found || (hasTable(fallback) ? fallback : (tables[0] || fallback));
  };
  const scoreTableForUser = (t: string): number => {
    const cols: string[] = (schema?.schema?.[t] || []).map((c: any) => c.column?.toLowerCase?.());
    let score = 0;
    if (cols.includes('username')) score++;
    if (cols.includes('email')) score++;
    if (cols.includes('first_name')) score++;
    if (cols.includes('last_name')) score++;
    if (cols.includes('family_role_id')) score++;
    return score;
  };

  // Intento de conteo
  const msgNorm = msg.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const msgFolded = msgNorm.replace(/[^a-z0-9\s]/gi, '');
  const isCountIntent = /(cuantos|cuántos|cuantas|cuántas|numero|número|total|cantidad)/i.test(msg)
    || /(cuantos|cuantas|numero|total|cantidad)/i.test(msgNorm)
    || /(cuantos|cuantas|cuntos|cuntas|numero|total|cantidad)/i.test(msgFolded);

  if (connection.type === 'mongo') {
    const collection = inferMongoCollection(schema, message);
    const filter: any = {};
    // Ejemplo simple: tareas de hoy -> due_date hoy
    if (msg.includes('hoy')) {
      filter.due_date = { $gte: new Date(new Date().toDateString()), $lt: new Date(new Date().toDateString() + ' 23:59:59') };
    }
    return { mongo: { collection, filter }, notes: 'Consulta heurística local (sin IA externa).' };
  }

  // Caso: consultas de usuario ("qué usuario soy", "mi usuario", "cuántos usuarios", etc.)
  // Evitar activar modo usuario si el mensaje habla de tareas/asignaciones.
  const mentionsTasks = (
    msg.includes('tarea') || msg.includes('tareas') || msg.includes('asignadas') ||
    msg.includes('pendiente') || msg.includes('pendientes') || msg.includes('completada') || msg.includes('completadas')
  );
  const isUserIntent = !mentionsTasks && (
    msg.includes('usuario') ||
    msg.includes('quien soy') || msg.includes('quién soy') ||
    msg.includes('mi usuario') || msg.includes('mi correo') || msg.includes('mi email') || msg.includes('mi rol') ||
    msg.includes('miembro') || msg.includes('miebro') || msg.includes('rol') || msg.includes('role') || msg.includes('member')
  );

  if (isUserIntent) {
    // Elegir la mejor tabla de usuarios evitando user_preferences/user_sessions
    const bestUser = tables.reduce<{ table?: string; score: number }>((best, t) => {
      const s = scoreTableForUser(t);
      return s > best.score ? { table: t, score: s } : best;
    }, { table: undefined, score: -1 });
    const usersTable = bestUser.table
      || tables.find(t => t.toLowerCase() === 'users')
      || tables.find(t => t.toLowerCase().includes('user') && !t.toLowerCase().includes('preferences') && !t.toLowerCase().includes('session'))
      || 'users';
    const rolesTable = pickTable(t => t.toLowerCase() === 'family_roles' || t.toLowerCase().includes('role'), 'family_roles');
    const userCols: string[] = (schema?.schema?.[usersTable] || []).map((c: any) => c.column);
    const roleCols: string[] = (schema?.schema?.[rolesTable] || []).map((c: any) => c.column);
    const hasFamilyRoleId = userCols.includes('family_role_id');
    const roleNameCol = roleCols.includes('role_name') ? 'role_name' : (roleCols.includes('name') ? 'name' : undefined);

    // Conteo de usuarios
    if (isCountIntent) {
      const sql = `SELECT COUNT(*) AS total FROM ${usersTable};`;
      return { sql, notes: `Heurística: conteo de usuarios. debug: isCountIntent=${isCountIntent}` };
    }

    const safe = (v?: string) => (v || '').replace(/'/g, "''").toLowerCase();
    const uEmail = safe(email);
    const uName = safe(userName);

    if (typeof userId === 'number' && userId > 0) {
      const selectBase = `u.*`;
      const roleExpr = hasFamilyRoleId
        ? (roleNameCol
            ? `COALESCE(fr.${roleNameCol}, CASE WHEN u.family_role_id = 1 THEN 'head_of_household' ELSE 'family_member' END) AS role`
            : `CASE WHEN u.family_role_id = 1 THEN 'head_of_household' ELSE 'family_member' END AS role`)
        : `NULL AS role`;
      const joinExpr = hasFamilyRoleId ? `LEFT JOIN ${rolesTable} fr ON fr.id = u.family_role_id` : '';
      const sql = `
        SELECT ${selectBase}, ${roleExpr}
        FROM ${usersTable} u
        ${joinExpr}
        WHERE u.id = ${userId}
        LIMIT 1;
      `;
      return { sql, notes: 'Heurística: información del usuario actual.' };
    } else if (uEmail || uName) {
      const conds = [
        uEmail ? `LOWER(u.email) = '${uEmail}'` : undefined,
        uName ? `LOWER(u.username) = '${uName}'` : undefined
      ].filter(Boolean).join(' OR ');
      const selectBase = `u.*`;
      const roleExpr = hasFamilyRoleId
        ? (roleNameCol
            ? `COALESCE(fr.${roleNameCol}, CASE WHEN u.family_role_id = 1 THEN 'head_of_household' ELSE 'family_member' END) AS role`
            : `CASE WHEN u.family_role_id = 1 THEN 'head_of_household' ELSE 'family_member' END AS role`)
        : `NULL AS role`;
      const joinExpr = hasFamilyRoleId ? `LEFT JOIN ${rolesTable} fr ON fr.id = u.family_role_id` : '';
      const sql = `
        SELECT ${selectBase}, ${roleExpr}
        FROM ${usersTable} u
        ${joinExpr}
        WHERE ${conds}
        LIMIT 1;
      `;
      return { sql, notes: 'Heurística: identificar usuario por email/username.' };
    } else {
      const orderCol = userCols.includes('created_at') ? 'created_at' : 'id';
      const sql = `
        SELECT *
        FROM ${usersTable}
        ORDER BY ${orderCol} DESC
        LIMIT 10;
      `;
      return { sql, notes: `Heurística: listado de usuarios. debug: isCountIntent=${isCountIntent} msg="${msg}" msgNorm="${msgNorm}"` };
    }
  }

  // SQL: detectar tabla más relevante para tareas
  const scoreTableForTasks = (t: string): number => {
    const cols: string[] = (schema?.schema?.[t] || []).map((c: any) => c.column?.toLowerCase?.());
    let score = 0;
    if (cols.includes('title')) score++;
    if (cols.includes('status')) score++;
    if (cols.includes('due_date')) score++;
    if (cols.includes('user_id')) score++;
    return score;
  };
  const bestTasks = tables.reduce<{ table?: string; score: number }>((best, t) => {
    const s = scoreTableForTasks(t);
    return s > best.score ? { table: t, score: s } : best;
  }, { table: undefined, score: -1 });
  let table = bestTasks.table
    || tables.find(t => t.toLowerCase() === 'tasks')
    || tables.find(t => t.toLowerCase().includes('tasks'))
    || 'tasks';

  const clauses: string[] = [];
  // filtros comunes
  if (msg.includes('hoy')) {
    clauses.push("(due_date::date = CURRENT_DATE)");
  }
  if (msg.includes('mañana')) {
    clauses.push("(due_date::date = (CURRENT_DATE + INTERVAL '1 day'))");
  }
  if (msg.includes('semana')) {
    clauses.push("(due_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')");
  }
  const pendingTokens = ['pendiente', 'pendientes', 'no complet', 'incomplet', 'en proceso', 'sin terminar', 'por hacer', 'no hecha', 'no hechas', 'no realizado', 'no realizados'];
  const completedTokens = ['complet', 'terminad', 'finalizad', 'hecha', 'hechas', 'realizad'];

  const isPendingLike = pendingTokens.some(t => msg.includes(t));
  const isCompletedLike = completedTokens.some(t => msg.includes(t));

  if (isPendingLike && !isCompletedLike) {
    clauses.push("(LOWER(status) <> 'completed' AND LOWER(status) <> 'completada')");
  } else if (isCompletedLike && !isPendingLike) {
    clauses.push("(LOWER(status) = 'completed' OR LOWER(status) = 'completada')");
  }

  // Filtro por usuario: si el mensaje implica intención de "mis/tengo/para mí/asignadas a mí".
  // Ejemplos: "mis tareas", "qué tareas tengo", "para mí", "asignadas a mí".
  const strip = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const myTokens = [
    'mis','mi','mío','mía','míos','mías',
    'tengo','para mi','para mí','me asignaron',
    'asignadas a mi','asignadas a mí','mis tareas','tareas mias','tareas mías'
  ];
  const myTokensNorm = myTokens.map(strip);
  const myTokensFolded = myTokensNorm.map(t => t.replace(/[^a-z0-9\s]/gi, ''));
  const hasMyIntent = (
    myTokens.some(t => msg.includes(t)) ||
    myTokensNorm.some(t => msgNorm.includes(t)) ||
    myTokensFolded.some(t => msgFolded.includes(t)) ||
    /asignadas\s+a\s+m\b/i.test(msgFolded) ||
    /para\s+m\b/i.test(msgFolded)
  );

  // Si hay intención explícita de "mis/para mí/asignadas a mí", filtrar por el usuario sin importar el rol.
  if (hasMyIntent || (email && email.length > 0)) {
    const safe = (v?: string) => (v || '').replace(/'/g, "''").toLowerCase();
    const uName = safe(userName);
    const uEmail = safe(email);
    const hasUserId = typeof userId === 'number' && userId > 0;

    // Detectar tabla de usuarios disponible (dinámica, puede ser users_schema.users o public.users)
    const bestUser = tables.reduce<{ table?: string; score: number }>((best, t) => {
      const s = scoreTableForUser(t);
      return s > best.score ? { table: t, score: s } : best;
    }, { table: undefined, score: -1 });
    const usersTable = bestUser.table
      || tables.find(t => t.toLowerCase() === 'users')
      || tables.find(t => t.toLowerCase().includes('user') && !t.toLowerCase().includes('preferences') && !t.toLowerCase().includes('session'))
      || 'users';
    const hasUsersTable = hasTable(usersTable);

    const parts: string[] = [];
    if (hasUserId) {
      parts.push(`(${table}.user_id = ${userId})`);
      parts.push(`EXISTS (SELECT 1 FROM task_assignments ta WHERE ta.task_id = ${table}.id AND ta.user_id = ${userId})`);
    }
    // Fallback por username/email:
    // 1) Si existe tabla de usuarios en esta conexión: hacemos JOIN/subqueries
    // 2) Además, intentamos resolver el ID vía users-service para cubrir bases separadas
    if (!hasUserId && (uName || uEmail)) {
      if (hasUsersTable) {
        const userCols: string[] = (schema?.schema?.[usersTable] || []).map((c: any) => c.column?.toLowerCase?.());
        const canUsername = userCols.includes('username');
        const canEmail = userCols.includes('email');
        const subUserMatch = [
          (uName && canUsername) ? `LOWER(u.username) = '${uName}'` : undefined,
          (uEmail && canEmail) ? `LOWER(u.email) = '${uEmail}'` : undefined
        ].filter(Boolean).join(' OR ');
        if (subUserMatch) {
          parts.push(`(${table}.user_id IN (SELECT u.id FROM ${usersTable} u WHERE ${subUserMatch}))`);
          parts.push(`EXISTS (SELECT 1 FROM task_assignments ta JOIN ${usersTable} u ON u.id = ta.user_id WHERE ta.task_id = ${table}.id AND (${subUserMatch}))`);
        }
      }
      // Siempre intentar resolver también por el servicio externo
      const resolvedId = await resolveUserIdFromUsersService(userName, email);
      if (resolvedId && Number.isFinite(resolvedId)) {
        parts.push(`(${table}.user_id = ${resolvedId})`);
        parts.push(`EXISTS (SELECT 1 FROM task_assignments ta WHERE ta.task_id = ${table}.id AND ta.user_id = ${resolvedId})`);
      }
    }
    if (parts.length) {
      clauses.push(`(${parts.join(' OR ')})`);
    }
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  // Conteo de tareas
  if (isCountIntent) {
    const sql = `SELECT COUNT(*) AS total FROM ${table} ${where};`;
    return { sql, notes: `Heurística: conteo de tareas. debug: hasMyIntent=${hasMyIntent} email="${email || ''}" msg="${msg}"` };
  }

  const sql = `SELECT * FROM ${table} ${where} ORDER BY due_date DESC NULLS LAST LIMIT 100;`

  return { sql, notes: `Consulta heurística local (con resolución de usuario si es necesario). debug: hasMyIntent=${hasMyIntent} email="${email || ''}" msg="${msg}"` };
};