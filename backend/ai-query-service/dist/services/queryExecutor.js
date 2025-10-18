"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeReadQuery = void 0;
const connections_1 = require("../config/connections");
const executeReadQuery = async (conn, ai) => {
    switch (conn.type) {
        case 'postgres': {
            const pool = await (0, connections_1.getPool)(conn);
            // Garantizar que las consultas sin prefijo de esquema funcionen
            try {
                await pool.query("SET search_path TO tasks_schema, public, users_schema, notifications_schema");
            }
            catch { }
            const { rows, fields } = await pool.query(ai.sql);
            return { rows, meta: { fields } };
        }
        case 'mysql': {
            const pool = await (0, connections_1.getPool)(conn);
            const [rows, fields] = await pool.query(ai.sql);
            return { rows, meta: { fields } };
        }
        case 'mssql': {
            const pool = await (0, connections_1.getPool)(conn);
            const result = await pool.request().query(ai.sql);
            return { rows: result.recordset, meta: { columns: result.columns } };
        }
        case 'mongo': {
            const client = await (0, connections_1.getPool)(conn);
            const db = client.db(conn.database);
            const col = db.collection(ai.mongo.collection);
            if (ai.mongo?.pipeline) {
                const rows = await col.aggregate(ai.mongo.pipeline).toArray();
                return { rows, meta: { type: 'aggregate', collection: ai.mongo.collection } };
            }
            const rows = await col.find(ai.mongo?.filter || {}).limit(100).toArray();
            return { rows, meta: { type: 'find', collection: ai.mongo?.collection } };
        }
        default:
            throw new Error('Tipo de conexión no soportado para ejecución');
    }
};
exports.executeReadQuery = executeReadQuery;
