// @ts-ignore
import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema: string;
}

class DatabaseService {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'users_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'linux',
      schema: process.env.DB_SCHEMA || 'public'
    };

    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(poolConfig);

    this.pool.on('connect', () => {
      console.log('Conexión establecida con PostgreSQL (users-service)');
    });

    this.pool.on('error', (err: Error) => {
      console.error('Error inesperado en el cliente de PostgreSQL (users-service):', err);
    });
  }

  /**
   * Obtiene una conexión del pool y fija el search_path
   */
  async getConnection() {
    const client = await this.pool.connect();
    try {
      await client.query(`SET search_path TO ${this.config.schema}, public`);
      return client;
    } catch (error) {
      client.release();
      throw error;
    }
  }

  /**
   * Ejecuta una consulta SQL
   */
  async query(text: string, params?: any[]): Promise<{ rows: any[] }> {
    const client = await this.getConnection();
    try {
      const result = await client.query(text, params);
      return result as { rows: any[] };
    } finally {
      client.release();
    }
  }

  /**
   * Prueba la conexión a la base de datos
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.getConnection();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('No se pudo conectar a PostgreSQL en users-service:', error);
      return false;
    }
  }

  /**
   * Cierra el pool de conexiones
   */
  async closePool() {
    try {
      await this.pool.end();
      console.log('Pool de conexiones cerrado (users-service)');
    } catch (error) {
      console.error('Error cerrando el pool de conexiones (users-service):', error);
    }
  }

  getConfig(): DatabaseConfig {
    return { ...this.config };
  }
}

export const databaseService = new DatabaseService();
export default databaseService;