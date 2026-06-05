import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PLUConstraints } from "@/lib/mini-archi.types";

export function PLUForm({
  value,
  onChange,
}: {
  value: PLUConstraints;
  onChange: (v: PLUConstraints) => void;
}) {
  const set = (patch: Partial<PLUConstraints>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Remplissez les contraintes PLU que vous connaissez. Laissez vide si non applicable.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Hauteur max (m)</Label>
          <Input type="number" value={value.max_height} onChange={(e) => set({ max_height: +e.target.value })}
            className="bg-background h-9" min={1} max={100} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recul limite voisine (m)</Label>
          <Input type="number" value={value.setback_neighbor} onChange={(e) => set({ setback_neighbor: +e.target.value })}
            className="bg-background h-9" min={0} step={0.5} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recul limite rue (m)</Label>
          <Input type="number" value={value.setback_street} onChange={(e) => set({ setback_street: +e.target.value })}
            className="bg-background h-9" min={0} step={0.5} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Emprise au sol max (%)</Label>
          <Input type="number" value={value.max_ground_coverage} onChange={(e) => set({ max_ground_coverage: +e.target.value })}
            className="bg-background h-9" min={1} max={100} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">SHON max (m²)</Label>
          <Input type="number" value={value.max_shon ?? ""} onChange={(e) => set({ max_shon: e.target.value ? +e.target.value : undefined })}
            className="bg-background h-9" min={1} placeholder="—" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Niveaux max</Label>
          <Input type="number" value={value.max_floors} onChange={(e) => set({ max_floors: +e.target.value })}
            className="bg-background h-9" min={1} max={10} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Type de toit imposé</Label>
          <Input value={value.roof_type ?? ""} onChange={(e) => set({ roof_type: e.target.value })}
            className="bg-background h-9" placeholder="Ex: tuiles canal, bac acier…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Matériaux imposés</Label>
          <Input value={value.materials ?? ""} onChange={(e) => set({ materials: e.target.value })}
            className="bg-background h-9" placeholder="Ex: pierre de taille, enduit…" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Zone PLU</Label>
        <select value={value.zone ?? ""} onChange={(e) => set({ zone: e.target.value })}
          className="w-full h-9 rounded-md bg-background border border-input px-3 text-sm">
          <option value="">— Non spécifiée —</option>
          <option value="U">U — Urbaine</option>
          <option value="AU">AU — À urbaniser</option>
          <option value="A">A — Agricole</option>
          <option value="N">N — Naturelle</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Autres contraintes PLU / urbaines</Label>
        <textarea
          value={value.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Ex: Secteur protégé, cône de vue, servitude de passage, arbre classé à préserver, hauteur limitée à 6m côté sud, raccordement tout-à-l'égout difficile…"
          className="w-full h-28 rounded-md bg-background border border-input px-3 py-2 text-sm resize-none placeholder:text-muted-foreground/50"
        />
        <p className="text-[10px] text-muted-foreground text-right">{value.notes.length}/3000</p>
      </div>
    </div>
  );
}
