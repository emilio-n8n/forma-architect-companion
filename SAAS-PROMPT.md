# FORMA — Assistant IA pour Architectes

Recrée intégralement ce SaaS. Stack : TanStack Start + React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui + Supabase. Dark theme, tons or sur fond noir.

## Stack exacte

```
"react": "^19.2.0", "react-dom": "^19.2.0"
"@tanstack/react-router": "^1.168.25"
"@tanstack/react-start": "^1.167.50"
"@tanstack/react-query": "^5.83.0"
"@supabase/supabase-js": "^2.105.4"
"zod": "^3.24.2"
"ai": "^6.0.177"
"@ai-sdk/react": "^3.0.179"
"@ai-sdk/openai-compatible": "^2.0.47"
"tailwindcss": "^4.2.1"
"@tailwindcss/typography": "^0.5.19"
"lucide-react": "^0.575.0"
"sonner": "^2.0.7"
"react-markdown": "^10.1.0"
"remark-gfm": "^4.0.1"
"@lovable.dev/vite-tanstack-config": "^1.7.0"
"@lovable.dev/cloud-auth-js": "^1.1.2"
"react-hook-form": "^7.71.2"
"react-day-picker": "^9.14.0"
"@tailwindcss/vite": "^4.2.1"
"vite-tsconfig-paths": "^6.0.2"
```

Vite config via `@lovable.dev/vite-tanstack-config` qui wrapper tanstackStart + tailwindcss + tsConfigPaths + cloudflare + componentTagger.

## Structure routes

```
/                → Landing page (marketing)
/auth            → Connexion / Inscription
/dashboard       → Layout avec SidebarProvider + AppSidebar + Outlet
/dashboard/      → Redirect /dashboard/agent
/dashboard/agent → Agent IA chat ← PRIORITAIRE
/dashboard/render→ Render AI (génération d'images)
/dashboard/projets → Kanban projets
/dashboard/settings → Profil utilisateur
/api/chat        → API route streaming Cerebras
```

## Database Supabase

### Table `profiles`
- id: uuid PK FK auth.users ON DELETE CASCADE
- email: text nullable
- agency_name: text nullable
- avatar_url: text nullable
- created_at / updated_at: timestamptz
- RLS: FOR ALL USING (auth.uid() = id)
- Trigger: ON auth.users INSERT → handle_new_user() INSERT INTO profiles

### Table `conversations`
- id: uuid PK DEFAULT gen_random_uuid()
- user_id: uuid FK auth.users NOT NULL
- title: text NOT NULL DEFAULT 'Nouvelle conversation'
- created_at / updated_at: timestamptz
- RLS: FOR ALL USING (auth.uid() = user_id)
- Trigger: BEFORE UPDATE → set_updated_at()

### Table `messages`
- id: uuid PK DEFAULT gen_random_uuid()
- conversation_id: uuid FK conversations ON DELETE CASCADE NOT NULL
- user_id: uuid FK auth.users NOT NULL
- role: text CHECK IN ('user','assistant') NOT NULL
- content: text NOT NULL
- created_at: timestamptz
- RLS: FOR ALL USING (auth.uid() = user_id)

### Table `projects` (Kanban)
- id: uuid PK
- user_id: uuid FK auth.users NOT NULL
- title: text NOT NULL
- description: text nullable
- tag: text DEFAULT 'Résidentiel'
- status: text CHECK IN ('todo','in_progress','review','done') DEFAULT 'todo'
- position: int DEFAULT 0
- created_at / updated_at: timestamptz
- RLS: FOR ALL USING (auth.uid() = user_id)

### Table `renders`
- id: uuid PK
- user_id: uuid FK auth.users NOT NULL
- project_id: uuid FK projects ON DELETE SET NULL nullable
- prompt: text, ambiance: text, weather: text, style: text, reference_url: text — all nullable
- image_url: text nullable
- status: text CHECK IN ('pending','done','error') DEFAULT 'pending'
- created_at: timestamptz
- RLS: FOR ALL USING (auth.uid() = user_id)

### Storage buckets
- `renders` : user only read/write/update/delete by folder `auth.uid()`
- `uploads` : user only read/write/delete by folder `auth.uid()`

## Fonction handle_new_user() + set_updated_at() — SECURITY DEFINER, search_path public

## Auth

