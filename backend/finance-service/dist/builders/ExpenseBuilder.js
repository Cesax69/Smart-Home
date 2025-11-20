"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseBuilder = void 0;
class ExpenseBuilder {
    constructor() {
        this.expense = {};
    }
    setAmount(amount) {
        if (amount <= 0) {
            throw new Error('amount must be > 0');
        }
        this.expense.amount = amount;
        return this;
    }
    setCurrency(currency) {
        this.expense.currency = currency || 'USD';
        return this;
    }
    setCategoryId(categoryId) {
        if (!categoryId || categoryId.trim() === '') {
            throw new Error('categoryId is required');
        }
        this.expense.categoryId = categoryId;
        return this;
    }
    setMemberId(memberId) {
        if (memberId) {
            this.expense.memberId = memberId;
        }
        return this;
    }
    setDate(date) {
        if (date) {
            this.expense.date = new Date(date).toISOString();
        }
        else {
            this.expense.date = new Date().toISOString();
        }
        return this;
    }
    setNotes(notes) {
        if (notes) {
            this.expense.notes = notes;
        }
        return this;
    }
    build() {
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
        return this.expense;
    }
    static fromRequest(req) {
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
exports.ExpenseBuilder = ExpenseBuilder;
//# sourceMappingURL=ExpenseBuilder.js.map