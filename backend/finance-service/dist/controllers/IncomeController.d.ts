import { Request, Response } from 'express';
export declare class IncomeController {
    private incomeService;
    constructor();
    createIncome(req: Request, res: Response): Promise<void>;
    getIncome(req: Request, res: Response): Promise<void>;
    updateIncome(req: Request, res: Response): Promise<void>;
    deleteIncome(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=IncomeController.d.ts.map