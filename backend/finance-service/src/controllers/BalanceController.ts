import { Request, Response } from 'express';
import { ExpenseService } from '../services/ExpenseService';
import { IncomeService } from '../services/IncomeService';
import { CurrencyExchangeService, CurrencyCode } from '../services/CurrencyExchangeService';

interface CurrencyBalance {
    currency: string;
    totalIncomes: number;
    totalExpenses: number;
    balance: number;
}

interface BalanceData {
    totalIncomes: number;
    totalExpenses: number;
    balance: number;
    byCurrency: CurrencyBalance[];
}

export class BalanceController {
    private expenseService = new ExpenseService();
    private incomeService = new IncomeService();

    async getBalance(req: Request, res: Response): Promise<void> {
        try {
            const { from, to } = req.query;

            const filters = {
                from: from as string | undefined,
                to: to as string | undefined
            };

            // Get all expenses and incomes
            const expenses = await this.expenseService.findAll(filters);
            const incomes = await this.incomeService.findAll(filters);

            // Calculate totals in MXN (convert each transaction to MXN first)
            const totalExpenses = expenses.reduce((sum, e) => {
                const mxnAmount = CurrencyExchangeService.convertToMXN(e.amount, e.currency as CurrencyCode);
                return sum + mxnAmount;
            }, 0);

            const totalIncomes = incomes.reduce((sum, i) => {
                const mxnAmount = CurrencyExchangeService.convertToMXN(i.amount, i.currency as CurrencyCode);
                return sum + mxnAmount;
            }, 0);

            const balance = totalIncomes - totalExpenses;

            // Calculate by currency (keep original amounts per currency for reference)
            const currencyMap = new Map<string, CurrencyBalance>();

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
                const data = currencyMap.get(curr)!;
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
                const data = currencyMap.get(curr)!;
                data.totalExpenses += expense.amount;
            });

            // Calculate balance per currency
            const byCurrency: CurrencyBalance[] = [];
            currencyMap.forEach(data => {
                data.balance = data.totalIncomes - data.totalExpenses;
                byCurrency.push(data);
            });

            // Sort by currency
            byCurrency.sort((a, b) => a.currency.localeCompare(b.currency));

            const balanceData: BalanceData = {
                totalIncomes: Math.round(totalIncomes * 100) / 100,
                totalExpenses: Math.round(totalExpenses * 100) / 100,
                balance: Math.round(balance * 100) / 100,
                byCurrency
            };

            res.status(200).json({
                ok: true,
                data: balanceData
            });
        } catch (error: any) {
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
