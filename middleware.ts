import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_for_development_only_12345'
);

// Protected routes that need a valid session
const protectedRoutes = ['/dashboard'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('auth_jwt_session');

  if (!sessionCookie || !sessionCookie.value) {
    console.log(`Unauthenticated attempt to access ${pathname}, redirecting...`);
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // Verify the JWT (this throws an exception if invalid)
    await jwtVerify(sessionCookie.value, JWT_SECRET);
    
    // Everything is good, allow the request
    return NextResponse.next();
  } catch (err) {
    console.error('Invalid JWT session detected in middleware', err);
    // Erase the bad cookie and redirect
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('auth_jwt_session');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
