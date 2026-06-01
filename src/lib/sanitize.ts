/**
 * Sanitization utilities for XSS protection
 * Simple HTML sanitizer - removes all HTML tags and dangerous content
 * Note: For production, consider using DOMPurify (npm install dompurify jsdom)
 */

/**
 * Remove all HTML tags from a string to prevent XSS
 * This is a simple implementation that removes all tags between < and >
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return input;
  
  // Remove all HTML tags
  // This regex matches <...> patterns including nested tags
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize for ReactMarkdown - ensure no dangerous HTML in markdown
 * Removes script tags, event handlers, and other dangerous patterns
 */
export function sanitizeMarkdown(input: string): string {
  if (typeof input !== 'string') return input;
  
  let result = input;
  
  // Remove script tags
  result = result.replace(/<script[^>]*>.*?<\/script>/gsi, '');
  
  // Remove event handlers (onerror, onclick, etc.)
  result = result.replace(/\bon\w+\s*=\s*["'][^"']*["']/g, '');
  
  // Remove javascript: URLs
  result = result.replace(/href=["']javascript:[^"']*["']/g, '');
  
  // Remove data: URLs (can contain malicious content)
  result = result.replace(/href=["']data:[^"']*["']/g, '');
  
  // Remove all remaining HTML tags
  result = result.replace(/<[^>]*>/g, '');
  
  return result;
}

/**
 * Sanitize JSON content to prevent injection attacks
 * Removes potentially dangerous keys and values
 */
export function sanitizeJson(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJson);
  }
  
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Remove keys that look like they could execute code
    if (typeof key === 'string' && /^__proto__|prototype|constructor$/.test(key)) {
      continue;
    }
    
    if (typeof value === 'string') {
      // Sanitize string values
      result[key] = sanitizeHtml(value);
    } else {
      result[key] = sanitizeJson(value);
    }
  }
  
  return result;
}

/**
 * Escape HTML special characters to prevent XSS when rendering raw text
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
