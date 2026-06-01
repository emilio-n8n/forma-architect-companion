/**
 * Simple in-memory rate limiter for development
 * For production, use Redis-based rate limiter
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store: key = userId or IP, value = rate limit entry
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_CONFIG = {
  // Chat API: 10 requests per minute per user
  CHAT: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  // Generation API: 5 requests per minute per user
  GENERATION: {
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
  // Render API: 3 requests per minute per user (expensive)
  RENDER: {
    maxRequests: 3,
    windowMs: 60 * 1000,
  },
} as const;

type RateLimitType = keyof typeof RATE_LIMIT_CONFIG;

/**
 * Check if request should be rate limited
 * @param type - Type of rate limit (CHAT, GENERATION, RENDER)
 * @param identifier - User ID or IP address
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(type: RateLimitType, identifier: string): boolean {
  const config = RATE_LIMIT_CONFIG[type];
  const now = Date.now();
  const key = `${type}:${identifier}`;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // First request or window expired - create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return true;
  }
  
  // Window still active
  if (entry.count >= config.maxRequests) {
    return false; // Rate limited
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  return true;
}

/**
 * Get remaining requests and reset time
 */
export function getRateLimitStatus(type: RateLimitType, identifier: string): {
  remaining: number;
  resetAt: number;
} {
  const config = RATE_LIMIT_CONFIG[type];
  const now = Date.now();
  const key = `${type}:${identifier}`;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    return {
      remaining: config.maxRequests,
      resetAt: now + config.windowMs,
    };
  }
  
  return {
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetTime,
  };
}

/**
 * Reset rate limit for a specific key (useful for testing)
 */
export function resetRateLimit(type: RateLimitType, identifier: string): void {
  const key = `${type}:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Create rate limit headers for response
 */
export function getRateLimitHeaders(type: RateLimitType, identifier: string): Record<string, string> {
  const status = getRateLimitStatus(type, identifier);
  return {
    'X-RateLimit-Limit': RATE_LIMIT_CONFIG[type].maxRequests.toString(),
    'X-RateLimit-Remaining': status.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(status.resetAt / 1000).toString(),
  };
}
