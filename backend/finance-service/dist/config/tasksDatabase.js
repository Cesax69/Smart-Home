"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksDatabaseService = void 0;
const pg_1 = require("pg");
/**
 * DatabaseService for tasks_db
 * Connects to tasks database to query completed tasks by member
 */
class TasksDatabaseService {
    constructor() {
        this.pool = null;
    }
    async connect() {
        if (this.pool) {
            return;
        }
        this.pool = new pg_1.Pool({
            host: process.env.TASKS_DB_HOST || 'postgres-tasks',
            port: parseInt(process.env.TASKS_DB_PORT || '5432'),
            database: process.env.TASKS_DB_NAME || 'tasks_db',
            user: process.env.TASKS_DB_USER || 'postgres',
            password: process.env.TASKS_DB_PASSWORD || 'linux',
        });
        console.log('✅ Connected to tasks_db');
    }
    async query(text, params) {
        if (!this.pool) {
            await this.connect();
        }
        return this.pool.query(text, params);
    }
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
}
exports.tasksDatabaseService = new TasksDatabaseService();
//# sourceMappingURL=tasksDatabase.js.map