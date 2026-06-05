# Mini Archi — Phase 1 Upgrade

Remplacé le formulaire 4 champs par un questionnaire guidé en 4 étapes. Les variantes sont maintenant générées avec les contraintes réelles (parcelle, PLU, programme pièces, notes libres).

---

## Nouveaux fichiers

### `src/lib/mini-archi.types.ts`
Types + Zod schemas pour tout le questionnaire. Exporte aussi :
- `DEFAULT_PLU` — valeurs par défaut des contraintes PLU
- `defaultProgram(surface, bedrooms, levels)` — génère un programme pièces standard

### `src/lib/parcel.api.ts`
3 fonctions API :
- `searchAddress(query)` → api-adresse.data.gouv.fr
- `fetchCadastreParcel(lat, lng)` → cadastre.data.gouv.fr (GeoJSON parcelle par coordonnées)
- `searchCadastreByReference(section, number, commune)` → cadastre par référence cadastrale

### `src/components/MiniMap.tsx`
Carte MapLibre GL chargée depuis CDN (jsdelivr). Affiche le contour GeoJSON de la parcelle avec la surface en overlay. Fallback propre si CDN indisponible.

### `src/components/ParcelSelector.tsx`
Step 1 du questionnaire. Deux modes :
- **Adresse** — recherche avec autocomplete, sélection → appel API cadastre pour obtenir le GeoJSON
- **Réf. cadastrale** — section + numéro + commune → appel direct

Affiche la MiniMap une fois la parcelle sélectionnée.

### `src/components/PLUForm.tsx`
Step 2. Champs structurés :
- Hauteur max, recul voisin, recul rue, emprise au sol max, SHON max, niveaux max
- Type de toit imposé, matériaux imposés, zone PLU (U/AU/A/N)
- Textarea "Autres contraintes PLU/urbaines" (servitudes, cônes de vue, etc.)

### `src/components/ProgramEditor.tsx`
Step 3. Liste de pièces modifiable :
- Nom, surface min, étage (RDC/1er/indifférent)
- Adjacences par boutons (toggle entre les autres pièces)
- Ajout/suppression de pièces
- Préréglages : "3 ch. plain-pied", "3 ch. RDC+étage", "4 ch.", "5 ch."

### `src/components/ConstraintsForm.tsx`
Step 4. Style architectural, budget, orientation préférée du séjour.
Grande textarea pour contraintes libres — l'architecte écrit tout ce que l'IA doit savoir et qui ne rentre pas dans les cases.

### `supabase/migrations/20260605000000_add_plans_input_data.sql`
```sql
ALTER TABLE plans ADD COLUMN IF NOT EXISTS input_data JSONB;
```

---

## Fichiers modifiés

### `src/routes/dashboard.mini-archi.tsx`
**Avant :** formulaire 4 champs + bouton générer → cartes variantes.
**Après :** questionnaire 4 steps (navigation avec indicateur). Après génération, les variantes s'affichent comme avant. Bouton "Retour au questionnaire" pour refaire une génération.

État questionnaire conservé entre les navigations. Validation par step (Step 1 → parcelle requise, Step 3 → au moins 1 pièce).

### `src/lib/plans.functions.ts`

**Nouveau schéma `GenerateInput` :**
- Accepte le `MiniArchiInput` complet (parcelle + PLU + programme + style)
- Fallback vers l'ancien schéma `LegacyInput` si appelé par du code legacy

**Prompt enrichi :**
Le prompt passe de 5 lignes à ~50 lignes incluant :
- Données parcelle (adresse, surface, réf. cadastrale)
- Contraintes PLU (hauteur, reculs, emprise, SHON, zone, notes)
- Programme pièces par étage avec adjacences
- Contraintes libres de l'architecte
- Style, budget, orientation préférée

**Stockage :** sauvegarde `input_data` dans la colonne JSONB pour traçabilité.

### `src/integrations/supabase/types.ts`
Ajout de `input_data: Json | null` dans les types Row/Insert/Update de `plans`.

---

## Ce qu'il faut faire sur le VPS

```bash
# 1. Installer MapLibre GL (pour MiniMap)
npm install maplibre-gl

# 2. Lancer la migration Supabase
# Exécuter le SQL de supabase/migrations/20260605000000_add_plans_input_data.sql

# 3. (optionnel) Vérifier que le build passe
npm run build
```

---

## Prochaines phases envisagées (pas commencées)

**Phase 2 — Placement contraint**
Algorithme de placement des pièces dans la parcelle (greedy + recuit simulé) pour éviter les chevauchements dûs à l'IA seule. L'IA propose les pièces/surfaces, l'algorithme les place.

**Phase 3 — Normes inline**
Les normes RE2020/PMR sont déjà dans le prompt depuis Phase 1, mais il faudrait supprimer le bouton "Appliquer normes" optionnel → auto par défaut.

**Phase 4 — Export chantier**
- Légende + cotes sur le plan 2D
- Tableau des surfaces (SHON, SHAB)
- Export PDF avec cartouche A3
- Notice descriptive IA pour permis de construire
