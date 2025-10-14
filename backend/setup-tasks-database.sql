-- Configuración de la base de datos de Tareas Smart Home
-- Base de datos dedicada para gestión de tareas y asignaciones

-- ========================================
-- ESQUEMA DE TAREAS
-- ========================================

-- Tabla de tareas mejorada con períodos y repeticiones
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(10) DEFAULT 'medium',
    category VARCHAR(50),
    start_date TIMESTAMP,
    due_date TIMESTAMP,
    estimated_time INTEGER,
    completed_at TIMESTAMP,
    -- Campos para manejo de períodos y repeticiones
    is_recurring BOOLEAN DEFAULT false,
    recurrence_type VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'yearly'
    recurrence_interval INTEGER DEFAULT 1, -- cada cuántos períodos se repite
    recurrence_days JSONB, -- para tareas semanales: [1,2,3,4,5] (lun-vie)
    recurrence_end_date TIMESTAMP, -- cuándo termina la recurrencia
    parent_task_id INTEGER REFERENCES tasks(id), -- para tareas generadas por recurrencia
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de subtareas
CREATE TABLE IF NOT EXISTS subtasks (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de asignaciones de tareas (para múltiples usuarios por tarea)
CREATE TABLE IF NOT EXISTS task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    assigned_by INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'assigned', -- 'assigned', 'accepted', 'rejected', 'completed'
    UNIQUE(task_id, user_id)
);

-- Tabla mejorada de archivos adjuntos a tareas
CREATE TABLE IF NOT EXISTS task_files (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500), -- URL pública si está en Google Drive
    file_size INTEGER,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    uploaded_by INTEGER NOT NULL,
    storage_type VARCHAR(20) DEFAULT 'local', -- 'local', 'google_drive'
    google_drive_id VARCHAR(255), -- ID del archivo en Google Drive
    is_image BOOLEAN DEFAULT false,
    thumbnail_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de comentarios de tareas
CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_by_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para comentarios de tareas
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_by ON task_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- ========================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ========================================

-- Índices para tareas
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks(is_recurring);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_task_files_storage_type ON task_files(storage_type);

-- Asegurar columna start_date si la tabla ya existía previamente
ALTER TABLE IF NOT EXISTS tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP;

-- Asegurar columna de progreso (0-100) en la tabla tasks
ALTER TABLE IF NOT EXISTS tasks 
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Persistencia de estado previo al archivar
ALTER TABLE IF NOT EXISTS tasks 
  ADD COLUMN IF NOT EXISTS previous_status VARCHAR(20);

-- ========================================
-- DATOS DE EJEMPLO - TAREAS
-- ========================================

-- Tareas de ejemplo con períodos y asignaciones
INSERT INTO tasks (user_id, title, description, status, priority, category, due_date, is_recurring, recurrence_type, recurrence_interval, recurrence_days) 
VALUES 
    (1, 'Limpiar la cocina', 'Limpiar y organizar toda la cocina después de las comidas', 'pending', 'alta', 'limpieza', '2024-01-15 20:00:00', true, 'daily', 1, '[1,2,3,4,5,6,7]'),
    (2, 'Revisar tareas escolares', 'Supervisar que los niños hagan sus tareas', 'in_progress', 'alta', 'educacion', '2024-01-15 19:00:00', true, 'weekly', 1, '[1,2,3,4,5]'),
    (1, 'Compras del supermercado', 'Hacer las compras semanales de la familia', 'pending', 'media', 'compras', '2024-01-20 10:00:00', true, 'weekly', 1, '[6]'),
    (1, 'Organizar cuarto', 'Mantener el cuarto ordenado y limpio', 'pending', 'media', 'limpieza', '2024-01-16 18:00:00', false, NULL, NULL, NULL),
    (2, 'Ayudar en la cocina', 'Ayudar a preparar la cena familiar', 'pending', 'baja', 'cocina', '2024-01-15 17:30:00', false, NULL, NULL, NULL),
    (1, 'Sacar la basura', 'Sacar la basura todos los martes y viernes', 'pending', 'media', 'limpieza', '2024-01-16 07:00:00', true, 'weekly', 1, '[2,5]'),
    (2, 'Regar las plantas', 'Regar todas las plantas del jardín', 'completed', 'baja', 'jardineria', '2024-01-14 16:00:00', true, 'daily', 2, '[1,3,5]'),
    (1, 'Ordenar juguetes', 'Recoger y organizar todos los juguetes', 'pending', 'media', 'limpieza', '2024-01-15 18:00:00', false, NULL, NULL, NULL),
    (1, 'Preparar desayuno', 'Preparar el desayuno para toda la familia', 'in_progress', 'alta', 'cocina', '2024-01-15 07:30:00', true, 'daily', 1, '[1,2,3,4,5,6,7]'),
    (2, 'Revisar gastos mensuales', 'Revisar y organizar los gastos del mes', 'pending', 'media', 'finanzas', '2024-01-31 20:00:00', true, 'monthly', 1, NULL)
ON CONFLICT DO NOTHING;

