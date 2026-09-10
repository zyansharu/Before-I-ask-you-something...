const fs = require('fs');
const path = require('path');

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Payload too large.'));
      }
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  withCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Only POST requests are allowed.' });
  }

  try {
    const rawBody = await readBody(req);
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const event = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: new Date().toISOString(),
      ...payload
    };

    const isVercelEnv = Boolean(process.env.VERCEL);
    const logDir = isVercelEnv ? '/tmp' : path.join(process.cwd(), 'data');
    const logFile = path.join(logDir, 'submissions.json');

    fs.mkdirSync(logDir, { recursive: true });

    const existingEntries = fs.existsSync(logFile)
      ? JSON.parse(fs.readFileSync(logFile, 'utf8') || '[]')
      : [];

    existingEntries.push(event);
    fs.writeFileSync(logFile, JSON.stringify(existingEntries, null, 2));

    if (process.env.SHEETS_WEBHOOK_URL) {
      const sheetsResponse = await fetch(process.env.SHEETS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });

      if (!sheetsResponse.ok) {
        throw new Error(`Google Sheets webhook returned ${sheetsResponse.status}.`);
      }
    }

    console.log('Captured submission:', JSON.stringify(event));

    return res.status(200).json({
      ok: true,
      message: 'Submission captured successfully.',
      entryId: event.id
    });
  } catch (error) {
    console.error('Submission failed:', error);
    return res.status(500).json({
      ok: false,
      error: 'Something went wrong while saving the submission.'
    });
  }
};
