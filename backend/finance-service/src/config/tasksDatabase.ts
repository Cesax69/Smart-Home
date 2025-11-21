import { Pool } from 'pg';

/**
 * DatabaseService for tasks_db
 * Connects to tasks database to query completed tasks by member
 */
class TasksDatabaseService {
    private pool: Pool | null = null;

    async connect(): Promise<void> {
        if (this.pool) {
            return;
        }

        this.pool = new Pool({
            host: process.env.TASKS_DB_HOST || 'postgres-tasks',
            port: parseInt(process.env.TASKS_DB_PORT || '5432'),
            database: process.env.TASKS_DB_NAME || 'tasks_db',
            user: process.env.TASKS_DB_USER || 'postgres',
            password: process.env.TASKS_DB_PASSWORD || 'linux',
        });

        console.log('✅ Connected to tasks_db');
    }

    async query(text: string, params?: any[]): Promise<any> {
        if (!this.pool) {
            await this.connect();
        }
        return this.pool!.query(text, params);
    }

    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
}

export const tasksDatabaseService = new TasksDatabaseService();
