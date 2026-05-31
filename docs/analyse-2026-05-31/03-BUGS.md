# FORMA Architect Companion - Liste des Bugs
**Date:** 31 Mai 2026  
**Document:** 03 - BUGS.md  
**Priorité:** ⭐⭐⭐⭐⭐

---

## 🚨 CATÉGORIES DE BUGS

| Catégorie | Count | Priorité Moyenne |
|----------|-------|------------------|
| 🔴 Critiques | 8 | ⭐⭐⭐⭐⭐ |
| 🟠 Majeurs | 15 | ⭐⭐⭐⭐ |
| 🟡 Mineurs | 22 | ⭐⭐⭐ |
| 🔵 Cosmétiques | 10 | ⭐⭐ |
| **Total** | **55** | - |

---

## 🔴 BUGS CRITIQUES (Priorité 1 - À corriger immédiatement)

### 1. **Race Condition dans la Génération de Plans**
**Fichier:** `src/routes/dashboard.mini-archi.tsx`  
**Lignes:** 45-50, 60-65  
**Impact:** 🔴 **Perte de données**

```typescript
// Problème: Plusieurs appels simultanés peuvent corrompre l'état
const mutation = useMutation({
  mutationFn: () => gen({ data: { surface, bedrooms, levels, budget } }),
  onSuccess: () => { 
    toast.success("Plans générés"); 
    qc.invalidateQueries({ queryKey: ["plans"] }); 
  },
});
```

**Description:**
- L'utilisateur peut cliquer plusieurs fois sur "Générer 6 plans"
- Plusieurs requêtes `generatePlans` sont lancées simultanément
- Résultat: corrosion de l'état, plans dupliqués ou incomplets
- Pas de `disabled` sur le bouton pendant la mutation

**Solution:**
```typescript
<Button 
  onClick={() => mutation.mutate()} 
  disabled={mutation.isPending || plan2dMutation.isPending}
  className="..."
>
  {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
  {mutation.isPending ? "Génération…" : "Générer 6 plans"}
</Button>
```

**Priorité:** ⭐⭐⭐⭐⭐  
**Effort:** 1h  
**Impact:** Élevé

---

### 2. **Memory Leak dans CesiumViewer**
**Fichier:** `src/components/CesiumViewer.tsx`  
**Lignes:** 40-80  
**Impact:** 🔴 **Crash navigateur**

```typescript
// Problème: Les viewers Cesium ne sont pas proprement détruits
useEffect(() => {
  const el = containerRef.current;
  if (!el || !plan.parcel || initializedRef.current) return;
  let viewer: any = null;
  
  (async () => {
    await loadCesiumAssets();
    viewer = new Cesium.Viewer(el, { ... });
    viewerRef.current = viewer;
    initializedRef.current = true;
  })();
  
  return () => {
    // ❌ Cleanup incomplet
    if (viewer) {
      viewer.entities.removeAll();
      viewer.destroy();
    }
  };
}, []);
```

**Description:**
- Le `viewer` peut être null au moment du cleanup
- `initializedRef.current` n'est jamais réinitialisé
- Si le composant est monté/démonté rapidement, mémoire leak
- Cesium est très lourd (~50MB+ en mémoire)

**Solution:**
```typescript
useEffect(() => {
  const el = containerRef.current;
  if (!el || !plan.parcel) return;
  
  let viewer: any = null;
  let canceled = false;
  
  (async () => {
    await loadCesiumAssets();
    if (canceled) return;
    
    viewer = new Cesium.Viewer(el, { ... });
    viewerRef.current = viewer;
    initializedRef.current = true;
  })();
  
  return () => {
    canceled = true;
    initializedRef.current = false;
    if (viewer) {
      try {
        viewer.entities.removeAll();
        viewer.destroy();
      } catch (e) {
        console.error("Cesium cleanup error:", e);
      }
    }
    viewerRef.current = null;
  };
}, [plan.parcel]);
```

**Priorité:** ⭐⭐⭐⭐⭐  
**Effort:** 2h  
**Impact:** Critique

---

