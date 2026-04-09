-- ============================================
-- Seed Data: Subscription Items
-- ============================================

-- Insert items (using user_id=1 for default test user)
INSERT INTO items (id, user_id, name, icon_url, home_url, description, expiry_date, status, category, available_actions) VALUES
  (
    gen_random_uuid(),
    1,
    'Copy.ai Pro',
    '/static/icons/copyai.svg',
    'https://www.copy.ai',
    'AI-powered copywriting tool for marketing content',
    '2025-03-15 00:00:00',
    'active',
    'ai_chatbot',
    '["open", "renew"]'
  ),
  (
    gen_random_uuid(),
    1,
    'Writesonic Individual',
    '/static/icons/writesonic.svg',
    'https://writesonic.com',
    'AI writing assistant for blogs and articles',
    '2025-02-20 00:00:00',
    'active',
    'ai_chatbot',
    '["open", "renew"]'
  ),
  (
    gen_random_uuid(),
    1,
    'Claude Pro',
    '/static/icons/claude.svg',
    'https://claude.ai',
    'Advanced AI assistant by Anthropic',
    '2025-02-09 00:00:00',
    'active',
    'ai_chatbot',
    '["open", "renew"]'
  ),
  (
    gen_random_uuid(),
    1,
    'ChatGPT Team',
    '/static/icons/chatgpt.svg',
    'https://chat.openai.com',
    'OpenAI ChatGPT for teams collaboration',
    '2025-08-24 00:00:00',
    'active',
    'ai_chatbot',
    '["open", "renew"]'
  ),
  (
    gen_random_uuid(),
    1,
    'Monica Unlimited',
    '/static/icons/monica.svg',
    'https://monica.im',
    'All-in-one AI assistant browser extension',
    '2025-06-24 00:00:00',
    'active',
    'ai_chatbot',
    '["open", "renew"]'
  ),
  (
    gen_random_uuid(),
    1,
    'Copilot Pro',
    '/static/icons/copilot.svg',
    'https://copilot.microsoft.com',
    'Microsoft Copilot Pro for productivity',
    '2025-09-24 00:00:00',
    'active',
    'ai_chatbot',
    '["open", "renew"]'
  ),
  (
    gen_random_uuid(),
    1,
    'Gemini Advanced',
    '/static/icons/gemini.svg',
    'https://gemini.google.com',
    'Google Gemini Advanced AI model',
    '2025-02-09 00:00:00',
    'active',
    'ai_chatbot',
    '["open", "renew"]'
  ),
  (
    gen_random_uuid(),
    1,
    'Scribd Premium',
    '/static/icons/scribd.svg',
    'https://www.scribd.com',
    'Unlimited access to books, audiobooks, and documents',
    '2025-09-24 00:00:00',
    'active',
    'study',
    '["open", "renew"]'
  )
ON CONFLICT DO NOTHING;
