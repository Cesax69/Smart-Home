-- Migration: Add task_comments table
-- Created: 2024-01-15
-- Description: Add table for storing comments on tasks

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

-- Índice para optimizar consultas por task_id
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

-- Índice para optimizar consultas por created_by
CREATE INDEX IF NOT EXISTS idx_task_comments_created_by ON task_comments(created_by);

-- Índice para optimizar consultas por fecha de creación
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);