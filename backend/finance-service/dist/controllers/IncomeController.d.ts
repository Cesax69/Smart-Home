import { Request, Response } from 'express';
export declare class IncomeController {
    private incomeService;
    constructor();
    /**
     * POST /finance/income - Crear ingreso
     */
    createIncome(req: Request, res: Response): Promise<void>;
    /**
     * GET /finance/income - Listar ingresos
     */
    getIncome(req: Request, res: Response): Promise<void>;
    private extractField;
    private calculateRange;
}
//# sourceMappingURL=IncomeController.d.ts.map