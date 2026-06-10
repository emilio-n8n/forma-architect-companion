# FORMA — Architecture

## Stack

```
Frontend: React 19.2 + TypeScript 5.8 + Vite 7.3 + Tailwind v4
UI: TanStack Router + Radix UI + shadcn/ui (New York) + Lucide
3D: Three.js + React Three Fiber + Drei
Backend: TanStack Start (SSR) + Nitro
DB: Supabase (PostgreSQL + Storage + Auth)
IA: OpenCode Zen (chat/mémoire), Mistral (extraction), Exa (web search)
Hébergement: Cloudflare Workers
```

## Thème

- Dark theme, fond `#090909`, tons or `#dcb383`
- Typo : Cormorant Garamond (titres), Inter (corps)
- Composants shadcn/ui New York via `tw-animate-css`

## Structure routes

```
/                     → Landing page marketing
/auth                 → Connexion / inscription (email + Google OAuth)
/dashboard            → Layout avec Sidebar + Outlet
/dashboard/agent      → Agent IA chat ← cœur du produit
/dashboard/render     → Render AI (images)
/dashboard/memories   → Mémoires synthétisées
/dashboard/projets    → Kanban projets
/dashboard/mini-archi → Plans 2D/3D
/dashboard/settings   → Profil utilisateur
/dashboard/studio     → Gestion agence
/api/chat             → API streaming chat
```

## Auth

- Supabase Auth (email/mot de passe + Google OAuth via Lovable Cloud)
- Middleware `requireSupabaseAuth` sur toutes les server functions
- Token Bearer JWT attaché automatiquement via `attachSupabaseAuth` function middleware
- Session persistée dans localStorage, auto-refresh

## Design system

- Variables CSS dans `src/styles.css` (Tailwind v4 `@theme`)
- Pas de CSS modules — tout en Tailwind + shadcn/ui
- `cn()` utility de `tailwind-merge` + `clsx`

## Conventions de code

- Server functions : `createServerFn` dans `src/lib/*.functions.ts`
- Validation : Zod schemas dans `src/lib/*.types.ts`
- Composants : React fonction, shadcn/ui dans `src/components/ui/`
- Routes : TanStack Router file-based dans `src/routes/`
- Types Supabase auto-générés dans `src/integrations/supabase/types.ts`

## Fichiers exclus (ne PAS toucher)

- `src/server.ts`, `src/start.ts`, `src/router.tsx`, `src/routeTree.gen.ts`
- `vite.config.ts`, `wrangler.jsonc`, `tsconfig.json`, `eslint.config.js`
- `components.json`, `bunfig.toml`
- Tout fichier `.env*`
