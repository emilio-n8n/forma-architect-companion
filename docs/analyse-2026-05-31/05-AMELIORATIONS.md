# FORMA Architect Companion - Suggestions d'Améliorations
**Date:** 31 Mai 2026  
**Document:** 05 - AMELIORATIONS.md  
**Priorité:** ⭐⭐⭐

---

## 🎯 CATÉGORIES D'AMÉLIORATIONS

| Catégorie | Count | Impact | Effort Estimé |
|----------|-------|--------|---------------|
| **Fonctionnalités** | 25 | ⭐⭐⭐⭐ | 120-150h |
| **UX/UI** | 18 | ⭐⭐⭐ | 40-50h |
| **Technique** | 15 | ⭐⭐⭐⭐ | 60-80h |
| **Business** | 10 | ⭐⭐⭐⭐⭐ | 30-40h |
| **Collaboration** | 8 | ⭐⭐⭐⭐ | 20-30h |
| **Intégrations** | 6 | ⭐⭐⭐ | 15-20h |
| **Total** | **82** | - | **285-370h** |

---

## 🚀 AMÉLIORATIONS FONCTIONNELLES

### 1. **Système de Crédits IA**
**Priorité:** ⭐⭐⭐⭐⭐  
**Impact:** Business  
**Effort:** 15h

#### Description
Implémenter un système de crédits pour limiter l'usage de l'IA et permettre la monétisation.

#### Fonctionnalités
- Chaque utilisateur a un nombre de crédits/mois
- Chaque appel IA (render, plan, chat) consomme des crédits
- Tableau de bord des crédits utilisés
- Option de rachat de crédits (Stripe)
- Plans gratuits et payants

#### Implémentation
```typescript
// Nouvelle table: user_credits
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INT NOT NULL DEFAULT 50,
  max_credits INT NOT NULL DEFAULT 50,
  last_reset TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

// Dans chaque server function IA
const consumeCredits = async (userId: string, cost: number) => {
  const { data: userCredits, error } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .single();
  
  if (error || !userCredits || userCredits.credits < cost) {
    throw new Error("Crédits insuffisants");
  }
  
  await supabase
    .from("user_credits")
    .update({ 
      credits: userCredits.credits - cost,
      updated_at: new Date().toISOString() 
    })
    .eq("id", userCredits.id);
};

// Coûts
const CREDIT_COSTS = {
  chat_message: 1,
  generate_render: 5,
  generate_plans: 10,
  generate_2d_data: 3,
  enhance_plan: 2,
};
```

#### Bénéfices
- Monétisation du produit
- Limitation des abus
- Expérience utilisateur contrôlée

---

### 2. **Génération de Documents Administratifs**
**Priorité:** ⭐⭐⭐⭐⭐  
**Impact:** Business  
**Effort:** 20h

#### Description
L'Agent IA peut générer des documents administratifs pour les architectes.

#### Fonctionnalités
- Génération de Permis de Construire (PC)
- Déclaration Préalable (DP)
- Notice de Début de Chantier
- Attestation RT2020
- Dossier de Permis d'Aménager

#### Implémentation
```typescript
// Nouvel endpoint
POST /api/generate-document
{
  "type": "permis_de_construire",
  "projectId": "uuid",
  "parcelData": { ... },
  "buildingData": { ... }
}

// Utilisation de l'API IA avec template
const prompt = `
Génère un dossier de Permis de Construire complet pour:
- Type: ${data.type}
- Parcelle: ${JSON.stringify(data.parcelData)}
- Bâtiment: ${JSON.stringify(data.buildingData)}

Format: Markdown structuré avec sections claires.
Inclure:
1. Formulaire Cerfa
2. Notice descriptive
3. Plan de situation
4. Plan de masse
5. Coupe
6. Façades
7. Document graphique (à générer séparément)
`;
```

#### Bénéfices
- Gain de temps énorme pour les architectes
- Réduction des erreurs administratives
- Valeur ajoutée majeure

---

### 3. **Collaboration Temps Réel**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Collaboration  
**Effort:** 25h

#### Description
Permettre à plusieurs utilisateurs de collaborer sur un même projet en temps réel.

#### Fonctionnalités
- Partage de projets avec d'autres utilisateurs
- Édition simultanée des plans
- Chat intégré par projet
- Historique des modifications
- Verrouillage des éléments en cours d'édition

#### Implémentation
```typescript
// Nouvel endpoint WebSocket ou utilisation de Supabase Realtime
import { RealtimeChannel } from '@supabase/supabase-js';

const setupRealtime = (projectId: string, userId: string) => {
  const channel = supabase.channel(`project:${projectId}`, {
    config: {
      presence: {
        key: userId,
      },
    },
  });
  
  channel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'plans',
    filter: `project_id=eq.${projectId}`,
  }, (payload) => {
    // Mettre à jour l'UI en temps réel
    console.log('Changement détecté:', payload);
  });
  
  channel.subscribe();
  
  return channel;
};
```

