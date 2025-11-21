export interface CatalogItem {
  id: string;
  name: string;
}

export const EXPENSE_CATEGORIES: CatalogItem[] = [
  { id: 'food', name: 'Alimentación' },
  { id: 'utilities', name: 'Servicios (luz, agua, gas)' },
  { id: 'rent', name: 'Renta/Hipoteca' },
  { id: 'transport', name: 'Transporte' },
  { id: 'health', name: 'Salud' },
  { id: 'education', name: 'Educación' },
  { id: 'household', name: 'Hogar' },
  { id: 'entertainment', name: 'Entretenimiento' },
  { id: 'pets', name: 'Mascotas' },
  { id: 'other', name: 'Otros' }
];

export const INCOME_SOURCES: CatalogItem[] = [
  { id: 'salary', name: 'Salario' },
  { id: 'bonus', name: 'Bono' },
  { id: 'freelance', name: 'Freelance' },
  { id: 'rental', name: 'Renta' },
  { id: 'investment', name: 'Inversión' },
  { id: 'gift', name: 'Regalo' },
  { id: 'other', name: 'Otros' }
];

export const HOUSEHOLD_MEMBERS: CatalogItem[] = [
  { id: 'head', name: 'Jefe/a de hogar' },
  { id: 'partner', name: 'Pareja' },
  { id: 'child1', name: 'Hijo/a 1' },
  { id: 'child2', name: 'Hijo/a 2' },
  { id: 'grandparent', name: 'Abuelo/a' }
];

export const CatalogMaps = {
  expenseCategoriesMap: Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c.name])) as Record<string, string>,
  incomeSourcesMap: Object.fromEntries(INCOME_SOURCES.map(c => [c.id, c.name])) as Record<string, string>,
  membersMap: Object.fromEntries(HOUSEHOLD_MEMBERS.map(m => [m.id, m.name])) as Record<string, string>,
};