import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function DELETE() {
  try {
    await query('DELETE FROM quiz_results');
    await query('DELETE FROM users');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
