import {
  Controller,
  Get,
  Post,
  Delete,
  Route,
  Tags,
  Path,
  Body,
  Query,
  Security,
  Response,
  Request,
  SuccessResponse,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/db';
import { generateImage as generateGeminiImage } from '../services/gemini-service';
import { createError } from '../middleware/error-handler';
import type {
  Image,
  GenerateImageRequest,
  GenerateImageResponse,
  ErrorResponse,
} from '../types/api-types';

// ============================================
// Image Controller - tsoa
// ============================================

@Route('api/images')
@Tags('Images')
@Security('jwt')
export class ImageController extends Controller {

  /**
   * Generate an image using Gemini 2.0
   * @summary Generate AI image from text prompt
   */
  @Post('generate')
  @SuccessResponse(201, 'Image generated successfully')
  @Response<ErrorResponse>(400, 'Prompt is required')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Response<ErrorResponse>(500, 'Failed to generate image')
  public async generateImage(
    @Request() request: ExpressRequest,
    @Body() body: GenerateImageRequest
  ): Promise<GenerateImageResponse> {
    if (!body.prompt) {
      this.setStatus(400);
      throw createError('Prompt is required', 400);
    }

    const userId = request.user!.userId;

    if (body.sessionId) {
      const owned = await queryOne<{ id: string }>(
        'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
        [body.sessionId, userId]
      );
      if (!owned) {
        this.setStatus(404);
        throw createError('Session not found', 404);
      }
    }

    const id = uuidv4();
    const image = await generateGeminiImage(body.prompt);

    if (!image) {
      this.setStatus(500);
      throw createError('Failed to generate image', 500);
    }

    const imageUrl = `data:${image.mimeType};base64,${image.data}`;

    // Save to database
    await query(
      `INSERT INTO images (id, session_id, prompt, image_url) VALUES ($1, $2, $3, $4)`,
      [id, body.sessionId || null, body.prompt, imageUrl]
    );

    this.setStatus(201);
    return {
      id,
      prompt: body.prompt,
      imageUrl,
    };
  }

  /**
   * List all images, optionally filtered by session
   * @summary List images
   */
  @Get('/')
  @Response<ErrorResponse>(401, 'Unauthorized')
  public async listImages(
    @Request() request: ExpressRequest,
    @Query() sessionId?: string
  ): Promise<Image[]> {
    const userId = request.user!.userId;

    if (sessionId) {
      return await query<Image>(
        `SELECT i.* FROM images i
         INNER JOIN chat_sessions cs ON cs.id = i.session_id
         WHERE i.session_id = $1 AND cs.user_id = $2
         ORDER BY i.created_at DESC`,
        [sessionId, userId]
      );
    }

    return await query<Image>(
      `SELECT i.* FROM images i
       INNER JOIN chat_sessions cs ON cs.id = i.session_id
       WHERE cs.user_id = $1
       ORDER BY i.created_at DESC LIMIT 50`,
      [userId]
    );
  }

  /**
   * Get a specific image by ID
   * @summary Get image by ID
   */
  @Get('{id}')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Response<ErrorResponse>(404, 'Image not found')
  public async getImage(
    @Request() request: ExpressRequest,
    @Path() id: string
  ): Promise<Image> {
    const image = await queryOne<Image>(
      `SELECT i.* FROM images i
       INNER JOIN chat_sessions cs ON cs.id = i.session_id
       WHERE i.id = $1 AND cs.user_id = $2`,
      [id, request.user!.userId]
    );

    if (!image) {
      this.setStatus(404);
      throw createError('Image not found', 404);
    }

    return image;
  }

  /**
   * Delete an image by ID
   * @summary Delete image
   */
  @Delete('{id}')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Response<ErrorResponse>(404, 'Image not found')
  public async deleteImage(
    @Request() request: ExpressRequest,
    @Path() id: string
  ): Promise<{ message: string }> {
    const result = await query(
      `DELETE FROM images i
       USING chat_sessions cs
       WHERE i.id = $1 AND i.session_id = cs.id AND cs.user_id = $2
       RETURNING i.id`,
      [id, request.user!.userId]
    );

    if (result.length === 0) {
      this.setStatus(404);
      throw createError('Image not found', 404);
    }

    return { message: 'Image deleted' };
  }
}
