import { DbConnectionConfig, getPool } from '../config/connections';

export const executeReadQuery = async (conn: DbConnectionConfig, ai: { sql?: string; mongo?: { collection: string; pipeline?: any[]; filter?: any } }) => {
  switch (conn.type) {
    case 'postgres': {
      const pool = await getPool(conn);
      // Garantizar que las consultas sin prefijo de esquema funcionen
      try {
        await pool.query("SET search_path TO tasks_schema, public, users_schema, notifications_schema");
      } catch {}
      const { rows, fields } = await pool.query(ai.sql as string);
      return { rows, meta: { fields } };
    }
    case 'mysql': {
      const pool = await getPool(conn);
      const [rows, fields] = await pool.query(ai.sql as string);
      return { rows, meta: { fields } };
    }
    case 'mssql': {
      const pool = await getPool(conn);
      const result = await pool.request().query(ai.sql as string);
      return { rows: result.recordset, meta: { columns: result.columns } };
    }
    case 'mongo': {
      const client = await getPool(conn);
      const db = client.db(conn.database);
      const col = db.collection(ai.mongo!.collection);
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