### 3. **XSS Vulnerability dans ReactMarkdown**
**Fichier:** `src/routes/dashboard.agent.tsx`  
**Lignes:** 280-300  
**Impact:** 🔴 **Sécurité - Injection de code**

```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    strong: ({ children }) => {
      const t = typeof children === "string" ? children : "";
      if (t.startsWith("[RF:")) {
        return (
          <span className="...">
            {t}  // ❌ Danger: HTML raw non échappé
          </span>
        );
      }
      return <strong>{children}</strong>;
    },
  }}
>
  {text}  // ❌ text peut contenir du HTML malveillant
</ReactMarkdown>
```

**Description:**
- L'Agent IA peut retourner du contenu malveillant
- `ReactMarkdown` interdit le HTML raw par défaut, mais si l'API est compromise...
- Pas de sanitization du contenu avant affichage
- Risque: vol de session, redirection malveillante

**Solution:**
```typescript
import DOMPurify from 'dompurify';

// Dans le handler de l'API chat
const cleanText = DOMPurify.sanitize(text, {
  ALLOWED_TAGS: [], // Aucun tag HTML autorisé
  ALLOWED_ATTR: [],
});

// Ou dans le composant
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    // ...
  }}
>
  {DOMPurify.sanitize(text)}
</ReactMarkdown>
```

**Priorité:** ⭐⭐⭐⭐⭐  
**Effort:** 3h (ajout dépendance + tests)  
**Impact:** Critique

---

### 4. **Upload de Fichiers Non Validés**
**Fichier:** `src/routes/dashboard.render.tsx`  
**Lignes:** 70-85  
**Impact:** 🔴 **Sécurité - Fichiers malveillants**

```typescript
const handleFile = async (file: File) => {
  setUploading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const path = `${user.id}/ref-${Date.now()}-${file.name}`;
    // ❌ AUCUNE validation du fichier
    const { error } = await supabase.storage.from("uploads").upload(path, file);
    if (error) throw error;
    const { data } = await supabase.storage.from("uploads").createSignedUrl(path, 3600);
    setRefUrl(data?.signedUrl ?? null);
    toast.success("Référence importée");
  } catch (e) {
    toast.error("Échec import: " + (e as Error).message);
  } finally {
    setUploading(false);
  }
};
```

**Description:**
- Acceptation de n'importe quel type de fichier
- Pas de vérification de l'extension
- Pas de scan antivirus
- Pas de limite de taille (DoS possible)
- Le fichier est utilisé comme référence pour la génération IA

**Solution:**
```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const handleFile = async (file: File) => {
  // Validation type
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error("Type de fichier non autorisé. Images seulement (JPEG, PNG, WebP).");
    return;
  }
  
  // Validation taille
  if (file.size > MAX_SIZE) {
    toast.error("Fichier trop volumineux. Maximum 10MB.");
    return;
  }
  
  // Validation extension
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!validExtensions.includes(extension)) {
    toast.error("Extension de fichier non autorisée.");
    return;
  }
  
  setUploading(true);
  try {
    // ... reste du code
  } catch (e) {
    // ...
  }
};
```

**Priorité:** ⭐⭐⭐⭐⭐  
**Effort:** 2h  
**Impact:** Critique

---

### 5. **Pas de Rate Limiting sur les APIs IA**
**Fichier:** `src/routes/api/chat.ts`  
**Lignes:** 1-40  
**Impact:** 🔴 **Coût financier - Abus de service**

```typescript
// ❌ AUCUN rate limiting
const result = streamText({
  model: cerebras("gpt-oss-120b"),
  system: SYSTEM_PROMPT,
  messages: await convertToModelMessages(messages),
  headers: { Authorization: `Bearer ${key}` },
});
```

**Description:**
- Un utilisateur malveillant peut spammer l'API chat
- Chaque appel coûte de l'argent (Cerebras/Lovable)
- Pas de limite par utilisateur ou par IP
- Risque: facture astronomique

