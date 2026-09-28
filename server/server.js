const express = require('express');
const cors = require('cors');
const path = require('path');

// Load .env from the same directory as server.js (__dirname = server/)
// Using an explicit path ensures this works whether the process is started
// from the root directory (npm run dev --prefix server) or from server/ directly.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const { verifyEmailService } = require('./services/emailService');

// Connect to MongoDB Database
connectDB();

const app = express();

// Global Middlewares
// CORS — allow the Vercel frontend, localhost dev, and any other
// origins listed in FRONTEND_URL (comma-separated).
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, server-to-server, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Fallback: allow any origin in development
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'ExamSphere AI Backend',
    module: 'Single-Institution 4-Role System',
    roles: ['college_admin', 'teacher', 'invigilator', 'student'],
    timestamp: new Date(),
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/question-papers', require('./routes/questionPaperRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/invigilator', require('./routes/invigilatorRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/accessibility', require('./routes/accessibilityRoutes'));

// Serve static files for uploads (Question Papers)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `API Endpoint ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiStatus =
    geminiKey && geminiKey.trim() && geminiKey !== 'your_gemini_api_key_here'
      ? '✅ CONFIGURED'
      : '❌ NOT CONFIGURED (placeholder or missing)';

  console.log(`====================================================`);
  console.log(`🚀 ExamSphere AI Server running on port ${PORT}`);
  console.log(`📡 Base URL: http://localhost:${PORT}/api`);
  console.log(`🎓 Roles: college_admin | teacher | invigilator | student`);
  console.log(`🤖 Gemini AI: ${geminiStatus}`);
  console.log(`====================================================`);
  await verifyEmailService();
});
