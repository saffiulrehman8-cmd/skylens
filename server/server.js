require('dotenv').config();

const path = require('path');
const dns  = require('dns');
const express = require('express');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const { app, connectDB, errorHandler } = require('./app');

connectDB().catch(err => console.error('❌ MongoDB failed:', err.message));

// ── Static files (HTML / CSS / JS / assets) ───────────────────────────────
const clientPath = path.join(__dirname, '..', 'client');
console.log('📁 Serving static files from:', clientPath);

// Never cache HTML/JS so users always get the latest version after updates
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html') || req.path.endsWith('.js')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma',        'no-cache');
    res.setHeader('Expires',       '0');
  }
  next();
});

app.use(express.static(clientPath));

// ── SPA catch-all ─────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

app.use(errorHandler);

// ── Start (local only — on Netlify the app runs as a function) ────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('  ☁  skyLens server running');
  console.log(`  🌐  http://localhost:${PORT}`);
  console.log(`  🔑  OWM key: ${process.env.OWM_API_KEY ? '✅ loaded' : '❌ MISSING!'}`);
  console.log('');
});
