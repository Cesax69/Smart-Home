"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.introspectSchema = void 0;
const connections_1 = require("../config/connections");
const introspectSchema = async (conn) => {
    switch (conn.type) {
        case 'postgres': {
            const pool = await (0, connections_1.getPool)(conn);
            // Asegurar que las consultas sin prefijo de esquema funcionen
            try {
                await pool.query("SET search_path TO tasks_schema, public, users_schema, notifications_schema");
            }
            catch { }
            const q = `
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog','information_schema')
        ORDER BY table_name, ordinal_position
      `;
            const { rows } = await pool.query(q);
            const schema = {};
            rows.forEach((r) => {
                schema[r.table_name] = schema[r.table_name] || [];
                schema[r.table_name].push({ column: r.column_name, type: r.data_type });
            });
            return { type: 'sql', dialect: 'postgres', schema };
        }
        case 'mysql': {
            const pool = await (0, connections_1.getPool)(conn);
            const [rows] = await pool.query(`
        SELECT TABLE_NAME as table_name, COLUMN_NAME as column_name, DATA_TYPE as data_type
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `);
            const schema = {};
            rows.forEach(r => {
                schema[r.table_name] = schema[r.table_name] || [];
                schema[r.table_name].push({ column: r.column_name, type: r.data_type });
            });
            return { type: 'sql', dialect: 'mysql', schema };
        }
        case 'mssql': {
            const pool = await (0, connections_1.getPool)(conn);
            const result = await pool.request().query(`
        SELECT t.name AS table_name, c.name AS column_name, ty.name AS data_type
        FROM sys.tables t
        JOIN sys.columns c ON c.object_id = t.object_id
        JOIN sys.types ty ON c.user_type_id = ty.user_type_id
        ORDER BY t.name, c.column_id
      `);
            const schema = {};
            result.recordset.forEach((r) => {
                schema[r.table_name] = schema[r.table_name] || [];
                schema[r.table_name].push({ column: r.column_name, type: r.data_type });
            });
            return { type: 'sql', dialect: 'mssql', schema };
        }
        case 'mongo': {
            const client = await (0, connections_1.getPool)(conn);
            const db = client.db(conn.database);
            const collections = await db.listCollections().toArray();
            const schema = {};
            for (const col of collections) {
                const sample = await db.collection(col.name).find({}).limit(5).toArray();
                schema[col.name] = { sample };
            }
            return { type: 'mongo', schema };
        }
        default:
            throw new Error('Tipo de conexión no soportado para introspección');
    }
};
exports.introspectSchema = introspectSchema;
