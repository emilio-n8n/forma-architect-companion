# FORMA Architect Companion - Analyse Architecture
**Date:** 31 Mai 2026  
**Document:** 02 - ARCHITECTURE.md  
**Priorité:** ⭐⭐⭐

---

## 🏗️ ARCHITECTURE GÉNÉRALE

### Schéma d'Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React 19   │  │   ThreeJS   │  │      Cesium 1.119        │  │
│  │   + Vite     │  │   + R3F     │  │   (Site Réel)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    @tanstack/react-start                        ││
│  │  (Router + Server Functions + SSR)                           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Cloudflare/Lovable)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    TanStack Start Server                        ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  ││
│  │  │  Server     │  │  Server     │  │     API Routes        │  ││
│  │  │  Functions  │  │  Functions  │  │   (POST /api/chat)    │  ││
│  │  │  (35+)      │  │  (Auth)     │  │                       │  ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICES EXTERNES                               │
├─────────────────────┬─────────────────────┬─────────────────────┤
│  Supabase             │  Cerebras AI         │  Lovable AI           │
│  ┌─────────────┐     │  ┌─────────────┐     │  ┌─────────────┐     │
│  │ PostgreSQL   │◄────┤  │ GPT-OSS 120B │     │  │ Gateway      │     │
│  └─────────────┘     │  └─────────────┘     │  └─────────────┘     │
│  ┌─────────────┐     │                     │                     │
│  │  Storage     │◄────┤                     │                     │
│  │  (renders)   │     │                     │                     │
│  └─────────────┘     │                     │                     │
│  ┌─────────────┐     │                     │                     │
│  │   Auth       │◄────┤                     │                     │
│  └─────────────┘     │                     │                     │
└─────────────────────┴─────────────────────┴─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT (Cesium Ion)                              │
├─────────────────────────────────────────────────────────────────┤
│  Terrain 3D + Imagerie Satellite (pour le module Site Réel)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 STRUCTURE DES DOSSIERS

```
forma-architect-companion/
├── src/
│   ├── components/           # Composants React (45+)
│   │   ├── ui/              # Composants Radix UI (30+)
│   │   ├── AppSidebar.tsx   # Sidebar principale
│   │   ├── CesiumViewer.tsx # Visualisation 3D géographique
│   │   ├── FirstPersonView.tsx # Vue première personne
│   │   ├── Furniture3D.tsx  # Meubles 3D
│   │   ├── Plan2DEditor.tsx # Éditeur de plans 2D
│   │   ├── Plan3DViewer.tsx # Visualisation 3D
│   │   ├── Roof3D.tsx       # Toits 3D
│   │   └── Tree3D.tsx       # Végétation 3D
│   │
│   ├── hooks/               # Hooks React personnalisés
│   │   └── useAuth.tsx      # Gestion authentification
│   │
│   ├── integrations/        # Intégrations externes
│   │   ├── lovable/         # Auth Lovable Cloud
│   │   └── supabase/        # Client Supabase + Auth
│   │
│   ├── lib/                 # Logique métier (12 fichiers)
│   │   ├── ai-gateway.ts    # Provider IA (Cerebras, Lovable)
│   │   ├── chat.functions.ts # Gestion conversations Agent IA
│   │   ├── error-capture.ts # Capture des erreurs
│   │   ├── error-page.ts    # Page d'erreur personnalisée
│   │   ├── plan-export-3d.ts # Export 3D (OBJ, GLTF)
│   │   ├── plan-export.ts    # Export 2D (SVG, DXF)
│   │   ├── plans.functions.ts # Gestion des plans
│   │   ├── profile.functions.ts # Gestion profil utilisateur
│   │   ├── projects.functions.ts # Gestion projets
│   │   ├── render.functions.ts # Génération de rendus
│   │   └── utils.ts          # Utilitaires
│   │
│   ├── routes/              # Routes TanStack Router
│   │   ├── api/             # API Endpoints
│   │   │   └── chat.ts       # Endpoint chat IA
│   │   ├── auth.tsx         # Page authentification
│   │   ├── dashboard/       # Routes dashboard
│   │   │   ├── agent.tsx    # Agent IA
│   │   │   ├── index.tsx    # Dashboard principal
│   │   │   ├── mini-archi.tsx # Mini Archi
│   │   │   ├── projets.tsx  # Gestion projets
│   │   │   ├── render.tsx   # Render AI
│   │   │   └── settings.tsx # Paramètres
│   │   ├── dashboard.tsx    # Layout dashboard
│   │   ├── index.tsx        # Landing page (816 lignes!)
│   │   └── __root.tsx       # Root layout
│   │
│   ├── routeTree.gen.ts     # Arborescence routes (généré)
│   ├── router.tsx          # Configuration router
│   ├── server.ts            # Entrypoint server
│   └── start.ts             # Entrypoint client
│
├── supabase/
│   ├── config.toml          # Configuration Supabase
│   └── migrations/          # Migrations DB (2 fichiers)
│
├── public/                  # Assets statiques
├── docs/                    # Documentation
│   └── analyse-2026-05-31/  # Cette analyse
│
├── package.json             # Dépendances (99 lignes)
├── vite.config.ts           # Configuration Vite
├── tsconfig.json            # Configuration TypeScript
└── .env                     # Variables environnement
```

