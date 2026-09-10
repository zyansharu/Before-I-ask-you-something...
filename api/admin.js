const fs = require('fs');
const path = require('path');

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
}

module.exports = async function handler(req, res) {
  withCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Only GET requests are allowed.' });
  if (process.env.ADMIN_TOKEN && req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Invalid admin token.' });
  }

  try {
    if (process.env.SHEETS_WEBHOOK_URL) {
      const response = await fetch(process.env.SHEETS_WEBHOOK_URL);
      if (!response.ok) throw new Error(`Google Sheets webhook returned ${response.status}.`);
      const payload = await response.json();
      return res.status(200).json({ ok: true, entries: payload.entries || [] });
    }

    const logFile = path.join(process.cwd(), 'data', 'submissions.json');
    const entries = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8') || '[]') : [];
    return res.status(200).json({ ok: true, entries });
  } catch (error) {
    console.error('Admin data fetch failed:', error);
    return res.status(500).json({ ok: false, error: 'Could not load submissions.' });
  }
};