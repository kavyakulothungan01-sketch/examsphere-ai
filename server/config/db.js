const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/examsphere_ai';

    // PRODUCTION GUARD: Refuse to use in-memory DB in production.
    // This prevents silent data loss in deployed environments.
    if (process.env.NODE_ENV === 'production' && process.env.USE_IN_MEMORY_DB === 'true') {
      console.error('[Database] ❌ FATAL: USE_IN_MEMORY_DB=true is NOT allowed in production.');
      console.error('[Database] Set MONGODB_URI to a valid MongoDB Atlas connection string.');
      process.exit(1);
    }

    // Attempt standard connection first
    await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected: ${mongoose.connection.host}`);
  } catch (err) {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowInMemory = !isProduction && process.env.USE_IN_MEMORY_DB === 'true';

    if (allowInMemory) {
      // Graceful fallback for local development without local MongoDB installed
      console.log(`[Database] Local MongoDB connection failed (${err.message}). Initializing In-Memory Mongo Server for seamless local setup...`);
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        console.log(`[Database] In-Memory MongoDB Connected successfully at: ${mongoUri}`);
        console.log(`[Database] ⚠️  Note: In-memory data is NOT persisted between server restarts.`);
      } catch (memErr) {
        console.error(`[Database Error] Failed to start MongoDB Memory Server: ${memErr.message}`);
        process.exit(1);
      }
    } else {
      const sanitizedUri = connStr.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
      console.error(`[Database Error] Persistent MongoDB connection failed: ${err.message}`);
      console.error(`
==================================================
❌ MONGODB CONNECTION FAILED
==================================================
ExamSphere AI could not connect to MongoDB.
Target URI: ${sanitizedUri}

For persistent storage and multi-user synchronization:
- Ensure MONGODB_URI is set to a valid MongoDB Atlas connection string.
- Ensure MongoDB Atlas Network Access whitelist includes 0.0.0.0/0 (or your server IP).
- Ensure your MongoDB user credentials and database name are correct.

In production (NODE_ENV=production), in-memory fallback is disabled.
==================================================
      `);
      process.exit(1);
    }
  }
};

module.exports = connectDB;

