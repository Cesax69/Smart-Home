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
-- (Eliminado) Sub-roles ya no se utilizan; solo se conserva family_roles

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
    birth_date DATE,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sesiones de usuario
-- (Eliminado) Tabla user_sessions no se utiliza en el nuevo esquema

-- Tabla de configuraciones de usuario
-- (Eliminado) Tabla user_preferences no se utiliza en el nuevo esquema

-- ========================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ========================================

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
-- (Eliminado) Índices de user_sessions

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
-- (Eliminado) Sub-roles

<<<<<<< HEAD
-- Insertar usuarios iniciales (familia)
INSERT INTO users (username, email, password_hash, first_name, last_name, family_role_id, birth_date) 
VALUES 
    -- Papá (jefe del hogar)
    ('papa', 'papa@smarthome.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carlos', 'Gómez', 1, '1980-05-12'),
    -- Mamá (miembro)
    ('mama', 'mama@smarthome.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'María', 'Gómez', 2, '1982-08-22'),
    -- Hijo (miembro)
    ('hijo1', 'hijo1@smarthome.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Luis', 'Gómez', 2, '2010-03-15'),
    -- Hija (miembro)
    ('hija1', 'hija1@smarthome.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sofía', 'Gómez', 2, '2012-07-19'),
    -- Hijo (miembro)
    ('hijo2', 'hijo2@smarthome.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Pedro', 'Gómez', 2, '2014-11-02')
ON CONFLICT (email) DO NOTHING;

-- Insertar familia solicitada: papá (jefe), mamá y 3 hijos
-- (Eliminado) Bloque duplicado de inserción de usuarios

-- Preferencias de usuario para la familia
-- (Eliminado) Preferencias de usuario

-- Preferencias para nuevos usuarios de la familia
-- (Eliminado) Preferencias de usuario
=======
-- Sin usuarios de ejemplo pre-cargados
>>>>>>> cegg

-- Mensaje de confirmación
DO $$
BEGIN
<<<<<<< HEAD
    RAISE NOTICE 'Base de datos de Usuarios Smart Home configurada exitosamente!';
    RAISE NOTICE 'Sistema de roles familiares implementado:';
    RAISE NOTICE 'Usuarios iniciales creados (familia):';
    RAISE NOTICE '  - Papá: papa/password';
    RAISE NOTICE '  - Mamá: mama/password';
    RAISE NOTICE '  - Hijo: hijo1/password';
    RAISE NOTICE '  - Hija: hija1/password';
    RAISE NOTICE '  - Hijo: hijo2/password';
    RAISE NOTICE 'Total de usuarios creados: 5';
=======
    RAISE NOTICE 'Base de datos de Usuarios Smart Home configurada exitosamente (sin datos de ejemplo).';
    RAISE NOTICE 'Roles y sub-roles familiares de base creados si no existían.';
    RAISE NOTICE 'No se insertaron usuarios ni preferencias por defecto.';
>>>>>>> cegg
END $$;