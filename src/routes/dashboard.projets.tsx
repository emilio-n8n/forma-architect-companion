import { createFileRoute } from "@tanstack/react-router";
import { Plus, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/projets")({
  component: ProjetsPage,
});

const COLUMNS = ["À faire", "En cours", "Revue", "Terminé"];
const PROJECTS = [
  { col: 0, title: "Maison Sablonsière", tag: "Résidentiel", color: "bg-amber-500/20 text-amber-300" },
  { col: 1, title: "Restaurant Le Cèdre", tag: "Tertiaire", color: "bg-emerald-500/20 text-emerald-300" },
  { col: 1, title: "Loft Belleville", tag: "Rénovation", color: "bg-rose-500/20 text-rose-300" },
  { col: 2, title: "Crèche Montreuil", tag: "Public", color: "bg-sky-500/20 text-sky-300" },
  { col: 3, title: "Villa Cap Ferret", tag: "Résidentiel", color: "bg-amber-500/20 text-amber-300" },
];

function ProjetsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Projets</p>
          <h1 className="font-display text-3xl">Studio collaboratif</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/60">
            <Calendar className="h-4 w-4 mr-2" /> Calendrier
          </Button>
          <Button variant="outline" className="border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/60">
            <Users className="h-4 w-4 mr-2" /> Équipe
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> Nouveau projet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map((col, i) => (
          <div key={col}>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{col}</span>
              <span className="text-xs text-primary">{PROJECTS.filter((p) => p.col === i).length}</span>
            </div>
            <div className="space-y-3 min-h-[200px] bg-card/50 rounded-lg p-3 border border-border/30">
              {PROJECTS.filter((p) => p.col === i).map((p) => (
                <Card key={p.title} className="p-4 bg-card border-border/40 hover:border-primary/60 cursor-pointer transition-colors">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.color}`}>{p.tag}</span>
                  <p className="font-display text-base mt-2">{p.title}</p>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
