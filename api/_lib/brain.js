import { getSupabase } from './supabase.js';
import { embedText } from './embeddings.js';
import { chatWithTools } from './openrouter.js';
import { toolDefinitions, runTool } from './tools.js';

const SHORT_TERM_WINDOW = 12;
const SUMMARIZE_EVERY = 10;
const KEEP_LATEST_FOR_SUMMARY = 6;

const SYSTEM_PROMPT = `You are the SkyTime assistant — a calm, direct, honest guide to the SkyTime app
(a personal planning layer for the time between takeoff and landing, online or offline; tagline
"Your time. Your altitude."). SkyTime was founded by Kiana.

Tone: no hype, no exclamation points, no words like "amazing" or "supercharge". Short, confident
sentences. Address the person directly. Frame things in terms of time (e.g. "in 3 hours").

Language: always reply in English, regardless of what language the person writes in.

You can use two tools:
- capture_lead: when someone shows real interest (pricing, early access, partnership, "contact me"),
  ask for their email if you don't have it yet, then call this tool to save them as a lead.
- check_registration_status: when someone asks if they're already on the waitlist, ask for their
  email if you don't have it, then call this tool and tell them the result plainly.

Only talk about SkyTime and this conversation. Keep answers short — this is a chat, not an essay.`;

async function ensureSession(supabase, sessionKey, channel, externalId) {
  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('summary, message_count')
    .eq('session_key', sessionKey)
    .maybeSingle();

  if (existing) return existing;

  await supabase.from('chat_sessions').insert({
    session_key: sessionKey,
    channel,
    external_id: externalId ?? null
  });
  return { summary: '', message_count: 0 };
}

async function maybeSummarize(supabase, sessionKey, existingSummary, messageCount) {
  if (messageCount === 0 || messageCount % SUMMARIZE_EVERY !== 0) return existingSummary;

  const { data: rows } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_key', sessionKey)
    .order('created_at', { ascending: true });

  const older = (rows || []).slice(0, -KEEP_LATEST_FOR_SUMMARY);
  if (older.length === 0) return existingSummary;

  const transcript = older.map(m => `${m.role}: ${m.content}`).join('\n');
  const prompt =
    `Existing summary of this conversation so far:\n${existingSummary || '(none yet)'}\n\n` +
    `Additional conversation to fold in:\n${transcript}\n\n` +
    'Write an updated, concise summary (3-5 short sentences) capturing durable facts about this ' +
    'person and the conversation — things worth remembering later. No preamble, just the summary.';

  const summary = await chatWithTools({
    systemInstruction: 'You write terse factual conversation summaries.',
    tools: [],
    messages: [{ role: 'user', content: prompt }],
    runTool: async () => ({})
  });

  await supabase.from('chat_sessions').update({ summary }).eq('session_key', sessionKey);
  return summary;
}

export async function handleMessage({ sessionKey, channel, externalId, message }) {
  const supabase = getSupabase();

  const session = await ensureSession(supabase, sessionKey, channel, externalId);

  const { data: recentMessages } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_key', sessionKey)
    .order('created_at', { ascending: false })
    .limit(SHORT_TERM_WINDOW);

  const history = (recentMessages || []).reverse();

  let ragContext = '';
  try {
    const embedding = await embedText(message);
    const { data: matches } = await supabase.rpc('match_kb_documents', {
      query_embedding: embedding,
      match_count: 4
    });
    if (matches?.length) {
      ragContext = '\n\nRelevant SkyTime info:\n' + matches.map(m => `- ${m.content}`).join('\n');
    }
  } catch {
    // RAG is best-effort — the chatbot still works from the system prompt + memory alone.
  }

  const systemInstruction =
    SYSTEM_PROMPT +
    (session.summary ? `\n\nWhat you remember about this person so far:\n${session.summary}` : '') +
    ragContext;

  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ];

  const reply = await chatWithTools({
    systemInstruction,
    tools: toolDefinitions,
    messages,
    runTool: (name, args) => runTool(name, args, { sessionKey, channel })
  });

  await supabase.from('chat_messages').insert([
    { session_key: sessionKey, role: 'user', content: message },
    { session_key: sessionKey, role: 'assistant', content: reply }
  ]);

  const newMessageCount = session.message_count + 2;
  await supabase
    .from('chat_sessions')
    .update({ message_count: newMessageCount, updated_at: new Date().toISOString() })
    .eq('session_key', sessionKey);

  await maybeSummarize(supabase, sessionKey, session.summary, newMessageCount);

  return { reply };
}
