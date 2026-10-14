/**
 * server/middleware/authMiddleware.js — JWT Authentication Guard
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IS THIS?
 *   This is the "bouncer" of our server.
 *   Certain routes (like saving favorites) require the user to be logged in.
 *   Before those routes run, this bouncer checks: "Do you have a valid token?"
 *
 * WHAT IS A JWT TOKEN?
 *   JWT = JSON Web Token. After a user logs in successfully, the server
 *   creates a small "stamp" (token) and gives it to the browser.
 *   The token contains: { userId: "abc123", email: "ali@..." }
 *   It's cryptographically signed — you can't fake it.
 *
 *   ANALOGY: Think of it like a wristband at a concert.
 *   You show your ticket (login), they give you a wristband (token).
 *   At every restricted area (protected route), staff check the wristband.
 *   You don't need to show your passport again every time.
 *
 * HOW IS THE TOKEN SENT?
 *   Frontend sends it in the HTTP "Authorization" header like this:
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * ─────────────────────────────────────────────────────────────────────────
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Step 1: Check if a token was sent in the Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // "Bearer eyJhbG..." → extract just the token part after "Bearer "
    token = authHeader.split(' ')[1];
  }

  // Step 2: If no token, reject with 401 Unauthorized
  if (!token) {
    return res.status(401).json({ message: 'Not authorized. Please log in.' });
  }

  try {
    // Step 3: Verify the token using our secret key
    // If the token was tampered with or expired, jwt.verify() throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { id: "507f1f...", iat: 1234567890, exp: 1235432100 }

    // Step 4: Find the user in the database
    // We attach the user object to req.user so route handlers can use it
    req.user = await User.findById(decoded.id).select('-password');
    // Note: .select('-password') means "exclude the password field"

    if (!req.user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    // Step 5: All good — pass control to the actual route handler
    next();

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token. Please log in again.' });
  }
};

module.exports = { protect };
