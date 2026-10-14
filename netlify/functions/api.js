const serverless = require('serverless-http');
const { app, errorHandler } = require('../../server/app');

app.set('trust proxy', 1);
app.use(errorHandler);
const handle = serverless(app);

// Whatever path Netlify hands us, normalise it to /api/...
exports.handler = async (event, context) => {
  let p = (event.path || '').replace(/^\/\.netlify\/functions\/api/, '');
  if (!p.startsWith('/api')) p = '/api' + (p.startsWith('/') ? p : '/' + p);
  event.path = p;
  return handle(event, context);
};
