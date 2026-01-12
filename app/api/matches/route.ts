import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateEuclideanDistance } from '@/lib/vector';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const targetUserResult = await query(
      'SELECT * FROM quiz_results WHERE user_id = $1',
      [userId]
    );

    if (targetUserResult.rows.length === 0) {
      return NextResponse.json({ error: 'User has not completed quiz' }, { status: 404 });
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

    const allUsersResult = await query(`
      SELECT u.id, u.name, qr.sporty, qr.creative, qr.social, qr.logical, qr.adventurous, qr.calm
      FROM users u
      JOIN quiz_results qr ON u.id = qr.user_id
      WHERE u.id != $1
    `, [userId]);

    const matches = allUsersResult.rows.map((user: any) => {
      const userVector = {
        sporty: user.sporty,
        creative: user.creative,
        social: user.social,
        logical: user.logical,
        adventurous: user.adventurous,
        calm: user.calm,
      };

      return {
        id: user.id,
        name: user.name,
        distance: calculateEuclideanDistance(targetVector, userVector),
      };
    });

    matches.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({ matches: matches.slice(0, 5) });
  } catch (error) {
    console.error('Get matches error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
