import { Expense, GetExpensesQuery } from '../models/types';
export declare class ExpenseService {
    create(expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense>;
    findAll(filters: GetExpensesQuery): Promise<Expense[]>;
    findById(id: number): Promise<Expense | null>;
    update(id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>): Promise<Expense | null>;
    delete(id: string): Promise<boolean>;
}
//# sourceMappingURL=ExpenseService.d.ts.map