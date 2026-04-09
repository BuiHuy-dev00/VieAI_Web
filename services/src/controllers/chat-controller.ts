import {
  Controller,
  Get,
  Post,
  Delete,
  Route,
  Tags,
  Path,
  Body,
  Security,
  Response,
  Request,
  SuccessResponse,
} from 'tsoa';
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/db';
import { createError } from '../middleware/error-handler';
import {
  buildOpenAIMessages,
  completeOpenAIChat,
  streamOpenAIChat,
  parseReasoningEffort,
  resolveChatModel,
  type HistoryRow,
  type UserImagePart,
} from '../services/openai-chat-service';
import type {
  Session,
  Message,
  SessionWithMessages,
  SessionImage,
  CreateSessionRequest,
  ErrorResponse,
} from '../types/api-types';
import '../types/auth-types';
import { deriveSessionTitle, isDefaultSessionTitle } from '../services/chat-session-title';
import { getMonthlyTokensUsed, getMonthlyTokenLimit } from '../services/admin-service';

// ============================================
// Chat Controller - tsoa
// ============================================

@Route('api/chat')
@Tags('Chat')
@Security('jwt')
export class ChatController extends Controller {
  /**
   * List all chat sessions for a user
   */
  @Get('sessions')
  @Response<ErrorResponse>(401, 'Unauthorized')
  public async listSessions(@Request() request: ExpressRequest): Promise<Session[]> {
    const userId = request.user!.userId;

    const sessions = await query<Session & { message_count?: string | number }>(
      `SELECT cs.*,
        (SELECT COUNT(*)::int FROM messages WHERE session_id = cs.id) AS message_count
       FROM chat_sessions cs
       WHERE cs.user_id = $1
       ORDER BY cs.updated_at DESC`,
      [userId]
    );

    return sessions.map((s) => ({
      ...s,
      message_count:
        typeof s.message_count === 'number'
          ? s.message_count
          : Number.parseInt(String(s.message_count ?? '0'), 10) || 0,
    }));
  }

  /**
   * Create a new chat session
   */
  @Post('sessions')
  @SuccessResponse(201, 'Session created')
  @Response<ErrorResponse>(401, 'Unauthorized')
  public async createSession(
    @Request() request: ExpressRequest,
    @Body() body: CreateSessionRequest
  ): Promise<Session> {
    const userId = request.user!.userId;
    const title = body.title ?? 'Đoạn chat mới';
    const id = uuidv4();

    await query('INSERT INTO chat_sessions (id, user_id, title) VALUES ($1, $2, $3)', [id, userId, title]);

    const session = await queryOne<Session>('SELECT * FROM chat_sessions WHERE id = $1', [id]);

    this.setStatus(201);
    return session!;
  }

  /**
   * Get a chat session with all messages and images
   */
  @Get('sessions/{id}')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Response<ErrorResponse>(404, 'Session not found')
  public async getSession(
    @Request() request: ExpressRequest,
    @Path() id: string
  ): Promise<SessionWithMessages> {
    const session = await queryOne<Session>(
      'SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [id, request.user!.userId]
    );

    if (!session) {
      this.setStatus(404);
      throw createError('Session not found', 404);
    }

    const messages = await query<Message>(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [id]
    );

    const images = await query<SessionImage>('SELECT id, prompt, image_url FROM images WHERE session_id = $1', [id]);

    return { ...session, messages, images };
  }

  /**
   * Delete a chat session and its messages
   */
  @Delete('sessions/{id}')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Response<ErrorResponse>(404, 'Session not found')
  public async deleteSession(
    @Request() request: ExpressRequest,
    @Path() id: string
  ): Promise<{ message: string }> {
    const result = await query('DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2 RETURNING id', [
      id,
      request.user!.userId,
    ]);

    if (result.length === 0) {
      this.setStatus(404);
      throw createError('Session not found', 404);
    }

    return { message: 'Session deleted' };
  }
}

// ============================================
// SSE Streaming Handler (NOT tsoa)
// ============================================

/**
 * Sau lượt trả lời đầu tiên của assistant, đặt tiêu đề session từ tin user đầu tiên.
 */
