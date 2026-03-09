import { spawn } from 'node:child_process';
import path      from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { locations, types, limit } = await req.json();

  const pipelineDir = path.resolve(process.cwd(), '../lead-pipeline');
  const encoder     = new TextEncoder();

  const send = (controller: ReadableStreamDefaultController, payload: object) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

  const stream = new ReadableStream({
    start(controller) {
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        TARGET_LOCATIONS: (locations as string) || 'St. Louis MO',
        BUSINESS_TYPES:   (types     as string) || 'restaurant,hair_care,plumber',
        DISCOVER_LIMIT:   String(limit ?? 50),
        FORCE_COLOR:      '0', // strip ANSI color codes from output
      };

      const script = path.resolve(pipelineDir, 'src', 'run.js');
      const child = spawn(process.execPath, [script], { cwd: pipelineDir, env });

      const flush = (data: Buffer, isErr = false) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) send(controller, { line, error: isErr });
      };

      child.stdout.on('data', d => flush(d));
      child.stderr.on('data', d => flush(d, true));

      child.on('close', code => {
        send(controller, { done: true, code });
        controller.close();
      });

      child.on('error', err => {
        send(controller, { line: `Failed to start: ${err.message}`, error: true });
        send(controller, { done: true, code: 1 });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
