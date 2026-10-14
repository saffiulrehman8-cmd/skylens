const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

// lat/lon must be real numbers (stops extra parameters being injected into the OpenWeather URL)
const validCoords = (lat, lon) =>
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) &&
  Math.abs(Number(lat)) <= 90 && Math.abs(Number(lon)) <= 180;

function handleAxiosError(err, res) {
  if (err.response) {
    return res.status(err.response.status).json({
      message: err.response.data?.message || 'External API error',
    });
  }
  if (err.request) {
    return res.status(503).json({ message: 'Cannot reach weather service.' });
  }
  return res.status(500).json({ message: 'Server error' });
}

// GET /api/weather?lat=33.68&lon=73.04  OR  /api/weather?q=London
router.get('/weather', async (req, res) => {
  try {
    const { lat, lon, q } = req.query;
    let url;
    if (lat && lon) {
      if (!validCoords(lat, lon)) return res.status(400).json({ message: 'Invalid lat/lon' });
      url = `${OWM_BASE}/weather?lat=${lat}&lon=${lon}&appid=${process.env.OWM_API_KEY}&units=metric`;
    } else if (typeof q === 'string' && q) {
      url = `${OWM_BASE}/weather?q=${encodeURIComponent(q)}&appid=${process.env.OWM_API_KEY}&units=metric`;
    } else {
      return res.status(400).json({ message: 'Provide lat+lon or q (city name)' });
    }
    const response = await axios.get(url, { timeout: 8000 });
    res.json(response.data);
  } catch (err) { handleAxiosError(err, res); }
});

// GET /api/forecast?lat=33.68&lon=73.04
router.get('/forecast', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ message: 'lat and lon required' });
    if (!validCoords(lat, lon)) return res.status(400).json({ message: 'Invalid lat/lon' });
    const url = `${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${process.env.OWM_API_KEY}&units=metric`;
    const response = await axios.get(url, { timeout: 8000 });
    res.json(response.data);
  } catch (err) { handleAxiosError(err, res); }
});

// GET /api/aqi?lat=33.68&lon=73.04
router.get('/aqi', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ message: 'lat and lon required' });
    if (!validCoords(lat, lon)) return res.status(400).json({ message: 'Invalid lat/lon' });
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${process.env.OWM_API_KEY}`;
    const response = await axios.get(url, { timeout: 8000 });
    res.json(response.data);
  } catch (err) { handleAxiosError(err, res); }
});

module.exports = router;
