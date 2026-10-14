# ☁ skyLens — Pro Weather Intelligence

A full-stack weather web app built with Node.js, Express, MongoDB and a beautiful
multi-page frontend.

---

## 📁 Project Structure

```
skylens/
├── client/                   ← Frontend (multi-page site)
│   ├── index.html            ← Home / hub
│   ├── dashboard.html        ← Live weather dashboard
│   ├── learn.html            ← Weather encyclopedia + learn-*.html topic pages
│   ├── about.html, 404.html
│   ├── css/                  ← style.css, premium.css, learn-topic.css
│   ├── js/                   ← app.js, motion.js, motion-dashboard.js
│   ├── assets/images/        ← Backgrounds and images
│   ├── manifest.json         ← PWA install config
│   └── sw.js                 ← Service Worker (offline mode)
│
├── server/                   ← Express backend (routes, models, middleware)
├── netlify/functions/api.js  ← Serverless entry point for Netlify
├── netlify.toml              ← Netlify build/redirect config
├── .env.example              ← Template for your secret .env (never commit .env)
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Quick Start (Step by Step)

### Prerequisites
- Node.js 18+ → https://nodejs.org
- MongoDB Community → https://www.mongodb.com/try/download/community
  (OR use MongoDB Atlas free cloud: https://cloud.mongodb.com)

### 1. Install dependencies
```bash
cd skylens
npm install
```
This reads package.json and downloads all the packages into node_modules/.

### 2. Configure your secrets
Edit the `.env` file and fill in your values:
```
OWM_API_KEY=your_openweathermap_key_here
MONGO_URI=mongodb://localhost:27017/skylens
JWT_SECRET=some_long_random_string_here
```

### 3. Start MongoDB (if using local)
```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Windows — MongoDB runs as a service automatically after install
# Linux
sudo systemctl start mongod
```

### 4. Start skyLens
```bash
# Development (auto-restarts when you change files)
npm run dev

# Production
npm start
```

### 5. Open in browser
```
http://localhost:3000
```

---

## 🔑 API Endpoints

| Method | Endpoint | Auth? | Description |
|--------|----------|-------|-------------|
| GET | /api/weather?lat=&lon= | No | Current weather by coords |
| GET | /api/weather?q=London | No | Current weather by city name |
| GET | /api/forecast?lat=&lon= | No | 5-day forecast |
| GET | /api/aqi?lat=&lon= | No | Air quality index |
| GET | /api/geo?q=Lah | No | City autocomplete (5 results) |
| POST | /api/auth/signup | No | Create account |
| POST | /api/auth/login | No | Log in, get JWT token |
| GET | /api/auth/me | ✅ JWT | Get current user |
| POST | /api/auth/favorites | ✅ JWT | Save a city |
| DELETE | /api/auth/favorites/:name | ✅ JWT | Remove a city |

---

## 🔒 Security Features

- **No API key in frontend** — key lives in .env, never sent to browser
- **bcrypt password hashing** — passwords stored as irreversible hashes
- **JWT authentication** — stateless, cryptographically signed tokens
- **Rate limiting** — max 100 API requests / 15 min / IP
- **CORS** — only your frontend domain can call the API

---

## 🌐 Deploying to Production

### Option A: Railway (easiest, free tier)
1. Push to GitHub (make sure .env is in .gitignore!)
2. Connect repo to railway.app
3. Add environment variables in Railway dashboard
4. Deploy!

### Option B: Render
1. Push to GitHub
2. Create a Web Service on render.com
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add env vars in the dashboard

### Option C: VPS (DigitalOcean / Linode)
Use PM2 to keep the server running:
```bash
npm install -g pm2
pm2 start server/server.js --name skylens
pm2 startup
```

---

## ☁ Deploying on Netlify
The site is configured by `netlify.toml` (static `client/` + serverless function in
`netlify/functions/api.js`). In Netlify → Site settings → Environment variables add:
`OWM_API_KEY`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`.
