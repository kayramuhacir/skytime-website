(function () {
  // Absolute origin this script was loaded from — so /api/chat is called on SkyTime's
  // domain even when this script is embedded on a third-party site.
  const ORIGIN = new URL(document.currentScript.src).origin;
  const SESSION_STORAGE_KEY = 'skytime_widget_session';

  function getSessionKey() {
    let key = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(SESSION_STORAGE_KEY, key);
    }
    return key;
  }

  const host = document.createElement('div');
  host.style.all = 'initial';
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .bubble {
        position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px;
        border-radius: 50%; background: #7ECFBA; border: none; cursor: pointer;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25); z-index: 2147483000;
        display: flex; align-items: center; justify-content: center;
      }
      .bubble svg { width: 26px; height: 26px; }
      .panel {
        position: fixed; bottom: 88px; right: 20px; width: 340px; max-width: calc(100vw - 40px);
        height: 460px; max-height: calc(100vh - 120px); background: #0D0D0F; color: #F5F5F7;
        border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.35); display: none;
        flex-direction: column; overflow: hidden; z-index: 2147483000; border: 1px solid rgba(245,245,247,0.1);
      }
      .panel.open { display: flex; }
      .header { padding: 0.9rem 1rem; font-weight: 600; border-bottom: 1px solid rgba(245,245,247,0.1); }
      .log { flex: 1; overflow-y: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
      .msg { max-width: 85%; padding: 0.6rem 0.8rem; border-radius: 12px; font-size: 0.85rem; line-height: 1.5; white-space: pre-wrap; }
      .msg.assistant { align-self: flex-start; background: #3A3A3C; border-bottom-left-radius: 4px; }
      .msg.user { align-self: flex-end; background: #7ECFBA; color: #0D0D0F; border-bottom-right-radius: 4px; }
      .msg.pending { opacity: 0.6; }
      form { display: flex; gap: 0.4rem; padding: 0.6rem; border-top: 1px solid rgba(245,245,247,0.1); }
      input { flex: 1; background: #3A3A3C; color: #F5F5F7; border: 1px solid rgba(245,245,247,0.12); border-radius: 8px; padding: 0.55rem 0.7rem; font-size: 0.85rem; }
      button.send { background: #7ECFBA; color: #0D0D0F; border: none; border-radius: 8px; padding: 0.55rem 0.9rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    </style>
    <button class="bubble" aria-label="Open chat">
      <svg viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    </button>
    <div class="panel">
      <div class="header">SkyTime assistant</div>
      <div class="log"></div>
      <form>
        <input type="text" placeholder="Type a message…" autocomplete="off" dir="auto" required />
        <button type="submit" class="send">Send</button>
      </form>
    </div>
  `;

  const bubble = root.querySelector('.bubble');
  const panel = root.querySelector('.panel');
  const log = root.querySelector('.log');
  const form = root.querySelector('form');
  const input = root.querySelector('input');
  const sessionKey = getSessionKey();
  let greeted = false;

  function appendMessage(text, role) {
    const el = document.createElement('div');
    el.className = `msg ${role}`;
    el.setAttribute('dir', 'auto');
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  bubble.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      if (!greeted) {
        appendMessage('Hi — ask me anything about SkyTime. / سلام، هر سوالی درباره SkyTime داری بپرس.', 'assistant');
        greeted = true;
      }
      input.focus();
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    input.disabled = true;
    appendMessage(message, 'user');
    const pending = appendMessage('…', 'assistant');
    pending.classList.add('pending');

    try {
      const response = await fetch(`${ORIGIN}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey, message, widget: true })
      });
      const data = await response.json();
      pending.classList.remove('pending');
      if (!response.ok) throw new Error(data.error || 'Request failed');
      pending.textContent = data.reply;
    } catch {
      pending.classList.remove('pending');
      pending.textContent = 'Something went wrong. Please try again.';
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
})();