- `src/integrations/supabase/client.ts` : lazy singleton, `createClient<Database>()` avec localStorage + persistSession + autoRefreshToken
- `src/integrations/supabase/client.server.ts` : admin client avec service_role, storage undefined
- `src/integrations/supabase/auth-middleware.ts` : middleware TanStack Start `requireSupabaseAuth` → extrait Bearer token, crée client, valide via `supabase.auth.getClaims()`, injecte `{ supabase, userId, claims }`
- `src/integrations/supabase/auth-attacher.ts` : middleware client `attachSupabaseAuth` → registered as `functionMiddleware` dans start.ts, attache Authorization header à toutes les serverFn
- `src/hooks/useAuth.tsx` : hook `useAuth()` via `onAuthStateChange`, expose `{ session, user, loading, signOut }`
- `src/integrations/lovable/index.ts` : wrapper `@lovable.dev/cloud-auth-js` pour OAuth Google, Apple, Microsoft, Lovable → `supabase.auth.setSession(result.tokens)`
- Page `/auth` : tabs Connexion/Inscription, email/password, Google OAuth, redirect /dashboard/agent

## Design system — styles.css

```css
@import "tailwindcss" source(none);
@source "../src";
@import "tw-animate-css";
@plugin "@tailwindcss/typography";

@theme {
  --font-display: "Cormorant Garamond", "Times New Roman", serif;
  --font-body: "Inter", system-ui, sans-serif;
  --color-background: oklch(0.13 0.005 60);
  --color-foreground: oklch(0.94 0.018 80);
  --color-primary: oklch(0.74 0.085 80);
  --color-card: oklch(0.16 0.005 60);
  --color-border: oklch(0.22 0.005 60);
  --color-sidebar-bg: oklch(0.11 0.005 60);
  --color-sidebar-foreground: oklch(0.94 0.018 80);
  --color-sidebar-border: oklch(0.2 0.005 60);
  --color-sidebar-accent: oklch(0.74 0.085 80 / 0.1);
  --radius: 0.5rem;
  --shadow-gold: 0 0 20px oklch(0.74 0.085 80 / 0.15);
}
```

Custom utilities : `.gold-gradient`, `.text-gradient-gold`. Dark theme par défaut. Composants shadcn/ui New York.

## Features

### 1. Agent IA — `/dashboard/agent` [PRIORITAIRE]

Provider IA : **Cerebras** (`gpt-oss-120b`) via `@ai-sdk/openai-compatible`

```
createCerebrasProvider() → baseURL: "https://api.cerebras.ai/v1", name: "cerebras"
```

