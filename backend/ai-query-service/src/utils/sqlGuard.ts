export const isReadOnlyQuery = (sql?: string): boolean => {
  if (!sql) return false;
  // Normalizar: quitar comentarios de línea y espacios extremos
  const normalized = sql.trim().toUpperCase().replace(/--.*$/gm, '');
  // Solo permitimos consultas que comienzan con SELECT o WITH
  if (normalized.startsWith('SELECT') || normalized.startsWith('WITH')) {
    // Palabras reservadas prohibidas (como comandos), no como parte de nombres de columnas
    const banned = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE'];
    const hasBanned = banned.some(k => new RegExp(`\\b${k}\\b`, 'i').test(normalized));
    return !hasBanned;
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