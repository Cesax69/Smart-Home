import { Income, GetIncomeQuery } from '../models/types';
export declare class IncomeService {
    create(incomeData: Omit<Income, 'id' | 'createdAt'>): Promise<Income>;
    findAll(filters: GetIncomeQuery): Promise<Income[]>;
}
//# sourceMappingURL=IncomeService.d.ts.map