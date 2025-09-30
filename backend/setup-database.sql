-- Configuración de la base de datos Smart Home
-- Solo esquemas para Users y Tasks (Redis maneja notificaciones)

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

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users_schema.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(20) DEFAULT 'user',
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

-- Tabla de tareas
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

-- Tabla de archivos adjuntos a tareas (solo metadata)
CREATE TABLE IF NOT EXISTS tasks_schema.task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks_schema.tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    uploaded_by INTEGER NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON tasks_schema.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON tasks_schema.task_attachments(task_id);

-- ========================================
-- DATOS DE EJEMPLO
-- ========================================

-- Usuario de ejemplo
INSERT INTO users_schema.users (username, email, password_hash, first_name, last_name, role) 
VALUES 
    ('admin', 'admin@smarthome.com', '$2b$10$example_hash', 'Admin', 'User', 'admin'),
    ('usuario1', 'usuario1@smarthome.com', '$2b$10$example_hash', 'Juan', 'Pérez', 'user')
ON CONFLICT (email) DO NOTHING;

-- Preferencias de usuario
INSERT INTO users_schema.user_preferences (user_id, theme, language) 
VALUES 
    (1, 'dark', 'es'),
    (2, 'light', 'es')
ON CONFLICT DO NOTHING;

-- Tareas de ejemplo
INSERT INTO tasks_schema.tasks (user_id, title, description, status, priority, category) 
VALUES 
    (1, 'Configurar sistema de iluminación', 'Instalar y configurar luces inteligentes en toda la casa', 'in_progress', 'high', 'iluminacion'),
    (1, 'Revisar sensores de temperatura', 'Verificar el funcionamiento de todos los sensores', 'pending', 'medium', 'sensores'),
    (2, 'Actualizar aplicación móvil', 'Descargar la última versión de la app', 'completed', 'low', 'software')
ON CONFLICT DO NOTHING;

-- Subtareas de ejemplo
INSERT INTO tasks_schema.subtasks (task_id, title, is_completed) 
VALUES 
    (1, 'Comprar luces LED inteligentes', true),
    (1, 'Instalar luces en sala', false),
    (1, 'Configurar automatización', false),
    (2, 'Revisar sensor cocina', false),
    (2, 'Revisar sensor dormitorio', false)
ON CONFLICT DO NOTHING;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos Smart Home configurada exitosamente!';
    RAISE NOTICE 'Esquemas creados: users_schema, tasks_schema';
    RAISE NOTICE 'Las notificaciones se manejan con Redis';
    RAISE NOTICE 'Los archivos se almacenan localmente';
END $$;