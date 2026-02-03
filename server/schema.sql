-- JustPlanner Database Schema
-- Run this script to create the database tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255),
    registration_source VARCHAR(255),
    registration_campaign VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    column_id VARCHAR(50) NOT NULL,
    hour INTEGER,
    color VARCHAR(20) DEFAULT 'default',
    completed BOOLEAN DEFAULT FALSE,
    subtasks JSONB DEFAULT '[]',
    recurrence_type VARCHAR(20),
    recurrence_interval INTEGER DEFAULT 1,
    recurrence_end_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
