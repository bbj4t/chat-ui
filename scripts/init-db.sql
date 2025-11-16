-- Database initialization script for Neon PostgreSQL
-- This creates all necessary tables and provides seed data

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT,
    hf_user_id VARCHAR(255) UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_early_access BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_hf_user_id ON users(hf_user_id);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    assistants JSONB DEFAULT '[]'::jsonb,
    settings_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    UNIQUE(session_id)
);

-- Assistants table
CREATE TABLE IF NOT EXISTS assistants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by_id VARCHAR(255) NOT NULL, -- Can be user id or session
    created_by_name VARCHAR(255),
    avatar TEXT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    model_id VARCHAR(255) NOT NULL,
    example_inputs JSONB DEFAULT '[]'::jsonb,
    preprompt TEXT,
    user_count INTEGER DEFAULT 0,
    review VARCHAR(50) DEFAULT 'pending',
    generate_settings JSONB,
    dynamic_prompt BOOLEAN DEFAULT FALSE,
    search_tokens TEXT[],
    last_24_hours_count INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    last_24_hours_use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assistants_created_by_id ON assistants(created_by_id);
CREATE INDEX IF NOT EXISTS idx_assistants_model_id ON assistants(model_id);
CREATE INDEX IF NOT EXISTS idx_assistants_review ON assistants(review);
CREATE INDEX IF NOT EXISTS idx_assistants_search_tokens ON assistants USING GIN(search_tokens);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    model VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    root_message_id UUID,
    messages JSONB DEFAULT '[]'::jsonb,
    meta JSONB,
    preprompt TEXT,
    assistant_id UUID REFERENCES assistants(id) ON DELETE SET NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_assistant_id ON conversations(assistant_id);

-- Shared conversations table
CREATE TABLE IF NOT EXISTS shared_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    hash VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500),
    model VARCHAR(255),
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shared_conversations_hash ON shared_conversations(hash);

-- Aborted generations table
CREATE TABLE IF NOT EXISTS aborted_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID UNIQUE NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Message events table
CREATE TABLE IF NOT EXISTS message_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID,
    event_type VARCHAR(50),
    event_data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_events_expires_at ON message_events(expires_at);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_assistant_id ON reports(assistant_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);

-- Conversation stats table
CREATE TABLE IF NOT EXISTS conversation_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    date_field VARCHAR(50) NOT NULL,
    date_span VARCHAR(50) NOT NULL,
    date_at TIMESTAMP WITH TIME ZONE NOT NULL,
    distinct VARCHAR(255) NOT NULL,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, date_field, date_span, date_at, distinct)
);

CREATE INDEX IF NOT EXISTS idx_conversation_stats_type ON conversation_stats(type, date_field, date_at);

-- Assistant stats table
CREATE TABLE IF NOT EXISTS assistant_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
    date_span VARCHAR(50) NOT NULL,
    date_at TIMESTAMP WITH TIME ZONE NOT NULL,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date_span, date_at, assistant_id)
);

-- Semaphores table
CREATE TABLE IF NOT EXISTS semaphores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    delete_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_semaphores_delete_at ON semaphores(delete_at);

-- Token cache table
CREATE TABLE IF NOT EXISTS token_caches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255),
    token_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_caches_token_hash ON token_caches(token_hash);
CREATE INDEX IF NOT EXISTS idx_token_caches_created_at ON token_caches(created_at);

-- Migration results table
CREATE TABLE IF NOT EXISTS migration_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tools table (for MCP and other tools)
CREATE TABLE IF NOT EXISTS tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Config table
CREATE TABLE IF NOT EXISTS config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Automated messaging agents table
CREATE TABLE IF NOT EXISTS messaging_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'telegram', 'instagram', 'whatsapp', etc.
    api_token TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messaging_agents_platform ON messaging_agents(platform);
CREATE INDEX IF NOT EXISTS idx_messaging_agents_is_active ON messaging_agents(is_active);

-- Agent logs table
CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES messaging_agents(id) ON DELETE CASCADE,
    log_type VARCHAR(50) NOT NULL, -- 'info', 'error', 'message_sent', 'message_received'
    log_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id ON agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_log_type ON agent_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at);

-- Files metadata table (for file uploads and storage)
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(500) NOT NULL,
    content_type VARCHAR(255),
    size BIGINT,
    data BYTEA,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_conversation_id ON files(conversation_id);

-- Insert seed data for testing

