import { Label } from "@/components/ui/label";
import type { StylePrefs } from "@/lib/mini-archi.types";

export function ConstraintsForm({
  value,
  onChange,
}: {
  value: StylePrefs;
  onChange: (v: StylePrefs) => void;
}) {
  const set = (patch: Partial<StylePrefs>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Style architectural</Label>
          <select value={value.style} onChange={(e) => set({ style: e.target.value as StylePrefs["style"] })}
            className="w-full h-9 rounded-md bg-background border border-input px-3 text-sm">
            <option>Contemporain</option>
            <option>Traditionnel</option>
            <option>Bioclimatique</option>
            <option>Minimaliste</option>
            <option>Industriel</option>
            <option>Méditerranéen</option>
            <option>Rustique</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Budget</Label>
          <select value={value.budget} onChange={(e) => set({ budget: e.target.value as StylePrefs["budget"] })}
            className="w-full h-9 rounded-md bg-background border border-input px-3 text-sm">
            <option>Économique</option>
            <option>Moyen de gamme</option>
            <option>Haut de gamme</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Orientation préférée du séjour</Label>
          <select value={value.preferred_orientation} onChange={(e) => set({ preferred_orientation: e.target.value as StylePrefs["preferred_orientation"] })}
            className="w-full h-9 rounded-md bg-background border border-input px-3 text-sm">
            <option value="S">Sud (recommandé)</option>
            <option value="E">Est</option>
            <option value="O">Ouest</option>
            <option value="N">Nord</option>
            <option value="Indifférent">Indifférent</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Contraintes libres — tout ce que l'architecte doit savoir</Label>
        <textarea
          value={value.free_notes}
          onChange={(e) => set({ free_notes: e.target.value })}
          placeholder={`Exemples de ce que vous pouvez écrire :
• La chambre parentale doit être au RDC à l'écart des chambres enfants
• Cuisine ouverte sur le séjour mais fermable par cloison coulissante
• Garage pour 2 voitures + atelier 15m² attenant
• Prévoir une extension future côté est (ouverture réservée dans le mur)
• Bureau avec entrée indépendante pour activité libérale
• Puits de lumière au-dessus de la circulation centrale
• Aucun vis-à-vis côté nord
• Combles aménageables à terme
• Pas de sous-sol (roche à -1.5m)
• Piscine possible dans le jardin
• Raccordement tout-à-l'égout difficile côté rue`}
          className="w-full h-48 rounded-md bg-background border border-input px-3 py-2 text-sm resize-none placeholder:text-muted-foreground/30"
        />
        <p className="text-[10px] text-muted-foreground text-right">{value.free_notes.length}/5000</p>
      </div>
    </div>
  );
}