#### Bénéfices
- Travail collaboratif efficace
- Réduction des erreurs de synchronisation
- Expérience utilisateur moderne

---

### 4. **Versioning des Plans et Projets**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Collaboration  
**Effort:** 15h

#### Description
Système de versioning pour les plans et projets.

#### Fonctionnalités
- Historique complet des modifications
- Restauration de versions précédentes
- Comparaison entre versions
- Branches de développement
- Tags de versions (v1.0, v2.0, final)

#### Implémentation
```typescript
// Nouvelle table: plan_versions
CREATE TABLE plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  version INT NOT NULL,
  label TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

// Dans updatePlan2DData
const saveVersion = async (planId: string, userId: string, data: PlanData) => {
  const { count } = await supabase
    .from("plan_versions")
    .select("*", { count: 'exact' })
    .eq("plan_id", planId);
  
  const version = count + 1;
  
  await supabase.from("plan_versions").insert({
    plan_id: planId,
    user_id: userId,
    data,
    version,
    label: `Version ${version}`,
    description: `Modification manuelle`,
  });
};
```

#### Bénéfices
- Sécurité contre la perte de données
- Suivi des évolutions
- Collaboration améliorée

---

### 5. **Système de Commentaires sur les Plans**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Collaboration  
**Effort:** 12h

#### Description
Permettre d'ajouter des commentaires directement sur les plans 2D et 3D.

#### Fonctionnalités
- Ajout de commentaires textuels sur des éléments du plan
- Réponses aux commentaires
- Résolution des commentaires
- Notifications par email
- Visualisation des commentaires en surbrillance

#### Implémentation
```typescript
// Nouvelle table: plan_comments
CREATE TABLE plan_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  variant_index INT NOT NULL,
  room_id TEXT,
  x FLOAT,
  y FLOAT,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  parent_id UUID REFERENCES plan_comments(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

// Composant CommentOverlay
function CommentOverlay({ plan, comments }) {
  return (
    <>
      {comments.map((comment) => (
        <div
          key={comment.id}
          style={{
            position: 'absolute',
            left: `${comment.x * 50 + 10}px`,
            top: `${comment.y * 50 + 10}px`,
          }}
          className="comment-pin"
          onClick={() => setSelectedComment(comment)}
        >
          {comment.status === 'open' && <div className="comment-dot" />}
          {comment.status === 'resolved' && <Check className="comment-check" />}
        </div>
      ))}
    </>
  );
}
```

---

### 6. **Intégration avec AutoCAD/Revit**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Intégrations  
**Effort:** 20h

#### Description
Permettre l'import/export direct avec AutoCAD et Revit.

#### Fonctionnalités
- Export DXF amélioré (compatible AutoCAD 2024)
- Export IFC pour Revit
- Import de fichiers AutoCAD
- Plugin AutoCAD/Revit (future)

#### Implémentation
```typescript
// Utiliser une librairie comme 'ifc.js' pour IFC
import { IFCManager } from 'web-ifc-viewer';

const exportToIFC = async (plan: PlanData): Promise<Blob> => {
  // Convertir PlanData en IFC
  // Utiliser Three.js pour générer la géométrie
  // Exporter en format IFC
};

const exportToRevit = async (plan: PlanData): Promise<Blob> => {
  // Exporter en format RVT ou via API Revit
};
```

#### Bénéfices
- Intégration avec les outils existants des architectes
- Gain de temps dans le workflow
- Positionnement marché renforcé

---

### 7. **Génération de Visites Virtuelles**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Fonctionnalités  
**Effort:** 15h

#### Description
Créer des visites virtuelles à partir des plans 3D.

#### Fonctionnalités
- Génération automatique de parcours
- Vue première personne (déjà partiellement implémentée)
- Points d'intérêt (POI) configurables
- Export en vidéo ou en lien partageable
- Intégration avec Matterport ou équivalent

#### Implémentation
```typescript
// Utilisation de FirstPersonView existant
function VirtualTour({ plan }) {
  const [currentPosition, setCurrentPosition] = useState({ x: 0, z: 0 });
  const [poi, setPoi] = useState([]);
  
  // Générer des POI automatiquement (centre des pièces)
  useEffect(() => {
    const generatedPOI = plan.rooms.map(room => ({
      id: room.id,
      x: room.x + room.w / 2,
      z: room.y + room.h / 2,
      name: room.name,
    }));
    setPoi(generatedPOI);
  }, [plan]);
  
  return (
    <FirstPersonView
      plan={plan}
      position={currentPosition}
      onPositionChange={setCurrentPosition}
    >
      {poi.map(point => (
        <POIMarker
          key={point.id}
          position={{ x: point.x, z: point.z }}
          onClick={() => navigateToPOI(point)}
        />
      ))}
    </FirstPersonView>
  );
}
```

