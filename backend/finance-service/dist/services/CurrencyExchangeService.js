"use strict";
/**
 * Currency Exchange Service
 * Provides currency conversion to MXN for financial balance calculations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyExchangeService = void 0;
class CurrencyExchangeService {
    /**
     * Convert amount from source currency to MXN
     * @param amount - Amount to convert
     * @param fromCurrency - Source currency code
     * @returns Amount in MXN, rounded to 2 decimal places
     */
    static convertToMXN(amount, fromCurrency) {
        const rate = this.EXCHANGE_RATES[fromCurrency];
        if (!rate) {
            console.warn(`Unknown currency: ${fromCurrency}, treating as MXN`);
            return amount;
        }
        return Math.round(amount * rate * 100) / 100;
    }
    /**
     * Get the exchange rate for a given currency to MXN
     * @param currency - Currency code
     * @returns Exchange rate to MXN
     */
    static getRate(currency) {
        return this.EXCHANGE_RATES[currency] || 1.00;
    }
    /**
     * Get all supported currencies
     * @returns Array of supported currency codes
     */
    static getSupportedCurrencies() {
        return Object.keys(this.EXCHANGE_RATES);
    }
}
exports.CurrencyExchangeService = CurrencyExchangeService;
// Exchange rates: 1 unit of source currency = X MXN
CurrencyExchangeService.EXCHANGE_RATES = {
    'MXN': 1.00, // Mexican Peso (base)
    'USD': 17.00, // US Dollar
    'EUR': 18.50, // Euro
    'PEN': 4.50, // Peruvian Sol
    'COP': 0.0042, // Colombian Peso
    'CLP': 0.019 // Chilean Peso
};
//# sourceMappingURL=CurrencyExchangeService.js.map