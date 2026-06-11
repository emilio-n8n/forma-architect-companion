import { RenderAICard } from "@/components/RenderAICard";
import { AgentIACard } from "@/components/AgentIACard";
import { MiniArchiCard } from "@/components/MiniArchiCard";
import { ProjetsCard } from "@/components/ProjetsCard";

export function BentoGrid() {
  return (
    <section id="features" className="border-t border-border/20 bg-background py-32 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-20 text-left">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Fonctionnalités</p>
          <h2 className="font-display text-4xl md:text-6xl tracking-tight leading-none">
            Quatre outils. <br />
            <span className="text-gradient-gold">Un seul studio.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RenderAICard />
          <AgentIACard />
          <MiniArchiCard />
          <ProjetsCard />
        </div>
      </div>
    </section>
  );
}
