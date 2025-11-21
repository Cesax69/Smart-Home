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
    /**
     * GET /finance/income/:id - Obtener ingreso por ID
     */
    getIncomeById(req: Request, res: Response): Promise<void>;
    /**
     * PUT /finance/income/:id - Actualizar ingreso
     */
    updateIncome(req: Request, res: Response): Promise<void>;
    /**
     * DELETE /finance/income/:id - Eliminar ingreso
     */
    deleteIncome(req: Request, res: Response): Promise<void>;
    private extractField;
    private calculateRange;
}
//# sourceMappingURL=IncomeController.d.ts.map