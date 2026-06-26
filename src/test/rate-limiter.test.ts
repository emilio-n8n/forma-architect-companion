import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  getRateLimitHeaders,
  clearAllRateLimits,
} from "@/lib/rate-limiter";

describe("rate-limiter", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it("returns true for first request", () => {
    const result = checkRateLimit("CHAT", "user-1");
    expect(result).toBe(true);
  });

  it("returns false after exceeding limit", () => {
    const type = "CHAT";
    const id = "user-1";

    // CHAT allows 10 requests per window
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(type, id)).toBe(true);
    }

    // 11th request should be rate limited
    expect(checkRateLimit(type, id)).toBe(false);
  });

  it("returns correct rate limit headers", () => {
    const type = "CHAT";
    const id = "user-1";

    const headers = getRateLimitHeaders(type, id);
    expect(headers["X-RateLimit-Limit"]).toBe("10");
    expect(headers["X-RateLimit-Remaining"]).toBe("10");
    expect(headers["X-RateLimit-Reset"]).toBeDefined();

    // Make a request and check remaining decreases
    checkRateLimit(type, id);
    const headersAfter = getRateLimitHeaders(type, id);
    expect(headersAfter["X-RateLimit-Remaining"]).toBe("9");
  });

  it("resets after window expires", () => {
    const type = "CHAT";
    const id = "user-1";

    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      checkRateLimit(type, id);
    }
    expect(checkRateLimit(type, id)).toBe(false);

    // Simulate window expiration by clearing
    clearAllRateLimits();
    expect(checkRateLimit(type, id)).toBe(true);
  });

  it("tracks different identifiers separately", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("CHAT", "user-a");
    }
    expect(checkRateLimit("CHAT", "user-a")).toBe(false);
    expect(checkRateLimit("CHAT", "user-b")).toBe(true);
  });

  it("tracks different rate limit types separately", () => {
    // Exhaust CHAT but not GENERATION
    for (let i = 0; i < 10; i++) {
      checkRateLimit("CHAT", "user-1");
    }
    expect(checkRateLimit("CHAT", "user-1")).toBe(false);
    expect(checkRateLimit("GENERATION", "user-1")).toBe(true);
  });
});
