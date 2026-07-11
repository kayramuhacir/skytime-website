// One-off local script: chunks content/kb/*.md, embeds each chunk with Gemini, and
// upserts them into Supabase's kb_documents table for RAG lookup.
//
// Run locally (not deployed as an API route):
//   GOOGLE_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/ingest-kb.mjs

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { embedText } from '../api/_lib/embeddings.js';
import { getSupabase } from '../api/_lib/supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.join(__dirname, '..', 'content', 'kb');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function chunkMarkdown(text) {
  return text
    .split(/\n\s*\n/)
    .map(chunk => chunk.trim())
    .filter(Boolean);
}

async function main() {
  for (const key of ['GOOGLE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[key]) {
      console.error(`Missing required env var: ${key}`);
      process.exit(1);
    }
  }

  const supabase = getSupabase();
  const files = (await readdir(KB_DIR)).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const source = file;
    const raw = await readFile(path.join(KB_DIR, file), 'utf-8');
    const chunks = chunkMarkdown(raw);

    // Re-running this script should replace, not duplicate, a source file's chunks.
    await supabase.from('kb_documents').delete().eq('source', source);

    for (const content of chunks) {
      const embedding = await embedText(content);
      const { error } = await supabase.from('kb_documents').insert({ source, content, embedding });
      if (error) throw new Error(`Failed to insert chunk from ${source}: ${error.message}`);
      await sleep(300); // stay comfortably under free-tier rate limits
    }

    console.log(`Ingested ${chunks.length} chunks from ${source}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
