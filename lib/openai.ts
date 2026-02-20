import OpenAI from 'openai';

/**
 * Embedding provider: "openai" | "xai" (Grok)
 * xAI is OpenAI-compatible; use XAI_API_KEY and get free credits at console.x.ai
 */
const PROVIDER = (process.env.EMBEDDING_PROVIDER || 'xai').toLowerCase();
const USE_XAI = PROVIDER === 'xai' || PROVIDER === 'grok';

const client = new OpenAI({
  apiKey: USE_XAI ? process.env.XAI_API_KEY : process.env.OPENAI_API_KEY,
  baseURL: USE_XAI ? 'https://api.x.ai/v1' : undefined,
});

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || (USE_XAI ? 'text-embedding-3-small' : 'text-embedding-3-small');
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generates a vector embedding for the given text.
 * Uses xAI (Grok) by default for free credits; set EMBEDDING_PROVIDER=openai for OpenAI.
 * Output: 1536 dimensions for pgvector semantic search.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Invalid embedding: expected ${EMBEDDING_DIMENSIONS} dimensions`);
  }

  return embedding;
}

const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini';

/**
 * One-turn chat completion for MAS agents (Scholar, Valuer, Auditor).
 * Returns the assistant message content as text.
 */
export async function completeChat(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 1024,
    temperature: 0.2,
  });
  const content = response.choices[0]?.message?.content?.trim();
  if (content == null) throw new Error('Empty chat completion');
  return content;
}