---

### 8. **Bibliothèque de Composants Architecturaux**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Fonctionnalités  
**Effort:** 10h

#### Description
Une bibliothèque de composants prédéfinis pour les plans.

#### Fonctionnalités
- Meubles standards (cuisines, salles de bain, etc.)
- Éléments structurels (murs, portes, fenêtres)
- Styles architecturaux (contemporain, traditionnel, etc.)
- Composants personnalisables
- Glisser-déposer dans l'éditeur

#### Implémentation
```typescript
// Nouvelle table: component_library
CREATE TABLE component_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('furniture', 'structural', 'decoration')),
  category TEXT NOT NULL,
  data JSONB NOT NULL,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

// Dans Plan2DEditor
function ComponentPalette({ components, onAddComponent }) {
  return (
    <div className="component-palette">
      {components.map(component => (
        <div
          key={component.id}
          className="component-item"
          draggable
          onDragStart={(e) => e.dataTransfer.setData('component', component.id)}
        >
          <img src={component.thumbnail_url} alt={component.name} />
          <span>{component.name}</span>
        </div>
      ))}
    </div>
  );
}
```

---

### 9. **Système de Templates**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Fonctionnalités  
**Effort:** 8h

#### Description
Templates prédéfinis pour les projets.

#### Fonctionnalités
- Templates de maisons (T3, T4, T5)
- Templates de bureaux
- Templates de commerces
- Templates personnalisables
- Partage de templates entre utilisateurs

---

### 10. **Calcul Automatique de Métriques**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Fonctionnalités  
**Effort:** 10h

#### Description
Calcul automatique des métriques de construction.

#### Fonctionnalités
- Surface habitable (SHAB)
- Surface utile (SU)
- Coefficient d'occupation des sols (COS)
- Coefficient d'emprise au sol (CES)
- Hauteur sous plafond
- Volume
- Estimation de coût précis

#### Implémentation
```typescript
const calculateMetrics = (plan: PlanData): BuildingMetrics => {
  // Surface habitable
  const habitableArea = plan.rooms
    .filter(room => ['Séjour', 'Chambre', 'Cuisine', 'Salle de bain'].includes(room.name))
    .reduce((sum, room) => sum + room.w * room.h, 0);
  
  // Volume
  const floors = [...new Set(plan.rooms.map(r => r.floor ?? 1))];
  const volume = habitableArea * floors.length * 2.7; // 2.7m hauteur standard
  
  // COS
  const cos = habitableArea / plan.total_w / plan.total_h;
  
  // Coût
  const costPerSqm = 1500; // €/m²
  const estimatedCost = habitableArea * costPerSqm;
  
  return {
    habitableArea,
    totalArea: plan.total_w * plan.total_h,
    volume,
    cos,
    ces: cos, // Simplification
    estimatedCost,
    // ... autres métriques
  };
};
```

---

## 🎨 AMÉLIORATIONS UX/UI

### 11. **Refonte de la Landing Page**
**Priorité:** ⭐⭐⭐  
**Impact:** UX  
**Effort:** 8h

#### Description
La landing page actuelle (`src/routes/index.tsx`) fait **816 lignes** et contient beaucoup de code dupliqué.

#### Problèmes
- Trop de logique dans un seul fichier
- Code dupliqué (sliders)
- Pas de composants réutilisables
- Difficile à maintenir

#### Solution
```
// Nouvelle structure
src/routes/index.tsx (50 lignes)
├── components/landing/
│   ├── HeroSection.tsx
│   ├── FeaturesGrid.tsx
│   ├── BeforeAfterSlider.tsx (réutilisable)
│   ├── StudioPreview.tsx
│   ├── StatsSection.tsx
│   └── ManifestoSection.tsx
```

#### Bénéfices
- Code plus maintenable
- Réutilisation des composants
- Meilleure performance

---

### 12. **Mode Sombre (Dark Mode)**
**Priorité:** ⭐⭐⭐  
**Impact:** UX  
**Effort:** 5h

#### Description
Ajouter un mode sombre pour l'application.

#### Implémentation
```typescript
// Context
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

function ThemeProvider({ children }) {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme}>{children}</div>
    </ThemeContext.Provider>
  );
}

// Dans styles.css
:root {
  --background: 240 240 240;
  --foreground: 10 10 10;
  --card: 255 255 255;
  --border: 200 200 200;
}

.dark {
  --background: 10 10 10;
  --foreground: 240 240 240;
  --card: 20 20 20;
  --border: 40 40 40;
}

body {
  background-color: rgb(var(--background));
  color: rgb(var(--foreground));
}
```

---

### 13. **Amélioration de l'Éditeur 2D**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** UX  
**Effort:** 10h