-- Asignaciones de tareas (tarea con múltiples usuarios)
INSERT INTO task_assignments (task_id, user_id, assigned_by, status) 
VALUES 
    (4, 1, 1, 'assigned'), -- Admin asignado a "Organizar cuarto"
    (5, 2, 1, 'accepted'), -- Member asignado a "Ayudar en la cocina"
    (2, 2, 1, 'assigned'), -- Member asignado a "Revisar tareas escolares"
    (6, 1, 1, 'accepted'), -- Admin asignado a "Sacar la basura"
    (8, 2, 1, 'assigned'), -- Member asignado a "Ordenar juguetes"
    (1, 2, 1, 'accepted'), -- Member asignado a "Limpiar la cocina"
    (9, 2, 1, 'accepted')  -- Member asignado a "Preparar desayuno"
ON CONFLICT DO NOTHING;

-- Subtareas de ejemplo
INSERT INTO subtasks (task_id, title, is_completed) 
VALUES 
    (1, 'Lavar platos y utensilios', false),
    (1, 'Limpiar superficies y mesones', false),
    (1, 'Organizar despensa', false),
    (1, 'Barrer y trapear el piso', true),
    (2, 'Revisar matemáticas de Luis', true),
    (2, 'Revisar ciencias de Pedro', false),
    (2, 'Ayudar con proyecto de Ana', false),
    (2, 'Verificar tareas de Sofía', true),
    (3, 'Hacer lista de compras', true),
    (3, 'Ir al supermercado', false),
    (3, 'Organizar compras en casa', false),
    (4, 'Organizar ropa en el armario', false),
    (4, 'Limpiar escritorio de estudio', true),
    (4, 'Aspirar alfombra', false),
    (5, 'Preparar ingredientes', true),
    (5, 'Cocinar plato principal', false),
    (5, 'Poner la mesa', false),
    (6, 'Separar basura reciclable', true),
    (6, 'Sacar bolsas al contenedor', false),
    (7, 'Revisar estado de las plantas', true),
    (7, 'Regar plantas del interior', true),
    (7, 'Regar plantas del jardín', false),
    (8, 'Recoger juguetes del suelo', false),
    (8, 'Organizar juguetes en cajas', false),
    (9, 'Preparar café', true),
    (9, 'Hacer tostadas', false),
    (9, 'Servir frutas', false),
    (10, 'Recopilar recibos del mes', true),
    (10, 'Categorizar gastos', false),
    (10, 'Actualizar presupuesto', false)
ON CONFLICT DO NOTHING;

-- Archivos de ejemplo asociados a tareas
INSERT INTO task_files (task_id, file_name, file_path, file_type, mime_type, uploaded_by, storage_type, is_image) 
VALUES 
    (2, 'horario_tareas_escolares.pdf', '/uploads/documents/horario_tareas_escolares.pdf', 'pdf', 'application/pdf', 2, 'local', false),
    (2, 'foto_tarea_member.jpg', '/uploads/images/foto_tarea_member.jpg', 'jpg', 'image/jpeg', 2, 'local', true),
    (3, 'lista_compras_enero.txt', '/uploads/documents/lista_compras_enero.txt', 'txt', 'text/plain', 1, 'local', false),
    (3, 'cupones_descuento.pdf', '/uploads/documents/cupones_descuento.pdf', 'pdf', 'application/pdf', 1, 'local', false),
    (4, 'antes_organizacion.jpg', '/uploads/images/antes_organizacion.jpg', 'jpg', 'image/jpeg', 1, 'local', true),
    (4, 'despues_organizacion.jpg', '/uploads/images/despues_organizacion.jpg', 'jpg', 'image/jpeg', 1, 'local', true),
    (5, 'receta_cena_familiar.pdf', '/uploads/documents/receta_cena_familiar.pdf', 'pdf', 'application/pdf', 2, 'local', false),
    (5, 'foto_plato_terminado.jpg', '/uploads/images/foto_plato_terminado.jpg', 'jpg', 'image/jpeg', 2, 'local', true),
    (7, 'guia_cuidado_plantas.pdf', '/uploads/documents/guia_cuidado_plantas.pdf', 'pdf', 'application/pdf', 2, 'local', false),
    (9, 'menu_desayunos_semana.txt', '/uploads/documents/menu_desayunos_semana.txt', 'txt', 'text/plain', 1, 'local', false),
    (10, 'recibos_enero_2024.zip', '/uploads/documents/recibos_enero_2024.zip', 'zip', 'application/zip', 2, 'local', false),
    (10, 'presupuesto_familiar.xlsx', '/uploads/documents/presupuesto_familiar.xlsx', 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 2, 'local', false)
ON CONFLICT DO NOTHING;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos de Tareas Smart Home configurada exitosamente!';
    RAISE NOTICE 'Funcionalidades de tareas implementadas:';
    RAISE NOTICE '  - Tareas recurrentes con períodos configurables';
    RAISE NOTICE '  - Asignación múltiple de usuarios por tarea';
    RAISE NOTICE '  - Gestión de archivos con integración Google Drive';
    RAISE NOTICE '  - Sistema de subtareas para mejor organización';
    RAISE NOTICE 'Total de tareas creadas: 10 (para usuarios admin y member)';
    RAISE NOTICE 'Total de subtareas creadas: 30';
    RAISE NOTICE 'Total de archivos adjuntos: 12';
END $$;