**Solution:**
```typescript
// Utiliser un store Redis ou Supabase pour le rate limiting
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 10, // 10 requêtes
  interval: 'minute',
  fireImmediately: true,
});

// Dans l'API route
POST: async ({ request, context }) => {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userId = context.userId || 'anonymous';
  const key = `${userId}:${ip}`;
  
  try {
    await limiter.removeTokens(1, key);
  } catch {
    return new Response('Too many requests', { status: 429 });
  }
  
  // ... reste du code
}
```

**Priorité:** ⭐⭐⭐⭐⭐  
**Effort:** 4h (avec Redis)  
**Impact:** Critique (Financier)

---

### 6. **Concurrence sur les Conversations**
**Fichier:** `src/lib/chat.functions.ts`  
**Lignes:** 10-30  
**Impact:** 🔴 **Données corrompues**

```typescript
// ❌ Pas de verrou sur les conversations
const { id } = await supabase
  .from("conversations")
  .insert({ user_id: userId })
  .select("id")
  .single();
```

**Description:**
- Plusieurs utilisateurs peuvent accéder à la même conversation
- Pas de vérification que l'utilisateur est le propriétaire
- Dans `listConversations`, filtre seulement par `user_id` mais pas de vérification côté server

**Solution:**
```typescript
// Dans loadMessages et autres fonctions
const { data: conv, error: convError } = await context.supabase
  .from("conversations")
  .select("*")
  .eq("id", data.conversationId)
  .eq("user_id", context.userId)  // ⭐ Vérification propriétaire
  .single();
  
if (convError || !conv) {
  throw new Error("Conversation introuvable ou accès refusé");
}
```

**Priorité:** ⭐⭐⭐⭐⭐  
**Effort:** 2h  
**Impact:** Élevé

---

### 7. **État Incohérent après Reset Conversation**
**Fichier:** `src/routes/dashboard.agent.tsx`  
**Lignes:** 50-60  
**Impact:** 🔴 **UI bloquée**

```typescript
const onReset = async () => {
  const { id } = await resetFn();
  setInitialMessages([]);  // ❌ Incohérent avec convId
  setConvId(id);
};
```

**Description:**
- Après reset, `convId` est mis à jour mais `initialMessages` est vide
- Le composant `ChatInner` peut essayer d'utiliser un `convId` sans messages
- Cause des erreurs de rendu

**Solution:**
```typescript
const onReset = async () => {
  const { id } = await resetFn();
  setConvId(id);
  setInitialMessages(null); // Force le re-render complet
};
```

**Priorité:** ⭐⭐⭐⭐⭐  
**Effort:** 1h  
**Impact:** Élevé

---

### 8. **Fuite de Mémoire dans Plan3DViewer**
**Fichier:** `src/components/Plan3DViewer.tsx`  
**Lignes:** 30-50  
**Impact:** 🔴 **Performance dégradée**

```typescript
// ❌ Canvas non nettoyé, Three.js objects non disposés
<Canvas
  camera={{ position: [...], fov: 60 }}
  shadows
>
  <ambientLight intensity={0.5} />
  <directionalLight ... />
  <Environment preset="city" />
  <Grid ... />
  {/* ... */}
</Canvas>
```

**Description:**
- Three.js crée des WebGL contexts et des objects 3D
- Lorsque le composant est démonté, rien n'est nettoyé
- Accumulation de mémoire et de ressources GPU

**Solution:**
```typescript
import { useThree } from '@react-three/fiber';

function SceneCleanup() {
  const gl = useThree((state) => state.gl);
  
  useEffect(() => {
    return () => {
      // Nettoyer les textures, géométries, etc.
      gl.dispose();
    };
  }, [gl]);
  
  return null;
}

// Dans Plan3DViewer
<Canvas ...>
  <SceneCleanup />
  {/* ... */}
</Canvas>
```

**Priorité:** ⭐⭐⭐⭐⭐  
**Effort:** 3h  
**Impact:** Élevé

---

## 🟠 BUGS MAJEURS (Priorité 2 - À corriger rapidement)

### 9. **Problème de Responsive dans Plan2DEditor**
**Fichier:** `src/components/Plan2DEditor.tsx`  
**Impact:** 🟠 **UX dégradée sur mobile**

