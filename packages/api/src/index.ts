// packages/api/src/index.ts
import dotenv from 'dotenv';

// Force dotenv to load from this package's .env file
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Debug: log important env values
console.log("Loaded SUPABASE_URL:", process.env.SUPABASE_URL || "<missing>");
console.log("Loaded EMAIL_USER:", process.env.EMAIL_USER || "<missing>");

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import authRoutes from './routes/auth';
import questionnaireRoutes from './routes/questionnaire';
import chatRoutes from './routes/chat';
import nutritionRoutes from './routes/nutrition';
import { authMiddleware } from './middlewares/authMiddleware';
import { supabase } from './db/supabaseClient';

const PORT = Number(process.env.PORT || 4000);
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

// IMPORTANT: Set up CORS FIRST before any routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Then other middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Basic health check (no auth required)
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      return res.status(503).json({ status: 'degraded', db: 'error', error: error.message });
    }
    return res.json({ status: 'ok' });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', error: err?.message || String(err) });
  }
});

// Mount routes ONCE and with correct prefixes
app.use('/api/auth', authRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/nutrition', nutritionRoutes);

// Example protected route
app.get('/me', authMiddleware, (req: Request, res: Response) => {
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

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new SocketIOServer(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/ws'
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Handle chat messages
  socket.on('chat-message', (data) => {
    console.log('Received chat message:', data);
    // Broadcast to all connected clients
    io.emit('chat-message', data);
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    socket.broadcast.emit('typing', data);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

function start() {
  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.log('Address in use, retrying in 1 second...');
      setTimeout(() => {
        server.close();
        server.listen(PORT);
      }, 1000);
    } else {
      console.error('Server error:', e);
    }
  });

  server.listen(PORT, () => {
    console.log(`API server running (${NODE_ENV}) — listening on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
    console.log('Available routes:');
    console.log('  - GET  /health');
    console.log('  - POST /api/auth/send-otp');
    console.log('  - POST /api/auth/verify-otp');
    console.log('  - POST /api/auth/register');
    console.log('  - POST /api/questionnaire/submit');
    console.log('  - GET  /api/chat/threads');
    console.log('  - POST /api/chat/threads');
    console.log('  - POST /api/chat/messages');
    console.log('  - GET  /api/nutrition/foods');
    console.log('  - GET  /api/nutrition/foods/:id');
    console.log('  - POST /api/nutrition/diet/generate');
    console.log('  - POST /api/nutrition/diet/recommendations');
    console.log('  - GET  /api/nutrition/diet/recommendations');
    console.log('  - POST /api/nutrition/meals/log');
    console.log('  - GET  /api/nutrition/meals/logs');
    console.log('  - POST /api/nutrition/feedback');
    console.log('  - POST /api/nutrition/dietitian/recommendations');
    console.log('  - GET  /api/nutrition/dietitian/recommendations');
    console.log('  - WS   /ws (WebSocket)');
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
      console.log('Server closed. Exiting.');
      process.exit(0);
    } catch (ex) {
      console.error('Error during shutdown cleanup:', ex);
      process.exit(1);
    }
  });

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
  // Log but don't shut down for unhandled rejections
});

// Only start if run directly
if (require.main === module) {
  // Test database connection before starting server
  (async () => {
    try {
      console.log('\n=== TESTING DATABASE CONNECTION ===');
      // Use the users table instead of a test table
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (error) throw error;
      console.log('✅ Basic connection successful; sample rows:', data);

      // Start the server
      start();
    } catch (err) {
      console.error('❌ Database connection test failed:', err);
      process.exit(1);
    }
  })();
}

export { app, server, io };
export default app;