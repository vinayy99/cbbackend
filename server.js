import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { testConnection } from './database/config.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import skillSwapRoutes from './routes/skillSwaps.js';
import applicationRoutes from './routes/applications.js';
import notificationRoutes from './routes/notifications.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ FIXED CORS COMPLETELY
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://collabmate1.onrender.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Log Requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ✅ DB Test
testConnection();

// ✅ ROUTES (NO DOUBLE /api/api ISSUE)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/skill-swaps', skillSwapRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/notifications', notificationRoutes);

// ✅ Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ✅ 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ✅ Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(500).json({ error: 'Internal server error' });
});

// ✅ Start Normally (Local only)
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
}

export default app;
