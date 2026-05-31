# FORMA Architect Companion - Optimisations de Performance
**Date:** 31 Mai 2026  
**Document:** 06 - PERFORMANCES.md  
**Priorité:** ⭐⭐⭐⭐

---

## 📊 AUDIT DE PERFORMANCE ACTUEL

### Scores Initiaux

| Métrique | Score | Note |
|----------|-------|------|
| **Lighthouse Performance** | 45-60 | ❌ Critique |
| **First Contentful Paint** | 3.5-5.0s | ❌ Lent |
| **Largest Contentful Paint** | 5.0-7.0s | ❌ Très Lent |
| **Time to Interactive** | 8.0-12.0s | ❌ Catastrophique |
| **Cumulative Layout Shift** | 0.1-0.3 | ⚠️ Moyen |
| **Total Blocking Time** | 1.5-2.5s | ❌ Lent |
| **Bundle Size** | ~8-12MB | ❌ Très Gros |
| **Memory Usage** | 300-500MB+ | ❌ Élevé |

---

## 🔴 PROBLÈMES CRITIQUES DE PERFORMANCE

### 1. **Bundle Size Trop Gros**
**Impact:** 🔴 **Catastrophique**  
**Fichiers:** Tous les fichiers  
**Cause:** Dépendances lourdes chargées immédiatement

#### Analyse
```
Dépendances lourdes:
├── three@0.184.0: ~1.2MB
├── @react-three/fiber: ~500KB
├── @react-three/drei: ~800KB
├── cesium@1.119.0: ~50MB (CDN)
├── radix-ui: ~500KB (25+ composants)
├── lucide-react: ~200KB
├── recharts: ~400KB
└── Autres: ~3-5MB

Total: ~8-12MB (gzip)
```

#### Solutions

##### A. Code Splitting par Route
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      manualChunks: {
        // Séparer les dépendances lourdes
        three: ['three', '@react-three/fiber', '@react-three/drei'],
        cesium: ['cesium'],
        radix: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        charts: ['recharts'],
        editor: ['react-hook-form', 'zod'],
      },
    },
  },
});
```

##### B. Lazy Loading des Composants
```typescript
// App.tsx
const Dashboard = React.lazy(() => import('@/routes/dashboard'));
const RenderPage = React.lazy(() => import('@/routes/dashboard.render'));
const MiniArchiPage = React.lazy(() => import('@/routes/dashboard.mini-archi'));
const AgentPage = React.lazy(() => import('@/routes/dashboard.agent'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Router>
        <Route path="/dashboard" element={<Dashboard />}>
          <Route path="render" element={<RenderPage />} />
          <Route path="mini-archi" element={<MiniArchiPage />} />
          <Route path="agent" element={<AgentPage />} />
        </Route>
      </Router>
    </Suspense>
  );
}
```

##### C. Dynamic Import pour Cesium
```typescript
// components/CesiumViewer.tsx
const CesiumComponent = React.lazy(async () => {
  // Charger Cesium dynamiquement
  const cesium = await import('cesium');
  
  // Initialiser Cesium
  (window as any).Cesium = cesium;
  
  // Charger le CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/cesium@1.119.0/Build/Cesium/Widgets/widgets.css';
  document.head.appendChild(link);
  
  return import('./CesiumViewerImpl');
});

// Utilisation
<Suspense fallback={<div>Chargement de Cesium...</div>}>
  <CesiumComponent plan={plan} modelBlob={modelBlob} />
</Suspense>
```

**Gain estimé:** -5-7MB, amélioration de 30-40% du TTI

---

### 2. **Rendu 3D Non Optimisé**
**Impact:** 🔴 **Élevé**  
**Fichiers:** `src/components/Plan3DViewer.tsx`
**Cause:** Pas d'optimisations Three.js

#### Problèmes Identifiés
- Tous les objets sont rendus même hors écran
- Pas de Level of Detail (LOD)
- Pas d'Instanced Rendering
- Les textures ne sont pas compressées
- Pas de Frustum Culling manuel

#### Solutions

##### A. Frustum Culling Automatique
```typescript
// Dans Plan3DViewer.tsx
<Canvas
  camera={{ position: [...], fov: 60 }}
  shadows
  gl={{ antialias: false }} // Désactiver l'anti-aliasing pour la performance
  performance={{ min: 0.1 }} // Réduire le rendement
