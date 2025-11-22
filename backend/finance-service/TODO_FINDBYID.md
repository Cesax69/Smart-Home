Script para agregar métodos findById a ExpenseService e IncomeService, y luego agregar los controladores correspondientes en los routers.

## Pasos:

1. Añadir método findById en ExpenseService (línea 86)
2. Añadir método findById en IncomeService (línea 86)  
3. Añadir método getExpenseById en ExpenseController (despuésde getExpenses)
4. Añadir método getIncomeById en IncomeController (después de getIncome)
5. Agregar rutas GET /expenses/:id y GET /income/:id en financeRoutes.ts

Los métodos deben buscar por ID y devolver null si no se encuentra.
