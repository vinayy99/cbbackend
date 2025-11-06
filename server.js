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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Test database connection
testConnection();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/skill-swaps', skillSwapRoutes);
app.use('/api', applicationRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 404 handler
app.use((req, res, next) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware - MUST be last
app.use((err, req, res, next) => {
  console.error('=== ERROR DETAILS ===');
  console.error('Error Message:', err.message);
  console.error('Error Stack:', err.stack);
  console.error('Request Path:', req.path);
  console.error('Request Method:', req.method);
  console.error('Request Body:', req.body);
  console.error('====================');
  
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    path: req.path
  });
});

// Export for Vercel serverless
export default app;

// Start server (for local development only)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}