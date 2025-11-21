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
    /**
     * GET /finance/expenses/:id - Obtener gasto por ID
     */
    getExpenseById(req: Request, res: Response): Promise<void>;
    /**
     * PUT /finance/expenses/:id - Actualizar gasto
     */
    updateExpense(req: Request, res: Response): Promise<void>;
    /**
     * DELETE /finance/expenses/:id - Eliminar gasto
     */
    deleteExpense(req: Request, res: Response): Promise<void>;
    private extractField;
    private calculateRange;
}
//# sourceMappingURL=ExpenseController.d.ts.map