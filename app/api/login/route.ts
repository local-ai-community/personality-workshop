import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    const existingUser = await query(
      'SELECT id FROM users WHERE name = $1',
      [trimmedName]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'This name is already taken' },
        { status: 409 }
      );
    }

    const result = await query(
      'INSERT INTO users (name) VALUES ($1) RETURNING id, name, created_at',
      [trimmedName]
    );

    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
