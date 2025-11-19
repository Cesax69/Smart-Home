"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = void 0;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'postgres-finance',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'linux',
    database: process.env.DB_NAME || 'finance_db',
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000')
});
const query = async (text, params) => {
    return pool.query(text, params);
};
exports.query = query;
exports.default = pool;
