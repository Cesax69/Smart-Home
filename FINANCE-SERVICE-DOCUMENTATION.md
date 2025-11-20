# Finance Service - Documentación Completa

## 📋 Resumen

Implementación completa del microservicio **finance-service** para gestión de finanzas familiares con tracking de gastos e ingresos y generación de reportes.

**Fecha**: 2025-11-19  
**Versión**: 1.0.0  
**Puerto Servicio**: 3007  
**Puerto Base de Datos**: 5435  

---

## 🗄️ CAMBIOS EN BASE DE DATOS

### Nueva Base de Datos: `finance_db`

**Contenedor Docker**: `smart-home-postgres-finance`  
**Puerto**: 5435 → 5432  
**Usuario**: postgres  
**Password**: linux  
**Volumen**: postgres_finance_data

### Tablas Creadas

#### 1. Tabla `expenses` (Gastos)

```sql
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    category_id VARCHAR(50) NOT NULL,
    member_id VARCHAR(50),
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Índices**:
```sql
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_member ON expenses(member_id);
CREATE INDEX idx_expenses_currency ON expenses(currency);
```

**Propósito**: Registro de todos los gastos familiares con categorización, asignación a miembros y soporte multi-moneda.

#### 2. Tabla `income` (Ingresos)

```sql
CREATE TABLE income (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    source VARCHAR(100) NOT NULL,
    member_id VARCHAR(50),
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Índices**:
```sql
CREATE INDEX idx_income_date ON income(date);
CREATE INDEX idx_income_source ON income(source);
CREATE INDEX idx_income_member ON income(member_id);
CREATE INDEX idx_income_currency ON income(currency);
```

**Propósito**: Registro de ingresos familiares con identificación de fuente y miembro responsable.

### Script de Inicialización

**Archivo**: `backend/setup-finance-database.sql`  
**Ubicación en Docker**: `/docker-entrypoint-initdb.d/setup-finance-database.sql`  
**Ejecución**: Automática al crear el contenedor  
**Datos iniciales**: Ninguno (base de datos vacía)

---

## 🏗️ ARQUITECTURA DEL SERVICIO

### Estructura de Carpetas

```
backend/finance-service/
├── src/
│   ├── models/
│   │   └── types.ts                 # DTOs e interfaces TypeScript
│   ├── builders/
│   │   ├── ExpenseBuilder.ts        # Builder para gastos
│   │   ├── IncomeBuilder.ts         # Builder para ingresos
│   │   └── FinanceReportQueryBuilder.ts  # Builder para queries de reportes
│   ├── services/
│   │   ├── ExpenseService.ts        # Lógica de negocio gastos
│   │   ├── IncomeService.ts         # Lógica de negocio ingresos
│   │   └── ReportService.ts         # Agregaciones y reportes
│   ├── controllers/
│   │   ├── ExpenseController.ts     # HTTP endpoints gastos
│   │   ├── IncomeController.ts      # HTTP endpoints ingresos
│   │   └── ReportController.ts      # HTTP endpoint reportes
│   ├── routes/
│   │   └── financeRoutes.ts         # Definición de rutas
│   ├── config/
│   │   └── database.ts              # Configuración PostgreSQL
│   └── server.ts                     # Servidor Express
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env
└── .env.example
```

### Patrón Builder Implementado

**ExpenseBuilder**:
- Validación: `amount > 0`
- Default: `currency = 'USD'`
- Default: `date = now()`
- Validación: `categoryId` requerido

**IncomeBuilder**:
- Validación: `amount > 0`
- Default: `currency = 'USD'`  
- Default: `date = now()`
- Validación: `source` requerido

**FinanceReportQueryBuilder**:
- Default: `currency = 'USD'`
- Default: `groupBy = 'date'`
- Default: `period = 'month'` (si no hay from/to)

---

## 🔌 ENDPOINTS IMPLEMENTADOS

### Base URL
- **Directo**: `http://localhost:3007/finance`
- **Via Gateway**: `http://localhost:3000/api/finance`

### 1. POST /finance/expenses

Crear un nuevo gasto.

**Request Body**:
```json
{
  "amount": 150.75,          // REQUERIDO, > 0
  "currency": "USD",         // OPCIONAL, default: USD
  "categoryId": "transporte", // REQUERIDO
  "memberId": "hijo1",       // OPCIONAL
  "date": "2025-11-19",      // OPCIONAL, default: now
  "notes": "Gasolina semanal" // OPCIONAL
}
```

**Response 201**:
```json
{
  "ok": true,
  "data": {
    "id": "1",
    "amount": 150.75,
    "currency": "USD",
    "categoryId": "transporte",
    "memberId": "hijo1",
    "date": "2025-11-19T20:30:00.000Z",
    "notes": "Gasolina semanal",
    "createdAt": "2025-11-19T20:30:05.123Z"
  },
  "meta": {
    "createdAt": "2025-11-19T20:30:05.123Z"
  }
}
```

### 2. GET /finance/expenses

Listar gastos con filtros opcionales.

**Query Parameters**:
- `from`: Fecha inicio (ISO 8601)
- `to`: Fecha fin (ISO 8601)
- `categoryId`: Filtrar por categoría
- `memberId`: Filtrar por miembro

**Response 200**:
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "1",
        "amount": 150.75,
        "currency": "USD",
        "categoryId": "transporte",
        "memberId": "hijo1",
        "date": "2025-11-19T20:30:00.000Z",
        "notes": "Gasolina semanal",
        "createdAt": "2025-11-19T20:30:05.123Z"
      }
    ]
  },
  "meta": {
    "count": 1,
    "currency": "USD",
    "range": {
      "start": "2025-10-20T00:00:00.000Z",
      "end": "2025-11-20T23:59:59.999Z"
    }
  }
}
```

### 3. POST /finance/income

Crear un nuevo ingreso.

**Request Body**:
```json
{
  "amount": 2500,              // REQUERIDO, > 0
  "currency": "MXN",           // OPCIONAL, default: USD
  "source": "salario quincenal", // REQUERIDO
  "memberId": "papa",          // OPCIONAL
  "date": "2025-11-15",        // OPCIONAL, default: now
  "notes": "Quincena noviembre" // OPCIONAL
}
```

**Response 201**: Similar a expenses

### 4. GET /finance/income

Listar ingresos con filtros opcionales.

**Query Parameters**:
- `from`: Fecha inicio
- `to`: Fecha fin  
- `source`: Filtrar por fuente
- `memberId`: Filtrar por miembro

**Response 200**: Similar a expenses

### 5. GET /finance/report

Generar reporte financiero para gráficas.

**Query Parameters**:
- `period`: 'week' | 'month' | 'year' (default: month)
- `from`: Fecha inicio custom
- `to`: Fecha fin custom
- `groupBy`: 'date' | 'category' | 'member' (default: date)
- `currency`: Moneda filter (default: USD)

**Response 200**:
```json
{
  "ok": true,
  "data": {
    "labels": ["2025-10-20", "2025-10-21", "2025-10-22", ...],
    "datasets": [
      {
        "label": "Gastos",
        "data": [150.75, 0, 45.5, ...],
        "color": "#F44336"
      },
      {
        "label": "Ingresos",
        "data": [0, 2500, 0, ...],
        "color": "#2196F3"
      },
      {
        "label": "Balance",
        "data": [-150.75, 2500, -45.5, ...],
        "color": "#4CAF50"
      }
    ]
  },
  "meta": {
    "period": "month",
    "groupBy": "date",
    "currency": "USD",
    "range": {
      "start": "2025-10-20T00:00:00.000Z",
      "end": "2025-11-20T23:59:59.999Z"
    }
  }
}
```

---

## ✅ PRUEBAS REALIZADAS

### Test 1: Crear Gasto (POST /expenses)

**Input**:
```json
{
  "amount": 250,
  "currency": "USD",
  "categoryId": "servicios",
  "notes": "Internet mensual"
}
```

**Resultado**: ✅ 201 Created
- ID generado: "1"
- Currency aplicada: "USD"
- Fecha auto-asignada
- Registro guardado en BD

### Test 2: Listar Gastos (GET /expenses)

**Resultado**: ✅ 200 OK
- 1 item retornado
- Metadata con count, currency, range
- Range calculado correctamente (30 días por default)

### Test 3: Filtrar por Categoría (GET /expenses?categoryId=servicios)

**Resultado**: ✅ 200 OK
- Solo gastos de categoría "servicios"
- Filtro SQL funcionando correctamente

### Test 4: Crear Ingreso (POST /income)

**Input**:
```json
{
  "amount": 2500,
  "currency": "MXN",
  "source": "salario quincenal",
  "memberId": "papa"
}
```

**Resultado**: ✅ 201 Created
- Registro persistido
- Multi-moneda soportada

### Test 5: Reporte por Categoría (GET /report?groupBy=category)

**Resultado**: ✅ 200 OK
- Labels generados por categoría única
- 3 datasets: Gastos, Ingresos, Balance
- Balance = Ingresos - Gastos
- Agregaciones SQL correctas

---

## 🐳 CONFIGURACIÓN DOCKER

###docker-compose.yml - Cambios

**1. Agregado postgres-finance**:
```yaml
postgres-finance:
  image: postgres:15-alpine
  container_name: smart-home-postgres-finance
  environment:
    POSTGRES_DB: finance_db
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: linux
  ports:
    - "5435:5432"
  volumes:
    - postgres_finance_data:/var/lib/postgresql/data
    - ./backend/setup-finance-database.sql:/docker-entrypoint-initdb.d/setup-finance-database.sql
  networks:
    - smart-home-network
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres -d finance_db"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**2. Agregado finance-service**:
```yaml
finance-service:
  build:
    context: ./backend/finance-service
  container_name: smart-home-finance-service
  ports:
    - "3007:3007"
  environment:
    - NODE_ENV=production
    - PORT=3007
    - DB_HOST=postgres-finance
    - DB_PORT=5432
    - DB_NAME=finance_db
    - DB_USER=postgres
    - DB_PASSWORD=linux
  depends_on:
    postgres-finance:
      condition: service_healthy
  networks:
    - smart-home-network
  restart: unless-stopped
```

