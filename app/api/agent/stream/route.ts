import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

/** Simulated agent activity messages for SSE live feed */
const AGENT_MESSAGES = [
  'Connecting to n8n workflow...',
  'Analyzing LinkedIn profile...',
  'Computing similarity score...',
  'Fetching expert vectors from database...',
  'Applying ML ranker...',
  'Building knowledge graph...',
  'Identifying industry clusters...',
  'Expert match complete.',
];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const projectId = req.nextUrl.searchParams.get('projectId') ?? '';

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      for (let i = 0; i < AGENT_MESSAGES.length; i++) {
        const msg = AGENT_MESSAGES[i];
        const payload = JSON.stringify({
          message: msg,
          timestamp: new Date().toISOString(),
          progress: Math.round(((i + 1) / AGENT_MESSAGES.length) * 100),
          projectId: projectId || undefined,
        });
        send(payload);
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
      }

      send(
        JSON.stringify({
          message: 'Agent idle',
          timestamp: new Date().toISOString(),
          progress: 100,
          done: true,
        })
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