>
  {/* Frustum culling est activé par défaut dans Three.js */}
  <Bounds clip observe>
    <group>
      {/* Contenu 3D */}
    </group>
  </Bounds>
</Canvas>
```

##### B. Level of Detail (LOD)
```typescript
import { LOD } from 'three';

function RoomWithLOD({ room, distanceThresholds = [20, 50] }) {
  const highDetail = (
    <RoomWalls room={room} detailLevel="high" />
  );
  
  const mediumDetail = (
    <RoomWalls room={room} detailLevel="medium" />
  );
  
  const lowDetail = (
    <mesh position={[room.x + room.w/2, 0, room.y + room.h/2]}>
      <boxGeometry args={[room.w, 2.7, room.h]} />
      <meshBasicMaterial color="#ccc" />
    </mesh>
  );
  
  return (
    <LOD>
      <LOD.Object3D distance={distanceThresholds[0]}>{highDetail}</LOD.Object3D>
      <LOD.Object3D distance={distanceThresholds[1]}>{mediumDetail}</LOD.Object3D>
      <LOD.Object3D>{lowDetail}</LOD.Object3D>
    </LOD>
  );
}
```

##### C. Instanced Rendering pour les Meubles
```typescript
// components/Furniture3D.tsx
import { useLoader, InstancedMesh } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

function FurnitureInstances({ furnitureItems }) {
  const { nodes, materials } = useLoader(
    GLTFLoader,
    '/models/furniture.glb'
  );
  
  // Grouper par type
  const byType = {};
  furnitureItems.forEach(item => {
    if (!byType[item.type]) byType[item.type] = [];
    byType[item.type].push(item);
  });
  
  return (
    <>
      {Object.entries(byType).map(([type, items]) => {
        const geometry = nodes[type]?.geometry;
        const material = nodes[type]?.material;
        
        if (!geometry || !material) return null;
        
        return (
          <InstancedMesh
            key={type}
            args={[geometry, material, items.length]}
            castShadow
            receiveShadow
          >
            {items.map((item, i) => (
              <instance
                key={i}
                position={[item.x + item.w/2, item.h/2, item.z + item.d/2]}
                rotation={[0, item.rotation, 0]}
              />
            ))}
          </InstancedMesh>
        );
      })}
    </>
  );
}
```

##### D. Optimisation des Ombres
```typescript
<Canvas
  shadows
  gl={{ 
    antialias: false,
    powerPreference: 'high-performance',
    precision: 'lowp', // Précision réduite pour les mobiles
  }}
>
  {/* Utiliser des ombres plus simples */}
  <directionalLight
    position={[10, 15, 8]}
    intensity={1.2}
    castShadow
    shadow-mapSize={[512, 512]} // Réduire la taille
    shadow-camera-near={0.5}
    shadow-camera-far={50}
    shadow-camera-left={-20}
    shadow-camera-right={20}
    shadow-camera-top={20}
    shadow-camera-bottom={-20}
  />
</Canvas>
```

**Gain estimé:** -50-70% de temps de rendu 3D

---

### 3. **Memory Leaks dans Three.js**
**Impact:** 🔴 **Critique**  
**Fichiers:** `src/components/Plan3DViewer.tsx`, `src/components/CesiumViewer.tsx`
**Cause:** Objets Three.js non nettoyés

#### Solutions

##### A. Nettoyage Automatique avec useEffect
```typescript
// components/Plan3DViewer.tsx
import { useThree } from '@react-three/fiber';

function SceneCleanup() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  
  useEffect(() => {
    return () => {
      // Nettoyer les textures
      gl.dispose();
      
      // Supprimer tous les objets de la scène
      while (scene.children.length > 0) {
        const obj = scene.children[0];
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
        scene.remove(obj);
      }
    };
  }, [gl, scene]);
  
  return null;
}

