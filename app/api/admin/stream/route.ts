import { NextRequest } from 'next/server';
import { Client } from 'pg';

export async function GET(req: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    await client.query('LISTEN quiz_updates');

    const encoder = new TextEncoder();
    const notifiedUsers = new Set<number>();

    // Track existing users so we don't re-notify
    const existingUsers = await client.query(`
      SELECT u.id FROM users u
      JOIN quiz_results qr ON u.id = qr.user_id
    `);
    existingUsers.rows.forEach((row) => notifiedUsers.add(row.id));

    const stream = new ReadableStream({
      async start(controller) {
        client.on('notification', (msg) => {
          try {
            const data = JSON.parse(msg.payload!);

            if (notifiedUsers.has(data.userId)) {
              return;
            }

            notifiedUsers.add(data.userId);

            const userData = {
              id: data.userId,
              name: data.name,
              sporty: data.sporty,
              creative: data.creative,
              social: data.social,
              logical: data.logical,
              adventurous: data.adventurous,
              calm: data.calm,
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(userData)}\n\n`)
            );
          } catch (error) {
            console.error('Notification error:', error);
          }
        });

        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        }, 30000);

        req.signal.addEventListener('abort', async () => {
          clearInterval(keepAlive);
          try {
            await client.query('UNLISTEN quiz_updates');
          } catch (err) {
            console.error('Error unsubscribing:', err);
          }
          try {
            await client.end();
          } catch (err) {
            console.error('Error closing connection:', err);
          }
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Stream setup error:', error);
    try {
      await client.end();
    } catch (err) {
      console.error('Error closing client:', err);
    }
    return new Response('Internal server error', { status: 500 });
  }
}
