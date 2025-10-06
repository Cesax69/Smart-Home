-- Configuración de la base de datos Smart Home
-- Esquemas para Users y Tasks con sistema de roles familiares

-- Crear esquemas
CREATE SCHEMA IF NOT EXISTS users_schema;
CREATE SCHEMA IF NOT EXISTS tasks_schema;

-- Otorgar permisos al usuario postgres
GRANT ALL PRIVILEGES ON SCHEMA users_schema TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA tasks_schema TO postgres;

-- Configurar search_path para incluir los esquemas
ALTER USER postgres SET search_path TO users_schema, tasks_schema, public;

-- ========================================
-- ESQUEMA DE USUARIOS (users_schema)
-- ========================================

-- Tabla de roles familiares
CREATE TABLE IF NOT EXISTS users_schema.family_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sub-roles (para diferenciar miembros de la familia)
CREATE TABLE IF NOT EXISTS users_schema.family_sub_roles (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES users_schema.family_roles(id) ON DELETE CASCADE,
    sub_role_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, sub_role_name)
);

-- Tabla de usuarios mejorada
CREATE TABLE IF NOT EXISTS users_schema.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    family_role_id INTEGER REFERENCES users_schema.family_roles(id),
    family_sub_role_id INTEGER REFERENCES users_schema.family_sub_roles(id),
    birth_date DATE,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sesiones de usuario
CREATE TABLE IF NOT EXISTS users_schema.user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users_schema.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuraciones de usuario
CREATE TABLE IF NOT EXISTS users_schema.user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users_schema.users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ESQUEMA DE TAREAS (tasks_schema)
-- ========================================

