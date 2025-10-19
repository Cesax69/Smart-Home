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

-- (Eliminado) Tabla de subtareas

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

<<<<<<< HEAD
-- Índices para comentarios de tareas
=======
-- Índices para optimización de comentarios
>>>>>>> cegg
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
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_task_files_storage_type ON task_files(storage_type);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_by ON task_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- Asegurar columna start_date si la tabla ya existía previamente
ALTER TABLE IF NOT EXISTS tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP;

-- Asegurar columna de progreso (0-100) en la tabla tasks
ALTER TABLE IF NOT EXISTS tasks 
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Persistencia de estado previo al archivar
ALTER TABLE IF NOT EXISTS tasks 
  ADD COLUMN IF NOT EXISTS previous_status VARCHAR(20);


-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos de Tareas Smart Home configurada exitosamente (sin datos de ejemplo).';
    RAISE NOTICE 'Funcionalidades de tareas implementadas:';
    RAISE NOTICE '  - Tareas recurrentes con períodos configurables';
    RAISE NOTICE '  - Asignación múltiple de usuarios por tarea';
    RAISE NOTICE '  - Gestión de archivos con integración Google Drive';
    RAISE NOTICE 'Datos iniciales: ninguno';
END $$;