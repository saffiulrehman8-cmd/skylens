/**
 * server/models/User.js — The User Data Blueprint
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IS A MODEL?
 *   A Mongoose "model" is like a template form.
 *   Every user stored in MongoDB must follow this template.
 *   If someone tries to save a user without an email, MongoDB rejects it.
 *
 * ANALOGY: Think of a library card system.
 *   Every card MUST have: name, ID number, join date.
 *   You can't make a card without those. That's what a model enforces.
 *
 * WHAT DOES MONGODB ACTUALLY STORE?
 *   For each user, MongoDB saves something like this:
 *   {
 *     _id: "507f1f77bcf86cd799439011",   ← auto-generated unique ID
 *     email: "ali@example.com",
 *     password: "$2a$10$Xk...",          ← HASHED, not the real password!
 *     favorites: [
 *       { name: "Lahore",  lat: 31.5, lon: 74.3, addedAt: "2025-01-01" },
 *       { name: "London",  lat: 51.5, lon: -0.1, addedAt: "2025-01-02" }
 *     ],
 *     createdAt: "2025-01-01T12:00:00Z"
 *   }
 * ─────────────────────────────────────────────────────────────────────────
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs'); // For hashing passwords securely

// ── Define the "shape" of a user document ────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // Email address — must be unique, stored lowercase, trimmed of spaces
    email: {
      type:     String,
      required: [true, 'Email is required'],
      unique:   true,
      lowercase: true,    // "ALI@EXAMPLE.COM" becomes "ali@example.com" automatically
      trim:     true,     // removes leading/trailing spaces
      match: [
        /^\S+@\S+\.\S+$/,  // basic email format check (must have @ and .)
        'Please provide a valid email address',
      ],
    },

    // Password — minimum 6 characters, stored as a HASH (never plain text!)
    password: {
      type:     String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      // "select: false" means: when we fetch a user, the password field is
      // NOT included by default. We only include it when we explicitly need it
      // (e.g. during login to verify). Extra safety layer.
      select:   false,
    },

    // Favorite cities — an array, max 10 entries
    favorites: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          lat:  { type: Number, required: true },
          lon:  { type: Number, required: true },
          addedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
      validate: {
        validator: function (arr) { return arr.length <= 10; },
        message: 'You can save up to 10 favorite cities',
      },
    },
  },
  {
    // Automatically adds "createdAt" and "updatedAt" timestamp fields
    timestamps: true,
  }
);

// ── Pre-save Hook: Hash the password before saving ────────────────────────
// This runs AUTOMATICALLY before every user.save() call.
// 
// WHY HASH? You should NEVER store plain text passwords in a database.
// If the database is ever hacked, hackers get hash strings — not real passwords.
//
// HOW HASHING WORKS (simple analogy):
//   "mypassword123"  →  bcrypt  →  "$2a$10$Xk8Rz9..."
//   It's a one-way process. You can't reverse it.
//   To verify: hash the entered password again, compare the two hashes.
userSchema.pre('save', async function (next) {
  // Only re-hash if the password field was actually changed
  // (Don't re-hash if someone just updates their favorites list!)
  if (!this.isModified('password')) return next();

  // "10" is the salt rounds — higher = more secure but slower. 10 is the sweet spot.
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ── Instance Method: Verify a password ───────────────────────────────────
// Called during login: user.matchPassword(whatTheyTyped)
// Returns true if it matches, false if not.
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ── Export the model ──────────────────────────────────────────────────────
// mongoose.model('User', userSchema) creates a "User" collection in MongoDB
// and gives us a User class we can use in our routes.
const User = mongoose.model('User', userSchema);
module.exports = User;
