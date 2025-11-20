import { Income, CreateIncomeRequest } from '../models/types';

export class IncomeBuilder {
    private income: Partial<Income> = {};

    setAmount(amount: number): this {
        if (amount <= 0) {
            throw new Error('amount must be > 0');
        }
        this.income.amount = amount;
        return this;
    }

    setCurrency(currency?: string): this {
        this.income.currency = currency || 'USD';
        return this;
    }

    setSource(source: string): this {
        if (!source || source.trim() === '') {
            throw new Error('source is required');
        }
        this.income.source = source;
        return this;
    }

    setMemberId(memberId?: string): this {
        if (memberId) {
            this.income.memberId = memberId;
        }
        return this;
    }

    setDate(date?: string): this {
        if (date) {
            this.income.date = new Date(date).toISOString();
        } else {
            this.income.date = new Date().toISOString();
        }
        return this;
    }

    setNotes(notes?: string): this {
        if (notes) {
            this.income.notes = notes;
        }
        return this;
    }

    build(): Omit<Income, 'id' | 'createdAt'> {
        if (!this.income.amount) {
            throw new Error('amount is required');
        }
        if (!this.income.source) {
            throw new Error('source is required');
        }
        if (!this.income.currency) {
            this.income.currency = 'USD';
        }
        if (!this.income.date) {
            this.income.date = new Date().toISOString();
        }

        return this.income as Omit<Income, 'id' | 'createdAt'>;
    }

    static fromRequest(req: CreateIncomeRequest): Omit<Income, 'id' | 'createdAt'> {
        return new IncomeBuilder()
            .setAmount(req.amount)
            .setCurrency(req.currency)
            .setSource(req.source)
            .setMemberId(req.memberId)
            .setDate(req.date)
            .setNotes(req.notes)
            .build();
    }
}