-- Tabla de tareas mejorada con períodos y repeticiones
CREATE TABLE IF NOT EXISTS tasks_schema.tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(10) DEFAULT 'medium',
    category VARCHAR(50),
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    -- Campos para manejo de períodos y repeticiones
    is_recurring BOOLEAN DEFAULT false,
    recurrence_type VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'yearly'
    recurrence_interval INTEGER DEFAULT 1, -- cada cuántos períodos se repite
    recurrence_days JSONB, -- para tareas semanales: [1,2,3,4,5] (lun-vie)
    recurrence_end_date TIMESTAMP, -- cuándo termina la recurrencia
    parent_task_id INTEGER REFERENCES tasks_schema.tasks(id), -- para tareas generadas por recurrencia
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de subtareas
CREATE TABLE IF NOT EXISTS tasks_schema.subtasks (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks_schema.tasks(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de asignaciones de tareas (para múltiples usuarios por tarea)
CREATE TABLE IF NOT EXISTS tasks_schema.task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks_schema.tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    assigned_by INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'assigned', -- 'assigned', 'accepted', 'rejected', 'completed'
    UNIQUE(task_id, user_id)
);

-- Tabla mejorada de archivos adjuntos a tareas
CREATE TABLE IF NOT EXISTS tasks_schema.task_files (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks_schema.tasks(id) ON DELETE CASCADE,
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

-- ========================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ========================================

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_users_email ON users_schema.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users_schema.users(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON users_schema.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON users_schema.user_sessions(user_id);

-- Índices para tareas
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks_schema.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks_schema.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks_schema.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks_schema.tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks_schema.tasks(is_recurring);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks_schema.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON tasks_schema.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON tasks_schema.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON tasks_schema.task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON tasks_schema.task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_task_files_storage_type ON tasks_schema.task_files(storage_type);

-- ========================================
-- DATOS DE EJEMPLO
-- ========================================

-- Insertar roles familiares
INSERT INTO users_schema.family_roles (role_name, description, permissions) 
VALUES 
    ('Jefe del hogar', 'Administrador principal de la casa con todos los permisos', '{"admin": true, "create_tasks": true, "assign_tasks": true, "manage_users": true, "view_all": true}'),
    ('Miembro', 'Miembro de la familia con permisos limitados', '{"admin": false, "create_tasks": false, "assign_tasks": false, "manage_users": false, "view_all": false}')
ON CONFLICT (role_name) DO NOTHING;

-- Insertar sub-roles para miembros
INSERT INTO users_schema.family_sub_roles (role_id, sub_role_name, description) 
VALUES 
    (2, 'Mamá', 'Madre de familia'),
    (2, 'Papá', 'Padre de familia'),
    (2, 'Hijo', 'Hijo varón de la familia'),
    (2, 'Hija', 'Hija mujer de la familia')
ON CONFLICT (role_id, sub_role_name) DO NOTHING;

-- Insertar usuarios de ejemplo
INSERT INTO users_schema.users (username, email, password_hash, first_name, last_name, family_role_id, family_sub_role_id, birth_date) 
VALUES 
    -- Padres como jefes del hogar
    ('mama_garcia', 'maria.garcia@smarthome.com', '$2b$10$example_hash', 'María', 'García', 1, NULL, '1985-03-15'),
    ('papa_garcia', 'carlos.garcia@smarthome.com', '$2b$10$example_hash', 'Carlos', 'García', 1, NULL, '1983-07-22'),
    
    -- Hijos
    ('luis_garcia', 'luis.garcia@smarthome.com', '$2b$10$example_hash', 'Luis', 'García', 2, 3, '2010-09-12'),
    ('pedro_garcia', 'pedro.garcia@smarthome.com', '$2b$10$example_hash', 'Pedro', 'García', 2, 3, '2012-11-08'),
    ('miguel_garcia', 'miguel.garcia@smarthome.com', '$2b$10$example_hash', 'Miguel', 'García', 2, 3, '2015-04-25'),
    
    -- Hijas
    ('ana_garcia', 'ana.garcia@smarthome.com', '$2b$10$example_hash', 'Ana', 'García', 2, 4, '2008-12-03'),
    ('sofia_garcia', 'sofia.garcia@smarthome.com', '$2b$10$example_hash', 'Sofía', 'García', 2, 4, '2013-06-18')
ON CONFLICT (email) DO NOTHING;

-- Preferencias de usuario
INSERT INTO users_schema.user_preferences (user_id, theme, language) 
VALUES 
    (1, 'light', 'es'), -- María
    (2, 'dark', 'es'),  -- Carlos
    (3, 'light', 'es'), -- Luis
    (4, 'light', 'es'), -- Pedro
    (5, 'light', 'es'), -- Miguel
    (6, 'light', 'es'), -- Ana
    (7, 'light', 'es')  -- Sofía
ON CONFLICT DO NOTHING;

-- Tareas de ejemplo con períodos y asignaciones
INSERT INTO tasks_schema.tasks (user_id, title, description, status, priority, category, due_date, is_recurring, recurrence_type, recurrence_interval, recurrence_days) 
VALUES 
    (1, 'Limpiar la cocina', 'Limpiar y organizar toda la cocina después de las comidas', 'pending', 'high', 'limpieza', '2024-01-15 20:00:00', true, 'daily', 1, '[1,2,3,4,5,6,7]'),
    (2, 'Revisar tareas escolares', 'Supervisar que los niños hagan sus tareas', 'in_progress', 'high', 'educacion', '2024-01-15 19:00:00', true, 'weekly', 1, '[1,2,3,4,5]'),
    (1, 'Compras del supermercado', 'Hacer las compras semanales de la familia', 'pending', 'medium', 'compras', '2024-01-20 10:00:00', true, 'weekly', 1, '[6]'),
    (3, 'Organizar cuarto', 'Mantener el cuarto ordenado y limpio', 'pending', 'medium', 'limpieza', '2024-01-16 18:00:00', false, NULL, NULL, NULL),
    (6, 'Ayudar en la cocina', 'Ayudar a preparar la cena familiar', 'pending', 'low', 'cocina', '2024-01-15 17:30:00', false, NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- Asignaciones de tareas (tarea con 2 hijos/hijas)
INSERT INTO tasks_schema.task_assignments (task_id, user_id, assigned_by, status) 
VALUES 
    (4, 3, 1, 'assigned'), -- Luis asignado a "Organizar cuarto" por María
    (4, 4, 1, 'assigned'), -- Pedro asignado a "Organizar cuarto" por María
    (5, 6, 1, 'accepted'), -- Ana asignada a "Ayudar en la cocina" por María
    (5, 7, 1, 'accepted'), -- Sofía asignada a "Ayudar en la cocina" por María
    (2, 3, 2, 'assigned'), -- Luis asignado a "Revisar tareas escolares" por Carlos
    (2, 4, 2, 'assigned')  -- Pedro asignado a "Revisar tareas escolares" por Carlos
ON CONFLICT DO NOTHING;

-- Subtareas de ejemplo
INSERT INTO tasks_schema.subtasks (task_id, title, is_completed) 
VALUES 
    (1, 'Lavar platos y utensilios', false),
    (1, 'Limpiar superficies y mesones', false),
    (1, 'Organizar despensa', false),
    (2, 'Revisar matemáticas de Luis', true),
    (2, 'Revisar ciencias de Pedro', false),
    (2, 'Ayudar con proyecto de Ana', false),
    (3, 'Hacer lista de compras', true),
    (3, 'Ir al supermercado', false),
    (3, 'Organizar compras en casa', false)
ON CONFLICT DO NOTHING;

-- Archivos de ejemplo asociados a tareas
INSERT INTO tasks_schema.task_files (task_id, file_name, file_path, file_type, mime_type, uploaded_by, storage_type, is_image) 
VALUES 
    (2, 'horario_tareas_escolares.pdf', '/uploads/documents/horario_tareas_escolares.pdf', 'pdf', 'application/pdf', 2, 'local', false),
    (2, 'foto_tarea_luis.jpg', '/uploads/images/foto_tarea_luis.jpg', 'jpg', 'image/jpeg', 3, 'local', true),
    (3, 'lista_compras_enero.txt', '/uploads/documents/lista_compras_enero.txt', 'txt', 'text/plain', 1, 'local', false),
    (4, 'antes_organizacion.jpg', '/uploads/images/antes_organizacion.jpg', 'jpg', 'image/jpeg', 3, 'local', true),
    (5, 'receta_cena_familiar.pdf', '/uploads/documents/receta_cena_familiar.pdf', 'pdf', 'application/pdf', 6, 'local', false)
ON CONFLICT DO NOTHING;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos Smart Home configurada exitosamente!';
    RAISE NOTICE 'Esquemas creados: users_schema, tasks_schema';
    RAISE NOTICE 'Sistema de roles familiares implementado:';
    RAISE NOTICE '  - Jefe del hogar: María y Carlos García';
    RAISE NOTICE '  - Miembros: 3 hijos (Luis, Pedro, Miguel) y 2 hijas (Ana, Sofía)';
    RAISE NOTICE 'Funcionalidades de tareas:';
    RAISE NOTICE '  - Tareas recurrentes con períodos configurables';
    RAISE NOTICE '  - Asignación múltiple de usuarios por tarea';
    RAISE NOTICE '  - Gestión de archivos con integración Google Drive';
    RAISE NOTICE 'Las notificaciones se manejan con Redis';
END $$;