import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT u.id, u.name, u.created_at,
             qr.sporty, qr.creative, qr.social, qr.logical, qr.adventurous, qr.calm
      FROM users u
      LEFT JOIN quiz_results qr ON u.id = qr.user_id
      ORDER BY u.created_at DESC
    `);

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await query('DELETE FROM users WHERE id = $1', [userId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
