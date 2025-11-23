/**
 * DatabaseService for tasks_db
 * Connects to tasks database to query completed tasks by member
 */
declare class TasksDatabaseService {
    private pool;
    connect(): Promise<void>;
    query(text: string, params?: any[]): Promise<any>;
    close(): Promise<void>;
}
export declare const tasksDatabaseService: TasksDatabaseService;
export {};
//# sourceMappingURL=tasksDatabase.d.ts.map