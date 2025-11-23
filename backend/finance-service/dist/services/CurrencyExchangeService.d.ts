/**
 * Currency Exchange Service
 * Provides currency conversion to MXN for financial balance calculations
 */
export type CurrencyCode = 'USD' | 'EUR' | 'PEN' | 'MXN' | 'COP' | 'CLP';
export declare class CurrencyExchangeService {
    private static readonly EXCHANGE_RATES;
    /**
     * Convert amount from source currency to MXN
     * @param amount - Amount to convert
     * @param fromCurrency - Source currency code
     * @returns Amount in MXN, rounded to 2 decimal places
     */
    static convertToMXN(amount: number, fromCurrency: CurrencyCode): number;
    /**
     * Get the exchange rate for a given currency to MXN
     * @param currency - Currency code
     * @returns Exchange rate to MXN
     */
    static getRate(currency: CurrencyCode): number;
    /**
     * Get all supported currencies
     * @returns Array of supported currency codes
     */
    static getSupportedCurrencies(): CurrencyCode[];
}
//# sourceMappingURL=CurrencyExchangeService.d.ts.map