-- Insert dummy users
INSERT INTO users (username, name, email, hf_user_id, is_admin, avatar_url) VALUES
    ('admin', 'Admin User', 'admin@example.com', 'hf_admin_001', TRUE, 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'),
    ('alice', 'Alice Johnson', 'alice@example.com', 'hf_user_001', FALSE, 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice'),
    ('bob', 'Bob Smith', 'bob@example.com', 'hf_user_002', FALSE, 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob'),
    ('charlie', 'Charlie Brown', 'charlie@example.com', 'hf_user_003', FALSE, 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie')
ON CONFLICT (hf_user_id) DO NOTHING;

-- Insert dummy assistants
INSERT INTO assistants (created_by_id, created_by_name, name, description, model_id, example_inputs, preprompt, review, user_count) VALUES
    ('hf_admin_001', 'admin', 'Code Helper', 'An assistant specialized in helping with code and programming questions', 'meta-llama/Meta-Llama-3.1-8B-Instruct', '["How do I write a function in Python?", "Explain async/await in JavaScript"]'::jsonb, 'You are a helpful coding assistant. Help users with their programming questions.', 'approved', 150),
    ('hf_admin_001', 'admin', 'Creative Writer', 'An assistant that helps with creative writing and storytelling', 'mistralai/Mistral-7B-Instruct-v0.2', '["Write a short story about a dragon", "Help me brainstorm ideas for my novel"]'::jsonb, 'You are a creative writing assistant. Help users with their stories and creative content.', 'approved', 89),
    ('hf_user_001', 'alice', 'Math Tutor', 'An assistant specialized in mathematics and problem-solving', 'microsoft/Phi-3-mini-4k-instruct', '["Help me solve this equation", "Explain calculus basics"]'::jsonb, 'You are a mathematics tutor. Help users understand and solve mathematical problems.', 'approved', 67)
ON CONFLICT DO NOTHING;

-- Insert dummy messaging agents
INSERT INTO messaging_agents (name, platform, api_token, config, is_active) VALUES
    ('Telegram Bot 1', 'telegram', 'bot_token_placeholder_telegram', '{"webhook_url": "https://example.com/webhook/telegram", "commands": ["/start", "/help"]}'::jsonb, TRUE),
    ('Instagram Bot 1', 'instagram', 'bot_token_placeholder_instagram', '{"webhook_url": "https://example.com/webhook/instagram", "auto_reply": true}'::jsonb, TRUE),
    ('WhatsApp Bot 1', 'whatsapp', 'bot_token_placeholder_whatsapp', '{"webhook_url": "https://example.com/webhook/whatsapp", "business_id": "example_business"}'::jsonb, FALSE)
ON CONFLICT DO NOTHING;

-- Insert dummy conversations
DO $$
DECLARE
    user_alice_id UUID;
    user_bob_id UUID;
    assistant_code_id UUID;
    conv_id_1 UUID;
    conv_id_2 UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO user_alice_id FROM users WHERE username = 'alice' LIMIT 1;
    SELECT id INTO user_bob_id FROM users WHERE username = 'bob' LIMIT 1;
    SELECT id INTO assistant_code_id FROM assistants WHERE name = 'Code Helper' LIMIT 1;
    
    -- Insert conversations
    INSERT INTO conversations (user_id, model, title, messages, assistant_id)
    VALUES 
        (user_alice_id, 'meta-llama/Meta-Llama-3.1-8B-Instruct', 'Python Tutorial Discussion', 
         '[{"id": "msg_001", "from": "user", "content": "How do I create a list in Python?", "createdAt": "2024-01-15T10:00:00Z"}, 
           {"id": "msg_002", "from": "assistant", "content": "In Python, you can create a list using square brackets. For example: my_list = [1, 2, 3, 4, 5]", "createdAt": "2024-01-15T10:00:05Z"}]'::jsonb,
         assistant_code_id)
    RETURNING id INTO conv_id_1;
    
    INSERT INTO conversations (user_id, model, title, messages)
    VALUES 
        (user_bob_id, 'mistralai/Mistral-7B-Instruct-v0.2', 'General Chat', 
         '[{"id": "msg_003", "from": "user", "content": "What is machine learning?", "createdAt": "2024-01-16T14:30:00Z"}, 
           {"id": "msg_004", "from": "assistant", "content": "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.", "createdAt": "2024-01-16T14:30:10Z"}]'::jsonb);
END $$;

-- Insert some agent logs
DO $$
DECLARE
    telegram_agent_id UUID;
BEGIN
    SELECT id INTO telegram_agent_id FROM messaging_agents WHERE platform = 'telegram' LIMIT 1;
    
    INSERT INTO agent_logs (agent_id, log_type, log_data)
    VALUES 
        (telegram_agent_id, 'message_received', '{"user": "telegram_user_123", "message": "Hello bot!", "timestamp": "2024-01-15T10:00:00Z"}'::jsonb),
        (telegram_agent_id, 'message_sent', '{"user": "telegram_user_123", "message": "Hello! How can I help you?", "timestamp": "2024-01-15T10:00:02Z"}'::jsonb);
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistants_updated_at BEFORE UPDATE ON assistants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shared_conversations_updated_at BEFORE UPDATE ON shared_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aborted_generations_updated_at BEFORE UPDATE ON aborted_generations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON tools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messaging_agents_updated_at BEFORE UPDATE ON messaging_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