#### Fonctionnalités
- Zoom et pan avec la souris
- Sélection multiple de pièces
- Copier/coller des pièces
- Alignement automatique
- Grille magnétique
- Règles de mesure
- Export PNG du plan

#### Implémentation
```typescript
// Utiliser react-zoom-pan-pinch pour le zoom/pan
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

function Plan2DEditor({ plan, editable, onChange }) {
  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.1}
      maxScale={10}
    >
      <TransformComponent>
        <svg viewBox={`0 0 ${W} ${H}`}>
          {/* Contenu SVG */}
        </svg>
      </TransformComponent>
    </TransformWrapper>
  );
}
```

---

### 14. **Amélioration de la Visualisation 3D**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** UX  
**Effort:** 15h

#### Fonctionnalités
- Sélection d'objets 3D
- Propriétés des objets sélectionnés
- Vue en coupe
- Vue en plan
- Vue en élévation
- Export d'images HD
- Réglages de lumière avancés

#### Implémentation
```typescript
// Dans Plan3DViewer
<Canvas ...>
  {/* ... */}
  <SelectionHelper
    onSelect={(object) => setSelectedObject(object)}
  />
  {selectedObject && (
    <ObjectProperties object={selectedObject} />
  )}
  <LightControls />
  <ViewControls
    views={['perspective', 'top', 'front', 'right']}
    onViewChange={setCurrentView}
  />
</Canvas>
```

---

### 15. **Notifications Améliorées**
**Priorité:** ⭐⭐⭐  
**Impact:** UX  
**Effort:** 3h

#### Description
Système de notifications plus complet.

#### Fonctionnalités
- Notifications en temps réel (WebSocket)
- Centre de notifications
- Notifications par email
- Préférences de notification
- Historique des notifications

#### Implémentation
```typescript
// Nouvelle table: notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  action_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

// Composant NotificationCenter
function NotificationCenter() {
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  });
  
  return (
    <Popover>
      <PopoverTrigger>
        <Bell className="h-5 w-5" />
        {notifications?.filter(n => !n.read).length > 0 && (
          <span className="notification-badge">
            {notifications.filter(n => !n.read).length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent>
        <div className="notification-list">
          {notifications?.map(n => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

### 16. **Recherche et Filtres Globaux**
**Priorité:** ⭐⭐⭐  
**Impact:** UX  
**Effort:** 5h

#### Description
Ajouter une barre de recherche globale.

#### Fonctionnalités
- Recherche dans les projets
- Recherche dans les conversations
- Recherche dans les plans
- Filtres par type, date, statut

#### Implémentation
```typescript
function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const search = useDebouncedCallback(async (q) => {
    if (!q) {
      setResults([]);
      return;
    }
    
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .ilike('title', `%${q}%`)
      .limit(5);
    
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .ilike('title', `%${q}%`)
      .limit(5);
    
    setResults([...projects, ...conversations]);
  }, 300);
  
  useEffect(() => {
    search(query);
  }, [query]);
  
  return (
    <Command>
      <CommandInput
        placeholder="Rechercher..."
        value={query}
        onValueChange={setQuery}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      {isOpen && (
        <CommandList>
          {results.map(result => (
            <CommandItem key={result.id}>
              <Link to={`/${result.type}/${result.id}`}>
                {result.title}
              </Link>
            </CommandItem>
          ))}
        </CommandList>
      )}
    </Command>
  );
}
```

---

## 🔧 AMÉLIORATIONS TECHNIQUES

### 17. **Tests Unitaires et d'Intégration**
**Priorité:** ⭐⭐⭐⭐⭐  
**Impact:** Technique  
**Effort:** 20h

#### Description
Ajouter une couverture de tests complète.

#### Implémentation
```typescript
// package.json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jsdom": "^24.0.0"
  }
}

// vite.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});

// src/test/plans.functions.test.ts
import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '@/lib/plans.functions';

describe('calculateMetrics', () => {
  it('should calculate habitable area correctly', () => {
    const plan = {
      rooms: [
        { name: 'Séjour', w: 5, h: 6 },
        { name: 'Chambre', w: 4, h: 4 },
        { name: 'Cuisine', w: 3, h: 4 },
      ],
      total_w: 10,
      total_h: 10,
    };
    
    const metrics = calculateMetrics(plan);
    expect(metrics.habitableArea).toBe(5*6 + 4*4 + 3*4); // 30 + 16 + 12 = 58
  });
});
```

#### Bénéfices
- Réduction des bugs
- Meilleure maintenabilité
- Confiance accrue dans le code

---

### 18. **Optimisation des Performances 3D**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Technique  
**Effort:** 15h

#### Description
Optimiser les performances de la visualisation 3D.

#### Optimisations
- Level of Detail (LOD)
- Frustum Culling
- Occlusion Culling
- Texture Compression
- Instanced Rendering pour les éléments répétitifs
- WebGLRenderer optimisé

#### Implémentation
```typescript
// Utilisation de Troika pour les text 3D (plus performant)
import { Text } from '@react-three/drei';

