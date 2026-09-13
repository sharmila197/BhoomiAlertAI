import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import parcelRoutes from './routes/parcelRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import interventionRoutes from './routes/interventionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

export const app = express();

// Security & Parsing Middlewares
app.use(
  cors({
    origin: [ENV.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/parcels', parcelRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/interventions', interventionRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    system: 'Land Acquisition Delay Prediction System (SIH1624)',
    phase: 'Phase 4 - Intervention Management Layer',
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found.',
  });
});
