import { Request, Response } from 'express';
export declare class ExpenseController {
    private expenseService;
    constructor();
    createExpense(req: Request, res: Response): Promise<void>;
    getExpenses(req: Request, res: Response): Promise<void>;
    updateExpense(req: Request, res: Response): Promise<void>;
    deleteExpense(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=ExpenseController.d.ts.map