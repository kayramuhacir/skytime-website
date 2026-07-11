const EMBEDDING_MODEL = 'gemini-embedding-001';
const OUTPUT_DIMENSIONALITY = 768; // must match the `vector(768)` columns in supabase/chat-schema.sql

export async function embedText(text) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent` +
    `?key=${process.env.GOOGLE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: OUTPUT_DIMENSIONALITY
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini embedContent failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.embedding.values;
}
