-- SkyTime chatbot schema: RAG store, chat memory, leads.
-- Run this once in the Supabase Dashboard (Project "sky time" -> SQL Editor).
-- Does not touch the existing `waitlist` table.

create extension if not exists vector;

-- One row per conversation. session_key is "telegram:<chat_id>" for Telegram,
-- or a client-generated UUID (localStorage) for the web page / embeddable widget.
create table if not exists chat_sessions (
  session_key text primary key,
  channel text not null check (channel in ('web', 'widget', 'telegram')),
  external_id text,
  summary text not null default '',
  message_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Short-term memory: raw recent turns per session.
create table if not exists chat_messages (
  id bigserial primary key,
  session_key text not null references chat_sessions (session_key) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_key_created_at_idx
  on chat_messages (session_key, created_at);

-- RAG knowledge base: chunks of SkyTime content + their embeddings.
-- 768 dimensions matches Gemini's embedding-001 model truncated via outputDimensionality (see
-- api/_lib/embeddings.js) — its untruncated 3072-dim output exceeds pgvector's hnsw index limit.
create table if not exists kb_documents (
  id bigserial primary key,
  source text not null,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

create index if not exists kb_documents_embedding_idx
  on kb_documents using hnsw (embedding vector_cosine_ops);

create or replace function match_kb_documents(
  query_embedding vector(768),
  match_count int default 4
)
returns table (id bigint, source text, content text, similarity float)
language sql stable
as $$
  select id, source, content, 1 - (embedding <=> query_embedding) as similarity
  from kb_documents
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Leads captured by the chatbot's capture_lead tool.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  phone text,
  message text,
  source_channel text not null,
  session_key text,
  created_at timestamptz not null default now()
);

-- RLS enabled with no anon policies: only the service role (used server-side by
-- the chatbot's Vercel functions) can read/write these tables. The service role
-- bypasses RLS by default, so this is defense in depth, matching the posture
-- already used for `waitlist`.
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table kb_documents enable row level security;
alter table leads enable row level security;
