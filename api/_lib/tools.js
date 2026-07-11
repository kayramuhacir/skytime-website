import { getSupabase } from './supabase.js';

export const toolDefinitions = [
  {
    name: 'capture_lead',
    description:
      'Save a visitor\'s contact info because they asked about pricing, early access, a partnership, ' +
      'or otherwise want SkyTime to follow up with them. Only call this once you actually have an email ' +
      'from the user in this conversation - ask for it first if they haven\'t given one.',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'The lead\'s email address.' },
        name: { type: 'string', description: 'The lead\'s name, if given.' },
        phone: { type: 'string', description: 'The lead\'s phone number, if given.' },
        message: { type: 'string', description: 'What they\'re interested in, in a short sentence.' }
      },
      required: ['email']
    }
  },
  {
    name: 'check_registration_status',
    description:
      'Check whether an email address is already on the SkyTime waitlist. Use this when the user asks ' +
      '"am I signed up?" or similar, and you have their email.',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'The email address to look up.' }
      },
      required: ['email']
    }
  }
];

export async function runTool(name, input, { sessionKey, channel }) {
  const supabase = getSupabase();

  if (name === 'capture_lead') {
    const { error } = await supabase.from('leads').insert({
      email: input.email,
      name: input.name ?? null,
      phone: input.phone ?? null,
      message: input.message ?? null,
      source_channel: channel,
      session_key: sessionKey
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  if (name === 'check_registration_status') {
    const { data, error } = await supabase
      .from('waitlist')
      .select('created_at')
      .eq('email', input.email)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    return data ? { registered: true, since: data.created_at } : { registered: false };
  }

  return { ok: false, error: `Unknown tool: ${name}` };
}
