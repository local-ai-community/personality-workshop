import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const result = await query(
      'SELECT sporty, creative, social, logical, adventurous, calm FROM quiz_results WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json({ quiz: result.rows[0] });
  } catch (error) {
    console.error('Quiz fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, answers } = await req.json();

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const requiredFields = ['sporty', 'creative', 'social', 'logical', 'adventurous', 'calm'];
    for (const field of requiredFields) {
      if (typeof answers[field] !== 'number' || answers[field] < 0 || answers[field] > 10) {
        return NextResponse.json(
          { error: `${field} must be a number between 0 and 10` },
          { status: 400 }
        );
      }
    }

    const existingQuiz = await query(
      'SELECT id FROM quiz_results WHERE user_id = $1',
      [userId]
    );

    let result;
    if (existingQuiz.rows.length > 0) {
      result = await query(
        `UPDATE quiz_results 
         SET sporty = $1, creative = $2, social = $3, logical = $4, adventurous = $5, calm = $6, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $7
         RETURNING *`,
        [
          answers.sporty,
          answers.creative,
          answers.social,
          answers.logical,
          answers.adventurous,
          answers.calm,
          userId,
        ]
      );
    } else {
      result = await query(
        `INSERT INTO quiz_results (user_id, sporty, creative, social, logical, adventurous, calm)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          userId,
          answers.sporty,
          answers.creative,
          answers.social,
          answers.logical,
          answers.adventurous,
          answers.calm,
        ]
      );
    }

    const quiz = result.rows[0];

    const userResult = await query(
      'SELECT name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length > 0) {
      const payload = JSON.stringify({
        userId,
        name: userResult.rows[0].name,
        sporty: quiz.sporty,
        creative: quiz.creative,
        social: quiz.social,
        logical: quiz.logical,
        adventurous: quiz.adventurous,
        calm: quiz.calm,
      });

      await query(`NOTIFY quiz_updates, '${payload}'`);
    }

    return NextResponse.json({ quiz }, { status: 200 });
  } catch (error) {
    console.error('Quiz submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
