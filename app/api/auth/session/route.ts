import { NextResponse } from 'next/server';
import { createToken, verifyToken } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, uid, email } = body;
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    // In a real app we would verify the Firebase token here via Admin SDK.
    // For this demonstration, we create a session JWT.
    const sessionJwt = await createToken({ uid: uid || 'unknown', email: email || '' }, '7d');

    const response = NextResponse.json({ success: true }, { status: 200 });
    
    // Set a strict HttpOnly cookie
    response.cookies.set({
      name: 'auth_jwt_session',
      value: sessionJwt,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    console.error('Session creation failed', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.delete('auth_jwt_session');
  return response;
}