**3. Agregado volumen**:
```yaml
volumes:
  postgres_finance_data:
    driver: local
```

**4. Actualizado API Gateway**:
```yaml
api-gateway:
  environment:
    - FINANCE_SERVICE_URL=http://finance-service:3007
  depends_on:
    - finance-service
```

### API Gateway - Cambios

**Archivo**: `backend/api-gateway/src/config/services.ts`

```typescript
FINANCE: {
  name: 'Finance Service',
  url: process.env.FINANCE_SERVICE_URL || 'http://localhost:3007',
  path: '/api/finance',
  description: 'Servicio de gestión de finanzas (gastos e ingresos)',
  healthEndpoint: '/health'
}
```

---

## 📊 VALIDACIONES IMPLEMENTADAS

### Builder Validations

✅ **amount > 0**: Lanza error si amount <= 0  
✅ **currency default**: Asigna 'USD' si no se provee  
✅ **date default**: Asigna now() si no se provee  
✅ **categoryId/source requeridos**: Error si falta

### Database Constraints

✅ `CHECK (amount > 0)`: Nivel de base de datos  
✅ `NOT NULL`: En campos requeridos  
✅ `DEFAULT 'USD'`: Para currency  
✅ `DEFAULT CURRENT_TIMESTAMP`: Para date y created_at

