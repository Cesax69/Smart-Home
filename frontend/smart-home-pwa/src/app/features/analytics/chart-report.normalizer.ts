import { ChartDatasetInput } from './chart-config.builder';
import { formatLabelForPeriod } from './chart-label-format.util';

// Patrón Builder (flujo en Analytics):
// Este normalizador convierte la respuesta del backend `res` al contrato que
// consume el Builder (`ChartConfigBuilder`).
//
// Responsabilidades:
// - Garantiza que `labels` sea un arreglo de strings listo para el gráfico.
// - Unifica los datasets a un `Record<string, ChartDatasetInput>` con claves
//   semánticas (`expenses`, `incomes`, `balance`).
// - Formatea etiquetas de tiempo en función del `period` cuando `groupBy` es `date`.
//
// Importante:
// - El Builder no conoce la estructura cruda del backend; opera sobre este
//   resultado normalizado.
// - Cualquier cambio en el backend se absorbe aquí, manteniendo estable el
//   contrato hacia el Builder y los componentes.

export function normalizeReport(res: any): { labels: string[]; datasets: Record<string, ChartDatasetInput> } {
  // Extraer metadatos mínimos para decidir el formateo de etiquetas
  const rawLabels: string[] = res?.data?.labels || [];
  const period: string | undefined = res?.meta?.period;
  const groupBy: string | undefined = res?.meta?.groupBy;
  // Si agrupamos por fecha, homogenizamos las etiquetas según el período
  // (día/mes/año) para evitar variaciones de formato.
  const labels: string[] = (groupBy === 'date' && period)
    ? rawLabels.map(l => formatLabelForPeriod(l, period))
    : rawLabels;
  const ds = res?.data?.datasets;

  if (Array.isArray(ds)) {
    const map: Record<string, ChartDatasetInput> = {};
    ds.forEach((d: any) => {
      const rawLabel: string = d?.label || '';
      const lower = rawLabel.toLowerCase();
      let key = lower;
      if (lower.includes('gasto')) key = 'expenses';
      else if (lower.includes('ingreso')) key = 'incomes';
      else if (lower.includes('balance')) key = 'balance';
      // Unificar al contrato del Builder: label legible, datos numéricos y color opcional
      map[key] = { label: rawLabel, data: d?.data || [], color: d?.color };
    });
    return { labels, datasets: map };
  }

  return {
    labels,
    datasets: {
      // Si el backend ya envía un objeto, sólo lo mapeamos al contrato del Builder
      expenses: ds?.expenses,
      incomes: ds?.incomes,
      balance: ds?.balance
    }
  } as any;
}