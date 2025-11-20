import { Request, Response } from 'express';
export declare class ExpenseController {
    private expenseService;
    constructor();
    /**
     * POST /finance/expenses - Crear gasto
     */
    createExpense(req: Request, res: Response): Promise<void>;
    /**
     * GET /finance/expenses - Listar gastos
     */
    getExpenses(req: Request, res: Response): Promise<void>;
    private extractField;
    private calculateRange;
}
//# sourceMappingURL=ExpenseController.d.ts.map