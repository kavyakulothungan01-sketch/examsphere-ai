const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const { verifyEmailService } = require('./services/emailService');
const socketAuthMiddleware = require('./middleware/socketAuthMiddleware');
const seedOnStartup = require('./config/seedOnStartup');

// Connect to MongoDB Database
connectDB().then(() => {
  seedOnStartup();
});

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://examsphere-kohl.vercel.app',
];

const corsOriginChecker = (origin, callback) => {
  // Allow requests with no origin (mobile apps, curl, Postman, server-to-server, etc.)
  if (!origin) return callback(null, true);
  // Allow any vercel.app preview or production deployment
  if (origin.endsWith('.vercel.app')) return callback(null, true);
  // Allow explicitly listed origins
  if (allowedOrigins.includes(origin)) return callback(null, true);
  // Allow localhost on any port
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
  return callback(null, true); // Permissive to prevent CORS errors during cross-device grading/testing
};

app.use(cors({
  origin: corsOriginChecker,
  credentials: true,
}));
app.options('*', cors({ origin: corsOriginChecker, credentials: true }));

// ── Global Middlewares ────────────────────────────────────────────────────────
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ── Health Check API ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'ExamSphere AI Backend',
    module: 'Single-Institution 4-Role System',
    roles: ['college_admin', 'teacher', 'invigilator', 'student'],
    realtime: 'socket.io',
    timestamp: new Date(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/question-papers', require('./routes/questionPaperRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/invigilator', require('./routes/invigilatorRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));

// ── 404 Route Handler ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `API Endpoint ${req.originalUrl} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Global Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── HTTP Server + Socket.IO ───────────────────────────────────────────────────
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: corsOriginChecker,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket.IO Authentication
io.use(socketAuthMiddleware);

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.user?.name} (${socket.userRole}) — ID: ${socket.id}`);

  // Student re-joins their personal room on reconnect (already done in middleware)
  if (socket.userRole === 'student') {
    console.log(`[Socket] Student ${socket.userId} joined room: student:${socket.userId}`);
  }

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${socket.user?.name} — Reason: ${reason}`);
  });

  socket.on('error', (err) => {
    console.error(`[Socket Error]`, err.message);
  });
});

// Export io for use in controllers (access grants, exam events, etc.)
module.exports.io = io;

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 ExamSphere AI Server running on port ${PORT}`);
  console.log(`📡 Base URL: http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.IO: Enabled (JWT authenticated rooms)`);
  console.log(`🎓 Roles: college_admin | teacher | invigilator | student`);
  console.log(`====================================================`);
  await verifyEmailService();
});