async function maybeSetSessionTitleAfterFirstAssistantMessage(
  sessionId: string,
  sessionTitle: string | null | undefined
): Promise<void> {
  if (!isDefaultSessionTitle(sessionTitle)) {
    return;
  }

  const assistantCount = await queryOne<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM messages WHERE session_id = $1 AND role = 'assistant'`,
    [sessionId]
  );
  if (!assistantCount || Number(assistantCount.n) !== 1) {
    return;
  }

  const firstUser = await queryOne<{ content: string; attachments: unknown }>(
    `SELECT content, attachments FROM messages WHERE session_id = $1 AND role = 'user' ORDER BY created_at ASC LIMIT 1`,
    [sessionId]
  );
  if (!firstUser) {
    return;
  }

  const att = firstUser.attachments;
  const hasImg = Array.isArray(att) ? att.length > 0 : Boolean(att && att !== '[]');

  const title = deriveSessionTitle(firstUser.content ?? '', hasImg);

  await query(`UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2`, [title, sessionId]);
}

function normalizeImages(raw: unknown): UserImagePart[] {
  if (!Array.isArray(raw)) return [];
  const out: UserImagePart[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object' && 'data' in item) {
      const mimeType =
        typeof (item as { mimeType?: string }).mimeType === 'string'
          ? (item as { mimeType: string }).mimeType
          : 'image/jpeg';
      let data = String((item as { data: string }).data).trim();
      const m = /^data:[^;]+;base64,(.+)$/i.exec(data);
      if (m) data = m[1];
      if (data.length > 0) out.push({ mimeType, data });
    }
  }
  return out;
}

/**
 * Gửi tin nhắn → OpenAI (GPT) → stream SSE / JSON.
 * Body: { message?: string, stream?: boolean, images?: { mimeType, data }[] }
 * — Cho phép chỉ ảnh không text; không giới hạn độ dài text (giới hạn thực tế do HTTP 50mb).
 */
export async function sendMessageHandler(
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body as {
      message?: string;
      stream?: boolean;
      images?: unknown;
      model?: string;
      reasoning_effort?: unknown;
    };
    const stream = body.stream !== false;
    const model = resolveChatModel(body.model);
    const reasoningEffort = parseReasoningEffort(body.reasoning_effort);
    const message = typeof body.message === 'string' ? body.message : '';
    const images = normalizeImages(body.images);

    if (!message.trim() && images.length === 0) {
      throw createError('Cần nội dung tin nhắn hoặc ít nhất một ảnh', 400);
    }

    const session = await queryOne<Session>('SELECT * FROM chat_sessions WHERE id = $1', [id]);

    if (!session) {
      throw createError('Session not found', 404);
    }

    const authUserId = req.user?.userId;
    if (authUserId == null) {
      throw createError('Unauthorized', 401);
    }
    if (session.user_id !== authUserId) {
      throw createError('Forbidden', 403);
    }

    const tokenLimit = await getMonthlyTokenLimit(authUserId);
    if (tokenLimit != null && tokenLimit > 0) {
      const used = await getMonthlyTokensUsed(authUserId);
      if (used >= tokenLimit) {
        throw createError('Đã đạt giới hạn token trong tháng. Liên hệ quản trị viên.', 429);
      }
    }

    const historyRows = await query<HistoryRow & { content: string }>(
      'SELECT role, content, attachments FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [id]
    );

    const attachmentsJson = images.map((i) => ({ mimeType: i.mimeType, data: i.data }));

    await query(
      `INSERT INTO messages (session_id, role, content, attachments) VALUES ($1, $2, $3, $4::jsonb)`,
      [id, 'user', message, JSON.stringify(attachmentsJson)]
    );

    const openaiMessages = buildOpenAIMessages(historyRows, message, images);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';
      let assistantTokens: number | undefined;

      try {
        for await (const chunk of streamOpenAIChat(openaiMessages, { model, reasoningEffort })) {
          if (chunk.totalTokens != null) {
            assistantTokens = chunk.totalTokens;
          }
          if (chunk.text) {
            fullResponse += chunk.text;
            res.write(`data: ${JSON.stringify({ type: 'text', text: chunk.text, done: false })}\n\n`);
          }
          if (chunk.done) {
            res.write(`data: ${JSON.stringify({ type: 'done', done: true })}\n\n`);
          }
        }
      } catch (e) {
        if (!res.headersSent) throw e;
        console.error('[OpenAI stream]', e);
        try {
          res.end();
        } catch {
          /* ignore */
        }
        return;
      }

      await query(
        'INSERT INTO messages (session_id, role, content, tokens_used) VALUES ($1, $2, $3, $4)',
        [id, 'assistant', fullResponse, assistantTokens ?? null]
      );

      await query('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [id]);
      await maybeSetSessionTitleAfterFirstAssistantMessage(id, session.title);

      res.end();
    } else {
      const { text: fullResponse, totalTokens } = await completeOpenAIChat(openaiMessages, {
        model,
        reasoningEffort,
      });

      await query(
        'INSERT INTO messages (session_id, role, content, tokens_used) VALUES ($1, $2, $3, $4)',
        [id, 'assistant', fullResponse, totalTokens ?? null]
      );

      await query('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [id]);
      await maybeSetSessionTitleAfterFirstAssistantMessage(id, session.title);

      res.json({
        success: true,
        data: {
          response: fullResponse,
        },
      });
    }
  } catch (error) {
    if (res.headersSent) {
      console.error('[SSE/chat]', error);
      try {
        res.end();
      } catch {
        /* ignore */
      }
      return;
    }
    next(error);
  }
}
