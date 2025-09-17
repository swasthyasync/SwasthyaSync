// packages/api/src/index.ts
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';

import authRoutes from './routes/auth';
import questionnaireRoutes from './routes/questionnaire';
import { authMiddleware } from './middlewares/authMiddleware';
import { supabase } from './db/supabaseClient';

// Optional: schedule cleanup or background tasks here (keep minimal)
const PORT = Number(process.env.PORT || 4000);
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Basic health check
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // quick DB check (supabase): try a harmless query to ensure DB reachability
    // If you prefer not to call DB here, remove the block and just return ok.
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      return res.status(503).json({ status: 'degraded', db: 'error', error: error.message });
    }
    return res.json({ status: 'ok' });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', error: err?.message || String(err) });
  }
});

// Mount routes
app.use('/auth', authRoutes);
app.use('/questionnaire', questionnaireRoutes);

// Example protected route
app.get('/me', authMiddleware, (req: Request, res: Response) => {
  // authMiddleware attaches user to req
  return res.json({ user: (req as any).user });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err?.status || 500).json({ error: err?.message || 'Internal server error' });
});

// Create HTTP server to support graceful shutdown
const server = http.createServer(app);

function start() {
  server.listen(PORT, () => {
    console.log(`API server running (${NODE_ENV}) — listening on http://localhost:${PORT}`);
  });
}

// Graceful shutdown
function shutdown(signal?: string) {
  console.log(`Received ${signal ?? 'shutdown'} — closing server...`);
  server.close(async (err) => {
    if (err) {
      console.error('Error closing server:', err);
      process.exit(1);
    }

    try {
      // any cleanup tasks: close DB connections if needed
      // supabase client does not require an explicit close in the JS client
      console.log('Server closed. Exiting.');
      process.exit(0);
    } catch (ex) {
      console.error('Error during shutdown cleanup:', ex);
      process.exit(1);
    }
  });

  // if server doesn't close within X ms, force exit
  setTimeout(() => {
    console.warn('Forcing shutdown.');
    process.exit(1);
  }, 30_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  // keep running briefly to log, then exit
  shutdown('unhandledRejection');
});

// Only start if this module is run directly (useful for tests importing app)
if (require.main === module) {
  start();
}

// Export app & server for testing
export { app, server };
export default app;
