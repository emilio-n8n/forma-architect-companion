import { createFileRoute } from "@tanstack/react-router";
import { Wand2, Loader2, Zap, Home, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { generatePlans, listPlans, generate2DPlan, type PlanVariant } from "@/lib/plans.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/mini-archi")({
  component: MiniArchiPage,
});

function MiniArchiPage() {
  const [surface, setSurface] = useState(120);
  const [bedrooms, setBedrooms] = useState(3);
  const [levels, setLevels] = useState(1);
  const [budget, setBudget] = useState<"Économique" | "Moyen de gamme" | "Haut de gamme">("Moyen de gamme");
  const [pendingPlanIdx, setPendingPlanIdx] = useState<number | null>(null);

  const gen = useServerFn(generatePlans);
  const list = useServerFn(listPlans);
  const gen2d = useServerFn(generate2DPlan);
  const qc = useQueryClient();

  const plans = useQuery({ queryKey: ["plans"], queryFn: () => list() });
  const mutation = useMutation({
    mutationFn: () => gen({ data: { surface, bedrooms, levels, budget } }),
    onSuccess: () => { toast.success("Plans générés"); qc.invalidateQueries({ queryKey: ["plans"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const plan2dMutation = useMutation({
    mutationFn: (vars: { planId: string; variantIndex: number }) => gen2d({ data: vars }),
    onSuccess: () => { toast.success("Plan 2D généré"); qc.invalidateQueries({ queryKey: ["plans"] }); setPendingPlanIdx(null); },
    onError: (e: Error) => { toast.error(e.message); setPendingPlanIdx(null); },
  });

  const last = plans.data?.[0];
  const variants = (last?.variants as unknown as PlanVariant[]) ?? [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Mini Archi</p>
        <h1 className="font-display text-3xl">Génération de plans par IA</h1>
        <p className="text-sm text-muted-foreground mt-1">6 variantes, conformité RE2020, estimation budget France 2026.</p>
      </div>

      <Card className="p-6 bg-card border-border/40 mb-8">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="space-y-2"><Label>Surface (m²)</Label>
            <Input type="number" value={surface} onChange={(e) => setSurface(+e.target.value)} className="bg-background" /></div>
          <div className="space-y-2"><Label>Chambres</Label>
            <Input type="number" value={bedrooms} onChange={(e) => setBedrooms(+e.target.value)} className="bg-background" /></div>
          <div className="space-y-2"><Label>Niveaux</Label>
            <Input type="number" value={levels} onChange={(e) => setLevels(+e.target.value)} className="bg-background" /></div>
          <div className="space-y-2"><Label>Budget</Label>
            <select value={budget} onChange={(e) => setBudget(e.target.value as typeof budget)}
              className="w-full h-9 rounded-md bg-background border border-input px-3 text-sm">
              <option>Économique</option><option>Moyen de gamme</option><option>Haut de gamme</option>
            </select></div>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}
          className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
          {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          {mutation.isPending ? "Génération…" : "Générer 6 plans"}
        </Button>
      </Card>

      {variants.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {variants.map((v, i) => (
            <Card key={i} className="bg-card border-border/40 overflow-hidden hover:border-primary/60 transition-colors p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-primary">Variante {i + 1}</span>
                <span className="text-xs text-primary flex items-center gap-1"><Zap className="h-3 w-3" /> {v.energy_class}</span>
              </div>
              <p className="font-display text-xl mb-2">{v.name}</p>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{v.concept}</p>
              <ul className="text-xs space-y-1 mb-3">
                {(v.features ?? []).slice(0, 3).map((f, j) => (
                  <li key={j} className="flex gap-2"><Home className="h-3 w-3 text-primary/60 mt-0.5 shrink-0" /> {f}</li>
                ))}
              </ul>
              <div className="border-t border-border/30 pt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Estimation</span>
                <span className="text-sm text-primary font-display">
                  {new Intl.NumberFormat("fr-FR").format(v.estimated_cost_eur)} €
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Lancez une génération pour voir 6 variantes architecturales.</p>
      )}
    </div>
  );
}
