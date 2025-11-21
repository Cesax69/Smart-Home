import { Income, GetIncomeQuery } from '../models/types';
export declare class IncomeService {
    create(incomeData: Omit<Income, 'id' | 'createdAt'>): Promise<Income>;
    findAll(filters: GetIncomeQuery): Promise<Income[]>;
    findById(id: string): Promise<Income | null>;
    update(id: string, data: Partial<Income>): Promise<Income | null>;
    delete(id: string): Promise<boolean>;
}
//# sourceMappingURL=IncomeService.d.ts.map