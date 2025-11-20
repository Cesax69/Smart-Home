import { tasksDatabaseService } from '../config/tasksDatabase';

export interface Task {
    id: string;
    title: string;
    description: string;
    assignedTo: string;
    completedAt: string | null;
    status: string;
    categoryId: string;
}

export interface GetTasksQuery {
    memberId?: string;
    from?: string;
    to?: string;
    status?: string;
}

export class TaskService {
    async getTasksByMember(filters: GetTasksQuery): Promise<Task[]> {
        let query = `
            SELECT id, title, description, user_id as "assignedTo", 
                   completed_at as "completedAt", status, category as "categoryId",
                   created_at as "createdAt"
            FROM tasks
            WHERE 1=1
        `;

        const values: any[] = [];
        let paramCount = 1;

        // Filter by member
        if (filters.memberId) {
            query += ` AND user_id = $${paramCount}`;
            values.push(filters.memberId);
            paramCount++;
        }

        // Filter by date range on completed_at
        if (filters.from) {
            query += ` AND completed_at >= $${paramCount}`;
            values.push(new Date(filters.from));
            paramCount++;
        }

        if (filters.to) {
            query += ` AND completed_at <= $${paramCount}`;
            values.push(new Date(filters.to));
            paramCount++;
        }

        // Filter by status (default to 'completed')
        const status = filters.status || 'completed';
        query += ` AND status = $${paramCount}`;
        values.push(status);
        paramCount++;

        query += ' ORDER BY completed_at DESC';

        const result = await tasksDatabaseService.query(query, values);

        return result.rows.map((row: any) => ({
            id: row.id.toString(),
            title: row.title,
            description: row.description || '',
            assignedTo: row.assignedTo,
            completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : null,
            status: row.status,
            categoryId: row.categoryId
        }));
    }

    async getTasksStats(filters: GetTasksQuery): Promise<{ totalCompleted: number, byCategory: any[] }> {
        let query = `
            SELECT category as "categoryId", COUNT(*) as count
            FROM tasks
            WHERE status = 'completed'
        `;

        const values: any[] = [];
        let paramCount = 1;

        if (filters.memberId) {
            query += ` AND user_id = $${paramCount}`;
            values.push(filters.memberId);
            paramCount++;
        }

        if (filters.from) {
            query += ` AND completed_at >= $${paramCount}`;
            values.push(new Date(filters.from));
            paramCount++;
        }

        if (filters.to) {
            query += ` AND completed_at <= $${paramCount}`;
            values.push(new Date(filters.to));
            paramCount++;
        }

        query += ' GROUP BY category ORDER BY count DESC';

        const result = await tasksDatabaseService.query(query, values);

        const totalCompleted = result.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0);

        return {
            totalCompleted,
            byCategory: result.rows.map((row: any) => ({
                categoryId: row.categoryId,
                count: parseInt(row.count)
            }))
        };
    }
}
