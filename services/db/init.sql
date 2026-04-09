-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ảnh đính kèm tin nhắn user (JSON array: [{ "mimeType", "data" }] base64)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Generated Images
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT,
  storage_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_images_session ON images(session_id);

-- ============================================
-- Auth Schema Updates (OAuth2 + JWT)
-- ============================================

-- Add OAuth columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Add unique constraint for provider+provider_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_id
  ON users(provider, provider_id) WHERE provider_id IS NOT NULL;

-- User mặc định id=1 (seed items). Mật khẩu admin thật khi chạy Docker: đặt ADMIN_EMAIL / ADMIN_PASSWORD
-- trong .env cạnh docker-compose.yml — backend sẽ ghi đè hash khi khởi động.
-- Dòng dưới: bcrypt mẫu (Admin123!) nếu chưa có .env.
INSERT INTO users (email, password_hash, name, provider, email_verified)
VALUES (
  'admin@localhost',
  '$2b$12$qx9Yj8H.7wm.1ssHZbv/Ru6fvmZCc/ARJe9tVVngpCHDBH3QJ2a7S',
  'Administrator',
  'email',
  TRUE
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  email_verified = EXCLUDED.email_verified;

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  jti VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ============================================
-- Items (Subscription Tools/Services)
-- ============================================

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon_url TEXT NOT NULL,
  home_url TEXT,
  description TEXT,
  expiry_date TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  category VARCHAR(30) NOT NULL DEFAULT 'ai_chatbot',
  available_actions JSONB NOT NULL DEFAULT '["open"]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for items
CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

-- Một user không có hai dòng cùng tên dịch vụ (tránh trùng gói).
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_user_name ON items (user_id, name);

-- ============================================
-- Seed Data: Subscription Items
-- ============================================

-- Admin & usage (users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_token_limit INTEGER;

UPDATE users SET is_admin = TRUE WHERE email = 'admin@localhost';

INSERT INTO items (user_id, name, icon_url, home_url, description, expiry_date, status, category, available_actions) VALUES
  (1, 'Claude Pro', '/static/claude-ai-icon.png', 'https://claude.ai', 'Advanced AI assistant by Anthropic', '2025-02-09', 'active', 'ai_chatbot', '["open", "renew"]'),
  (1, 'ChatGPT Team', '/static/chatgpt-icon.png', 'https://chat.openai.com', 'OpenAI ChatGPT for teams collaboration', '2025-08-24', 'active', 'ai_chatbot', '["open", "renew"]'),
  (1, 'Copilot Pro', '/static/copilot-icon.png', 'https://copilot.microsoft.com', 'Microsoft Copilot Pro for productivity', '2025-09-24', 'active', 'ai_chatbot', '["open", "renew"]'),
  (1, 'Gemini Advanced', '/static/google-gemini-icon.png', 'https://gemini.google.com', 'Google Gemini Advanced AI model', '2025-02-09', 'active', 'ai_chatbot', '["open", "renew"]'),
  (1, 'Super Grok', '/static/grok-icon.png', 'https://grok.com', 'xAI Grok AI assistant', '2025-06-24', 'active', 'ai_chatbot', '["open", "renew"]')
ON CONFLICT (user_id, name) DO NOTHING;
