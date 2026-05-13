import { createFileRoute } from "@tanstack/react-router";
import { Upload, Sun, Moon, Cloud, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/render")({
  component: RenderPage,
});

function RenderPage() {
  const [mode, setMode] = useState<"jour" | "nuit">("jour");
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Render AI</p>
        <h1 className="font-display text-3xl">Photoréalisme architectural</h1>
        <p className="text-sm text-muted-foreground mt-1">Importez votre 3D, choisissez l'ambiance, recevez un rendu.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <Card className="bg-card border-border/40 p-12 flex flex-col items-center justify-center min-h-[480px] border-dashed hover:border-primary/60 transition-colors">
          <Upload className="h-10 w-10 text-primary/60 mb-4" />
          <p className="font-display text-xl mb-2">Déposez votre modèle 3D</p>
          <p className="text-sm text-muted-foreground mb-6">SketchUp · Revit · OBJ · GLB · FBX</p>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Sélectionner un fichier</Button>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 bg-card border-border/40">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Ambiance</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={mode === "jour" ? "default" : "outline"}
                onClick={() => setMode("jour")}
                className={mode === "jour" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/60"}>
                <Sun className="h-4 w-4 mr-2" /> Jour
              </Button>
              <Button variant={mode === "nuit" ? "default" : "outline"}
                onClick={() => setMode("nuit")}
                className={mode === "nuit" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/60"}>
                <Moon className="h-4 w-4 mr-2" /> Nuit
              </Button>
            </div>
          </Card>

          <Card className="p-5 bg-card border-border/40">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Météo</p>
            <div className="flex flex-wrap gap-2">
              {["Ensoleillé", "Nuageux", "Pluie", "Brume"].map((w) => (
                <button key={w} className="text-xs px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary/10 hover:text-primary hover:border-primary/60 transition-colors">
                  <Cloud className="h-3 w-3 inline mr-1" />{w}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5 bg-card border-border/40">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Style</p>
            <div className="flex flex-wrap gap-2">
              {["Contemporain", "Haussmannien", "Minimaliste", "Industriel"].map((s) => (
                <button key={s} className="text-xs px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary/10 hover:text-primary hover:border-primary/60 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </Card>

          <Button size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Wand2 className="h-4 w-4 mr-2" /> Générer le rendu
          </Button>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-xl mb-4">Galerie</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="aspect-square bg-muted border-border/40 hover:border-primary/60 transition-colors cursor-pointer" />
          ))}
        </div>
      </div>
    </div>
  );
}
