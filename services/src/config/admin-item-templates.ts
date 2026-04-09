import type { CreateItemRequest } from '../types/item-types';

/**
 * Dịch vụ có sẵn khi admin thêm cho user (đồng bộ tên với UI VieGPT GO/PLUS/PRO).
 */
export const ADMIN_ITEM_TEMPLATES: Record<string, CreateItemRequest> = {
  viegpt_go: {
    name: 'CHATGPT VIEAI - GO',
    icon_url: '/static/chatgpt-icon.png',
    home_url: 'https://chat.openai.com',
    description: 'ChatGPT VieAI — gói GO',
    status: 'active',
    category: 'ai_chatbot',
    available_actions: ['open', 'renew'],
  },
  viegpt_plus: {
    name: 'CHATGPT VIEAI - PLUS',
    icon_url: '/static/chatgpt-icon.png',
    home_url: 'https://chat.openai.com',
    description: 'ChatGPT VieAI — gói PLUS',
    status: 'active',
    category: 'ai_chatbot',
    available_actions: ['open', 'renew'],
  },
  viegpt_pro: {
    name: 'CHATGPT VIEAI - PRO',
    icon_url: '/static/chatgpt-icon.png',
    home_url: 'https://chat.openai.com',
    description: 'ChatGPT VieAI — gói PRO',
    status: 'active',
    category: 'ai_chatbot',
    available_actions: ['open', 'renew'],
  },
};

export function listAdminTemplateIds(): string[] {
  return Object.keys(ADMIN_ITEM_TEMPLATES);
}