---

## 🔧 DÉPENDANCES PRINCIPALES

### Frontend Core
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "typescript": "^5.8.3",
  "vite": "^7.3.1",
  "@tanstack/react-router": "^1.168.25",
  "@tanstack/react-start": "^1.167.50",
  "@tanstack/react-query": "^5.83.0"
}
```

### UI/UX
```json
{
  "@radix-ui/*": "^1-2.16.16",  // 25+ composants
  "tailwindcss": "^4.2.1",
  "@tailwindcss/vite": "^4.2.1",
  "tw-animate-css": "^1.3.4",
  "lucide-react": "^0.575.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.5.0"
}
```

### 3D & Visualisation
```json
{
  "three": "^0.184.0",
  "@react-three/fiber": "^9.6.1",
  "@react-three/drei": "^10.7.7",
  "cesium": "^1.119.0"  // Chargé via CDN
}
```

### IA & Data
```json
{
  "ai": "^6.0.177",
  "@ai-sdk/openai-compatible": "^2.0.47",
  "@ai-sdk/react": "^3.0.179",
  "@supabase/supabase-js": "^2.105.4",
  "zod": "^3.24.2"
}
```

### Formulaires & Validation
```json
{
  "react-hook-form": "^7.71.2",
  "@hookform/resolvers": "^5.2.2",
  "zod": "^3.24.2"
}
```

### Autres
```json
{
  "react-markdown": "^10.1.0",
  "remark-gfm": "^4.0.1",
  "recharts": "^2.15.4",
  "date-fns": "^4.1.0",
  "sonner": "^2.0.7",
  "vaul": "^1.1.2",
  "embla-carousel-react": "^8.6.0"
}
```

---

## 🗃️ SCHÉMA DE LA BASE DE DONNÉES

### Tables Supabase (PostgreSQL)

#### 1. `conversations`
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
**Index:** `user_id` (pour requêtes utilisateur)

#### 2. `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
**Index:** `conversation_id`, `user_id`, `created_at`
**Relation:** `conversation_id → conversations(id)`

#### 3. `plans`
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surface INTEGER NOT NULL,
  bedrooms INTEGER NOT NULL,
  levels INTEGER NOT NULL,
  budget TEXT NOT NULL CHECK (budget IN ('Économique', 'Moyen de gamme', 'Haut de gamme')),
  variants JSONB NOT NULL,  -- Contient PlanVariant[]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
**Structure JSONB `variants`:**
```typescript
{
  variants: [
    {
      name: string,
      concept: string,
      features: string[],
      estimated_cost_eur: number,
      energy_class: string,
      pros: string[],
      plan_2d_data?: PlanData,
      plan_3d_ready?: boolean
    }
  ]
}
```

