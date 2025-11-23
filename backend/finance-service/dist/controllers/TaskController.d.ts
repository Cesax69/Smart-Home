import { Request, Response } from 'express';
export declare class TaskController {
    private taskService;
    constructor();
    /**
     * GET /finance/tasks/by-member - Get tasks completed by member
     */
    getTasksByMember(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=TaskController.d.ts.map