const express = require('express');
const axios   = require('axios');
const router  = express.Router();

// GET /api/geo?q=Lahore
router.get('/geo', async (req, res) => {
  try {
    const { q } = req.query;
    if (typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ message: 'Query must be at least 2 characters' });
    }
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q.trim())}&limit=5&appid=${process.env.OWM_API_KEY}`;
    const response = await axios.get(url, { timeout: 6000 });
    res.json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json({ message: 'Geo API error' });
    res.status(500).json({ message: 'Server error during geocoding' });
  }
});

module.exports = router;
