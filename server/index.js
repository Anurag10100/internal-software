require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initializeDatabase } = require('./config/database');
const authRoutes = require('./routes/auth');
const tasksRoutes = require('./routes/tasks');
const leavesRoutes = require('./routes/leaves');
const checkinsRoutes = require('./routes/checkins');
const usersRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const probationsRoutes = require('./routes/probations');
const appraisalsRoutes = require('./routes/appraisals');
const performanceRoutes = require('./routes/performance');
// Extended Enterprise Modules
const payrollRoutes = require('./routes/payroll');
const recruitmentRoutes = require('./routes/recruitment');
const learningRoutes = require('./routes/learning');
const assetsRoutes = require('./routes/assets');
const expensesRoutes = require('./routes/expenses');
const organizationRoutes = require('./routes/organization');
const documentsRoutes = require('./routes/documents');
const announcementsRoutes = require('./routes/announcements');
const offboardingRoutes = require('./routes/offboarding');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true, // Allow all origins in production (Railway will handle this)
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Initialize database
initializeDatabase();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/checkins', checkinsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/probations', probationsRoutes);
app.use('/api/appraisals', appraisalsRoutes);
app.use('/api/performance', performanceRoutes);
// Extended Enterprise Module Routes
app.use('/api/payroll', payrollRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/offboarding', offboardingRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));

  // Express 5 requires named parameter for catch-all routes
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

module.exports = app;
