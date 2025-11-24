// Utilidad de etiquetas (Builder, soporte):
// Convierte una fecha ISO a un label homogéneo según el `period` (day/month/year).
// El normalizador la usa cuando `groupBy` es `date` para asegurar consistencia
// en el eje X antes de que el Builder construya la configuración.
export function formatLabelForPeriod(iso: string, period?: string): string {
  if (!iso) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  // Capturar Y-M-D del inicio del string, soportando variantes con tiempo (T...Z) y con '/'
  const ymdHyphen = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const ymdSlash = iso.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  let y: number | null = null;
  let m: number | null = null;
  let day: number | null = null;
  if (ymdHyphen) {
    y = parseInt(ymdHyphen[1], 10);
    m = parseInt(ymdHyphen[2], 10);
    day = parseInt(ymdHyphen[3], 10);
  } else if (ymdSlash) {
    y = parseInt(ymdSlash[1], 10);
    m = parseInt(ymdSlash[2], 10);
    day = parseInt(ymdSlash[3], 10);
  }

  // Si no se pudo parsear, intentar con Date pero sólo como último recurso
  if (y === null || m === null || day === null) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    y = d.getUTCFullYear();
    m = d.getUTCMonth() + 1;
    day = d.getUTCDate();
  }

  if (period === 'year') return `${y}-01-01`;
  if (period === 'month') return `${y}-${pad(m)}-01`;
  return `${y}-${pad(m)}-${pad(day)}`;
}