import OpenAI from 'openai';

/**
 * Embedding provider: "openrouter" | "openai" | "xai" (Grok)
 * OpenRouter: unified API, use OPENROUTER_API_KEY
 * xAI: use XAI_API_KEY
 * OpenAI: use OPENAI_API_KEY
 */
function getClient(): OpenAI {
  const provider = (process.env.EMBEDDING_PROVIDER || 'xai').toLowerCase().trim();
  const useOpenRouter = provider === 'openrouter';
  const useXai = provider === 'xai' || provider === 'grok';
  const raw = useOpenRouter
    ? process.env.OPENROUTER_API_KEY
    : useXai
      ? process.env.XAI_API_KEY
      : process.env.OPENAI_API_KEY;
  const apiKey = raw?.trim();
  const baseURL = useOpenRouter
    ? 'https://openrouter.ai/api/v1'
    : useXai
      ? 'https://api.x.ai/v1'
      : undefined;

  if (!apiKey || apiKey.length < 10) {
    const varName = useOpenRouter ? 'OPENROUTER_API_KEY' : useXai ? 'XAI_API_KEY' : 'OPENAI_API_KEY';
    throw new Error(
      `Missing or invalid ${varName}. Set EMBEDDING_PROVIDER=openrouter and OPENROUTER_API_KEY in Vercel env (Settings → Environment Variables).`
    );
  }

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) _client = getClient();
  return _client;
}

const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL ||
  (process.env.EMBEDDING_PROVIDER?.toLowerCase() === 'openrouter' ? 'openai/text-embedding-3-small' : 'text-embedding-3-small');
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generates a vector embedding for the given text.
 * Uses OpenRouter by default; set EMBEDDING_PROVIDER=openrouter|openai|xai.
 * Output: 1536 dimensions for pgvector semantic search.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await client().embeddings.create({
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

const _chatModel = process.env.CHAT_MODEL || 'gpt-4o-mini';
const useOpenRouterForChat = process.env.EMBEDDING_PROVIDER?.toLowerCase() === 'openrouter';
const CHAT_MODEL = useOpenRouterForChat && !_chatModel.includes('/') ? `openai/${_chatModel}` : _chatModel;

/**
 * One-turn chat completion for MAS agents (Scholar, Valuer, Auditor).
 * Returns the assistant message content as text.
 */
export async function completeChat(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await client().chat.completions.create({
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