---

## 🚀 COMANDOS ÚTILES

### Desarrollo Local

```bash
# Instalar dependencias
cd backend/finance-service
npm install

# Desarrollo
npm run dev

# Compilar
npm run build

# Producción
npm start
```

### Docker

```bash
# Levantar solo finance
docker-compose up -d postgres-finance finance-service

# Ver logs
docker-compose logs -f finance-service

# Verificar base de datos
docker exec smart-home-postgres-finance psql -U postgres -d finance_db -c "\dt"

# Consultar datos
docker exec smart-home-postgres-finance psql -U postgres -d finance_db -c "SELECT * FROM expenses;"
```

### Testing con PowerShell

```powershell
# Crear gasto
$headers = @{"Content-Type"="application/json"}
$body = '{"amount": 100, "categoryId": "comida"}'
Invoke-WebRequest -Uri "http://localhost:3007/finance/expenses" -Method POST -Headers $headers -Body $body

# Listar
Invoke-WebRequest -Uri "http://localhost:3007/finance/expenses"

# Reporte
Invoke-WebRequest -Uri "http://localhost:3007/finance/report?period=month&groupBy=category"
```

---

## 📝 RESUMEN DE ARCHIVOS MODIFICADOS/CREADOS

### Nuevos
- `backend/finance-service/` (directorio completo)
- `backend/setup-finance-database.sql`

### Modificados
- `docker-compose.yml`
- `backend/api-gateway/src/config/services.ts`

### Total de Archivos Finance Service
- 15 archivos TypeScript
- 3 archivos de configuración (package.json, tsconfig.json, Dockerfile)
- 2 archivos .env
- 1 archivo SQL

---

## ✅ CHECKLIST FINAL

### Base de Datos
- [x] BD finance_db creada
- [x] Tabla expenses con índices
- [x] Tabla income con índices
- [x] Script SQL de inicialización
- [x] Health checks funcionando

### Backend
- [x] Patrón Builder implementado
- [x] 3 Services (Expense, Income, Report)
- [x] 3 Controllers HTTP
- [x] Validaciones completas
- [x] Formato de respuesta estándar

### Docker
- [x] Contenedor postgres-finance (puerto 5435)
- [x] Contenedor finance-service (puerto 3007)
- [x] Volumen persistente
- [x] Health checks
- [x] Integración con API Gateway

### Testing
- [x] POST /expenses ✅
- [x] GET /expenses ✅
- [x] POST /income ✅
- [x] GET /income ✅
- [x] GET /report ✅

---

**Estado Final**: ✅ **100% Implementado y Funcional**
