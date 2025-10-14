-- Configuración de la base de datos de Notificaciones Smart Home
-- Base de datos dedicada para gestión de notificaciones persistentes

-- ========================================
-- ESQUEMA DE NOTIFICACIONES
-- ========================================

-- Crear esquema de notificaciones si no existe
CREATE SCHEMA IF NOT EXISTS notifications_schema;

-- Otorgar permisos al usuario postgres
GRANT ALL PRIVILEGES ON SCHEMA notifications_schema TO postgres;

-- Tabla principal de notificaciones
CREATE TABLE IF NOT EXISTS notifications_schema.notifications (
    id SERIAL PRIMARY KEY,
    notification_id VARCHAR(255) UNIQUE NOT NULL, -- ID único de la notificación
    user_id INTEGER NOT NULL, -- ID del usuario que recibe la notificación
    type VARCHAR(50) NOT NULL, -- 'task_completed', 'task_assigned', 'task_reminder', 'system_alert'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}', -- Datos adicionales como taskData, comments, files, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- Fecha de expiración opcional
);

-- Tabla de historial de notificaciones (para auditoría)
CREATE TABLE IF NOT EXISTS notifications_schema.notification_history (
    id SERIAL PRIMARY KEY,
    notification_id VARCHAR(255) NOT NULL,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'created', 'read', 'deleted', 'expired'
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Tabla de configuraciones de notificaciones por usuario
CREATE TABLE IF NOT EXISTS notifications_schema.user_notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    whatsapp_notifications BOOLEAN DEFAULT false,
    notification_frequency VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'hourly', 'daily'
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '07:00:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ========================================

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications_schema.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications_schema.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications_schema.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications_schema.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications_schema.notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_notification_id ON notifications_schema.notifications(notification_id);

-- Índices para historial
CREATE INDEX IF NOT EXISTS idx_notification_history_notification_id ON notifications_schema.notification_history(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notifications_schema.notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_performed_at ON notifications_schema.notification_history(performed_at);

-- Índices para configuraciones
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON notifications_schema.user_notification_settings(user_id);

-- ========================================
-- FUNCIONES Y TRIGGERS
-- ========================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION notifications_schema.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en notificaciones
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications_schema.notifications 
    FOR EACH ROW EXECUTE FUNCTION notifications_schema.update_updated_at_column();

-- Trigger para actualizar updated_at en configuraciones
CREATE TRIGGER update_user_notification_settings_updated_at 
    BEFORE UPDATE ON notifications_schema.user_notification_settings 
    FOR EACH ROW EXECUTE FUNCTION notifications_schema.update_updated_at_column();

-- Función para crear entrada en historial automáticamente
CREATE OR REPLACE FUNCTION notifications_schema.create_notification_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications_schema.notification_history (notification_id, user_id, action, metadata)
        VALUES (NEW.notification_id, NEW.user_id, 'created', '{}');
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Si se marca como leída
        IF OLD.is_read = false AND NEW.is_read = true THEN
            INSERT INTO notifications_schema.notification_history (notification_id, user_id, action, metadata)
            VALUES (NEW.notification_id, NEW.user_id, 'read', '{}');
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notifications_schema.notification_history (notification_id, user_id, action, metadata)
        VALUES (OLD.notification_id, OLD.user_id, 'deleted', '{}');
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger para crear historial automáticamente
CREATE TRIGGER notification_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON notifications_schema.notifications
    FOR EACH ROW EXECUTE FUNCTION notifications_schema.create_notification_history();

-- ========================================
-- Sin datos de ejemplo por defecto. Las configuraciones de notificaciones
-- se crearán dinámicamente la primera vez que el usuario ajuste preferencias
-- o cuando el servicio de notificaciones las inicialice.

-- Función para limpiar notificaciones expiradas (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION notifications_schema.cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications_schema.notifications 
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % expired notifications', deleted_count;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Función para obtener notificaciones de un usuario con paginación
CREATE OR REPLACE FUNCTION notifications_schema.get_user_notifications(
    p_user_id INTEGER,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id INTEGER,
    notification_id VARCHAR(255),
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.notification_id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.metadata,
        n.created_at,
        n.updated_at
    FROM notifications_schema.notifications n
    WHERE n.user_id = p_user_id
        AND (NOT p_unread_only OR n.is_read = false)
        AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ language 'plpgsql';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos de Notificaciones Smart Home configurada exitosamente!';
    RAISE NOTICE 'Esquema creado: notifications_schema';
    RAISE NOTICE 'Funcionalidades implementadas:';
    RAISE NOTICE '  - Persistencia de notificaciones en base de datos';
    RAISE NOTICE '  - Historial de acciones de notificaciones';
    RAISE NOTICE '  - Configuraciones personalizables por usuario';
    RAISE NOTICE '  - Limpieza automática de notificaciones expiradas';
    RAISE NOTICE '  - Triggers para auditoría automática';
    RAISE NOTICE 'Sin datos de ejemplo: las configuraciones se crearán dinámicamente.';
END $$;