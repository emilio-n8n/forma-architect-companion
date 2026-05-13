import { createFileRoute } from "@tanstack/react-router";
import { Layers, Wand2, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/dashboard/mini-archi")({
  component: MiniArchiPage,
});

function MiniArchiPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Mini Archi</p>
        <h1 className="font-display text-3xl">Génération de plans par IA</h1>
        <p className="text-sm text-muted-foreground mt-1">6 variantes, estimation budget, vue 3D, export STL.</p>
      </div>

      <Card className="p-6 bg-card border-border/40 mb-8">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Surface (m²)</Label>
            <Input type="number" defaultValue={120} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label>Chambres</Label>
            <Input type="number" defaultValue={3} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label>Niveaux</Label>
            <Input type="number" defaultValue={1} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label>Budget</Label>
            <select className="w-full h-9 rounded-md bg-background border border-input px-3 text-sm">
              <option>Économique</option>
              <option>Moyen de gamme</option>
              <option>Haut de gamme</option>
            </select>
          </div>
        </div>
        <Button className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
          <Wand2 className="h-4 w-4 mr-2" /> Générer 6 plans
        </Button>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-card border-border/40 overflow-hidden hover:border-primary/60 transition-colors group">
            <div className="aspect-video bg-muted flex items-center justify-center">
              <Layers className="h-10 w-10 text-primary/30 group-hover:text-primary/60 transition-colors" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg">Variante {i + 1}</p>
                <span className="text-xs text-primary">~{(180 + i * 12)}k€</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1 border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/60">
                  <Box className="h-3 w-3 mr-1" /> Vue 3D
                </Button>
                <Button size="sm" variant="outline" className="border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/60">
                  STL
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
