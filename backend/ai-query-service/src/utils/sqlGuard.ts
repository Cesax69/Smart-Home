export const isReadOnlyQuery = (sql?: string): boolean => {
  if (!sql) return false;
  const normalized = sql.trim().toUpperCase().replace(/--.*$/gm, '');
  if (normalized.startsWith('SELECT') || normalized.startsWith('WITH')) {
    const banned = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE'];
    return !banned.some(k => normalized.includes(k));
  }
  return false;
};

export const isReadOnlyMongo = (pipelineOrFind?: any): boolean => {
  if (!pipelineOrFind) return false;
  if (Array.isArray(pipelineOrFind)) {
    return true;
  }
  if (typeof pipelineOrFind === 'object') {
    return true;
  }
  return false;
};