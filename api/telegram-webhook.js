import { handleMessage } from './_lib/brain.js';
import { sendTelegramMessage } from './_lib/telegram.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).end();
    return;
  }

  // Acknowledge immediately — Telegram retries if the webhook is slow to respond.
  res.status(200).end();

  const update = req.body || {};
  const chatId = update.message?.chat?.id;
  const text = update.message?.text;
  if (!chatId || !text) return;

  try {
    const { reply } = await handleMessage({
      sessionKey: `telegram:${chatId}`,
      channel: 'telegram',
      externalId: String(chatId),
      message: text
    });
    await sendTelegramMessage(chatId, reply);
  } catch (err) {
    console.error('telegram webhook error', err);
    await sendTelegramMessage(chatId, "Sorry, something went wrong on my end. Try again in a moment.");
  }
}
