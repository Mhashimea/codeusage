import { db, rateLimits } from "./db";
import { eq, and, gt, sql } from "drizzle-orm";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until retry is allowed
}

/**
 * Database-backed rate limiter for distributed environments (Vercel serverless)
 * Uses PostgreSQL for persistence across function instances
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);
  const expiresAt = new Date(now.getTime() + config.windowMs);

  // Clean up expired entries periodically (1% chance per request)
  if (Math.random() < 0.01) {
    await db.delete(rateLimits).where(
      sql`${rateLimits.expires_at} < NOW()`
    );
  }

  // Get current rate limit entry
  const existing = await db
    .select()
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.key, key),
        gt(rateLimits.window_start, windowStart)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    // No existing entry, create new one
    await db.insert(rateLimits).values({
      key,
      count: 1,
      window_start: now,
      expires_at: expiresAt,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: expiresAt,
    };
  }

  const entry = existing[0];

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.expires_at.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.expires_at,
      retryAfter: Math.max(1, retryAfter),
    };
  }

  // Increment counter
  await db
    .update(rateLimits)
    .set({ count: entry.count + 1 })
    .where(eq(rateLimits.id, entry.id));

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count - 1,
    resetAt: entry.expires_at,
  };
}

/**
 * Pre-configured rate limiters for different endpoints
 */
export const rateLimiters = {
  // OTP sending: 3 requests per 5 minutes per email
  sendOtp: (email: string) =>
    checkRateLimit(`otp:send:${email.toLowerCase()}`, {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 3,
    }),

  // OTP verification: 5 attempts per 10 minutes per email
  verifyOtp: (email: string) =>
    checkRateLimit(`otp:verify:${email.toLowerCase()}`, {
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxRequests: 5,
    }),

  // IP-based rate limiting for auth endpoints: 20 requests per minute
  authByIp: (ip: string) =>
    checkRateLimit(`auth:ip:${ip}`, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20,
    }),

  // API task ingestion: 100 requests per minute per workspace
  taskIngestion: (workspaceId: string) =>
    checkRateLimit(`api:tasks:${workspaceId}`, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    }),
};

/**
 * Get client IP from request headers
 * Handles Vercel's x-forwarded-for header
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}
