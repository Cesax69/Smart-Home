import { Pool, QueryResult, QueryResultRow } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres-finance',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'linux',
  database: process.env.DB_NAME || 'finance_db',
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000')
});

export const query = async <T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

export default pool;