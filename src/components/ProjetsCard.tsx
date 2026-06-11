import { useState } from "react";
import { FolderKanban, Check } from "lucide-react";
import { BentoCard } from "@/components/BentoCard";

export function ProjetsCard() {
  const [activeProjectStatus, setActiveProjectStatus] = useState("review");

  return (
    <BentoCard
      colSpan
      icon={<FolderKanban className="h-4 w-4" />}
      label="Gestion"
      title="Projets"
      description="Suivez vos projets de l'esquisse au chantier. Organisez vos documents, collaborez avec votre équipe et partagez les rendus."
    >
      <div className="grid grid-cols-3 gap-3 bg-[#0a0a0a] p-4 border border-border/40 rounded">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/20">
            <span>Esquisse</span>
            <span className="text-primary font-mono">2</span>
          </div>
          <div className="bg-[#121212] p-3 border border-border/20 rounded-sm space-y-1.5 opacity-60">
            <div className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 max-w-max rounded-full">Maison</div>
            <div className="text-[10px] font-medium text-foreground">Villa Cap-Ferret</div>
          </div>
          <div className="bg-[#121212] p-3 border border-border/20 rounded-sm space-y-1.5 opacity-60">
            <div className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 max-w-max rounded-full">Maison</div>
            <div className="text-[10px] font-medium text-foreground">Bordeaux Bastide</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/20">
            <span>Permis</span>
            <span className="text-primary font-mono">1</span>
          </div>

          <div
            onClick={() => setActiveProjectStatus(activeProjectStatus === "review" ? "done" : "review")}
            className={`p-3 border rounded-sm space-y-1.5 cursor-pointer transition-all duration-300 ${
              activeProjectStatus === "review"
                ? "bg-primary/5 border-primary/40 shadow-lg shadow-primary/5"
                : "bg-[#121212] border-border/20 opacity-60"
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="text-[9px] px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 max-w-max rounded-full">Rénovation</div>
              {activeProjectStatus === "review" && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            <div className="text-[10px] font-medium text-foreground">Maison Sablonsière</div>
            <div className="text-[8px] font-mono text-muted-foreground flex items-center justify-between pt-1 border-t border-border/10">
              <span>Statut</span>
              <span className={activeProjectStatus === "review" ? "text-amber-400" : "text-emerald-400"}>
                {activeProjectStatus === "review" ? "RE2020" : "Validé"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/20">
            <span>Chantier</span>
            <span className="text-primary font-mono">1</span>
          </div>

          <div
            className={`p-3 border rounded-sm space-y-1.5 transition-all duration-300 ${
              activeProjectStatus === "done"
                ? "bg-emerald-950/20 border-emerald-500/30 shadow-md shadow-emerald-500/5"
                : "bg-[#121212] border-border/20 opacity-60"
            }`}
          >
            <div className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 max-w-max rounded-full">Tertiaire</div>
            <div className="text-[10px] font-medium text-foreground">Siège Ecopolis</div>
            <div className="text-[8px] font-mono text-emerald-400 flex items-center gap-1 pt-1 border-t border-border/10">
              <Check className="h-2.5 w-2.5" /> Gros œuvre
            </div>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
