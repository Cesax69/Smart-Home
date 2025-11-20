import { Expense, CreateExpenseRequest } from '../models/types';

export class ExpenseBuilder {
    private expense: Partial<Expense> = {};

    setAmount(amount: number): this {
        if (amount <= 0) {
            throw new Error('amount must be > 0');
        }
        this.expense.amount = amount;
        return this;
    }

    setCurrency(currency?: string): this {
        this.expense.currency = currency || 'USD';
        return this;
    }

    setCategoryId(categoryId: string): this {
        if (!categoryId || categoryId.trim() === '') {
            throw new Error('categoryId is required');
        }
        this.expense.categoryId = categoryId;
        return this;
    }

    setMemberId(memberId?: string): this {
        if (memberId) {
            this.expense.memberId = memberId;
        }
        return this;
    }

    setDate(date?: string): this {
        if (date) {
            this.expense.date = new Date(date).toISOString();
        } else {
            this.expense.date = new Date().toISOString();
        }
        return this;
    }

    setNotes(notes?: string): this {
        if (notes) {
            this.expense.notes = notes;
        }
        return this;
    }

    build(): Omit<Expense, 'id' | 'createdAt'> {
        if (!this.expense.amount) {
            throw new Error('amount is required');
        }
        if (!this.expense.categoryId) {
            throw new Error('categoryId is required');
        }
        if (!this.expense.currency) {
            this.expense.currency = 'USD';
        }
        if (!this.expense.date) {
            this.expense.date = new Date().toISOString();
        }

        return this.expense as Omit<Expense, 'id' | 'createdAt'>;
    }

    static fromRequest(req: CreateExpenseRequest): Omit<Expense, 'id' | 'createdAt'> {
        return new ExpenseBuilder()
            .setAmount(req.amount)
            .setCurrency(req.currency)
            .setCategoryId(req.categoryId)
            .setMemberId(req.memberId)
            .setDate(req.date)
            .setNotes(req.notes)
            .build();
    }
}
