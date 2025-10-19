"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = exports.getConnectionById = exports.listConnections = void 0;
const pg_1 = require("pg");
const promise_1 = __importDefault(require("mysql2/promise"));
const mssql_1 = __importDefault(require("mssql"));
const mongodb_1 = require("mongodb");
const pools = {};
let connections = [];
const buildDefaultPgUrl = () => {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const database = process.env.DB_NAME || 'smart_home_db';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'linux';
    // Construir string de conexión Postgres compatible con contraseña opcional
    // Si la contraseña es vacía, incluir el separador ':' para que pg trate password como cadena vacía
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};
const loadConnections = () => {
    try {
        const raw = process.env.AI_DB_CONNECTIONS || '[]';
        const parsed = JSON.parse(raw);
        connections = parsed;
    }
    catch (err) {
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
const listConnections = () => connections.length ? connections : loadConnections();
exports.listConnections = listConnections;
const getConnectionById = (id) => {
    const list = (0, exports.listConnections)();
    if (id)
        return list.find(c => c.id === id);
    return list[0];
};
exports.getConnectionById = getConnectionById;
const getPool = async (conn) => {
    const key = `${conn.type}:${conn.id}`;
    if (pools[key])
        return pools[key];
    switch (conn.type) {
        case 'postgres': {
            const pool = new pg_1.Pool({ connectionString: conn.url });
            pools[key] = pool;
            return pool;
        }
        case 'mysql': {
            const pool = await promise_1.default.createPool({ uri: conn.url, connectionLimit: 5 });
            pools[key] = pool;
            return pool;
        }
        case 'mssql': {
            const pool = await mssql_1.default.connect(conn.url);
            pools[key] = pool;
            return pool;
        }
        case 'mongo': {
            const client = new mongodb_1.MongoClient(conn.mongoUri);
            await client.connect();
            pools[key] = client;
            return client;
        }
        default:
            throw new Error(`Tipo de conexión no soportado: ${conn.type}`);
    }
};
exports.getPool = getPool;
