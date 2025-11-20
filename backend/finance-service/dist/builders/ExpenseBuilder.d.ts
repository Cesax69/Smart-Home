import { Expense, CreateExpenseRequest } from '../models/types';
export declare class ExpenseBuilder {
    private expense;
    setAmount(amount: number): this;
    setCurrency(currency?: string): this;
    setCategoryId(categoryId: string): this;
    setMemberId(memberId?: string): this;
    setDate(date?: string): this;
    setNotes(notes?: string): this;
    build(): Omit<Expense, 'id' | 'createdAt'>;
    static fromRequest(req: CreateExpenseRequest): Omit<Expense, 'id' | 'createdAt'>;
}
//# sourceMappingURL=ExpenseBuilder.d.ts.map