// Utilisation de InstancedMesh pour les meubles identiques
function FurnitureInstances({ items }) {
  const { nodes, materials } = useLoader(GLTFLoader, '/furniture.glb');
  
  return (
    <InstancedMesh
      args={[nodes.Chair.geometry, materials.Chair, 100]}
      castShadow
      receiveShadow
    >
      {items.filter(i => i.type === 'chaise').map((item, i) => (
        <instance
          key={i}
          position={[item.x, 0, item.z]}
          rotation={[0, item.rotation, 0]}
        />
      ))}
    </InstancedMesh>
  );
}
```

---

### 19. **Lazy Loading des Composants**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Technique  
**Effort:** 5h

#### Description
Charger les composants lourds à la demande.

#### Implémentation
```typescript
// Utilisation de React.lazy et Suspense
const Plan3DViewer = React.lazy(() => import('@/components/Plan3DViewer'));
const CesiumViewer = React.lazy(() => import('@/components/CesiumViewer'));

function MiniArchiPage() {
  return (
    <Suspense fallback={<div>Chargement du visualiseur 3D...</div>}>
      <Plan3DViewer plan={plan} />
    </Suspense>
  );
}

// Pour Cesium (très lourd)
const CesiumComponent = React.lazy(async () => {
  // Charger Cesium dynamiquement
  await import('cesium');
  return import('@/components/CesiumViewer');
});
```

---

### 20. **Cache des Requêtes IA**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Technique  
**Effort:** 8h

#### Description
Cacher les réponses de l'IA pour éviter de refaire les mêmes requêtes.

#### Implémentation
```typescript
// Utilisation de Redis ou Supabase Cache
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL,
});

await redis.connect();

const getCachedOrFetch = async (key: string, fetchFn: () => Promise<any>, ttl = 3600) => {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const result = await fetchFn();
  await redis.set(key, JSON.stringify(result), { ex: ttl });
  
  return result;
};

// Utilisation
const generatePlans = createServerFn({ method: "POST" })
  .handler(async ({ data, context }) => {
    const cacheKey = `plans:${context.userId}:${JSON.stringify(data)}`;
    
    return getCachedOrFetch(cacheKey, async () => {
      // Appel IA normal
      return callJSON<{ variants: PlanVariant[] }>(prompt, system);
    }, 86400); // Cache 24h
  });
```

---

### 21. **Système de Logging Centralisé**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Technique  
**Effort:** 10h

#### Description
Système de logging pour le monitoring et le debug.

#### Implémentation
```typescript
// Utilisation de pino ou winston
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// Middleware de logging
const loggingMiddleware = createMiddleware().server(async ({ next }) => {
  const start = Date.now();
  const request = getRequest();
  
  try {
    const response = await next();
    const duration = Date.now() - start;
    
    logger.info({
      method: request.method,
      path: request.url,
      status: response.status,
      duration,
    });
    
    return response;
  } catch (error) {
    logger.error({
      method: request.method,
      path: request.url,
      error: error.message,
      stack: error.stack,
    });
    
    throw error;
  }
});

// Dans les server functions
logger.info('Génération de plans démarrée', { userId, params: data });
logger.error('Erreur de génération', { error: error.message });
```

---

## 💼 AMÉLIORATIONS BUSINESS

### 22. **Système d'Abonnements**
**Priorité:** ⭐⭐⭐⭐⭐  
**Impact:** Business  
**Effort:** 20h

#### Description
Système d'abonnements pour monétiser la plateforme.

#### Fonctionnalités
- Abonnement gratuit (limité)
- Abonnement Pro (illimité)
- Abonnement Agence (multi-utilisateurs)
- Essai gratuit 14 jours
- Paiement par Stripe
- Gestion des abonnements dans le dashboard

#### Implémentation
```typescript
// Nouvelle table: subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'agency')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

// Middleware de vérification abonnement
const requireSubscription = (minPlan: 'free' | 'pro' | 'agency') => {
  return createMiddleware().server(async ({ next, context }) => {
    const { data: subscription, error } = await context.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', context.userId)
      .single();
    
    if (error || !subscription) {
      throw new Error('Abonnement requis');
    }
    
    const plans = { free: 0, pro: 1, agency: 2 };
    if (plans[subscription.plan] < plans[minPlan]) {
      throw new Error('Abonnement insuffisant');
    }
    
    return next({ context: { ...context, subscription } });
  });
};

// Utilisation
const generatePlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireSubscription('pro')])
  .handler(async ({ data, context }) => {
    // ...
  });