API route `/api/chat` :
```ts
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createCerebrasProvider } from "@/lib/ai-gateway";

const SYSTEM_PROMPT = `Tu es FORMA Agent...`;

// POST handler:
const { messages } = await request.json();
const cerebras = createCerebrasProvider();
const result = streamText({
  model: cerebras("gpt-oss-120b"),
  system: SYSTEM_PROMPT,
  messages: await convertToModelMessages(messages),
  headers: { Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}` },
});
return result.toUIMessageStreamResponse({ originalMessages: messages });
```

UI :
- `useChat` de `@ai-sdk/react` avec `api: "/api/chat"` (pas DefaultChatTransport, utiliser l'api string directement)
- Chargement initial : `ensureConversation` → `loadMessages` → initialMessages
- Messages : user (right-aligned, bg primary), assistant (left-aligned, markdown via ReactMarkdown + remarkGfm)
- Système prompt demande format `**[RF: Article]** — Description` pour les citations → rendu en badges
- Saisie : Textarea + Enter-to-send
- Boutons en-tête : Historique (sheet latéral gauche liste conversations), Exporter (.md), Nouvelle conversation
- Suggestions : après chaque réponse, appeler Cerebras avec dernier échange → 3 questions cliquables
- Export docx : conversion markdown → HTML Word-compatible → Blob application/msword

Server functions (`chat.functions.ts`) :
- `ensureConversation` : retourne dernière conversation ou crée nouvelle
- `loadMessages({ conversationId })` : messages ordonnés par created_at ASC
- `saveMessage({ conversationId, role, content })` : INSERT message + UPDATE conversation.updated_at
- `resetConversation` : INSERT nouvelle conversation
- `listConversations` : 50 dernières conversations avec message_count
- `deleteConversation({ id })` : DELETE (CASCADE)
- `updateConversationTitle({ conversationId, title })`
- `generateSuggestions({ messages })` : appel Cerebras direct pour 3 questions

### 2. Render AI — `/dashboard/render`

Provider IA : **Lovable AI Gateway** (Gemini 2.5 Flash) via `@ai-sdk/openai-compatible`

```
createLovableAiGatewayProvider(apiKey) → baseURL: "https://ai.gateway.lovable.dev/v1"
```

Server functions (`render.functions.ts`) :
- `generateRender({ prompt, ambiance, weather, style, referenceUrl })` :
  1. Appel Gemini avec prompt formaté : "Rendu architectural photoréaliste, ambiance {jour/nuit}, météo {weather}, style {style}. {prompt}. Haute qualité..."
  2. Data URL → upload Supabase Storage bucket `renders` via `upload()`
  3. INSERT dans table `renders` avec `image_url = signed URL`
- `editRender({ renderId, instruction })` : charge render original → Gemini avec image reference + instruction → nouveau render
- `listRenders` : 48 derniers renders (id, image_url, prompt, ambiance, style, weather, created_at)

UI :
- Upload référence image (bucket uploads → signed URL)
- Prompt textarea, Ambiance toggle (Jour/Nuit), Weather picker, Style picker
- Generate button + loading
- Gallery grid des renders passés avec React Query

### 3. Projets — `/dashboard/projets`

Kanban 4 colonnes : A faire → En cours → Revue → Terminé

Server functions (`projects.functions.ts`) :
- `listProjects` : tous les projets ordonnés par position
- `createProject({ title, tag, description? })`
- `updateProjectStatus({ id, status })`
- `deleteProject({ id })`

UI :
- Projets en cards dans 4 colonnes
- Dialog création (titre + catégorie)
- Tag badges : Résidentiel (amber), Tertiaire (emerald), Rénovation (rose), Public (sky)
- Delete on hover
- React Query mutations avec cache invalidation

### 4. Settings — `/dashboard/settings`

Server functions (`profile.functions.ts`) :
- `getProfile` : retourne profil
- `updateProfile({ agency_name })` : upsert

UI :
- Profil card (email disabled, agency_name input, save)
- Plan info card

### 5. AppSidebar

```tsx
const items = [
  { title: "Render AI", url: "/dashboard/render", icon: Sparkles },
  { title: "Agent IA", url: "/dashboard/agent", icon: MessageSquare },
  { title: "Projets", url: "/dashboard/projets", icon: FolderKanban },
];
```

- FORMA logo gold gradient en header
- "Studio" group + "Compte" group (Paramètres)
- Footer : Déconnexion
- Collapsible icon/text
- Active state par path

### 6. Landing page — `/`

Marketing page interactive :
- Header sticky avec FORMA, Fonctionnalités, Le Studio, Manifeste, Studio/Rejoindre
- Hero "La forme suit l'intelligence." avec before/after slider (sketch.jpg → render.jpg)
- Bento grid 4 cards : Render AI (before/after slider), Agent IA (chat simulator avec auto-typing), Kanban mock, stats
- Le Studio section : dashboard mockup
- Stats : 6x, 100%, 0, 24/7
- Manifesto : Le Corbusier quote
- Footer : ecosystem, stack, contact

## Ce qui est EXCLU (NE PAS FAIRE)

- **Mini Archi** : PAS de génération/rendu de plans 2D/3D. Pas de Three.js, pas de Cesium, pas d'export OBJ/SVG/DXF/GLTF. Pas de composants Plan2DEditor, Plan3DViewer, CesiumViewer, Furniture3D, Roof3D, Tree3D, FirstPersonView.
- Pas de table `plans` en DB
- Pas de fichiers : `plans.functions.ts`, `plan-export.ts`, `plan-export-3d.ts`, `plan-export-gltf.ts`

## Ordre d'implémentation

1. Setup projet : Vite, TanStack Start, Tailwind, shadcn/ui, Supabase client, auth
2. Database : migrations + types Supabase
3. Auth : middleware, attacher, useAuth, page /auth
4. Layout dashboard : SidebarProvider + AppSidebar + routing
5. Agent IA : server functions + API route + UI chat
6. Projets : Kanban
7. Render AI : image generation
8. Settings : profile page
9. Landing page : marketing
10. Polish : suggestions IA, export docx, historique conversations, citations badges
