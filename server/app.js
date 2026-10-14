require('dotenv').config();

const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

const weatherRoutes = require('./routes/weather');
const authRoutes    = require('./routes/auth');
const geoRoutes     = require('./routes/geo');

const app = express();

// Behind Netlify's proxy the real client IP is in X-Forwarded-For (needed by the rate limiter)
if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY || process.env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
}));
// Strict limit only on login/signup (brute-force protection); favorites use the general limit
app.use(['/api/auth/login', '/api/auth/signup'], rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many auth attempts. Try again in 15 minutes.' },
}));

// ── MongoDB: connect lazily and reuse the connection (works locally and in serverless) ──
let connecting = null;
async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
      .then(() => console.log('✅ MongoDB connected'))
      .catch(err => { connecting = null; throw err; });
  }
  await connecting;
}

// Only auth routes need the database, so weather keeps working even if Mongo is down
app.use('/api/auth', async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set');
    return res.status(503).json({ message: 'Server is not configured for login yet.' });
  }
  try { await connectDB(); next(); }
  catch (err) {
    console.error('❌ MongoDB failed:', err.message);
    res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
  }
});

app.use('/api', weatherRoutes);
app.use('/api', geoRoutes);
app.use('/api/auth', authRoutes);

function errorHandler(err, req, res, next) {
  console.error('❌ Server error:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
}

module.exports = { app, connectDB, errorHandler };