```

---

### 23. **Intégration avec Stripe**
**Priorité:** ⭐⭐⭐⭐⭐  
**Impact:** Business  
**Effort:** 15h

#### Description
Intégrer Stripe pour les paiements.

#### Fonctionnalités
- Paiement par carte bancaire
- Paiement par SEPA
- Factures automatiques
- Gestion des abonnements
- Webhooks pour les événements

#### Implémentation
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-01-30',
});

// Création d'un customer Stripe
const createStripeCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const customer = await stripe.customers.create({
      email: context.claims.email,
      metadata: {
        user_id: context.userId,
      },
    });
    
    await context.supabase
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', context.userId);
    
    return { customerId: customer.id };
  });

// Création d'un abonnement
const createSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    priceId: z.string(),
    paymentMethodId: z.string(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', context.userId)
      .single();
    
    const subscription = await stripe.subscriptions.create({
      customer: profile.stripe_customer_id,
      items: [{ price: data.priceId }],
      default_payment_method: data.paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
    });
    
    await context.supabase.from('subscriptions').insert({
      user_id: context.userId,
      plan: 'pro', // À mapper avec le priceId
      stripe_customer_id: profile.stripe_customer_id,
      stripe_subscription_id: subscription.id,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      status: subscription.status,
    });
    
    return {
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    };
  });
```

---

### 24. **Tableau de Bord Analytics**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Business  
**Effort:** 12h

#### Description
Tableau de bord pour suivre l'utilisation et la performance.

#### Fonctionnalités
- Statistiques d'utilisation
- Nombre de projets créés
- Nombre de rendus générés
- Temps moyen de génération
- Coût des appels IA
- Activité utilisateur

#### Implémentation
```typescript
// Nouvelle table: analytics
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

// Middleware de tracking
const trackingMiddleware = createMiddleware().server(async ({ next }) => {
  const request = getRequest();
  const response = await next();
  
  // Ne pas tracker les erreurs
  if (response.status >= 400) return response;
  
  const userId = request.headers.get('x-user-id');
  const path = request.url;
  
  await supabase.from('analytics').insert({
    user_id: userId || null,
    event_type: 'api_call',
    event_data: {
      path,
      method: request.method,
      status: response.status,
    },
    ip_address: request.headers.get('x-forwarded-for'),
    user_agent: request.headers.get('user-agent'),
  });
  
  return response;
});

// Page Analytics (admin only)
function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from('analytics')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      // Calculer les stats
      const eventCounts = {};
      data.forEach(event => {
        eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
      });
      
      setStats(eventCounts);
    };
    
    fetchStats();
  }, []);
  
  return (
    <div className="analytics-dashboard">
      <StatCard title="Utilisateurs actifs" value={stats?.user_id || 0} />
      <StatCard title="Projets créés" value={stats?.create_project || 0} />
      <StatCard title="Rendus générés" value={stats?.generate_render || 0} />
      {/* ... */}
    </div>
  );
}
```

---

### 25. **API Publique (Future)**
**Priorité:** ⭐⭐⭐  
**Impact:** Business  
**Effort:** 30h

#### Description
API publique pour permettre à d'autres applications d'utiliser FORMA.

#### Fonctionnalités
- Endpoint de génération de rendus
- Endpoint de génération de plans
- Endpoint de conseil réglementaire
- Authentification par clé API
- Rate limiting strict
- Documentation Swagger/OpenAPI

---

## 👥 AMÉLIORATIONS COLLABORATION

### 26. **Partage de Projets**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Collaboration  
**Effort:** 10h

#### Description
Permettre le partage de projets avec d'autres utilisateurs.

#### Fonctionnalités
- Partage par email
- Partage par lien (public ou privé)
- Niveaux de permission (lecture, commentaire, édition)
- Révocation du partage

#### Implémentation
```typescript
// Nouvelle table: project_shares
CREATE TABLE project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'comment', 'edit', 'admin')),
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

// Dans le middleware
const requireProjectAccess = createMiddleware().server(async ({ next, context }) => {
  const projectId = context.pathParams?.projectId;
  if (!projectId) return next();
  
  const { data: share, error } = await context.supabase
    .from('project_shares')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', context.userId)
    .maybeSingle();
  
  if (error) throw error;
  if (!share && !isOwner) {
    throw new Error('Accès refusé');
  }
  
  return next({ context: { ...context, projectPermission: share?.permission || 'admin' } });
});
```

---

### 27. **Rôles et Permissions**
**Priorité:** ⭐⭐⭐⭐  
**Impact:** Collaboration  
**Effort:** 8h

#### Description
Système de rôles et permissions avancé.

#### Rôles
- **Propriétaire** : Tous les droits
- **Administrateur** : Gestion des utilisateurs
- **Éditeur** : Modification des projets
- **Commentateur** : Ajout de commentaires
- **Visualiseur** : Lecture seule