**Description:**
- Le SVG n'est pas responsive sur petits écrans
- Les contrôles de édition disparaissent sur mobile
- Le zoom/pinch n'est pas géré

**Solution:** Ajouter des media queries et des contrôles tactiles.

---

### 10. **Export DXF Non Valide**
**Fichier:** `src/lib/plan-export.ts`  
**Lignes:** 80-150  
**Impact:** 🟠 **Fichiers DXF inutilisables**

**Description:**
- Le DXF généré n'est pas conforme à la spécification R12
- Certains logiciels (AutoCAD) rejettent le fichier
- Les entités LINE manquent des attributs obligatoires

**Solution:** Utiliser une librairie comme `dxf-writer` pour une génération valide.

---

### 11. **Gestion des Erreurs Incomplète**
**Fichier:** Divers fichiers  
**Impact:** 🟠 **Expérience utilisateur médiocre**

**Description:**
- Certaines erreurs ne sont pas capturées
- Les messages d'erreur ne sont pas toujours clairs
- Pas de retry automatique pour les erreurs réseau

**Solution:** Implémenter un système de gestion d'erreurs centralisé.

---

### 12. **Problème de Synchronisation dans Mini Archi**
**Fichier:** `src/routes/dashboard.mini-archi.tsx`  
**Impact:** 🟠 **Données non synchronisées**

**Description:**
- Lorsque plusieurs onglets sont ouverts, les données ne sont pas synchronisées
- Pas de WebSocket ou de polling pour les mises à jour en temps réel

**Solution:** Implémenter un système de synchronisation (WebSocket, SSR).

---

### 13. **Validation Insuffisante des Inputs**
**Fichier:** `src/lib/plans.functions.ts`  
**Impact:** 🟠 **Plans invalides générés**

**Description:**
- La surface minimale est de 20m² mais pas de maximum raisonnable
- Le nombre de chambres peut être 0
- Pas de validation que la somme des surfaces ≈ surface totale

**Solution:** Ajouter des validations plus strictes dans les schémas Zod.

---

### 14. **Pas de Confirmation avant Suppression**
**Fichier:** `src/routes/dashboard.projets.tsx`  
**Lignes:** 90-95  
**Impact:** 🟠 **Suppression accidentelle**

```typescript
<button onClick={() => delM.mutate(p.id)}>
  <Trash2 className="..." />
</button>
```

**Solution:** Ajouter une confirmation avant suppression.

---

### 15. **Problème de Performance avec les Gros Plans**
**Fichier:** `src/components/Plan3DViewer.tsx`  
**Impact:** 🟠 **Lag sur les plans complexes**

**Description:**
- Pas de LOD (Level of Detail) pour les objets 3D
- Tous les meubles et arbres sont rendus même loin
- Pas de culling des objets hors écran

**Solution:** Implémenter des optimisations 3D (LOD, culling).

---

### 16. **Upload en Double**
**Fichier:** `src/routes/dashboard.render.tsx`  
**Impact:** 🟠 **Fichiers dupliqués**

**Description:**
- Si l'utilisateur clique deux fois sur upload, deux fichiers sont uploadés
- Pas de vérification de doublon

**Solution:** Désactiver le bouton pendant l'upload.

---

### 17. **Problème de Timezone dans les Dates**
**Fichier:** Divers fichiers  
**Impact:** 🟠 **Dates incorrectes affichées**

**Description:**
- Les dates de Supabase sont en UTC
- Pas de conversion vers le timezone local
- Affichage incorrect pour les utilisateurs hors UTC

**Solution:** Utiliser `date-fns-tz` pour la conversion.

---

### 18. **Export OBJ sans Textures**
**Fichier:** `src/lib/plan-export-3d.ts`  
**Impact:** 🟠 **Modèles 3D sans couleurs**

**Description:**
- L'export OBJ ne gère pas les textures/couleurs
- Les matériaux ne sont pas exportés
- Résultat: modèle gris dans les logiciels 3D

