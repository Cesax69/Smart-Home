"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncomeBuilder = void 0;
class IncomeBuilder {
    constructor() {
        this.income = {};
    }
    setAmount(amount) {
        if (amount <= 0) {
            throw new Error('amount must be > 0');
        }
        this.income.amount = amount;
        return this;
    }
    setCurrency(currency) {
        this.income.currency = currency || 'USD';
        return this;
    }
    setSource(source) {
        if (!source || source.trim() === '') {
            throw new Error('source is required');
        }
        this.income.source = source;
        return this;
    }
    setMemberId(memberId) {
        if (memberId) {
            this.income.memberId = memberId;
        }
        return this;
    }
    setDate(date) {
        if (date) {
            this.income.date = new Date(date).toISOString();
        }
        else {
            this.income.date = new Date().toISOString();
        }
        return this;
    }
    setNotes(notes) {
        if (notes) {
            this.income.notes = notes;
        }
        return this;
    }
    build() {
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
        return this.income;
    }
    static fromRequest(req) {
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
exports.IncomeBuilder = IncomeBuilder;
//# sourceMappingURL=IncomeBuilder.js.map