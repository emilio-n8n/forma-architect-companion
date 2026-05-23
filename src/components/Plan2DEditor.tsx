import { useState, useMemo } from "react";
import type { PlanData } from "@/lib/plans.functions";
import { planToSvgInner } from "@/lib/plan-export";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Layers } from "lucide-react";

export function Plan2DEditor({
  plan,
  editable,
  onChange,
}: {
  plan: PlanData;
  editable: boolean;
  onChange: (p: PlanData) => void;
}) {
  const floors = useMemo(() => {
    const f = new Set(plan.rooms.map((r) => r.floor ?? 1));
    return Array.from(f).sort((a, b) => a - b);
  }, [plan.rooms]);
  const [currentFloor, setCurrentFloor] = useState(floors[0] ?? 1);

  const floorRooms = useMemo(
    () => plan.rooms.filter((r) => (r.floor ?? 1) === currentFloor),
    [plan.rooms, currentFloor]
  );
  const floorOpenings = useMemo(
    () => plan.openings.filter((o) => floorRooms.some((r) => r.id === o.room_id)),
    [plan.openings, floorRooms]
  );

  const [selected, setSelected] = useState<string | null>(floorRooms[0]?.id ?? null);
  const room = floorRooms.find((r) => r.id === selected) ?? null;

  const updateRoom = (id: string, patch: Partial<PlanData["rooms"][number]>) => {
    const rooms = plan.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r));
    const total_w = Math.max(...rooms.map((r) => r.x + r.w), plan.total_w);
    const total_h = Math.max(...rooms.map((r) => r.y + r.h), plan.total_h);
    onChange({ ...plan, rooms, total_w, total_h });
  };
  const deleteRoom = (id: string) => {
    onChange({
      ...plan,
      rooms: plan.rooms.filter((r) => r.id !== id),
      openings: plan.openings.filter((o) => o.room_id !== id),
    });
    setSelected(null);
  };
  const addRoom = () => {
    const id = `r${Date.now()}`;
    const r = { id, name: "Nouvelle pièce", x: 0, y: plan.total_h, w: 3, h: 3, floor: currentFloor };
    onChange({ ...plan, rooms: [...plan.rooms, r], total_h: plan.total_h + 3 });
    setSelected(id);
  };

  const svgInner = planToSvgInner(plan, 50, currentFloor);
  const W = plan.total_w * 50;
  const H = plan.total_h * 50;

  return (
    <div className={editable ? "grid lg:grid-cols-[1fr_320px] gap-4" : ""}>
      {floors.length > 1 && (
        <div className="lg:col-span-2 flex items-center gap-2 mb-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          {floors.map((f) => (
            <button
              key={f}
              onClick={() => { setCurrentFloor(f); setSelected(null); }}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                currentFloor === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {f === 1 ? "RDC" : `Niv. ${f}`}
            </button>
          ))}
        </div>
      )}
      <div className="bg-white rounded-lg overflow-auto border border-border/40 p-4 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="max-w-full h-auto"
          style={{ maxHeight: 500 }}
          dangerouslySetInnerHTML={{ __html: svgInner + selectionOverlay(floorRooms, selected) }}
          onClick={(e) => {
            if (!editable) return;
            const target = e.target as SVGElement;
            const id = target.getAttribute("data-room-id");
            if (id) setSelected(id);
          }}
        />
      </div>

      {editable && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Pièces {currentFloor > 1 ? `Niv. ${currentFloor}` : "RDC"}
            </p>
            <Button size="sm" variant="ghost" onClick={addRoom}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 border border-border/30 rounded p-1">
            {floorRooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                  selected === r.id ? "bg-primary/20 text-primary" : "hover:bg-muted/40"
                }`}
              >
                {r.name} <span className="text-muted-foreground">· {(r.w * r.h).toFixed(1)} m²</span>
              </button>
            ))}
          </div>
          {room && (
            <div className="space-y-2 border-t border-border/30 pt-3">
              <p className="text-xs uppercase tracking-widest text-primary">Édition</p>
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Nom</span>
                <Input value={room.name} onChange={(e) => updateRoom(room.id, { name: e.target.value })} className="bg-background h-8 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">Largeur (m)</span>
                  <Input type="number" step="0.1" value={room.w} onChange={(e) => updateRoom(room.id, { w: +e.target.value })} className="bg-background h-8 text-sm" />
                </label>
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">Profondeur (m)</span>
                  <Input type="number" step="0.1" value={room.h} onChange={(e) => updateRoom(room.id, { h: +e.target.value })} className="bg-background h-8 text-sm" />
                </label>
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">X (m)</span>
                  <Input type="number" step="0.1" value={room.x} onChange={(e) => updateRoom(room.id, { x: +e.target.value })} className="bg-background h-8 text-sm" />
                </label>
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">Y (m)</span>
                  <Input type="number" step="0.1" value={room.y} onChange={(e) => updateRoom(room.id, { y: +e.target.value })} className="bg-background h-8 text-sm" />
                </label>
              </div>
              <Button size="sm" variant="ghost" onClick={() => deleteRoom(room.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function selectionOverlay(rooms: PlanData["rooms"], id: string | null) {
  const scale = 50;
  return rooms
    .map((r) => {
      const sel = r.id === id ? `<rect x="${r.x * scale}" y="${r.y * scale}" width="${r.w * scale}" height="${r.h * scale}" fill="none" stroke="#c4a264" stroke-width="3" stroke-dasharray="6 4" pointer-events="none"/>` : "";
      return `<rect data-room-id="${r.id}" x="${r.x * scale}" y="${r.y * scale}" width="${r.w * scale}" height="${r.h * scale}" fill="transparent" style="cursor:pointer"/>${sel}`;
    })
    .join("");
}
