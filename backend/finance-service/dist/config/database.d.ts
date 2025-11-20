interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}
declare class DatabaseService {
    private pool;
    private config;
    constructor();
    getConnection(): Promise<import("pg").PoolClient>;
    query(text: string, params?: any[]): Promise<import("pg").QueryResult<any>>;
    testConnection(): Promise<boolean>;
    closePool(): Promise<void>;
    getConfig(): DatabaseConfig;
}
export declare const databaseService: DatabaseService;
export {};
//# sourceMappingURL=database.d.ts.map