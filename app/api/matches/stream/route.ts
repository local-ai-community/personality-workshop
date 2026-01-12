import { NextRequest } from 'next/server';
import { Client } from 'pg';
import { calculateEuclideanDistance } from '@/lib/vector';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('User ID is required', { status: 400 });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();

    const targetUserResult = await client.query(
      'SELECT * FROM quiz_results WHERE user_id = $1',
      [userId]
    );

    if (targetUserResult.rows.length === 0) {
      await client.end();
      return new Response('User has not completed quiz', { status: 404 });
    }

    const targetQuiz = targetUserResult.rows[0];
    const targetVector = {
      sporty: targetQuiz.sporty,
      creative: targetQuiz.creative,
      social: targetQuiz.social,
      logical: targetQuiz.logical,
      adventurous: targetQuiz.adventurous,
      calm: targetQuiz.calm,
    };

    await client.query('LISTEN quiz_updates');

    const encoder = new TextEncoder();
    const notifiedUsers = new Set<number>();

    const allUsersResult = await client.query(`
      SELECT u.id, u.name, qr.sporty, qr.creative, qr.social, qr.logical, qr.adventurous, qr.calm
      FROM users u
      JOIN quiz_results qr ON u.id = qr.user_id
      WHERE u.id != $1
    `, [userId]);

    allUsersResult.rows.forEach((user) => {
      notifiedUsers.add(user.id);
    });

    const stream = new ReadableStream({
      async start(controller) {
        client.on('notification', (msg) => {
          try {
            const data = JSON.parse(msg.payload!);

            if (data.userId === Number(userId)) {
              return;
            }

            if (notifiedUsers.has(data.userId)) {
              return;
            }

            notifiedUsers.add(data.userId);

            const userVector = {
              sporty: data.sporty,
              creative: data.creative,
              social: data.social,
              logical: data.logical,
              adventurous: data.adventurous,
              calm: data.calm,
            };

            const distance = calculateEuclideanDistance(targetVector, userVector);

            const matchData = {
              id: data.userId,
              name: data.name,
              distance,
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(matchData)}\n\n`)
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
