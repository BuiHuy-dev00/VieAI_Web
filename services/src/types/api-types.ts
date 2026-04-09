/**
 * API Request/Response Types for tsoa Controllers
 *
 * Note: Auth types are in auth-types.ts
 */

// ============================================
// Common Types
// ============================================

/**
 * Standard API response wrapper
 * @deprecated tsoa returns data directly - kept for reference
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// ============================================
// Chat Session Types
// ============================================

export interface Session {
  id: string;
  user_id: number;
  title: string;
  created_at: Date;
  updated_at: Date;
  /** Số tin nhắn trong session (chỉ có trong GET /sessions) */
  message_count?: number;
}

/** Ảnh kèm tin (lưu trong DB, base64 không prefix) */
export interface MessageAttachment {
  mimeType: string;
  data: string;
}

export interface Message {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Ảnh người dùng gửi kèm (vision) */
  attachments?: MessageAttachment[];
  image_data?: string;
  tokens_used?: number;
  created_at: Date;
}

export interface SessionImage {
  id: string;
  prompt: string;
  image_url: string;
}

export interface SessionWithMessages extends Session {
  messages: Message[];
  images: SessionImage[];
}

// ============================================
// Chat Request Types
// ============================================

export interface CreateSessionRequest {
  /**
   * Optional session title
   * @default "Đoạn chat mới"
   */
  title?: string;
}

export interface SendMessageRequest {
  /**
   * Nội dung tin (có thể rỗng nếu chỉ gửi ảnh)
   */
  message?: string;
  /**
   * Ảnh kèm tin (base64, không prefix); OpenAI vision
   */
  images?: MessageAttachment[];
  /**
   * Enable streaming response
   * @default true
   */
  stream?: boolean;
  /**
   * Model OpenAI (gpt-5, gpt-5-mini, gpt-4o, …) — phải nằm trong danh sách cho phép
   */
  model?: string;
  /**
   * Mức suy luận (chỉ áp dụng cho dòng gpt-5); bỏ qua với gpt-4
   */
  reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | null;
}

// ============================================
// Chat Response Types
// ============================================

export interface SessionResponse extends Session {}

export interface SessionListResponse {
  sessions: Session[];
}

export interface MessageResponse {
  response: string;
  imageId?: string;
  imageUrl?: string;
}

// ============================================
// Image Types
// ============================================

export interface Image {
  id: string;
  session_id?: string;
  prompt: string;
  image_url: string;
  storage_path?: string;
  created_at: Date;
}

// ============================================
// Image Request Types
// ============================================

export interface GenerateImageRequest {
  /**
   * Text prompt describing the image to generate
   */
  prompt: string;
  /**
   * Optional session ID to associate the image with
   */
  sessionId?: string;
}

// ============================================
// Image Response Types
// ============================================

export interface GenerateImageResponse {
  id: string;
  prompt: string;
  imageUrl: string;
}

export interface ImageResponse extends Image {}

export interface ImageListResponse {
  images: Image[];
}

// ============================================
// Query Parameter Types
// ============================================

/** No query params; sessions are always scoped to the authenticated user. */
export type ListSessionsQuery = Record<string, never>;

export interface ListImagesQuery {
  /**
   * Filter images by session ID
   */
  sessionId?: string;
}

// ============================================
// Error Response Types (for OpenAPI docs)
// ============================================

export interface ErrorResponse {
  message: string;
  statusCode: number;
}

export interface ValidationErrorResponse extends ErrorResponse {
  details?: Record<string, string>;
}
