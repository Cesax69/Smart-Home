import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

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
      database: process.env.DB_NAME || 'smart_home',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'linux',
      schema: process.env.DB_SCHEMA || 'notifications_schema'
    };

    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      max: 20, // Máximo número de conexiones en el pool
      idleTimeoutMillis: 30000, // Tiempo de espera antes de cerrar conexiones inactivas
      connectionTimeoutMillis: 10000, // Tiempo de espera para establecer conexión
    };

    this.pool = new Pool(poolConfig);

    // Manejar eventos del pool
    this.pool.on('connect', () => {
      console.log('✅ Nueva conexión establecida con PostgreSQL (notifications-service)');
    });

    this.pool.on('error', (err) => {
      console.error('❌ Error inesperado en el cliente de PostgreSQL (notifications-service):', err);
    });
  }

  /**
   * Obtiene una conexión del pool
   */
  async getConnection() {
    try {
      const client = await this.pool.connect();
      // Establecer el esquema por defecto
      await client.query(`SET search_path TO ${this.config.schema}, public`);
      return client;
    } catch (error) {
      console.error('Error obteniendo conexión del pool:', error);
      throw error;
    }
  }

  /**
   * Ejecuta una consulta SQL
   */
  async query(text: string, params?: any[]) {
    const client = await this.getConnection();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('Error ejecutando consulta:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Ejecuta múltiples consultas en una transacción
   */
  async transaction(queries: { text: string; params?: any[] }[]) {
    const client = await this.getConnection();
    try {
      await client.query('BEGIN');
      const results = [];
      
      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en transacción:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene la configuración de la base de datos
   */
  getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  /**
   * Verifica la conexión a la base de datos
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.getConnection();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Conexión a PostgreSQL exitosa (notifications-service)');
      return true;
    } catch (error) {
      console.error('❌ Error conectando a PostgreSQL (notifications-service):', error);
      return false;
    }
  }

  /**
   * Cierra todas las conexiones del pool
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('✅ Pool de conexiones cerrado correctamente');
    } catch (error) {
      console.error('❌ Error cerrando pool de conexiones:', error);
      throw error;
    }
  }
}

// Exportar una instancia singleton
export const databaseService = new DatabaseService();
export default databaseService;