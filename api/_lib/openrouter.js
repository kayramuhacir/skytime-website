// Free OpenRouter models get shared, fluctuating rate limits and are sometimes retired
// outright — the original pick (nvidia/nemotron-3-nano-30b-a3b:free) 404s as of 2026-09-06
// because it no longer exists. nemotron-3-super-120b-a12b:free confirmed working (plain
// replies + tool calls) as of 2026-09-06. If this one stops working, hit
// GET https://openrouter.ai/api/v1/models, filter for the ":free" suffix, and test a
// candidate directly against /chat/completions before swapping it in — don't assume this
// list is still current. Override with OPENROUTER_MODEL without a redeploy if needed.
const MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free';
const MAX_TOOL_ROUNDS = 4;

async function chatCompletion(messages, tools) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: tools?.length ? tools : undefined
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter chat completion failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Runs the OpenRouter chat + tool-use loop (OpenAI-compatible) and returns the final assistant text.
 * `runTool(name, args)` executes a tool call and returns its JSON-serializable result.
 */
export async function chatWithTools({ systemInstruction, tools, messages, runTool }) {
  const history = [{ role: 'system', content: systemInstruction }, ...messages];
  const openaiTools = tools.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters }
  }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const data = await chatCompletion(history, openaiTools);
    const message = data.choices?.[0]?.message;
    if (!message) throw new Error(`OpenRouter returned no message: ${JSON.stringify(data)}`);

    const toolCalls = message.tool_calls || [];
    if (toolCalls.length === 0) {
      return (message.content || '').trim();
    }

    history.push({ role: 'assistant', content: message.content || null, tool_calls: toolCalls });

    for (const call of toolCalls) {
      const args = JSON.parse(call.function.arguments || '{}');
      const result = await runTool(call.function.name, args);
      history.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return "Sorry, I'm having trouble finishing that thought — could you try again?";
}