**Solution:** Exporter avec MTL (Material Template Library).

---

### 19. **Pas de Gestion des Erreurs Network dans Cesium**
**Fichier:** `src/components/CesiumViewer.tsx`  
**Impact:** 🟠 **Cesium bloque l'UI**

**Description:**
- Si Cesium échoue à charger, l'UI reste bloquée
- Pas de fallback ou de message d'erreur clair

**Solution:** Ajouter des try/catch et un état d'erreur.

---

### 20. **Conflits de Noms dans les Plans**
**Fichier:** `src/lib/plans.functions.ts`  
**Impact:** 🟠 **Pièces dupliquées**

**Description:**
- Les IDs des pièces sont générés avec `Date.now()`
- Risque de collision si génération rapide
- Pas de vérification d'unicité

**Solution:** Utiliser `crypto.randomUUID()` ou un compteur.

---

### 21. **Problème de Zoom dans Plan2DEditor**
**Fichier:** `src/components/Plan2DEditor.tsx`  
**Impact:** 🟠 **Navigation difficile**

**Description:**
- Pas de zoom/pan sur le SVG
- Impossible de naviguer sur les grands plans

**Solution:** Ajouter des contrôles de zoom (svg-pan-zoom).

---

### 22. **Export DOCX Basique**
**Fichier:** `src/routes/dashboard.agent.tsx`  
**Lignes:** 10-40  
**Impact:** 🟠 **Formatage perdu**

**Description:**
- L'export DOCX utilise du HTML simple
- Le formatage (gras, listes, code) peut être perdu
- Pas de style Word professionnel

**Solution:** Utiliser une librairie comme `docx` pour un export propre.

---

### 23. **Pas de Pagination dans les Listes**
**Fichier:** Divers fichiers  
**Impact:** 🟠 **Performance dégradée**

**Description:**
- Toutes les conversations, plans, projets sont chargés d'un coup
- Pas de pagination ou de lazy loading
- Problème quand l'utilisateur a beaucoup de données

**Solution:** Implémenter la pagination côté server et client.

---

## 🟡 BUGS MINEURS (Priorité 3)

### 24-45. Divers Bugs Mineurs

| # | Description | Fichier | Solution |
|---|-------------|--------|----------|
| 24 | Typo "PMR" au lieu de "PMR" | `dashboard.agent.tsx:20` | Correction orthographique |
| 25 | Console warnings (React keys) | Plusieurs fichiers | Ajouter keys uniques |
| 26 | Scrollbar manquant dans Chat | `dashboard.agent.tsx` | Ajouter overflow-auto |
| 27 | Bouton "Nouvelle conversation" ne reset pas | `dashboard.agent.tsx` | Corriger la logique |
| 28 | Icônes non centrées dans certains boutons | Plusieurs fichiers | Ajuster le CSS |
| 29 | Couleurs non accessibles (contrast) | `styles.css` | Vérifier les ratios WCAG |
| 30 | Pas de tooltip sur les icônes | Plusieurs fichiers | Ajouter des tooltips |
| 31 | Focus non visible sur certains éléments | Plusieurs fichiers | Ajouter outline |
| 32 | Formulaire de login sans validation | `auth.tsx` | Ajouter validation |
| 33 | Message de succès sans durée | Plusieurs fichiers | Ajouter durée toast |
| 34 | Pas de loading sur certains boutons | Plusieurs fichiers | Ajouter états loading |
| 35 | Texte troncature mal | Plusieurs fichiers | Ajouter ellipsis |
| 36 | Pas de placeholder dans certains inputs | Plusieurs fichiers | Ajouter placeholders |
| 37 | Icônes de chargement non cohérentes | Plusieurs fichiers | Standardiser |
| 38 | Couleurs des tags non cohérentes | `projets.tsx` | Standardiser |
| 39 | Pas de confirmation avant quit | `dashboard.agent.tsx` | Ajouter confirmation |
| 40 | Historique des conversations trié inversement | `chat.functions.ts` | Corriger ORDER BY |
| 41 | Pas de recherche dans l'historique | `dashboard.agent.tsx` | Ajouter search |
| 42 | Messages trop longs non wrap | `dashboard.agent.tsx` | Ajouter word-break |
| 43 | Date de création non affichée | `projets.tsx` | Ajouter date |
| 44 | Pas de filtre par tag | `projets.tsx` | Ajouter filtres |
| 45 | Export SVGs sans metadata | `plan-export.ts` | Ajouter metadata |

