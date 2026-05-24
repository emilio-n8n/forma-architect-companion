# Problème : Chat ne répond pas après le 1er message + SSR error

## Constat
- Le 1er message dans le chat fonctionne, mais les messages suivants ne reçoivent aucune réponse (le bouton "Send" reste désactivé ou le streaming ne démarre pas).
- Un SSR error `"SSR rendering failed"` avec `"has_blank_screen": true` est apparu après modifications du transport / route API du chat, et persiste même après revert complet des fichiers concernés. Probablement un cache Vite corrompu.

## Ce qu'on a essayé

### 1. Changement de transport (cause probable)
- On a modifié `src/routes/api/chat.ts` et `src/routes/dashboard.agent.tsx` pour remplacer `DefaultChatTransport` + `toUIMessageStreamResponse` par un format `toDataStreamResponse` + `customTransport` + `onFinish`.
- **Résultat :** SSR error + chat cassé. Aucune amélioration.
- **Revert :** On est revenu à la version originale avec `DefaultChatTransport` et `toUIMessageStreamResponse`. Le SSR error persiste.

### 2. Changement de provider IA
- On a changé le provider IA de Lovable AI Gateway (Gemini) vers Cerebras (`gpt-oss-120b`) dans `src/lib/ai-gateway.ts` et `src/routes/api/chat.ts`.
- Cerebras supporte le streaming OpenAI, mais **ne supporte PAS le tool calling**.
- Résultat : le streaming texte fonctionne (sur le 1er message), mais toute tentative d'utiliser le tool system de l'AI SDK (`tools: {}` pour la recherche web Exa) échoue silencieusement.

### 3. Recherche web Exa
- On a tenté d'ajouter une recherche web via Exa dans le chat (tool calling).
- Cerebras ne supportant pas le tool calling, cette approche a été abandonnée.
- Code de recherche retiré (mais `EXA_API_KEY` est toujours dans `.env`).

### 4. Nettoyage du cache
- `rm -rf node_modules/.vite` → pas de changement
- `touch src/routes/api/chat.ts` → pas de changement
- Le SSR error vient probablement du cache du serveur Vite, pas des sources.

### 5. Création de `src/lib/plans.functions.ts`
- Fonction `callJSON` pour les appels IA structurés (génération de plans, enrichissement RE2020/PMR/PLU, édition par texte).
- Fonctionne sur Cerebras indépendamment du chat.

## Architecture actuelle

### Chat (`src/routes/api/chat.ts` + `src/routes/dashboard.agent.tsx`)
- **Provider :** Cerebras (`gpt-oss-120b`) via `createCerebrasProvider()` + `streamText`
- **Transport :** Retour à `DefaultChatTransport` + `toUIMessageStreamResponse` (comme avant)
- **Format :** `POST /api/chat` renvoie un `Response` avec `toUIMessageStreamResponse`
- **Problème connu :** nécessite un refresh entre chaque message

### Plans (`src/lib/plans.functions.ts`)
- **Provider :** Cerebras (`gpt-oss-120b`) via `callJSON()`
- **Fonctions :** `generate2DPlanData`, `enhancePlanWithAI`, `editPlanWithAI`
- **Fonctionnement :** appels directs sans streaming, `response_format: { type: 'json_object' }`

### Rendu 3D (`src/lib/render.functions.ts`)
- **Provider :** Lovable AI Gateway (Gemini) - Cerebras ne génère pas d'images

## Fichiers importants

| Fichier | Rôle |
|---------|------|
| `src/lib/ai-gateway.ts` | Création des providers Cerebras et Lovable |
| `src/routes/api/chat.ts` | Route API du chat (streaming Cerebras) |
| `src/routes/dashboard.agent.tsx` | UI du chat + transport |
| `src/routes/dashboard.mini-archi.tsx` | PlanDialog (pas concerné) |
| `src/lib/plans.functions.ts` | Fonctions IA pour les plans |
| `src/server.ts` + `src/lib/error-capture.ts` + `src/lib/error-page.ts` | SSR error wrapper (non modifié) |
| `.env` | `CEREBRAS_API_KEY`, `EXA_API_KEY` |

## Pistes restantes à explorer

1. **Redémarrer `bun run dev` proprement** (stop → kill port → restart) pour vider le cache Vite.
2. **Vérifier la console navigateur** (F12) pour l'erreur JS exacte du SSR.
3. **Vérifier dans les Network tab** si la 2ème requête `/api/chat` est bien envoyée et quelle réponse elle reçoit.
4. **Timeout Cerebras ?** Peut-être que le 2ème message arrive pendant que le 1er stream n'est pas terminé côté serveur.
5. **État interne de `useChat`** : vérifier si `isLoading`/`isLast`/`append` sont corrects après le 1er message.
6. **Mode hors-ligne** : les appels API Lovable ne passent peut-être pas si on bosse sans internet (ou avec une connexion limitée).