#### Implémentation
```typescript
// Enum des rôles
const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  COMMENTER: 'commenter',
  VIEWER: 'viewer',
};

// Middleware de vérification de rôle
const requireRole = (role: string) => {
  return createMiddleware().server(async ({ next, context }) => {
    const { projectPermission } = context;
    
    const roleHierarchy = {
      [ROLES.OWNER]: 5,
      [ROLES.ADMIN]: 4,
      [ROLES.EDITOR]: 3,
      [ROLES.COMMENTER]: 2,
      [ROLES.VIEWER]: 1,
    };
    
    if (roleHierarchy[projectPermission] < roleHierarchy[role]) {
      throw new Error('Permission insuffisante');
    }
    
    return next();
  });
};

// Utilisation
const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireProjectAccess, requireRole(ROLES.EDITOR)])
  .handler(async ({ data, context }) => {
    // ...
  });
```

---

### 28. **Historique des Activités**
**Priorité:** ⭐⭐⭐  
**Impact:** Collaboration  
**Effort:** 5h

#### Description
Historique complet des activités sur un projet.

#### Fonctionnalités
- Liste des modifications
- Qui a fait quoi et quand
- Restauration à un point dans le temps
- Export de l'historique

#### Implémentation
```typescript
// Déjà partiellement implémentée avec Supabase
// Il suffit d'ajouter une table dédiée

CREATE TABLE project_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

// Trigger PostgreSQL pour logger automatiquement
CREATE OR REPLACE FUNCTION log_project_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO project_activity (project_id, user_id, action, data)
    VALUES (NEW.id, current_setting('app.current_user_id')::UUID, 'create', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO project_activity (project_id, user_id, action, data)
    VALUES (NEW.id, current_setting('app.current_user_id')::UUID, 'update', jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO project_activity (project_id, user_id, action, data)
    VALUES (OLD.id, current_setting('app.current_user_id')::UUID, 'delete', to_jsonb(OLD));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION log_project_activity();
```

---

## 🔗 AMÉLIORATIONS INTÉGRATIONS

### 29. **Intégration avec Google Drive/Dropbox**
**Priorité:** ⭐⭐⭐  
**Impact:** Intégrations  
**Effort:** 8h

#### Description
Permettre de sauvegarder et charger des fichiers depuis Google Drive ou Dropbox.

#### Fonctionnalités
- Connexion OAuth
- Liste des fichiers
- Téléchargement
- Upload
- Synchronisation automatique

#### Implémentation
```typescript
// Utilisation de l'API Google Drive
import { google } from 'googleapis';

const drive = google.drive({
  version: 'v3',
  auth: oauth2Client,
});

const listFiles = async (folderId?: string) => {
  const res = await drive.files.list({
    q: folderId ? `parents='${folderId}'` : undefined,
    fields: 'files(id, name, mimeType, size, createdTime)',
  });
  
  return res.data.files || [];
};

const downloadFile = async (fileId: string) => {
  const res = await drive.files.get({
    fileId,
    alt: 'media',
  }, { responseType: 'arraybuffer' });
  
  return res.data;
};

const uploadFile = async (name: string, data: Buffer, mimeType: string, folderId?: string) => {
  const fileMetadata = {
    name,
    parents: folderId ? [folderId] : undefined,
  };
  
  const media = {
    mimeType,
    body: data,
  };
  
  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name',
  });
  
  return res.data;
};
```

---

### 30. **Webhooks pour les Événements**
**Priorité:** ⭐⭐⭐  
**Impact:** Intégrations  
**Effort:** 5h

#### Description
Webhooks pour notifier des systèmes externes des événements.

#### Fonctionnalités
- Webhook pour nouveau projet
- Webhook pour nouveau rendu
- Webhook pour nouveau message IA
- Configuration dans le dashboard
- Tests de webhook

#### Implémentation
```typescript
// Nouvelle table: webhooks
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL CHECK (array_length(events, 1) > 0),
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

// Fonction pour envoyer un webhook
const sendWebhook = async (event: string, data: any) => {
  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('*')
    .contains('events', [event])
    .eq('is_active', true);
  
  if (error) {
    console.error('Error fetching webhooks:', error);
    return;
  }
  
  for (const webhook of webhooks) {
    try {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(data))
        .digest('hex');
      
      await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Event': event,
        },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error(`Error sending webhook to ${webhook.url}:`, e);
    }
  }
};

// Dans les server functions
const generateRender = createServerFn({ method: "POST" })
  .handler(async ({ data, context }) => {
    // ... génération du rendu
    
    // Envoyer webhook
    await sendWebhook('render.generated', {
      userId: context.userId,
      renderId: result.id,
      createdAt: new Date().toISOString(),
    });
    
    return result;
  });
```

---

### 31. **API de Callback pour les Rendus**
**Priorité:** ⭐⭐⭐  
**Impact:** Intégrations  
**Effort:** 5h

