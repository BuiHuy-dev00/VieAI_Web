-- Chạy một lần trên DB đã tồn tại (trước đó chưa có cột):
--   psql -U postgres -d chat_db -f migration_message_attachments.sql

ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
