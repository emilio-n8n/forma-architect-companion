# Système de Chat et Mémoire Dreaming V3

## Architecture du Chat

### Flux

```
Client (useChat) → POST /api/chat → OpenCode Zen (nemotron-3-ultra-free)
                  ↓
           streamText() → toUIMessageStreamResponse() → streaming UI
                  ↓
           onFinish → saveMessage() → Supabase
                  ↓
           generateSuggestions() → 3 questions cliquables
```

### API Route (`src/routes/api/chat.ts`)

- Rate limiting : 10 req/min/IP
- Auth : Bearer token → Supabase JWT → userId
- System prompt généré dynamiquement avec :
  - `## CONTEXTE UTILISATEUR` (onboarding : nom, agence, style, spécialités)
  - `## MÉMOIRE SYNTHÉTISÉE` (résumés par catégorie depuis `memory_summaries`)
  - `## SOUVENIRS RÉCENTS` (8 dernières mémoires actives par freshness)
- Outils disponibles :
  1. **search_memories** — recherche ILIKE dans les mémoires actives, triée par freshness_score
  2. **web_search** — Exa Answer API pour recherche réglementaire en temps réel
  3. **save_memory** — enregistre un fait avec level/category/freshness_score
- Provider : `createOpenAICompatible` → `https://opencode.ai/zen/v1`

### Client (`src/routes/dashboard.agent.tsx`)

- `useChat()` de `@ai-sdk/react` avec `DefaultChatTransport`
- Messages utilisateur : right-aligned, bg `#262626`
- Messages assistant : markdown via ReactMarkdown + remarkGfm
- Citations `[RF: Article]` rendues en badges dorés
- Contenus riches : `doc` (markdown), `spreadsheet` (JSON → tableau), `email` (JSON → email)
- Suggestions générées après chaque réponse
- DocumentEditorPanel latéral pour preview des contenus riches

### Server Functions (`src/lib/chat.functions.ts`)

- `ensureConversation` — dernière conversation ou création
- `loadMessages` — messages ordonnés par created_at ASC
- `saveMessage` — INSERT + UPDATE conversation.updated_at
- `resetConversation` — nouvelle conversation
- `listConversations` — 50 dernières avec message_count
- `deleteConversation` — DELETE avec ownership check
- `updateConversationTitle`
- `generateSuggestions` — 3 questions de suivi via Zen
- `searchWeb` — Exa /search avec reformulation via Mistral

---

## Système de Mémoire Dreaming V3

### Principe

Au lieu d'extraire des faits message par message (ancien système), le Dreaming V3 synthétise la mémoire en arrière-plan à travers plusieurs conversations, avec gestion de la fraîcheur temporelle et résumé automatique.

### Base de données

**Table `memories`**

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK | Propriétaire |
| studio_id | uuid FK nullable | Scope agence |
| project_id | uuid FK nullable | Scope projet |
| level | text | `personal` / `project` / `studio` |
| category | text nullable | `preferences` / `projects` / `work_style` / `constraints` / `general` |
| content | text | Le fait mémorisé |
| freshness_score | float (0-1) | 1.0 = très frais, 0.0 = périmé |
| last_accessed | timestamptz | Dernière consultation par l'agent |
| is_active | boolean | true = utilisable, false = désactivé (périmé) |
| source_conversation_id | uuid FK nullable | Conversation d'origine |

**Table `memory_summaries`**

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK | |
| category | text | `preferences` / `projects` / `work_style` / `constraints` / `general` |
| summary | text | Synthèse en 1-3 phrases |
| unique(user_id, category) | | |

### Processus Dreaming

**1. `dreamMemorySynthesis`** — Déclenché au début d'une nouvelle conversation
- Récupère les 5 dernières conversations (jusqu'à 80 messages)
- Récupère les 50 dernières mémoires actives
- Récupère les résumés existants
- Envoie le tout à Zen avec un prompt de synthèse
- Parse la réponse JSON et applique :
  - **new_memories** : insertion de nouveaux faits (avec déduplication)
  - **updates** : mise à jour de contenu/freshness_score de mémoires existantes
  - **deactivate_ids** : désactivation de mémoires obsolètes
  - **summaries** : upsert des résumés par catégorie

**2. `refreshTemporalMemories`** — Déclenché au début de chaque session
- Multiplie `freshness_score` de toutes les mémoires actives par 0.95
- Applique un facteur d'accès : les mémoires non consultées récemment vieillissent plus vite
- Désactive automatiquement les mémoires avec `freshness_score < 0.15` et âge > 14 jours

**3. `generateMemorySummary`** — Déclenché après synthèse et périodiquement
- Prend toutes les mémoires actives (top 100)
- Demande à Zen de générer un résumé par catégorie
- Upsert dans `memory_summaries`

**4. `getRecentActiveMemories`** — Pour injection dans le prompt
- Retourne les 15 mémoires actives les plus fraîches

### Déclencheurs

| Moment | Action |
|--------|--------|
| Nouvelle conversation | `dreamMemorySynthesis` + `refreshTemporalMemories` + `generateMemorySummary` |
| Conversation existante | `refreshTemporalMemories` seulement |
| Toutes les 5 messages | `dreamMemorySynthesis` + `generateMemorySummary` |

### Recherche en mémoire

Les outils `search_memories` (dans l'API chat) et `searchMemories` (server function) :
- Ne cherchent que dans les mémoires `is_active = true`
- Tri par `freshness_score DESC` puis `created_at DESC`
- Mettent à jour `last_accessed` pour les mémoires retournées
- Fusion personnelles + studio avec déduplication

### Server Functions (`src/lib/memory.functions.ts`)

- `createMemory` — insertion avec freshness_score, category
- `searchMemories` — recherche ILIKE avec ranking freshness
- `listMemories` — liste avec filtre level/project, seulement actives
- `deleteMemory` — suppression définitive
- `updateMemory` — mise à jour content/category/freshness
- `deactivateMemory` — soft delete (is_active = false)
- `reactivateMemory` — réactive avec freshness_score
- `saveMemoriesFromConversation` — extraction legacy via Mistral

### UI (`/dashboard/memories`)

- Cartes de résumé par catégorie en haut de page (depuis `memory_summaries`)
- Liste des mémoires avec :
  - Badge de niveau (Personnelle/Projet/Studio)
  - Catégorie
  - Indicateur de fraîcheur (%) avec code couleur (vert ≥ 70%, jaune ≥ 30%, gris < 30%)
  - Date de création + dernière consultation
  - Boutons Désactiver / Supprimer

### Provider IA

- Chat + Dreaming : `nemotron-3-ultra-free` via Zen (OpenAI-compatible)
- Extraction legacy : `mistral-small-latest` via API Mistral
- Suggestions : `nemotron-3-ultra-free` via Zen
