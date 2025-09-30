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
      database: process.env.DB_NAME || 'smart_home_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      schema: process.env.DB_SCHEMA || 'tasks_schema'
    };

    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      max: 20, // Máximo número de conexiones en el pool
      idleTimeoutMillis: 30000, // Tiempo de espera antes de cerrar conexiones inactivas
      connectionTimeoutMillis: 2000, // Tiempo de espera para establecer conexión
    };

    this.pool = new Pool(poolConfig);

    // Manejar eventos del pool
    this.pool.on('connect', () => {
      console.log('Nueva conexión establecida con PostgreSQL');
    });

    this.pool.on('error', (err) => {
      console.error('Error inesperado en el cliente de PostgreSQL:', err);
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
      console.error('Error al obtener conexión de la base de datos:', error);
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
   * Inicializa la base de datos creando el esquema y las tablas necesarias
   */
  async initializeDatabase() {
    const client = await this.getConnection();
    try {
      // Crear esquema si no existe
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${this.config.schema}`);
      
      // Establecer el esquema
      await client.query(`SET search_path TO ${this.config.schema}, public`);

      // Crear tabla tasks si no existe
      const createTasksTable = `
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          description TEXT NOT NULL,
          status VARCHAR(20) NOT NULL CHECK (status IN ('pendiente', 'en_proceso', 'completada')),
          assigned_user_id INTEGER NOT NULL,
          file_url VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await client.query(createTasksTable);
      
      console.log(`Base de datos inicializada correctamente. Esquema: ${this.config.schema}`);
    } catch (error) {
      console.error('Error inicializando la base de datos:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verifica la conexión a la base de datos
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.getConnection();
      await client.query('SELECT NOW()');
      client.release();
      console.log('Conexión a PostgreSQL exitosa');
      return true;
    } catch (error) {
      console.error('Error conectando a PostgreSQL:', error);
      return false;
    }
  }

  /**
   * Cierra todas las conexiones del pool
   */
  async closePool() {
    try {
      await this.pool.end();
      console.log('Pool de conexiones cerrado');
    } catch (error) {
      console.error('Error cerrando el pool de conexiones:', error);
    }
  }

  /**
   * Obtiene la configuración actual de la base de datos
   */
  getConfig(): DatabaseConfig {
    return { ...this.config };
  }
}

// Exportar una instancia singleton
export const databaseService = new DatabaseService();
export default databaseService;