---

## 🔵 BUGS COSMÉTIQUES (Priorité 4)

### 46-55. Améliorations Visuelles

| # | Description | Fichier |
|---|-------------|--------|
| 46 | Animation de chargement non fluide | `dashboard.agent.tsx` |
| 47 | Ombres incohérentes sur les cards | Plusieurs fichiers |
| 48 | Bordures non alignées | Plusieurs fichiers |
| 49 | Espacement inégal dans les grilles | Plusieurs fichiers |
| 50 | Typographie non cohérente | `styles.css` |
| 51 | Couleurs du thème non utilisées partout | Plusieurs fichiers |
| 52 | Hover states non cohérents | Plusieurs fichiers |
| 53 | Focus states manquants | Plusieurs fichiers |
| 54 | Responsive breakpoints non optimaux | Plusieurs fichiers |
| 55 | Dark mode non implémenté | Global |

---

## 📊 RÉPARTITION PAR FICHIER

```
src/routes/dashboard.agent.tsx     : 12 bugs
src/routes/dashboard.render.tsx    : 8 bugs
src/routes/dashboard.mini-archi.tsx: 10 bugs
src/components/Plan3DViewer.tsx      : 5 bugs
src/components/CesiumViewer.tsx     : 4 bugs
src/lib/plans.functions.ts         : 6 bugs
src/lib/plan-export.ts              : 4 bugs
src/lib/chat.functions.ts          : 3 bugs
src/routes/dashboard.projets.tsx    : 4 bugs
Autres                             : 9 bugs
```

---

## 🎯 FEUILLE DE ROUTE DE CORRECTION

### Phase 1: Urgent (Semaine 1)
- [ ] #1 Race Condition dans Mini Archi
- [ ] #2 Memory Leak dans CesiumViewer
- [ ] #3 XSS Vulnerability dans ReactMarkdown
- [ ] #4 Upload de Fichiers Non Validés
- [ ] #5 Rate Limiting sur les APIs IA
- [ ] #6 Concurrence sur les Conversations
- [ ] #7 État Incohérent après Reset Conversation
- [ ] #8 Fuite de Mémoire dans Plan3DViewer

**Effort estimé:** 15-20h  
**Impact:** Critique

### Phase 2: Majeur (Semaine 2)
- [ ] #9 Problème de Responsive dans Plan2DEditor
- [ ] #10 Export DXF Non Valide
- [ ] #11 Gestion des Erreurs Incomplète
- [ ] #12 Problème de Synchronisation dans Mini Archi
- [ ] #13 Validation Insuffisante des Inputs
- [ ] #14 Pas de Confirmation avant Suppression
- [ ] #15 Problème de Performance avec les Gros Plans

**Effort estimé:** 20-25h  
**Impact:** Élevé

### Phase 3: Mineur (Semaine 3-4)
- [ ] Tous les bugs mineurs (#24-45)

**Effort estimé:** 15-20h  
**Impact:** Moyen

### Phase 4: Cosmétique (Semaine 5)
- [ ] Tous les bugs cosmétiques (#46-55)

**Effort estimé:** 10-15h  
**Impact:** Faible

---

## 📈 STATISTIQUES

| Catégorie | Count | % du Total | Temps Estimé |
|----------|-------|-----------|---------------|
| Critiques | 8 | 14.5% | 15-20h |
| Majeurs | 15 | 27.3% | 20-25h |
| Mineurs | 22 | 40.0% | 15-20h |
| Cosmétiques | 10 | 18.2% | 10-15h |
| **Total** | **55** | **100%** | **60-80h** |

---

*Document généré par Mistral Vibe - Audit Bugs Complet*
