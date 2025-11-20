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
export declare class TaskService {
    getTasksByMember(filters: GetTasksQuery): Promise<Task[]>;
    getTasksStats(filters: GetTasksQuery): Promise<{
        totalCompleted: number;
        byCategory: any[];
    }>;
}
//# sourceMappingURL=TaskService.d.ts.map