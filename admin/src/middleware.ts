import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
    
    const pathname = request.nextUrl.pathname;

    const token = request.cookies.get('auth_token')?.value;

    const protectedRoutes = ["/dashboard"];

    const publicRoutes = ['/auth/login','/auth/signup','/'];

    const isProtectedRoute = protectedRoutes.some((route) => 
        pathname.startsWith(route)
    );

    const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
    );

    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/auth/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    if ((pathname === '/auth/login' || pathname === '/auth/signup') && token) {
        const loginUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher : ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}