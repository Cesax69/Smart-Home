"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReadOnlyMongo = exports.isReadOnlyQuery = void 0;
const isReadOnlyQuery = (sql) => {
    if (!sql)
        return false;
    const normalized = sql.trim().toUpperCase().replace(/--.*$/gm, '');
    if (normalized.startsWith('SELECT') || normalized.startsWith('WITH')) {
        const banned = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE'];
        return !banned.some(k => normalized.includes(k));
    }
    return false;
};
exports.isReadOnlyQuery = isReadOnlyQuery;
const isReadOnlyMongo = (pipelineOrFind) => {
    if (!pipelineOrFind)
        return false;
    if (Array.isArray(pipelineOrFind)) {
        return true;
    }
    if (typeof pipelineOrFind === 'object') {
        return true;
    }
    return false;
};
exports.isReadOnlyMongo = isReadOnlyMongo;
