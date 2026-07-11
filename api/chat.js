import { handleMessage } from './_lib/brain.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { sessionKey, message, widget } = req.body || {};

  if (!sessionKey || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'sessionKey and message are required' });
    return;
  }

  try {
    const { reply } = await handleMessage({
      sessionKey,
      channel: widget ? 'widget' : 'web',
      message: message.trim()
    });
    res.status(200).json({ reply, sessionKey });
  } catch (err) {
    console.error('chat handler error', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
