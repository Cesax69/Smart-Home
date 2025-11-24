"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceController = void 0;
const ExpenseService_1 = require("../services/ExpenseService");
const IncomeService_1 = require("../services/IncomeService");
const CurrencyExchangeService_1 = require("../services/CurrencyExchangeService");
class BalanceController {
    constructor() {
        this.expenseService = new ExpenseService_1.ExpenseService();
        this.incomeService = new IncomeService_1.IncomeService();
    }
    async getBalance(req, res) {
        try {
            const { from, to } = req.query;
            const filters = {
                from: from,
                to: to
            };
            // Get all expenses and incomes
            const expenses = await this.expenseService.findAll(filters);
            const incomes = await this.incomeService.findAll(filters);
            // Calculate totals in MXN (convert each transaction to MXN first)
            const totalExpenses = expenses.reduce((sum, e) => {
                const mxnAmount = CurrencyExchangeService_1.CurrencyExchangeService.convertToMXN(e.amount, e.currency);
                return sum + mxnAmount;
            }, 0);
            const totalIncomes = incomes.reduce((sum, i) => {
                const mxnAmount = CurrencyExchangeService_1.CurrencyExchangeService.convertToMXN(i.amount, i.currency);
                return sum + mxnAmount;
            }, 0);
            const balance = totalIncomes - totalExpenses;
            // Calculate by currency (keep original amounts per currency for reference)
            const currencyMap = new Map();
            // Add incomes
            incomes.forEach(income => {
                const curr = income.currency;
                if (!currencyMap.has(curr)) {
                    currencyMap.set(curr, {
                        currency: curr,
                        totalIncomes: 0,
                        totalExpenses: 0,
                        balance: 0
                    });
                }
                const data = currencyMap.get(curr);
                data.totalIncomes += income.amount;
            });
            // Add expenses
            expenses.forEach(expense => {
                const curr = expense.currency;
                if (!currencyMap.has(curr)) {
                    currencyMap.set(curr, {
                        currency: curr,
                        totalIncomes: 0,
                        totalExpenses: 0,
                        balance: 0
                    });
                }
                const data = currencyMap.get(curr);
                data.totalExpenses += expense.amount;
            });
            // Calculate balance per currency
            const byCurrency = [];
            currencyMap.forEach(data => {
                data.balance = data.totalIncomes - data.totalExpenses;
                byCurrency.push(data);
            });
            // Sort by currency
            byCurrency.sort((a, b) => a.currency.localeCompare(b.currency));
            const balanceData = {
                totalIncomes: Math.round(totalIncomes * 100) / 100,
                totalExpenses: Math.round(totalExpenses * 100) / 100,
                balance: Math.round(balance * 100) / 100,
                byCurrency
            };
            res.status(200).json({
                ok: true,
                data: balanceData
            });
        }
        catch (error) {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error.message || 'Error fetching balance',
                    details: error
                }
            });
        }
    }
}
exports.BalanceController = BalanceController;
//# sourceMappingURL=BalanceController.js.map