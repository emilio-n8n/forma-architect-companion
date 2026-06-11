import { Link } from "@tanstack/react-router";
import { Sparkles, MessageSquare, Layers, FolderKanban, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export function StudioPreview() {
  return (
    <section id="studio" className="py-32 border-t border-border/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[180px] pointer-events-none" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-16 text-left">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">L'interface</p>
          <h2 className="font-display text-4xl md:text-6xl tracking-tight leading-none">
            Le Studio <span className="text-gradient-gold">FORMA</span>
          </h2>
        </div>

        <div className="border border-border/30 bg-card/30 rounded-lg overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 h-14 border-b border-border/20 bg-background/50">
            <div className="flex items-center gap-3">
              <Logo size={18} className="text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider ml-4 border-l border-border/20 pl-4">Studio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10" />
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="flex h-96">
            <div className="w-56 border-r border-border/20 bg-background/30 p-4 space-y-6 hidden md:block">
              {[
                { icon: <Sparkles className="h-4 w-4" />, label: "Render AI", active: false },
                { icon: <MessageSquare className="h-4 w-4" />, label: "Agent IA", active: true },
                { icon: <Layers className="h-4 w-4" />, label: "Mini Archi", active: false },
                { icon: <FolderKanban className="h-4 w-4" />, label: "Projets", active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 px-3 py-2 rounded text-xs tracking-wider uppercase ${
                    item.active
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </div>
              ))}
            </div>

            <div className="flex-1 p-6 bg-[#0a0a0a] flex items-start">
              <div className="max-w-2xl w-full space-y-4">
                <div className="bg-primary/5 border border-primary/10 p-4 rounded max-w-xs ml-auto">
                  <p className="text-[10px] font-mono text-primary/90">Quelles sont les règles PLU pour cette parcelle ?</p>
                </div>
                <div className="bg-muted/30 border border-border/10 p-4 rounded max-w-md">
                  <p className="text-[10px] font-mono text-muted-foreground">Selon le PLU de la zone UBa, hauteur max 10m sous sablière, R+2 autorisé avec retrait H/2...</p>
                </div>
                <div className="bg-primary/5 border border-primary/10 p-4 rounded max-w-xs ml-auto">
                  <p className="text-[10px] font-mono text-primary/90">Génère-moi une variante avec un étage supplémentaire</p>
                </div>
                <div className="bg-muted/30 border border-border/10 p-4 rounded max-w-md">
                  <p className="text-[10px] font-mono text-muted-foreground">Variante générée : R+2 avec toiture terrasse, retrait 5.5m, structure bois RE2020 conforme.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-3 justify-center">
          {["Rendu photoréaliste", "Agent réglementaire", "Plans 2D", "Kanban projets", "Export DXF", "Multi-utilisateurs"].map((tag) => (
            <span key={tag} className="px-4 py-2 border border-primary/20 bg-primary/5 text-[10px] uppercase tracking-wider text-primary rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link to="/auth">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/95 rounded-none h-14 px-12 text-xs uppercase tracking-widest shadow-gold transition-all duration-300 group">
              Accéder au Studio <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
