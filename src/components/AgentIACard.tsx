import { useState } from "react";
import { MessageSquare, Check } from "lucide-react";
import { BentoCard } from "@/components/BentoCard";

const ZONES = ["UBa", "UCa", "AU", "N"] as const;
type ZoneKey = (typeof ZONES)[number];

const ZONE_DATA: Record<ZoneKey, { label: string; rules: { text: string; status: "ok" | "warn" | "error" }[] }> = {
  UBa: {
    label: "Zone urbaine pavillonnaire",
    rules: [
      { text: "Hauteur max sous sablière : 10m (R+2)", status: "ok" },
      { text: "Retrait minimum H/2 ≥ 3m", status: "ok" },
      { text: "Emprise au sol ≤ 40%", status: "warn" },
      { text: "Stationnement : 2 places / 100 m²", status: "ok" },
    ],
  },
  UCa: {
    label: "Zone urbaine mixte",
    rules: [
      { text: "Hauteur max : 15m (R+4)", status: "ok" },
      { text: "Retrait minimum : 4m", status: "ok" },
      { text: "Emprise au sol ≤ 50%", status: "ok" },
      { text: "Toiture terrasse autorisée", status: "ok" },
    ],
  },
  AU: {
    label: "Zone à urbaniser",
    rules: [
      { text: "Hauteur max : 9m (R+2)", status: "ok" },
      { text: "Densité minimale : 30 logts / ha", status: "ok" },
      { text: "Espaces verts ≥ 25%", status: "ok" },
      { text: "Étude préalable requise", status: "warn" },
    ],
  },
  N: {
    label: "Zone naturelle",
    rules: [
      { text: "Hauteur max : 7m (R+1)", status: "ok" },
      { text: "Emprise au sol ≤ 10%", status: "ok" },
      { text: "Extensions limitées à 30 m²", status: "ok" },
      { text: "Permis de construire requis", status: "ok" },
    ],
  },
};

export function AgentIACard() {
  const [agentZone, setAgentZone] = useState<ZoneKey>("UBa");

  return (
    <BentoCard
      icon={<MessageSquare className="h-4 w-4" />}
      label="Réglementation"
      title="Agent IA"
      description="Analysez la conformité de vos projets face au PLU, à la RE2020 et aux règles d'accessibilité. Résultats immédiats."
    >
      <div className="bg-[#0a0a0a] border border-border/40 rounded p-4">
        <div className="flex gap-1 mb-3">
          {ZONES.map((zone) => (
            <button
              key={zone}
              onClick={() => setAgentZone(zone)}
              className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider rounded-sm border transition-all ${
                agentZone === zone
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {zone}
            </button>
          ))}
        </div>

        <div className="text-[9px] text-muted-foreground mb-3 pb-2 border-b border-border/10">
          {ZONE_DATA[agentZone].label}
        </div>

        <div className="space-y-1.5 mb-3">
          {ZONE_DATA[agentZone].rules.map((rule, i) => (
            <div key={i} className="flex items-start gap-2 py-1">
              {rule.status === "ok" && (
                <Check className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
              )}
              {rule.status === "warn" && (
                <span className="h-3 w-3 flex items-center justify-center text-amber-400 mt-0.5 shrink-0 text-[8px] font-bold">!</span>
              )}
              {rule.status === "error" && (
                <span className="h-3 w-3 flex items-center justify-center text-red-400 mt-0.5 shrink-0 text-[8px]">&#10005;</span>
              )}
              <span className="text-[10px] text-muted-foreground leading-relaxed">{rule.text}</span>
            </div>
          ))}
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded px-3 py-2 flex items-center justify-between">
          <span className="text-[9px] font-mono text-muted-foreground">Conformité</span>
          <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
            <Check className="h-2.5 w-2.5" /> Vérifiée
          </span>
        </div>
      </div>
    </BentoCard>
  );
}
