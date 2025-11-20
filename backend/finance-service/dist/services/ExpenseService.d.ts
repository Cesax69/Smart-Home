import { Expense, GetExpensesQuery } from '../models/types';
export declare class ExpenseService {
    create(expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense>;
    findAll(filters: GetExpensesQuery): Promise<Expense[]>;
}
//# sourceMappingURL=ExpenseService.d.ts.map