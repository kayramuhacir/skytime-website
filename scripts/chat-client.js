const SESSION_STORAGE_KEY = 'skytime_chat_session';

function getSessionKey() {
  let key = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, key);
  }
  return key;
}

function appendMessage(log, text, role) {
  const el = document.createElement('div');
  el.className = `chat-msg chat-msg--${role}`;
  el.dir = 'auto';
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

const log = document.getElementById('chat-log');
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');
const sessionKey = getSessionKey();

form.addEventListener('submit', async e => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  input.disabled = true;
  appendMessage(log, message, 'user');
  const pending = appendMessage(log, '…', 'assistant');
  pending.classList.add('chat-msg--pending');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionKey, message })
    });
    const data = await response.json();
    pending.classList.remove('chat-msg--pending');
    if (!response.ok) throw new Error(data.error || 'Request failed');
    pending.textContent = data.reply;
  } catch {
    pending.classList.remove('chat-msg--pending');
    pending.classList.add('chat-msg--error');
    pending.textContent = "Something went wrong. Please try again. / مشکلی پیش اومد، دوباره امتحان کن.";
  } finally {
    input.disabled = false;
    input.focus();
  }
});
