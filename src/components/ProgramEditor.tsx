import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { RoomDef } from "@/lib/mini-archi.types";

export function ProgramEditor({
  rooms,
  onChange,
}: {
  rooms: RoomDef[];
  onChange: (rooms: RoomDef[]) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  const updateRoom = (index: number, patch: Partial<RoomDef>) => {
    const updated = rooms.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(updated);
  };

  const removeRoom = (index: number) => {
    const name = rooms[index].name;
    onChange(rooms.filter((_, i) => i !== index).map((r) => ({
      ...r,
      adjacent_to: r.adjacent_to.filter((a) => a !== name),
    })));
  };

  const addRoom = () => {
    const newRoom: RoomDef = {
      name: `Pièce ${rooms.length + 1}`,
      min_surface: 10,
      floor: null,
      adjacent_to: [],
    };
    onChange([...rooms, newRoom]);
    setEditing(newRoom.name);
  };

  const allNames = rooms.map((r) => r.name);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Définissez chaque pièce, sa surface min, son étage et ses adjacences.</p>
        <Button size="sm" variant="outline" onClick={addRoom}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
        </Button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {rooms.map((room, i) => (
          <div
            key={i}
            className="border border-border/30 rounded-lg p-3 bg-card/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              <Input
                value={room.name}
                onChange={(e) => updateRoom(i, { name: e.target.value })}
                className="bg-background h-8 text-sm font-medium flex-1"
                placeholder="Nom de la pièce"
              />
              <Button size="sm" variant="ghost" onClick={() => removeRoom(i)} className="text-destructive hover:text-destructive h-8 w-8 p-0">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 ml-6">
              <div>
                <span className="text-[10px] text-muted-foreground">Surface min (m²)</span>
                <Input type="number" value={room.min_surface} onChange={(e) => updateRoom(i, { min_surface: +e.target.value })}
                  className="bg-background h-7 text-xs mt-0.5" min={1} step={0.5} />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Étage</span>
                <select value={room.floor ?? ""} onChange={(e) => updateRoom(i, { floor: e.target.value ? +e.target.value : null })}
                  className="w-full h-7 rounded-md bg-background border border-input px-2 text-xs mt-0.5">
                  <option value="">Indifférent</option>
                  <option value="1">RDC</option>
                  <option value="2">1er étage</option>
                  <option value="3">2e étage</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Adjacent à</span>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {allNames.filter((n) => n !== room.name).map((other) => (
                    <button
                      key={other}
                      onClick={() => {
                        const has = room.adjacent_to.includes(other);
                        updateRoom(i, {
                          adjacent_to: has
                            ? room.adjacent_to.filter((a) => a !== other)
                            : [...room.adjacent_to, other],
                        });
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        room.adjacent_to.includes(other)
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "border-border/30 text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {other}
                    </button>
                  ))}
                  {allNames.filter((n) => n !== room.name).length === 0 && (
                    <span className="text-[10px] text-muted-foreground/50">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rooms.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-8">
          Aucune pièce définie. Cliquez sur "Ajouter" pour commencer.
        </p>
      )}
    </div>
  );
}
