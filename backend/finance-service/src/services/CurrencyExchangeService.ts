/**
 * Currency Exchange Service
 * Provides currency conversion to MXN for financial balance calculations
 */

export type CurrencyCode = 'USD' | 'EUR' | 'PEN' | 'MXN' | 'COP' | 'CLP';

export class CurrencyExchangeService {
    // Exchange rates: 1 unit of source currency = X MXN
    private static readonly EXCHANGE_RATES: Record<CurrencyCode, number> = {
        'MXN': 1.00,      // Mexican Peso (base)
        'USD': 17.00,     // US Dollar
        'EUR': 18.50,     // Euro
        'PEN': 4.50,      // Peruvian Sol
        'COP': 0.0042,    // Colombian Peso
        'CLP': 0.019      // Chilean Peso
    };

    /**
     * Convert amount from source currency to MXN
     * @param amount - Amount to convert
     * @param fromCurrency - Source currency code
     * @returns Amount in MXN, rounded to 2 decimal places
     */
    public static convertToMXN(amount: number, fromCurrency: CurrencyCode): number {
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
    public static getRate(currency: CurrencyCode): number {
        return this.EXCHANGE_RATES[currency] || 1.00;
    }

    /**
     * Get all supported currencies
     * @returns Array of supported currency codes
     */
    public static getSupportedCurrencies(): CurrencyCode[] {
        return Object.keys(this.EXCHANGE_RATES) as CurrencyCode[];
    }
}
