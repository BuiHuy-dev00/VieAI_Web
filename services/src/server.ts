import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { RegisterRoutes } from './generated/routes';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth-middleware';
import { sendMessageHandler } from './controllers/chat-controller';
import { initDb } from './config/db';
import { ensureAdminUserFromEnv } from './config/ensure-admin-from-env';
import { mergeOpenApiSpecs } from './utils/merge-openapi-specs';

// Nạp .env: cwd, thư mục cha (repo root khi chạy từ services/), và services/.env cạnh dist|src
(() => {
    const candidates = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '..', '.env'),
        path.join(__dirname, '../.env'),
    ];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) {
                dotenv.config({ path: p, override: true });
            }
        } catch {
            /* ignore */
        }
    }
})();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware
// ============================================

app.use(cors({ origin: '*' }));
/** Chat: tin nhắn dài + nhiều ảnh base64 */
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));

// ============================================
// Static Files
// ============================================

app.use('/static', express.static(path.join(__dirname, '../static')));

// ============================================
// Swagger UI Documentation
// ============================================

// Cache merged spec to avoid re-merging on every request
let cachedSpec: unknown = null;

async function getMergedSpec() {
  if (!cachedSpec) {
    const baseSpec = await import('./generated/swagger.json');
    const manualSpec = await import('./openapi/manual-routes.json');
    cachedSpec = mergeOpenApiSpecs(baseSpec as any, manualSpec as any);
  }
  return cachedSpec;
}

app.use('/docs', swaggerUi.serve, async (_req: express.Request, res: express.Response) => {
  const spec = await getMergedSpec();
  return res.send(swaggerUi.generateHTML(spec as any));
});

// Serve raw OpenAPI spec
app.get('/docs/swagger.json', async (_req, res) => {
  const spec = await getMergedSpec();
  res.json(spec);
});

// ============================================
// Health Check
// ============================================

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// tsoa Generated Routes
// ============================================

RegisterRoutes(app);

// ============================================
// Manual Routes (SSE Streaming)
// ============================================

// SSE streaming endpoint - not supported by tsoa
// Must be registered AFTER tsoa routes to avoid conflicts
app.post('/api/chat/sessions/:id/message', authMiddleware, sendMessageHandler);

// ============================================
// Error Handling
// ============================================

// tsoa validation errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.status === 400 && err?.fields) {
    // tsoa validation error
    return res.status(400).json({
      message: 'Validation failed',
      details: err.fields,
    });
  }
  // Pass to existing error handler
  next(err);
});

app.use(errorHandler);

// ============================================
// Start Server
// ============================================

async function start() {
  try {
    await initDb();
    await ensureAdminUserFromEnv();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Swagger UI: http://localhost:${PORT}/docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