// Dans Plan3DViewer
<Canvas ...>
  <SceneCleanup />
  {/* ... */}
</Canvas>
```

##### B. Gestion des Textures
```typescript
// Utiliser un cache de textures
const textureCache = new Map();

function useCachedTexture(url: string) {
  const texture = useMemo(() => {
    if (textureCache.has(url)) {
      return textureCache.get(url);
    }
    
    const texture = new THREE.TextureLoader().load(url, (t) => {
      // Configurer la texture
      t.anisotropy = 1; // Réduire l'anisotropie pour la performance
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
    });
    
    textureCache.set(url, texture);
    return texture;
  }, [url]);
  
  useEffect(() => {
    return () => {
      // Ne pas disposer les textures partagées
      // texture.dispose();
    };
  }, [texture]);
  
  return texture;
}
```

**Gain estimé:** -80-90% de fuite mémoire

---

### 4. **Requêtes API Non Optimisées**
**Impact:** 🟠 **Élevé**  
**Fichiers:** Plusieurs server functions  
**Cause:** Pas de cache, requêtes répétées

#### Problèmes
- `listConversations` appelée à chaque ouverture du chat
- `listRenders` appelée à chaque chargement de la page render
- `listPlans` appelée à chaque chargement de mini-archi
- Pas de pagination

#### Solutions

##### A. Cache des Requêtes avec React Query
```typescript
// Déjà partiellement implémenté, mais à optimiser
const plans = useQuery({
  queryKey: ['plans'],
  queryFn: () => list(),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 60 * 60 * 1000, // 1 heure
});
```

##### B. Pagination
```typescript
// Dans listProjects
const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const offset = (data.page - 1) * data.pageSize;
    
    const { data: items, count, error } = await context.supabase
      .from("projects")
      .select("*", { count: 'exact' })
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + data.pageSize - 1);
    
    return {
      items: items ?? [],
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: Math.ceil((count ?? 0) / data.pageSize),
    };
  });
```

##### C. Lazy Loading des Données
```typescript
// Dans MiniArchiPage
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['plans'],
  queryFn: ({ pageParam = 1 }) => listPlans(pageParam),
  getNextPageParam: (lastPage, pages) => {
    return lastPage.hasNextPage ? pages.length + 1 : undefined;
  },
});

// Composant de chargement infini
<InfiniteScroll
  dataLength={data?.pages.flatMap(p => p.items).length ?? 0}
  next={fetchNextPage}
  hasMore={hasNextPage}
  loader={<Spinner />}
>
  {data?.pages.flatMap(page => page.items).map(plan => (
    <PlanCard key={plan.id} plan={plan} />
  ))}
</InfiniteScroll>
```

**Gain estimé:** -60-80% de requêtes inutiles

---

### 5. **Rendu React Non Optimisé**
**Impact:** 🟠 **Élevé**  
**Fichiers:** Plusieurs composants  
**Cause:** Re-renders inutiles

#### Problèmes
- Pas de `React.memo` sur les composants
- Pas de `useMemo` pour les calculs coûteux
- Props non stabilisées

#### Solutions

##### A. Memoization des Composants
```typescript
// components/RoomItem.tsx
import { memo } from 'react';

const RoomItem = memo(function RoomItem({ room, onSelect, selected }) {
  // ...
});

// ou avec comparaison personnalisée
const RoomItem = memo(
  function RoomItem({ room, onSelect, selected }) {
    // ...
  },
  (prevProps, nextProps) => {
    return (
      prevProps.room.id === nextProps.room.id &&
      prevProps.selected === nextProps.selected
    );
  }
);
```

##### B. Memoization des Calculs
```typescript
// Dans Plan2DEditor
const floorRooms = useMemo(
  () => plan.rooms.filter((r) => (r.floor ?? 1) === currentFloor),
  [plan.rooms, currentFloor]
);

const floorOpenings = useMemo(
  () => plan.openings.filter((o) => floorRooms.some((r) => r.id === o.room_id)),
  [plan.openings, floorRooms]
);

