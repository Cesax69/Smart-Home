-- Configuración de la base de datos de Usuarios Smart Home
-- Base de datos dedicada para gestión de usuarios y roles familiares

-- ========================================
-- ESQUEMA DE USUARIOS
-- ========================================

-- Tabla de roles familiares
CREATE TABLE IF NOT EXISTS family_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sub-roles (para diferenciar miembros de la familia)
CREATE TABLE IF NOT EXISTS family_sub_roles (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES family_roles(id) ON DELETE CASCADE,
    sub_role_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, sub_role_name)
);

-- Tabla de usuarios mejorada
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    family_role_id INTEGER REFERENCES family_roles(id),
    family_sub_role_id INTEGER REFERENCES family_sub_roles(id),
    birth_date DATE,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sesiones de usuario
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuraciones de usuario
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ========================================

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- ========================================
-- DATOS DE EJEMPLO - USUARIOS
-- ========================================

-- Insertar roles familiares
INSERT INTO family_roles (role_name, description, permissions) 
VALUES 
    ('Jefe del hogar', 'Administrador principal de la casa con todos los permisos', '{"admin": true, "create_tasks": true, "assign_tasks": true, "manage_users": true, "view_all": true}'),
    ('Miembro', 'Miembro de la familia con permisos limitados', '{"admin": false, "create_tasks": false, "assign_tasks": false, "manage_users": false, "view_all": false}')
ON CONFLICT (role_name) DO NOTHING;

-- Insertar sub-roles para miembros
INSERT INTO family_sub_roles (role_id, sub_role_name, description) 
VALUES 
    (2, 'Mamá', 'Madre de familia'),
    (2, 'Papá', 'Padre de familia'),
    (2, 'Hijo', 'Hijo varón de la familia'),
    (2, 'Hija', 'Hija mujer de la familia')
ON CONFLICT (role_id, sub_role_name) DO NOTHING;

-- Sin usuarios de ejemplo pre-cargados

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos de Usuarios Smart Home configurada exitosamente (sin datos de ejemplo).';
    RAISE NOTICE 'Roles y sub-roles familiares de base creados si no existían.';
    RAISE NOTICE 'No se insertaron usuarios ni preferencias por defecto.';
END $$;