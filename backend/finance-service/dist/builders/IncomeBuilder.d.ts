import { Income, CreateIncomeRequest } from '../models/types';
export declare class IncomeBuilder {
    private income;
    setAmount(amount: number): this;
    setCurrency(currency?: string): this;
    setSource(source: string): this;
    setMemberId(memberId?: string): this;
    setDate(date?: string): this;
    setNotes(notes?: string): this;
    build(): Omit<Income, 'id' | 'createdAt'>;
    static fromRequest(req: CreateIncomeRequest): Omit<Income, 'id' | 'createdAt'>;
}
//# sourceMappingURL=IncomeBuilder.d.ts.map