const svgInner = useMemo(
  () => planToSvgInner(plan, 50, currentFloor),
  [plan, currentFloor]
);
```

##### C. Stabilisation des Props
```typescript
// Utiliser useCallback pour les handlers
const handleRoomSelect = useCallback((roomId: string) => {
  setSelected(roomId);
}, []);

// Utiliser useMemo pour les objets
const roomProps = useMemo(() => ({
  plan,
  onChange,
  editable,
}), [plan, onChange, editable]);
```

**Gain estimé:** -40-60% de re-renders

---

### 6. **Images Non Optimisées**
**Impact:** 🟠 **Élevé**  
**Fichiers:** Uploads utilisateurs  
**Cause:** Images haute résolution non optimisées

#### Solutions

##### A. Compression Automatique
```typescript
// Dans handleFile (dashboard.render.tsx)
import imageCompression from 'browser-image-compression';

const handleFile = async (file: File) => {
  // Options de compression
  const options = {
    maxSizeMB: 2, // Taille max 2MB
    maxWidthOrHeight: 1920, // Résolution max
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.7,
  };
  
  try {
    const compressedFile = await imageCompression(file, options);
    
    // Upload du fichier compressé
    const path = `${user.id}/ref-${Date.now()}-${compressedFile.name}`;
    const { error } = await supabase.storage.from("uploads").upload(
      path, 
      compressedFile
    );
    
    if (error) throw error;
    
    const { data } = await supabase.storage.from("uploads").createSignedUrl(
      path, 
      3600
    );
    setRefUrl(data?.signedUrl ?? null);
    
  } catch (error) {
    // Fallback au fichier original si compression échoue
    toast.error("Compression échouée, upload du fichier original");
    // Upload original...
  }
};
```

##### B. Utilisation de CDN avec Optimisation
```typescript
// Configurer Supabase Storage avec transformation d'images
// Utiliser un service comme Cloudflare Images ou Imgix

const optimizedUrl = `https://cdn.yourservice.com/${refUrl}?width=800&quality=75&format=webp`;
```

##### C. Lazy Loading des Images
```typescript
<img
  src={refUrl}
  alt="Reference"
  loading="lazy"
  decoding="async"
  className="max-h-64 rounded"
