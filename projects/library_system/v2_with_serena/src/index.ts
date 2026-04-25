/**
 * Library Management System
 * Main entry point
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth';
import booksRoutes from './routes/books';
import loansRoutes from './routes/loans';
import statusRoutes from './routes/status';
import { initializeDatabase } from './database/init';

// Initialize database
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true,
  })
);

// Routes
app.use('/api', authRoutes);
app.use('/api', booksRoutes);
app.use('/api', loansRoutes);
app.use('/api', statusRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Library Management System API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

export default app;
