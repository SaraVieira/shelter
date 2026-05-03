import { auth } from "./auth";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Simple in-memory rate limiter
// In production, use Redis or similar
const rateLimits = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
};

export function createRateLimiter(options: Partial<RateLimitOptions> = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return async function rateLimit(request: Request): Promise<Response | null> {
    // Get identifier (API key for upload, session for others)
    let identifier: string;
    
    const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");
    if (apiKey) {
      // For API key authenticated requests
      identifier = `api:${apiKey.substring(0, 10)}`;
    } else {
      // For session authenticated requests, get user ID
      try {
        const session = await auth.api.getSession({ headers: request.headers });
        if (session?.user) {
          identifier = `user:${session.user.id}`;
        } else {
          identifier = `ip:${request.headers.get("x-forwarded-for") || "unknown"}`;
        }
      } catch {
        identifier = `ip:${request.headers.get("x-forwarded-for") || "unknown"}`;
      }
    }
    
    const now = Date.now();
    const entry = rateLimits.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      // New window
      rateLimits.set(identifier, {
        count: 1,
        resetTime: now + opts.windowMs,
      });
      return null; // Not rate limited
    }
    
    if (entry.count >= opts.maxRequests) {
      // Rate limit exceeded
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(opts.maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000)),
          },
        }
      );
    }
    
    // Increment count
    entry.count++;
    return null; // Not rate limited
  };
}

// Cleanup old entries periodically (every hour)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetTime) {
      rateLimits.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Pre-configured rate limiters for different endpoints
export const uploadRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 60, // 60 uploads per hour
});

export const apiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
});

export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
});
