"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const TaskService_1 = require("../services/TaskService");
class TaskController {
    constructor() {
        this.taskService = new TaskService_1.TaskService();
    }
    /**
     * GET /finance/tasks/by-member - Get tasks completed by member
     */
    async getTasksByMember(req, res) {
        try {
            const { memberId, from, to, status } = req.query;
            const filters = {
                memberId: memberId,
                from: from,
                to: to,
                status: status
            };
            const tasks = await this.taskService.getTasksByMember(filters);
            const stats = await this.taskService.getTasksStats(filters);
            // Calculate range
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);
            const response = {
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
                        start: from ? new Date(from).toISOString() : thirtyDaysAgo.toISOString(),
                        end: to ? new Date(to).toISOString() : now.toISOString()
                    }
                }
            };
            res.status(200).json(response);
        }
        catch (error) {
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
exports.TaskController = TaskController;
//# sourceMappingURL=TaskController.js.map