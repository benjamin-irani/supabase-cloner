/**
 * Next.js Middleware
 * Security headers, rate limiting, and request validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SecurityManager, RateLimiter, AuditLogger } from './lib/security-client';
import { config } from './lib/config';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add security headers
  addSecurityHeaders(response);
  
  // Rate limiting
  const rateLimitResult = await handleRateLimit(request);
  if (rateLimitResult) return rateLimitResult;
  
  // API route protection
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const apiResponse = await handleAPIRoute(request);
    if (apiResponse) return apiResponse;
  }
  
  // Dashboard route protection
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const authResponse = await handleDashboardRoute(request);
    if (authResponse) return authResponse;
  }
  
  return response;
}

/**
 * Add comprehensive security headers
 */
function addSecurityHeaders(response: NextResponse) {
  // Content Security Policy
  response.headers.set('Content-Security-Policy', SecurityManager.generateCSPHeader());
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://')) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Remove server information
  response.headers.delete('X-Powered-By');
  response.headers.set('Server', 'SupaClone');
}

/**
 * Handle rate limiting
 */
async function handleRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  
  // Different rate limits for different endpoints (development-friendly)
  let maxRequests = 1000;
  let windowMs = 60000; // 1 minute
  
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    maxRequests = process.env.NODE_ENV === 'development' ? 100 : 10; // More lenient in development
    windowMs = process.env.NODE_ENV === 'development' ? 60000 : 300000; // 1 minute in dev, 5 minutes in prod
  } else if (request.nextUrl.pathname.startsWith('/api/migrations')) {
    maxRequests = process.env.NODE_ENV === 'development' ? 200 : 50; // More lenient in development
    windowMs = 60000; // 1 minute
  }
  
  const rateLimitResult = RateLimiter.checkRateLimit(
    `${ip}:${request.nextUrl.pathname}`,
    maxRequests,
    windowMs
  );
  
  if (!rateLimitResult.allowed) {
    // Log rate limit violation
    AuditLogger.logSecurityEvent({
      type: 'access',
      action: 'rate_limit_exceeded',
      details: {
        ip,
        userAgent,
        path: request.nextUrl.pathname,
        resetTime: rateLimitResult.resetTime,
      },
      ipAddress: ip,
      userAgent,
    });
    
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
      },
    });
  }
  
  return null;
}

/**
 * Handle API route protection
 */
async function handleAPIRoute(request: NextRequest): Promise<NextResponse | null> {
  // Skip auth endpoints
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return null;
  }
  
  // Check authentication for protected API routes
  const token = await getToken({ 
    req: request, 
    secret: config.auth.nextAuthSecret 
  });
  
  if (!token) {
    AuditLogger.logSecurityEvent({
      type: 'access',
      action: 'unauthorized_api_access',
      details: {
        path: request.nextUrl.pathname,
        method: request.method,
      },
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    });
    
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  // Validate request size for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      AuditLogger.logSecurityEvent({
        type: 'access',
        action: 'request_too_large',
        userId: token.email || undefined,
        details: {
          path: request.nextUrl.pathname,
          contentLength: parseInt(contentLength),
          maxSize,
        },
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || '',
      });
      
      return new NextResponse('Request Entity Too Large', { status: 413 });
    }
  }
  
  return null;
}

/**
 * Handle dashboard route protection
 */
async function handleDashboardRoute(request: NextRequest): Promise<NextResponse | null> {
  const token = await getToken({ 
    req: request, 
    secret: config.auth.nextAuthSecret 
  });
  
  if (!token) {
    // Redirect to sign in page
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    
    AuditLogger.logSecurityEvent({
      type: 'access',
      action: 'unauthorized_dashboard_access',
      details: {
        path: request.nextUrl.pathname,
        redirectTo: signInUrl.toString(),
      },
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    });
    
    return NextResponse.redirect(signInUrl);
  }
  
  // Check token expiration
  if (token.expiresAt && Date.now() > (token.expiresAt as number) * 1000) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    signInUrl.searchParams.set('error', 'TokenExpired');
    
    return NextResponse.redirect(signInUrl);
  }
  
  return null;
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return 'unknown';
}

/**
 * Validate request origin
 */
function isValidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  if (!origin && !referer) {
    return false;
  }
  
  const allowedOrigins = [
    config.auth.nextAuthUrl,
    'http://localhost:3000', // Development
  ];
  
  if (origin && !allowedOrigins.includes(origin)) {
    return false;
  }
  
  if (referer && !allowedOrigins.some(allowed => referer.startsWith(allowed))) {
    return false;
  }
  
  return true;
}

// Configure which paths the middleware should run on
export const config_middleware = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
