import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import userRoutes from './routes/userRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import planRoutes from './routes/planRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { aiLimiter, authLimiter, generalLimiter } from './middleware/rateLimiters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger);
  app.use(generalLimiter);

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
    });
  });

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/rooms/:roomId/expenses', expenseRoutes);
  app.use('/api/rooms/:roomId/guests', guestRoutes);
  app.use('/api/rooms/:roomId/payments', paymentRoutes);
  app.use('/api/rooms/:roomId/ai', aiLimiter, aiRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/users', analyticsRoutes);
  app.use('/api/budgets', budgetRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api', notFoundHandler);

  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}
