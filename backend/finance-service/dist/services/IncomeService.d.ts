import { Income, GetIncomeQuery } from '../models/types';
export declare class IncomeService {
    create(incomeData: Omit<Income, 'id' | 'createdAt'>): Promise<Income>;
    findAll(filters: GetIncomeQuery): Promise<Income[]>;
    findById(id: number): Promise<Income | null>;
    update(id: string, updates: Partial<Omit<Income, 'id' | 'createdAt'>>): Promise<Income | null>;
    delete(id: string): Promise<boolean>;
}
//# sourceMappingURL=IncomeService.d.ts.map