import { NextResponse } from 'next/server';
import { getServerSession } from '@/modules/auth/session';

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, session: null }, { status: 401 });
  }
  const { userId: _userId, sessionVersion: _sv, ...publicSession } = session;
  return NextResponse.json({ ok: true, session: publicSession });
}
