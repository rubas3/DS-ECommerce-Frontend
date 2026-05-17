import { NextRequest, NextResponse } from "next/server";

function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return (
    origin.endsWith(".vercel.app") ||
    origin === "http://localhost:3000" ||
    origin === "https://localhost:3000"
  );
}

function buildCorsHeaders(request: NextRequest): HeadersInit {
  const requestOrigin = request.headers.get("origin");
  const configuredOrigin = process.env.CORS_ALLOWED_ORIGIN?.trim();

  let allowOrigin = configuredOrigin || requestOrigin || "*";
  if (requestOrigin && isAllowedOrigin(requestOrigin)) {
    allowOrigin = requestOrigin;
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, ngrok-skip-browser-warning",
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