#### 4. `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  agency_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 5. `projects`
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tag TEXT CHECK (tag IN ('Résidentiel', 'Tertiaire', 'Rénovation', 'Public')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
**Index:** `user_id`, `position`

#### 6. `renders`
```sql
CREATE TABLE renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  prompt TEXT,
  image_url TEXT,
  reference_url TEXT,
  ambiance TEXT CHECK (ambiance IN ('jour', 'nuit')),
  weather TEXT,
  style TEXT,
  status TEXT NOT NULL DEFAULT 'done',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
**Index:** `user_id`, `project_id`, `created_at`
**Relation:** `project_id → projects(id)`

---

## 🔄 FLUX DE DONNÉES

### 1. Flux Agent IA (Chat)
```
Utilisateur → Input → useChat() → /api/chat → Cerebras GPT-OSS 120B
                                    ↓
                             streamText() → Response Stream
                                    ↓
                            saveMessage() → Supabase messages
```

### 2. Flux Render AI
```
Utilisateur → Formulaire → generateRender() → Lovable AI Gateway
                                      ↓
                              Google Gemini 2.5 Flash
                                      ↓
                              generateImageBase64()
                                      ↓
                              persistImage() → Supabase Storage
                                      ↓
                              Insert renders → Supabase
```

### 3. Flux Mini Archi (Plans)
```
Utilisateur → Paramètres → generatePlans() → Cerebras GPT-OSS 120B
                                    ↓
                            JSON (6 variantes)
                                    ↓
                            Insert plans → Supabase
                                    ↓
Utilisateur → Sélection → generate2DPlanData() → Cerebras
                                    ↓
                            JSON (PlanData)
                                    ↓
                            Update plans → Supabase
                                    ↓
Utilisateur → Validation → confirm2DPlan()
                                    ↓
                            Generate 3D View
```

### 4. Flux Authentification
```
Utilisateur → /auth → supabase.auth.signInWithPassword()
                                    ↓
                              Supabase Auth
                                    ↓
                              JWT Token (Bearer)
                                    ↓
                              Stocké dans localStorage
                                    ↓
                              requireSupabaseAuth() middleware
                                    ↓
                              Vérification token → Accès autorisé
```

---

## 🎨 ARCHITECTURE DES COMPOSANTS

### Hiérarchie des Composants Principaux

```
App (Root)
├── Router (TanStack)
│   ├── __root.tsx (Layout racine)
│   │   ├── Head (SEO tags)
│   │   ├── Outlet (Contenu dynamique)
│   │   └── Toaster (Notifications)
│   │
│   ├── / (Landing Page)
│   │   ├── Header (Navigation)
│   │   ├── Hero Section (Before/After Slider)
│   │   ├── Features Grid (4 dimensions)
│   │   ├── Studio Preview
│   │   ├── Stats Section
│   │   └── Footer
│   │
│   ├── /auth (Auth Page)
│   │   ├── Tabs (Sign In / Sign Up)
│   │   ├── Google OAuth
│   │   └── Lovable Auth
│   │
│   └── /dashboard (Dashboard Layout)
│       ├── Sidebar (AppSidebar)
│       │   ├── Menu Items (Render, Agent, Mini Archi, Projets)
│       │   └── User Actions (Settings, Logout)
│       │
│       ├── /dashboard/agent (Agent IA)
│       │   ├── Chat Container
│       │   ├── Message List
│       │   ├── Suggestions
│       │   ├── Export (MD, DOCX)
│       │   └── History Sidebar
│       │
│       ├── /dashboard/render (Render AI)
│       │   ├── Upload Reference
│       │   ├── Parameters (Ambiance, Météo, Style)
│       │   ├── Generate Button
│       │   └── Gallery
│       │
│       ├── /dashboard/mini-archi (Mini Archi)
│       │   ├── Parameters (Surface, Chambres, Niveaux, Budget)
│       │   ├── Generate 6 Variants
│       │   ├── Plan2DEditor
│       │   │   ├── SVG Viewer
│       │   │   ├── Room List
│       │   │   └── Room Editor
│       │   ├── Plan3DViewer
│       │   │   ├── ThreeJS Canvas
│       │   │   ├── Furniture3D
│       │   │   ├── Roof3D
│       │   │   └── Tree3D
│       │   └── CesiumViewer (Site Réel)
│       │
│       └── /dashboard/projets (Projets Kanban)
│           ├── Column (Todo, In Progress, Review, Done)
│           └── Project Cards
```

---

## 🔐 MÉCANISMES D'AUTHENTIFICATION

### 1. Supabase Auth (Client)
- **Storage**: localStorage (persistSession: true)
- **Auto-refresh**: Token rafraîchi automatiquement
- **Methods**:
  - `signInWithPassword(email, password)`
  - `signUp(email, password)`
  - `signInWithOAuth(provider)`
  - `signOut()`

### 2. Lovable Cloud Auth (Server)
- **Middleware**: `requireSupabaseAuth`
- **Validation**: Vérifie JWT token dans headers
- **Context**: Injecte `supabase`, `userId`, `claims`

### 3. Session Management
```typescript
// useAuth.tsx
const { session, user, loading, signOut } = useAuth();
// Utilise onAuthStateChange pour écouter les changements
```

---

## 🌐 API ROUTES

### Server Functions (35+)

#### Chat Functions
- `ensureConversation()` - Crée/réutilise une conversation
- `loadMessages()` - Charge les messages d'une conversation
- `saveMessage()` - Sauvegarde un message
- `resetConversation()` - Réinitialise une conversation
- `listConversations()` - Liste toutes les conversations
- `deleteConversation()` - Supprime une conversation
- `generateSuggestions()` - Génère des suggestions de suivi

#### Render Functions
- `generateRender()` - Génère un rendu IA
- `editRender()` - Modifie un rendu existant
- `listRenders()` - Liste tous les rendus

#### Plans Functions (15+)
- `generatePlans()` - Génère 6 variantes de plans
- `listPlans()` - Liste tous les plans
- `generate2DPlanData()` - Génère données 2D pour une variante
- `updatePlan2DData()` - Met à jour les données 2D
- `confirm2DPlan()` - Valide un plan 2D
- `enhancePlanWithAI()` - Applique normes RE2020/PMR
- `editPlanWithAI()` - Modifie un plan via IA
- `generateFurniture()` - Génère meubles
- `generateRoof()` - Génère un toit
- `generateLandscaping()` - Génère végétation
- `suggestColorPalette()` - Suggère palette de couleurs

#### Projects Functions
- `listProjects()` - Liste tous les projets
- `createProject()` - Crée un projet
- `updateProjectStatus()` - Met à jour le statut
- `deleteProject()` - Supprime un projet

#### Profile Functions
- `getProfile()` - Récupère le profil
- `updateProfile()` - Met à jour le profil

### API Endpoints
- `POST /api/chat` - Endpoint pour le chat IA (streaming)

---

## 💾 STORAGE & UPLOADS

### Supabase Storage Buckets
1. **uploads** - Fichiers de référence (images)
2. **renders** - Rendus générés (PNG)

### Upload Process
```typescript
// Dans dashboard.render.tsx
const handleFile = async (file: File) => {
  const path = `${user.id}/ref-${Date.now()}-${file.name}`;
  await supabase.storage.from("uploads").upload(path, file);
  const { data } = await supabase.storage.from("uploads").createSignedUrl(path, 3600);
  setRefUrl(data?.signedUrl);
};
```

---

## 🎯 POINTS FORTS ARCHITECTURAUX

### ✅ Bonnes Pratiques

1. **Séparation des Concerns**
   - Logique métier dans `/lib/`
   - Composants UI dans `/components/`
   - Routes dans `/routes/`

2. **Type Safety**
   - Utilisation intensive de TypeScript
   - Schémas Zod pour validation
   - Types générés pour Supabase

3. **Server Functions**
   - Middleware d'authentification
   - Validation des inputs
   - Sécurité côté server

4. **React Query**
   - Gestion d'état server optimisée
   - Cache automatique
   - Invalidations intelligentes

5. **3D Performance**
   - React Three Fiber pour optimisation
   - Three.js pour le rendu
   - Cesium pour la géolocalisation

6. **IA Intégrée**
   - Appels API bien structurés
   - Streaming des réponses
   - Persistance des données

7. **Export Multi-format**
   - SVG, DXF pour les plans 2D
   - OBJ, GLTF pour la 3D
   - DOCX pour les conversations

### ⚠️ Dettes Techniques

1. **Fichier Landing Page Trop Gros**
   - `src/routes/index.tsx`: 816 lignes
   - Devrait être split en composants

2. **Duplication de Code**
   - Logique de slider dans landing page dupliquée
   - Styles CSS répétés

3. **Pas de Tests**
   - Aucun test unitaire ou d'intégration
   - Pas de Jest, Vitest, ou Cypress

4. **Configuration Manuelle**
   - Pas de CI/CD visible
   - Pas de lint-staged
   - Configuration ESLint basique

5. **Dépendances Lourdes**
   - Cesium chargé via CDN (1.119.0)
   - Three.js et dépendances 3D

6. **Pas de Type pour PlanData**
   - Types dans plans.functions.ts mais pas partout

---

## 📊 STATISTIQUES TECHNIQUES

| Métrique | Valeur |
|----------|--------|
| Fichiers TypeScript | 120+ |
| Composants React | 45+ |
| Server Functions | 35+ |
| Tables Supabase | 6 |
| APIs Externes | 3 (Cerebras, Lovable, Cesium) |
| Taille Bundle (estimée) | ~5-10MB |
| Complexité Cyclomatique | Moyenne à Élevée |
| Couverture de Tests | 0% |

---

## 🔮 ÉVOLUTIONS POSSIBLES

### Architecture
1. **Microservices** : Séparer IA, Storage, Auth
2. **Edge Functions** : Utiliser Cloudflare Workers
3. **Serverless** : Optimiser les coûts
4. **GraphQL** : Remplacer REST par GraphQL

### Performance
1. **Lazy Loading** : Charger Cesium à la demande
2. **Code Splitting** : Séparer les pages
3. **Memoization** : Optimiser les calculs 3D
4. **Web Workers** : Déporter IA heavy computations

### DevOps
1. **CI/CD** : GitHub Actions / GitLab CI
2. **Monitoring** : Sentry, Datadog
3. **Logging** : Structured logging
4. **Feature Flags** : Pour déploiements progressifs

---

*Document généré par Mistral Vibe - Analyse Architecture Complète*
