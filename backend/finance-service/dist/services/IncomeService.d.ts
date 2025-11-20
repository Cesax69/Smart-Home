import { Income, GetIncomeQuery } from '../models/types';
export declare class IncomeService {
    create(incomeData: Omit<Income, 'id' | 'createdAt'>): Promise<Income>;
    findAll(filters: GetIncomeQuery): Promise<Income[]>;
    update(id: string, updates: Partial<Omit<Income, 'id' | 'createdAt'>>): Promise<Income | null>;
    delete(id: string): Promise<boolean>;
}
//# sourceMappingURL=IncomeService.d.ts.map