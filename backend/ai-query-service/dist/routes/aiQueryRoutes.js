"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * AI Query Routes (Simple Postgres)
 * Propósito: Endpoints de lectura para múltiples conexiones Postgres.
 * Flujo: carga conexiones -> selecciona builder -> ejecuta SQL -> responde.
 * Seguridad: solo lectura; límites de filas; validación de entrada básica.
 */
const express_1 = require("express");
const pg_1 = require("pg");
const router = (0, express_1.Router)();
/**
 * parseConnections
 * Lee AI_DB_CONNECTIONS (JSON) y construye conexiones iniciales.
 * Fallback: si no hay JSON, crea conexión tasks-pg con variables TASKS_PG_*.
 * Retorna conexiones válidas (con id y url).
 */
const parseConnections = () => {
    try {
        const raw = process.env.AI_DB_CONNECTIONS;
        if (raw) {
            const parsed = JSON.parse(raw);
            const list = (Array.isArray(parsed) ? parsed : []).filter(c => c && c.type === 'postgres' && c.id && c.url);
            if (list.length)
                return list;
        }
    }
    catch { }
    // Fallback a Tasks DB por variables simples
    const PG_HOST = process.env.TASKS_PG_HOST || 'smart-home-postgres-tasks';
    const PG_PORT = parseInt(process.env.TASKS_PG_PORT || '5432');
    const PG_DB = process.env.TASKS_PG_DATABASE || 'tasks_db';
    const PG_USER = process.env.TASKS_PG_USER || 'postgres';
    const PG_PASSWORD = process.env.TASKS_PG_PASSWORD || 'linux';
    const url = `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DB}`;
    return [{ id: 'tasks-pg', type: 'postgres', name: 'Tasks DB (Postgres)', url, readOnly: true }];
};
const connections = parseConnections();
const pools = {};
for (const c of connections) {
    pools[c.id] = new pg_1.Pool({ connectionString: c.url });
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
        const testPool = new pg_1.Pool({ connectionString: url });
        try {
            await testPool.query('SELECT 1');
        }
        catch (e) {
            return res.status(400).json({ success: false, message: 'No se pudo conectar a la base de datos', detail: e?.message });
        }
        connections.push({ id, type: 'postgres', name, url, readOnly: !!readOnly });
        pools[id] = testPool;
        res.status(201).json({ success: true, connections: connections.map(({ id, type, name }) => ({ id, type, name })) });
    }
    catch (error) {
        console.error('❌ Error agregando conexión:', error);
        res.status(500).json({ success: false, message: 'Error interno al agregar conexión', detail: error?.message });
    }
});
// === Heurísticas simples ===
function buildSimpleTasksQuery(message, limit = 100, userId) {
    const msg = (message || '').toLowerCase();
    const msgNoAccent = msg.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const conditions = [];
    const params = [];
    if (msg.includes('pendiente'))
        conditions.push("LOWER(status) = 'pending'");
    else if (msg.includes('progreso') || msg.includes('in_progress'))
        conditions.push("LOWER(status) = 'in_progress'");
    else if (msg.includes('complet'))
        conditions.push("LOWER(status) = 'completed'");
    if (msg.includes('hoy'))
        conditions.push('(due_date::date = CURRENT_DATE)');
    else if (msg.includes('mañana'))
        conditions.push("(due_date::date = (CURRENT_DATE + INTERVAL '1 day'))");
    else if (msg.includes('semana'))
        conditions.push("(due_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')");
    if (typeof userId !== 'undefined' && userId !== null && `${userId}`.length > 0) {
        params.push(Number(userId));
        const idx = params.length;
        conditions.push(`((tasks.user_id = $${idx}) OR EXISTS (SELECT 1 FROM task_assignments ta WHERE ta.task_id = tasks.id AND ta.user_id = $${idx}))`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const tokens = msgNoAccent.replace(/[^a-z0-9\s]/g, ' ');
    const words = tokens.split(/\s+/).filter(Boolean);
    const isCount = words.some(w => ['cuantas', 'cuantos', 'numero', 'total', 'cantidad'].includes(w));
    if (isCount)
        return { sql: `SELECT COUNT(*) AS total FROM tasks ${where};`, params, mode: 'count' };
    const safeLimit = Math.max(1, Math.min(500, limit || 100));
    return { sql: `SELECT id, title, status, priority, due_date, created_at FROM tasks ${where} ORDER BY created_at DESC LIMIT ${safeLimit};`, params, mode: 'list' };
}
function buildSimpleUsersQuery(message, limit = 100) {
    const msg = (message || '').toLowerCase();
    const msgNoAccent = msg.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const conditions = [];
    if (msg.includes('activo') || msg.includes('activos'))
        conditions.push('is_active = true');
    if (msg.includes('inactivo') || msg.includes('inactivos'))
        conditions.push('is_active = false');
    if (msg.includes('hoy'))
        conditions.push('(created_at::date = CURRENT_DATE)');
    else if (msg.includes('semana'))
        conditions.push("(created_at::date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE)");
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const tokens = msgNoAccent.replace(/[^a-z0-9\s]/g, ' ');
    const words = tokens.split(/\s+/).filter(Boolean);
    const isCount = words.some(w => ['cuantas', 'cuantos', 'numero', 'total', 'cantidad'].includes(w));
    if (isCount)
        return { sql: `SELECT COUNT(*) AS total FROM users ${where};`, params: [], mode: 'count' };
    const safeLimit = Math.max(1, Math.min(500, limit || 100));
    return { sql: `SELECT id, username, email, first_name, last_name, is_active, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ${safeLimit};`, params: [], mode: 'list' };
}
function isUsersConnection(c) {
    const s = `${c.id} ${c.name} ${c.url}`.toLowerCase();
    return /user|usuario|usuarios/.test(s) || /users_db/.test(s);
}
function isTasksConnection(c) {
    const s = `${c.id} ${c.name} ${c.url}`.toLowerCase();
    return /task|tarea|tasks/.test(s) || /tasks_db/.test(s);
}
function inferConnectionId(message) {
    const msg = (message || '').toLowerCase();
    const preferUsers = /usuario|usuarios|email|correo|nombre|apellido/.test(msg);
    if (preferUsers) {
        const uc = connections.find(isUsersConnection);
        if (uc)
            return uc.id;
    }
    const tc = connections.find(isTasksConnection);
    if (tc)
        return tc.id;
    return connections[0]?.id;
}
router.post('/ai-query/chat', async (req, res) => {
    try {
        const { message, connectionId, limit, userId } = req.body || {};
        const targetId = (connectionId && connections.find(c => c.id === connectionId)) ? connectionId : inferConnectionId(message);
        if (!targetId)
            return res.status(400).json({ success: false, message: 'No hay conexiones disponibles' });
        const conn = connections.find(c => c.id === targetId);
        const pool = pools[targetId];
        if (!pool || !conn)
            return res.status(400).json({ success: false, message: `Conexión no soportada: ${targetId}` });
        const useUsers = isUsersConnection(conn);
        const builder = useUsers ? buildSimpleUsersQuery(message, limit) : buildSimpleTasksQuery(message, limit, userId);
        const built = builder;
        const result = await pool.query(built.sql, built.params || []);
        let summary = '';
        if (built.mode === 'count') {
            const total = Number((result.rows?.[0]?.total) ?? 0);
            summary = useUsers ? `Existen ${total} usuarios` : `Existen ${total} tareas`;
        }
        else {
            summary = useUsers ? `Encontré ${result.rows?.length || 0} usuarios` : `Encontré ${result.rows?.length || 0} tareas`;
        }
        res.json({
            success: true,
            query: { sql: built.sql },
            result: { rows: result.rows },
            notes: `Conexión: ${targetId} (solo lectura). Modo simple.`,
            summary
        });
    }
    catch (error) {
        console.error('❌ Error en /ai-query/chat (simple multi):', error);
        res.status(500).json({ success: false, message: 'Error procesando la consulta (simple)', detail: error?.message });
    }
});
router.post('/ai-query/assistant/ask', async (req, res) => {
    try {
        const messageRaw = (req.body?.message ?? '').toString();
        const text = messageRaw.trim();
        if (!text) {
            return res.status(400).json({ success: false, reply: '', error: 'Mensaje vacío' });
        }
        const lower = text.toLowerCase();
        // Preguntas orientadas a la base de datos (tareas) — modo simple real
        if (/(tarea|tareas)/.test(lower)) {
            try {
                const tasksConn = connections.find(isTasksConnection);
                const targetId = (tasksConn ? tasksConn.id : (inferConnectionId(text) || connections[0]?.id));
                if (!targetId) {
                    return res.status(400).json({ success: false, reply: '', error: 'No hay conexiones de base de datos disponibles' });
                }
                const conn = connections.find(c => c.id === targetId);
                const pool = pools[targetId];
                if (!pool || !conn) {
                    return res.status(400).json({ success: false, reply: '', error: `Conexión no válida: ${targetId}` });
                }
                const built = buildSimpleTasksQuery(text, 100);
                const result = await pool.query(built.sql, built.params || []);
                let reply = '';
                if (built.mode === 'count') {
                    const total = Number((result.rows?.[0]?.total) ?? 0);
                    reply = `Existen ${total} tareas`;
                }
                else {
                    const rows = Array.isArray(result.rows) ? result.rows : [];
                    const top = rows.slice(0, 10);
                    const listLines = top.map((r, i) => {
                        const s = String(r.status || '').toLowerCase();
                        const st = s === 'pending' ? 'pendiente' : (s === 'in_progress' ? 'en progreso' : (s === 'completed' ? 'completada' : s || ''));
                        const pr = String(r.priority || '').toLowerCase();
                        return `${i + 1}. ${r.title} (${st}, ${pr})`;
                    });
                    reply = `Encontré ${rows.length || 0} tareas${listLines.length ? ':\n' + listLines.join('\n') : ''}`;
                }
                return res.json({ success: true, reply, meta: { provider: 'db', intent: built.mode === 'count' ? 'tasks_count' : 'tasks_list', connection: targetId, sql: built.sql } });
            }
            catch (err) {
                console.error('❌ Error consultando tareas (assistant/ask):', err);
                // Si falla, continúa al proveedor IA (si está configurado) o fallback
            }
        }
        // Usar exclusivamente Groq si está configurado
        const provider = (process.env.GROQ_API_KEY ? 'groq' : '').toLowerCase();
        if (process.env.GROQ_API_KEY) {
            try {
                const model = (process.env.GROQ_MODEL || 'llama-3.1-8b-instant').toString();
                const systemPrompt = [
                    'Eres un asistente para un hogar inteligente (Smart Home).',
                    'Responde en español, breve y claro.',
                    'Si la pregunta requiere datos reales del sistema, indica que puedes ayudar a formular consultas (modo Chat).'
                ].join(' ');
                const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: text }
                        ],
                        temperature: 0.2,
                        max_tokens: 256
                    })
                });
                if (!resp.ok) {
                    const errText = await resp.text();
                    return res.status(resp.status).json({ success: false, reply: '', error: `Error del proveedor Groq: ${errText}` });
                }
                const data = await resp.json();
                const reply = (data?.choices?.[0]?.message?.content ?? '').toString();
                return res.json({ success: true, reply, meta: { provider: 'groq', model } });
            }
            catch (e) {
                console.error('❌ Error llamando a Groq:', e);
                return res.status(500).json({ success: false, reply: '', error: 'Error al consultar el proveedor de IA' });
            }
        }
        const now = new Date();
        const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        let intent = 'fallback';
        if (/(hora|tiempo|qué hora|que hora)/.test(lower))
            intent = 'time';
        else if (/(hoy|fecha|día|dia)/.test(lower))
            intent = 'date';
        else if (/(hola|buenos días|buenas|saludos)/.test(lower))
            intent = 'greeting';
        else if (/(tarea|tareas)/.test(lower))
            intent = 'tasks';
        else
            intent = 'echo';
        let reply = '';
        if (intent === 'time') {
            const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            reply = `Son las ${timeStr}.`;
        }
        else if (intent === 'date') {
            const dateStr = now.toLocaleDateString('es-ES');
            reply = `Hoy es ${dayNames[now.getDay()]}, ${dateStr}.`;
        }
        else if (intent === 'greeting') {
            reply = 'Hola 👋 ¿en qué te ayudo?';
        }
        else if (intent === 'tasks') {
            const matchNum = lower.match(/(\d+)/);
            if (matchNum) {
                reply = `Encontré ${matchNum[1]} tareas.`;
            }
            else {
                reply = 'Modo IA simple: no consulto datos reales. Usa "Chat" o "Develop" para consultas sobre tareas.';
            }
        }
        else if (intent === 'echo') {
            reply = text;
        }
        else {
            reply = 'Modo IA simple: no consulto datos. Cambia a "Chat" o "Develop" para consultas con base de datos.';
        }
        return res.json({ success: true, reply, meta: { intent, provider: provider || 'simple' } });
    }
    catch (error) {
        console.error('❌ Error en /assistant/ask:', error);
        res.status(500).json({ success: false, reply: '', error: 'Error interno del asistente simple' });
    }
});
exports.default = router;
