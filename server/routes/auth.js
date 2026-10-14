/**
 * server/routes/auth.js — Authentication Routes
 * ─────────────────────────────────────────────────────────────────────────
 * Handles:
 *   POST /api/auth/signup      → create new account
 *   POST /api/auth/login       → log in, get JWT token
 *   GET  /api/auth/me          → get current user info (requires token)
 *   POST /api/auth/favorites   → save a city (requires token)
 *   DELETE /api/auth/favorites/:name → remove a city (requires token)
 * ─────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const router  = express.Router();

// ── Helper: create a signed JWT token ────────────────────────────────────
// This is the "stamp machine" that creates a wristband for the user.
// We put the user's ID inside the token so we can identify them later.
function signToken(userId) {
  return jwt.sign(
    { id: userId },                     // Payload — what we put in the token
    process.env.JWT_SECRET,             // Secret key — needed to verify it later
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } // Token expires in 7 days
  );
}

// ── Helper: format user data to send to frontend ──────────────────────────
// We never send the password hash to the browser, even accidentally.
function formatUser(user) {
  return {
    id:        user._id,
    email:     user.email,
    favorites: user.favorites,
    createdAt: user.createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// Body: { email: "...", password: "..." }
// Creates a new user and returns a JWT token
// ─────────────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input (must be plain strings, not objects)
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ message: 'Invalid email or password format' });
    }

    // Check if email is already taken
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    // Create the user — the User model's pre-save hook automatically hashes the password
    const user = await User.create({ email, password });

    // Create a token for the new user
    const token = signToken(user._id);

    // Respond with token + user data
    // Status 201 = "Created" (more specific than 200 "OK" for resource creation)
    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: formatUser(user),
    });

  } catch (err) {
    // Mongoose validation errors (e.g., invalid email format)
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Failed to create account' });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email: "...", password: "..." }
// Verifies credentials, returns a JWT token
// ─────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid email or password format' });
    }

    // Find user — we need the password field here, so we explicitly select it
    // (Remember: we set "select: false" in the model so it's hidden by default)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      // IMPORTANT: Say "invalid credentials" not "email not found"
      // This prevents attackers from figuring out which emails are registered
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify the password using bcrypt comparison
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Credentials are correct — issue a token
    const token = signToken(user._id);

    res.json({
      message: 'Logged in successfully',
      token,
      user: formatUser(user),
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Header: Authorization: Bearer <token>
// Returns the current logged-in user's data (without password)
// ─────────────────────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  // "protect" middleware already verified the token and put user in req.user
  res.json({ user: formatUser(req.user) });
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/favorites
// Header: Authorization: Bearer <token>
// Body: { name: "Lahore", lat: 31.5, lon: 74.3 }
// Adds a city to the logged-in user's favorites list
// ─────────────────────────────────────────────────────────────────────────
router.post('/favorites', protect, async (req, res) => {
  try {
    const { name, lat, lon } = req.body;

    if (!name || lat === undefined || lon === undefined) {
      return res.status(400).json({ message: 'name, lat, and lon are required' });
    }
    if (typeof name !== 'string' || name.length > 100 ||
        !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) ||
        Math.abs(Number(lat)) > 90 || Math.abs(Number(lon)) > 180) {
      return res.status(400).json({ message: 'Invalid city data' });
    }

    // Check if already in favorites (no duplicates)
    const already = req.user.favorites.some(
      f => f.name.toLowerCase() === name.toLowerCase()
    );
    if (already) {
      return res.status(409).json({ message: `${name} is already in your favorites` });
    }

    // Check the 10-city limit
    if (req.user.favorites.length >= 10) {
      return res.status(400).json({ message: 'Maximum 10 favorites. Remove one first.' });
    }

    // Add to the favorites array and save
    req.user.favorites.push({ name, lat, lon });
    await req.user.save();

    res.json({
      message: `${name} added to favorites`,
      user: formatUser(req.user),
    });

  } catch (err) {
    console.error('Save favorite error:', err);
    res.status(500).json({ message: 'Failed to save favorite' });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// DELETE /api/auth/favorites/:name
// Header: Authorization: Bearer <token>
// Removes a city from the logged-in user's favorites
// ─────────────────────────────────────────────────────────────────────────
router.delete('/favorites/:name', protect, async (req, res) => {
  try {
    const nameToRemove = decodeURIComponent(req.params.name);

    // Filter out the city by name (case-insensitive)
    req.user.favorites = req.user.favorites.filter(
      f => f.name.toLowerCase() !== nameToRemove.toLowerCase()
    );
    await req.user.save();

    res.json({
      message: `${nameToRemove} removed from favorites`,
      user: formatUser(req.user),
    });

  } catch (err) {
    console.error('Remove favorite error:', err);
    res.status(500).json({ message: 'Failed to remove favorite' });
  }
});

module.exports = router;