#### Description
Permettre de recevoir un callback quand un rendu est prêt.

#### Implémentation
Similaire aux webhooks mais spécifique aux rendus longs.

---

## 📊 RÉPARTITION PAR PRIORITÉ

| Priorité | Count | Temps Estimé | ROI |
|----------|-------|---------------|-----|
| ⭐⭐⭐⭐⭐ (Critique) | 10 | 80-100h | ⭐⭐⭐⭐⭐ |
| ⭐⭐⭐⭐ (Élevé) | 20 | 100-120h | ⭐⭐⭐⭐ |
| ⭐⭐⭐ (Moyen) | 30 | 80-100h | ⭐⭐⭐ |
| ⭐⭐ (Faible) | 22 | 45-60h | ⭐⭐ |
| **Total** | **82** | **305-380h** | - |

---

## 🎯 FEUILLE DE ROUTE

### Phase 1: Monétisation (Mois 1)
**Objectif:** Générer des revenus

- [ ] Système de crédits IA (#22)
- [ ] Intégration Stripe (#23)
- [ ] Système d'abonnements (#24)
- [ ] Tableau de bord analytics (#25)

**Effort:** 60-70h  
**Impact:** ⭐⭐⭐⭐⭐

### Phase 2: Collaboration (Mois 2)
**Objectif:** Améliorer le travail d'équipe

- [ ] Collaboration temps réel (#3)
- [ ] Versioning des plans (#4)
- [ ] Système de commentaires (#5)
- [ ] Partage de projets (#26)
- [ ] Rôles et permissions (#27)
- [ ] Historique des activités (#28)

**Effort:** 70-80h  
**Impact:** ⭐⭐⭐⭐

### Phase 3: Fonctionnalités Avancées (Mois 3)
**Objectif:** Différenciation produit

- [ ] Génération de documents administratifs (#2)
- [ ] Intégration AutoCAD/Revit (#6)
- [ ] Génération de visites virtuelles (#7)
- [ ] Bibliothèque de composants (#8)
- [ ] Système de templates (#9)
- [ ] Calcul automatique de métriques (#10)

**Effort:** 80-90h  
**Impact:** ⭐⭐⭐⭐⭐

### Phase 4: UX/UI (Mois 4)
**Objectif:** Améliorer l'expérience utilisateur

- [ ] Refonte landing page (#11)
- [ ] Mode sombre (#12)
- [ ] Amélioration éditeur 2D (#13)
- [ ] Amélioration visualisation 3D (#14)
- [ ] Notifications améliorées (#15)
- [ ] Recherche et filtres (#16)

**Effort:** 40-50h  
**Impact:** ⭐⭐⭐

### Phase 5: Technique (Mois 5)
**Objectif:** Améliorer la robustesse

- [ ] Tests unitaires (#17)
- [ ] Optimisation performances 3D (#18)
- [ ] Lazy loading (#19)
- [ ] Cache des requêtes IA (#20)
- [ ] Logging centralisé (#21)

**Effort:** 60-80h  
**Impact:** ⭐⭐⭐⭐

### Phase 6: Intégrations (Mois 6)
**Objectif:** Écosystème étendu

- [ ] Google Drive/Dropbox (#29)
- [ ] Webhooks (#30)
- [ ] API de callback (#31)
- [ ] API publique (#28)

**Effort:** 20-30h  
**Impact:** ⭐⭐⭐

---

## 💡 IDÉES FUTURES

| Idée | Description | Potentiel | Complexité |
|------|-------------|-----------|------------|
| **IA Générative Avancée** | Génération de plans à partir d'images (sketch) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Reconnaissance Vocale** | Dictée des descriptions de projet | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Plugin SketchUp** | Plugin pour exporter vers FORMA | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Plugin Figma** | Design d'intérieur dans Figma | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Marketplace de Templates** | Vente de templates par les utilisateurs | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Formation en Ligne** | Cours et tutoriels vidéo | ⭐⭐⭐ | ⭐⭐ |
| **Certification** | Certification des architectes | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Mobile App** | Application mobile pour chantier | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **AR/VR Integration** | Visualisation en réalité augmentée | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Blockchain** | Certification des plans via blockchain | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 📈 ROI ESTIMÉ

| Amélioration | Coût (h) | Gain Annuel Estimé | ROI |
|--------------|----------|---------------------|-----|
| Système de crédits | 15 | €50,000-100,000 | 20x |
| Abonnements | 20 | €100,000-200,000 | 30x |
| Documents administratifs | 20 | €30,000-50,000 | 15x |
| Collaboration temps réel | 25 | €20,000-40,000 | 10x |
| Intégration AutoCAD | 20 | €15,000-30,000 | 12x |

---

*Document généré par Mistral Vibe - Analyse des Améliorations*
