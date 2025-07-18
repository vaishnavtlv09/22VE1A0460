const express = require("express");
const app = express();
const port = 3000;
const logger = require("../logging_middleware/logging");

app.use(express.json());
app.use(logger);

const shortUrls = new Map();


app.get('/shorturl', (req, res) => {
  res.json("Short URL Service Working");
});

function genCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  while (code.length < length) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function isValidCode(str) {
  const isValid = /^[a-zA-Z0-9]+$/.test(str);
  return isValid && str.length >= 4 && str.length <= 10;
}

app.get('/:code', (req, res) => {
  const code = req.params.code;
  const data = shortUrls.get(code);

  if (!data) {
    return res.status(404).json({ error: 'Shortcode not found' });
  }

  const now = new Date();
  if (now > data.expiry) {
    return res.status(410).json({ error: 'Link expired' });
  }

  data.clicks.push(now);
  res.redirect(data.url);
});


app.post('/shorturls', (req, res) => {
  const { url, validity = 30, shortcode } = req.body;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const code = shortcode || genCode();

  if (!isValidCode(code)) {
    return res.status(400).json({ error: 'Shortcode must be 4–10 alphanumeric chars' });
  }

  if (shortUrls.has(code)) {
    return res.status(409).json({ error: 'Shortcode already exists' });
  }

  const expiryTime = new Date(Date.now() + validity * 60000);

  shortUrls.set(code, {
    url,
    createdAt: new Date(),
    expiry: expiryTime,
    clicks: []
  });

  res.status(201).json({
    shortLink: `http://localhost:${port}/${code}`,
    expiry: expiryTime.toISOString()
  });
});

app.get('/shorturls/:code/stats', (req, res) => {
  const code = req.params.code;
  const data = shortUrls.get(code);

  if (!data) {
    return res.status(404).json({ error: 'Shortcode not found' });
  }

  const now = new Date();
  res.json({
    originalUrl: data.url,
    createdAt: data.createdAt.toISOString(),
    expiry: data.expiry.toISOString(),
    isExpired: now > data.expiry,
    totalClicks: data.clicks.length,
    accessLog: data.clicks.map(dt => dt.toISOString())
  });
});

app.listen(port);
