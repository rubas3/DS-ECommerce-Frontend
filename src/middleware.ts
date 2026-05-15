import { NextRequest, NextResponse } from "next/server";

function buildCorsHeaders(request: NextRequest): HeadersInit {
  const requestOrigin = request.headers.get("origin");
  const configuredOrigin = process.env.CORS_ALLOWED_ORIGIN?.trim();
  const allowOrigin =
    configuredOrigin && configuredOrigin.length > 0
      ? configuredOrigin
      : requestOrigin ?? "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function middleware(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
