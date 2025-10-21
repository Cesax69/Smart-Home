import pg from 'pg';
const { Pool: PgPool } = pg;
import mysql from 'mysql2/promise';
import mssql from 'mssql';
import { MongoClient } from 'mongodb';

type ConnectionType = 'postgres' | 'mysql' | 'mssql' | 'mongo';

export interface DbConnectionConfig {
  id: string;
  type: ConnectionType;
  name: string;
  url?: string;
  mongoUri?: string;
  database?: string;
  readOnly?: boolean;
}

const pools: Record<string, any> = {};
let connections: DbConnectionConfig[] = [];

const buildDefaultPgUrl = (): string => {
  const host = (globalThis as any).process?.env?.DB_HOST || 'localhost';
  const port = (globalThis as any).process?.env?.DB_PORT || '5432';
  const database = (globalThis as any).process?.env?.DB_NAME || 'tasks_db';
  const user = (globalThis as any).process?.env?.DB_USER || 'postgres';
  const password = (globalThis as any).process?.env?.DB_PASSWORD || 'linux';
  // Construir string de conexión Postgres compatible con contraseña opcional
  // Si la contraseña es vacía, incluir el separador ':' para que pg trate password como cadena vacía
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

const loadConnections = (): DbConnectionConfig[] => {
  try {
    const raw = (globalThis as any).process?.env?.AI_DB_CONNECTIONS || '[]';
    const parsed: DbConnectionConfig[] = JSON.parse(raw);
    connections = parsed;
  } catch (err) {
    console.warn('AI_DB_CONNECTIONS inválido, usando lista vacía');
    connections = [];
  }

  // Fallback: si no hay conexiones configuradas, crear una por defecto a Postgres local
  if (!connections || connections.length === 0) {
    connections = [{
      id: 'default-pg',
      type: 'postgres',
      name: 'Smart Home DB (Postgres)',
      url: buildDefaultPgUrl(),
      readOnly: true
    }];
    console.log('AI_QUERY_SERVICE: usando conexión por defecto a Postgres ->', connections[0].url);
  }

  return connections;
};

export const listConnections = (): DbConnectionConfig[] => connections.length ? connections : loadConnections();

export const getConnectionById = (id?: string): DbConnectionConfig | undefined => {
  const list = listConnections();
  if (id) return list.find(c => c.id === id);
  return list[0];
};

export const getPool = async (conn: DbConnectionConfig): Promise<any> => {
  const key = `${conn.type}:${conn.id}`;
  if (pools[key]) return pools[key];

  switch (conn.type) {
    case 'postgres': {
      const pool = new PgPool({ connectionString: conn.url });
      pools[key] = pool;
      return pool;
    }
    case 'mysql': {
      const pool = await mysql.createPool({ uri: conn.url, connectionLimit: 5 } as any);
      pools[key] = pool;
      return pool;
    }
    case 'mssql': {
      const pool = await mssql.connect(conn.url as string);
      pools[key] = pool;
      return pool;
    }
    case 'mongo': {
      const client = new MongoClient(conn.mongoUri as string);
      await client.connect();
      pools[key] = client;
      return client;
    }
    default:
      throw new Error(`Tipo de conexión no soportado: ${conn.type}`);
  }
};