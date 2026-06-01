// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      // ⭐ SECURITY: Configure security headers (CSP, HSTS, etc.)
      headers: {
        // Content Security Policy - Restrict sources to prevent XSS
        'Content-Security-Policy': 
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https: blob:; " +
          "font-src 'self'; " +
          "connect-src 'self' https://api.cerebras.ai https://ai.gateway.lovable.dev; " +
          "frame-src 'none'; " +
          "object-src 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self';",
        
        // Prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',
        
        // Prevent clickjacking
        'X-Frame-Options': 'DENY',
        
        // Enable XSS protection
        'X-XSS-Protection': '1; mode=block',
        
        // Referrer policy
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        
        // Permissions policy
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      },
    },
  },
});
