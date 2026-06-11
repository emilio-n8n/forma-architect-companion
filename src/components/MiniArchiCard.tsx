import { useState } from "react";
import { Layers } from "lucide-react";
import { BentoCard } from "@/components/BentoCard";

const ROOM_DETAILS: Record<string, { size: string; energy: string; comfort: string }> = {
  séjour: { size: "48.5 m²", energy: "Classe A (RE2020)", comfort: "Exposition Sud" },
  chambre: { size: "14.2 m²", energy: "Classe A (PMR)", comfort: "Accès terrasse" },
  cuisine: { size: "12.8 m²", energy: "Classe B", comfort: "Aération mécanique" },
  terrasse: { size: "22.0 m²", energy: "N/A", comfort: "Brise-soleil orientable" },
};

export function MiniArchiCard() {
  const [selectedRoom, setSelectedRoom] = useState("séjour");

  return (
    <BentoCard
      icon={<Layers className="h-4 w-4" />}
      label="Plans"
      title="Mini Archi"
      description="Créez et modifiez des plans d'étage en 2D. Testez plusieurs variantes d'agencement et visualisez les surfaces en un clic."
    >
      <div className="border border-border/40 p-4 bg-[#0a0a0a] rounded flex flex-col items-center gap-4 relative">
        <svg viewBox="0 0 200 150" className="w-full h-32 text-foreground font-sans">
          <rect
            x="8" y="8" width="112" height="82"
            fill={selectedRoom === "séjour" ? "rgba(196, 162, 100, 0.12)" : "transparent"}
            stroke={selectedRoom === "séjour" ? "var(--primary)" : "rgba(196, 162, 100, 0.25)"}
            strokeWidth="1" style={{ cursor: "pointer" }}
            onClick={() => setSelectedRoom("séjour")}
            rx="0"
          />
          <text x="64" y="48" textAnchor="middle" className="text-[8px] fill-foreground font-medium pointer-events-none">Séjour</text>
          <text x="64" y="58" textAnchor="middle" className="text-[7px] fill-muted-foreground pointer-events-none">48.5 m²</text>

          <rect
            x="124" y="8" width="68" height="46"
            fill={selectedRoom === "chambre" ? "rgba(196, 162, 100, 0.12)" : "transparent"}
            stroke={selectedRoom === "chambre" ? "var(--primary)" : "rgba(196, 162, 100, 0.25)"}
            strokeWidth="1" style={{ cursor: "pointer" }}
            onClick={() => setSelectedRoom("chambre")}
            rx="0"
          />
          <text x="158" y="32" textAnchor="middle" className="text-[7px] fill-foreground font-medium pointer-events-none">Chambre</text>
          <text x="158" y="41" textAnchor="middle" className="text-[6px] fill-muted-foreground pointer-events-none">14.2 m²</text>

          <rect
            x="124" y="58" width="68" height="32"
            fill={selectedRoom === "cuisine" ? "rgba(196, 162, 100, 0.12)" : "transparent"}
            stroke={selectedRoom === "cuisine" ? "var(--primary)" : "rgba(196, 162, 100, 0.25)"}
            strokeWidth="1" style={{ cursor: "pointer" }}
            onClick={() => setSelectedRoom("cuisine")}
            rx="0"
          />
          <text x="158" y="76" textAnchor="middle" className="text-[7px] fill-foreground font-medium pointer-events-none">Cuisine</text>
          <text x="158" y="84" textAnchor="middle" className="text-[6px] fill-muted-foreground pointer-events-none">12.8 m²</text>

          <rect
            x="8" y="94" width="184" height="48"
            strokeDasharray="3 2"
            fill={selectedRoom === "terrasse" ? "rgba(196, 162, 100, 0.12)" : "transparent"}
            stroke={selectedRoom === "terrasse" ? "var(--primary)" : "rgba(196, 162, 100, 0.25)"}
            strokeWidth="1" style={{ cursor: "pointer" }}
            onClick={() => setSelectedRoom("terrasse")}
            rx="0"
          />
          <text x="100" y="118" textAnchor="middle" className="text-[7px] fill-foreground font-medium pointer-events-none">Terrasse</text>
          <text x="100" y="127" textAnchor="middle" className="text-[6px] fill-muted-foreground pointer-events-none">22.0 m²</text>
        </svg>

        <div className="w-full bg-[#111] border border-border/40 p-2.5 flex items-center justify-between text-[9px] font-mono">
          <div>
            <div className="text-primary font-semibold uppercase">{selectedRoom}</div>
            <div className="text-muted-foreground">{ROOM_DETAILS[selectedRoom].size}</div>
          </div>
          <div className="text-right">
            <div className="text-foreground">{ROOM_DETAILS[selectedRoom].comfort}</div>
            <div className="text-emerald-400 font-medium">{ROOM_DETAILS[selectedRoom].energy}</div>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
