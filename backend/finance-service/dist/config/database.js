"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseService = void 0;
const pg_1 = require("pg");
class DatabaseService {
    constructor() {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'finance_db',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'linux'
        };
        const poolConfig = {
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };
        this.pool = new pg_1.Pool(poolConfig);
        this.pool.on('connect', () => {
            console.log('Nueva conexión establecida con PostgreSQL');
        });
        this.pool.on('error', (err) => {
            console.error('Error inesperado en el pool de PostgreSQL:', err);
        });
    }
    async getConnection() {
        try {
            const client = await this.pool.connect();
            return client;
        }
        catch (error) {
            console.error('Error obteniendo conexión:', error);
            throw error;
        }
    }
    async query(text, params) {
        const client = await this.getConnection();
        try {
            const result = await client.query(text, params);
            return result;
        }
        catch (error) {
            console.error('Error ejecutando consulta:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async testConnection() {
        try {
            const client = await this.getConnection();
            await client.query('SELECT NOW()');
            client.release();
            console.log('Conexión a PostgreSQL exitosa');
            return true;
        }
        catch (error) {
            console.error('Error conectando a PostgreSQL:', error);
            return false;
        }
    }
    async closePool() {
        try {
            await this.pool.end();
            console.log('Pool de conexiones cerrado');
        }
        catch (error) {
            console.error('Error cerrando el pool de conexiones:', error);
        }
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.databaseService = new DatabaseService();
//# sourceMappingURL=database.js.map