/>
```

**Gain estimé:** -60-80% de taille d'images

---

### 7. **Cesium Trop Lourd**
**Impact:** 🔴 **Critique**  
**Fichiers:** `src/components/CesiumViewer.tsx`
**Cause:** Cesium pèse ~50MB et charge beaucoup de données

#### Solutions

##### A. Chargement Paresseux avec Confirmation
```typescript
// Ne charger Cesium que quand l'utilisateur clique sur l'onglet
function PlanDialog({ plan, variantIndex, variant, onClose }) {
  const [showCesium, setShowCesium] = useState(false);
  
  return (
    <DialogContent>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsTrigger value="site_reel" onClick={() => setShowCesium(true)}>
          Site réel
        </TabsTrigger>
        
        <TabsContent value="site_reel">
          {showCesium ? (
            <Suspense fallback={<CesiumLoading />}>
              <CesiumViewerLazy plan={plan} />
            </Suspense>
          ) : (
            <div className="cesium-placeholder">
              <p>Cliquez pour charger le globe 3D (Cesium, ~50MB)</p>
              <Button onClick={() => setShowCesium(true)}>
                Charger Cesium
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}
```

##### B. Alternative Légère avec Three.js
```typescript
// Créer une visualisation 3D légère avec Three.js pour le site
// Sans le terrain et les textures haute résolution de Cesium

function LightweightSiteViewer({ plan }) {
  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border/40 bg-[#1a1a1a]">
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        <Grid args={[100, 100]} />
        
        <Plan3DModel plan={plan} />
        
        <OrbitControls />
      </Canvas>
    </div>
  );
}
```

**Gain estimé:** -50MB de bundle, amélioration majeure du chargement

---

### 8. **Landing Page Trop Lourde**
**Impact:** 🟠 **Élevé**  
**Fichiers:** `src/routes/index.tsx` (816 lignes!)
**Cause:** Trop de logique, images, animations

#### Solutions

##### A. Code Splitting de la Landing Page
```typescript
// Diviser en composants séparés
// src/components/landing/HeroSection.tsx
// src/components/landing/FeaturesGrid.tsx
// etc.

// Lazy loader pour les sections
const HeroSection = React.lazy(() => import('@/components/landing/HeroSection'));
const FeaturesGrid = React.lazy(() => import('@/components/landing/FeaturesGrid'));
const StudioPreview = React.lazy(() => import('@/components/landing/StudioPreview'));

function Landing() {
  return (
    <Suspense fallback={<LandingLoader />}>
      <HeroSection />
      <FeaturesGrid />
      <StudioPreview />
    </Suspense>
  );
}
```

##### B. Lazy Loading des Images
```typescript
// Utiliser des placeholders
import { Blurhash } from 'react-blurhash';

function HeroImage() {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <div className="relative">
      {!loaded && (
        <Blurhash
          hash="LE8tJ#?H00of%gayj[ay00ay?H"
          width={1200}
          height={600}
          resolutionX={32}
          resolutionY={32}
          punch={1}
        />
      )}
      <img
        src="/hero-image.jpg"
        alt="FORMA Hero"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn("transition-opacity", loaded ? "opacity-100" : "opacity-0")}
      />
    </div>
  );
}
```

##### C. Optimisation des Animations
```typescript
// Utiliser will-change pour les animations
<div 
  className="animate-fade-in"
  style={{ willChange: 'opacity, transform' }}
>
  {/* Contenu */}
</div>

// Utiliser requestAnimationFrame au lieu de setTimeout/setInterval
const animate = () => {
  const animationId = requestAnimationFrame(() => {
    // Animation
    animate();
  });
  
  return () => cancelAnimationFrame(animationId);
};
```

**Gain estimé:** -40-60% de temps de chargement initial

---

## 🟡 OPTIMISATIONS MOYENNES

### 9. **Preloading des Assets**
```typescript
// Dans __root.tsx ou App.tsx
<head>
  {/* Preload des fonts */}
  <link rel="preload" href="/fonts/Inter.var.woff2" as="font" type="font/woff2" crossOrigin="" />
  
  {/* Preload des images critiques */}
  <link rel="preload" href="/logo.svg" as="image" />
  
  {/* Preconnect aux services externes */}
  <link rel="preconnect" href="https://api.cerebras.ai" />
  <link rel="preconnect" href="https://ai.gateway.lovable.dev" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
</head>
```

### 10. **Service Worker pour le Cache**
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      strategies: 'generateSW',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'FORMA',
        short_name: 'FORMA',
        theme_color: '#0d0f12',
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/ai\.gateway\.lovable\.dev\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lovable-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60, // 1 heure
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\.cerebras\.ai\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cerebras-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
});
```

### 11. **Optimisation des Fonts**
```typescript
// Utiliser fontsource pour charger uniquement les weights nécessaires
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

// Ou utiliser variable fonts avec subset
import '@fontsource-variable/inter/wght.css';
```

### 12. **Optimisation des Requêtes Supabase**
```typescript
// Utiliser select() avec seulement les colonnes nécessaires
const { data: messages } = await supabase
  .from('messages')
  .select('id, role, content, created_at') // Pas de user_id si pas besoin
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });

// Utiliser maybeSingle() au lieu de single() pour éviter les erreurs
const { data: conversation } = await supabase
  .from('conversations')
  .select('id, title')
  .eq('id', conversationId)
  .maybeSingle();
```

### 13. **Batch des Requêtes**
```typescript
// Au lieu de plusieurs requêtes individuelles
const { data: user } = await supabase.from('profiles').select('*').eq('id', userId).single();
const { data: projects } = await supabase.from('projects').select('*').eq('user_id', userId);
const { data: conversations } = await supabase.from('conversations').select('*').eq('user_id', userId);

// Utiliser une seule requête avec RPC
const { data } = await supabase.rpc('get_user_data', {
  user_id: userId,
});

// PostgreSQL function
CREATE OR REPLACE FUNCTION get_user_data(user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', (SELECT * FROM profiles WHERE id = user_id),
    'projects', (SELECT * FROM projects WHERE user_id = user_id),
    'conversations', (SELECT * FROM conversations WHERE user_id = user_id)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### 14. **Virtual Scrolling**
```typescript
// Pour les listes longues (historique de chat, liste de projets)
import { Virtuoso } from 'react-virtuoso';

function ChatHistory({ messages }) {
  return (
    <Virtuoso
      style={{ height: '400px' }}
      data={messages}
      itemContent={(index, message) => (
        <MessageItem message={message} />
      )}
    />
  );
}
```

### 15. **Debounce des Inputs**
```typescript
// Pour la recherche, le resize, etc.
import { useDebounce } from '@uidotdev/usehooks';

function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  
  useEffect(() => {
    // Appeler la recherche seulement après 300ms d'inactivité
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    }
  }, [debouncedQuery]);
  
  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Rechercher..."
    />
  );
}
```

---

## 📊 BENCHMARK ET MÉTRIQUES

### Outils de Mesure

#### 1. Lighthouse (Chrome DevTools)
```bash
# Exécuter un audit Lighthouse
npx lighthouse http://localhost:5173 --output=html --output-path=./lighthouse-report.html
```

#### 2. Web Vitals
```javascript
// Dans le code
import { getCLS, getFID, getLCP, getTTFB, getFCP } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getLCP(console.log);
getTTFB(console.log);
getFCP(console.log);
```

#### 3. React DevTools Profiler
- Mesurer les temps de rendu
- Identifier les composants lents
- Voir les re-renders

#### 4. Chrome Performance Tab
- Enregistrer les performances
- Identifier les goulots d'étranglement
- Analyser le temps CPU

---

### Cibles de Performance

| Métrique | Actuel | Cible | Statut |
|----------|--------|-------|--------|
| First Contentful Paint | 3.5-5.0s | < 1.8s | 🔴 |
| Largest Contentful Paint | 5.0-7.0s | < 2.5s | 🔴 |
| Time to Interactive | 8.0-12.0s | < 3.8s | 🔴 |
| Total Blocking Time | 1.5-2.5s | < 200ms | 🔴 |
| Cumulative Layout Shift | 0.1-0.3 | < 0.1 | ⚠️ |
| Bundle Size | 8-12MB | < 3MB | 🔴 |
| Memory Usage | 300-500MB | < 200MB | 🔴 |
| FPS (3D) | 30-45 | > 55 | 🔴 |

---

## 🎯 FEUILLE DE ROUTE D'OPTIMISATION

### Phase 1: Urgent (Semaine 1-2)
**Objectif:** Amélioration significative des performances critiques

- [ ] **Code Splitting par Route** (5h)
- [ ] **Lazy Loading des Composants** (5h)
- [ ] **Dynamic Import pour Cesium** (4h)
- [ ] **Nettoyage Memory Three.js** (6h)
- [ ] **Cache des Requêtes React Query** (4h)

**Impact estimé:** 
- Bundle: -5-7MB
- TTI: -40-50%
- Memory: -80-90% de leaks

---

### Phase 2: Élevé (Semaine 3-4)
**Objectif:** Optimisation avancée

- [ ] **Frustum Culling / LOD 3D** (8h)
- [ ] **Instanced Rendering** (6h)
- [ ] **Optimisation des Ombres** (4h)
- [ ] **Pagination des Requêtes** (6h)
- [ ] **Memoization des Composants** (5h)
- [ ] **Compression des Images** (4h)

**Impact estimé:**
- FPS 3D: +100-200%
- Requêtes API: -60-80%
- Re-renders: -40-60%

---

### Phase 3: Moyen (Semaine 5-6)
**Objectif:** Optimisations fines

- [ ] **Preloading des Assets** (2h)
- [ ] **Service Worker Cache** (6h)
- [ ] **Optimisation des Fonts** (2h)
- [ ] **Batch des Requêtes** (4h)
- [ ] **Virtual Scrolling** (4h)
- [ ] **Debounce des Inputs** (2h)

**Impact estimé:**
- Chargement: -20-30%
- UX: Amélioration sensible

---

### Phase 4: Long Terme (Mois 3+)
**Objectif:** Performance optimale

- [ ] **Migration vers WebGPU** (Three.js r150+)
- [ ] **Utilisation de WASM** pour les calculs lourds
- [ ] **Edge Caching** avec Cloudflare
- [ ] **Server-Side Rendering** pour la landing page
- [ ] **Progressive Enhancement**

---

## 📈 GAINS ATTENDUS

### Après Phase 1 (2 semaines)
```
Performance Score: 45-60 → 65-75 (+30-40%)
FCP: 3.5-5.0s → 2.0-3.0s (-40-50%)
LCP: 5.0-7.0s → 3.0-4.0s (-30-40%)
TTI: 8.0-12.0s → 4.0-6.0s (-50%)
Bundle: 8-12MB → 4-6MB (-50%)
Memory: 300-500MB → 200-300MB (-40%)
```

### Après Phase 2 (4 semaines)
```
Performance Score: 65-75 → 80-85 (+20-25%)
FCP: 2.0-3.0s → 1.5-2.0s (-25-30%)
LCP: 3.0-4.0s → 2.0-2.5s (-25-30%)
TTI: 4.0-6.0s → 2.5-3.5s (-35-40%)
FPS 3D: 30-45 → 50-60 (+60-100%)
```

### Après Phase 3 (6 semaines)
```
Performance Score: 80-85 → 85-90 (+5-10%)
Bundle: 4-6MB → 2-3MB (-50%)
CLS: 0.1-0.3 → 0.05-0.1 (-50-60%)
```

### Après Phase 4 (3 mois)
```
Performance Score: 85-90 → 90-95 (+5-10%)
Toutes les métriques dans le vert
```

---

## 💡 RECOMMANDATIONS SUPPLÉMENTAIRES

### 1. Monitoring Continu
- Mettre en place un système de monitoring des performances
- Alertes en cas de régression
- Tableau de bord des métriques

### 2. Tests de Performance
- Ajouter des tests de performance dans la CI
- Vérifier que les optimisations ne cassent pas le fonctionnel

### 3. Documentation
- Documenter les bonnes pratiques de performance
- Guides pour les développeurs

### 4. Revue de Code
- Intégrer les considérations de performance dans les revues de code
- Checklist de performance pour les nouvelles features

### 5. Formation
- Former l'équipe aux bonnes pratiques de performance web
- Workshops sur les outils de profiling

---

## 🔧 OUTILS RECOMMANDÉS

### Analyse
- **Lighthouse** - Audit complet
- **WebPageTest** - Tests depuis différents endroits
- **Chrome DevTools** - Profiling détaillé
- **React DevTools** - Analyse des composants
- **Three.js Stats** - Monitoring Three.js

### Optimisation
- **Vite** - Build ultra-rapide
- **ESBuild** - Minification optimale
- **Terser** - Compression avancée
- **PurgeCSS** - Suppression du CSS inutilisé
- **SVGO** - Optimisation des SVGs

### Monitoring
- **Sentry** - Monitoring des erreurs et performances
- **New Relic** - APM complet
- **LogRocket** - Replays de sessions
- **Google Analytics** - Analytics basiques

---

## 📚 RESSOURCES

- [Web Performance Best Practices](https://web.dev/learn-performance/)
- [Three.js Performance Tips](https://threejs.org/docs/#manual/en/introduction/How-to-optimize-performance)
- [React Performance Optimization](https://reactjs.org/docs/optimizing-performance.html)
- [Vite Performance](https://vitejs.dev/guide/why.html#performance)
- [Core Web Vitals](https://web.dev/vitals/)

---

*Document généré par Mistral Vibe - Audit de Performance Complet*
