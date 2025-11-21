import { Expense, GetExpensesQuery } from '../models/types';
export declare class ExpenseService {
    create(expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense>;
    findAll(filters: GetExpensesQuery): Promise<Expense[]>;
    findById(id: string): Promise<Expense | null>;
    update(id: string, data: Partial<Expense>): Promise<Expense | null>;
    delete(id: string): Promise<boolean>;
}
//# sourceMappingURL=ExpenseService.d.ts.map