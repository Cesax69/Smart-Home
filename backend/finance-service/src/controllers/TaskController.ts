import { Request, Response } from 'express';
import { TaskService, GetTasksQuery } from '../services/TaskService';
import { ApiResponse, ApiError } from '../models/types';

export class TaskController {
    private taskService: TaskService;

    constructor() {
        this.taskService = new TaskService();
    }

    /**
     * GET /finance/tasks/by-member - Get tasks completed by member
     */
    async getTasksByMember(req: Request, res: Response): Promise<void> {
        try {
            const { memberId, from, to, status } = req.query;

            const filters: GetTasksQuery = {
                memberId: memberId as string,
                from: from as string | undefined,
                to: to as string | undefined,
                status: status as string | undefined
            };

            const tasks = await this.taskService.getTasksByMember(filters);
            const stats = await this.taskService.getTasksStats(filters);

            // Calculate range
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);

            const response: ApiResponse = {
                ok: true,
                data: {
                    tasks,
                    stats
                },
                meta: {
                    count: tasks.length,
                    memberId: memberId || 'all',
                    status: status || 'completed',
                    range: {
                        start: from ? new Date(from as string).toISOString() : thirtyDaysAgo.toISOString(),
                        end: to ? new Date(to as string).toISOString() : now.toISOString()
                    }
                }
            };

            res.status(200).json(response);
        } catch (error: any) {
            console.error('Error getting tasks:', error);

            res.status(500).json({
                ok: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error.message || 'Error fetching tasks',
                    details: error
                }
            });
        }
    }
}
