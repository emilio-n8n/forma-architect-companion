import { createFileRoute } from "@tanstack/react-router";
import { Wand2, Loader2, Zap, Home, Ruler, Check, Box, Download, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generatePlans,
  listPlans,
  generate2DPlanData,
  updatePlan2DData,
  confirm2DPlan,
  type PlanVariant,
  type PlanData,
} from "@/lib/plans.functions";
import { planToSvgString, planToDxfString, downloadBlob } from "@/lib/plan-export";
import { Plan2DEditor } from "@/components/Plan2DEditor";
import { Plan3DViewer } from "@/components/Plan3DViewer";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/mini-archi")({
  component: MiniArchiPage,
});

function MiniArchiPage() {
  const [surface, setSurface] = useState(120);
  const [bedrooms, setBedrooms] = useState(3);
  const [levels, setLevels] = useState(1);
  const [budget, setBudget] = useState<"Économique" | "Moyen de gamme" | "Haut de gamme">("Moyen de gamme");
  const [openVariant, setOpenVariant] = useState<number | null>(null);
  const [pendingGen, setPendingGen] = useState<number | null>(null);

  const gen = useServerFn(generatePlans);
  const list = useServerFn(listPlans);
  const gen2d = useServerFn(generate2DPlanData);
  const qc = useQueryClient();

  const plans = useQuery({ queryKey: ["plans"], queryFn: () => list() });
  const mutation = useMutation({
    mutationFn: () => gen({ data: { surface, bedrooms, levels, budget } }),
    onSuccess: () => { toast.success("Plans générés"); qc.invalidateQueries({ queryKey: ["plans"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const plan2dMutation = useMutation({
    mutationFn: (vars: { planId: string; variantIndex: number }) => gen2d({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success("Plan 2D structuré généré");
      qc.invalidateQueries({ queryKey: ["plans"] });
      setPendingGen(null);
      setOpenVariant(vars.variantIndex);
    },
    onError: (e: Error) => { toast.error(e.message); setPendingGen(null); },
  });

  const last = plans.data?.[0];
  const variants = (last?.variants as unknown as PlanVariant[]) ?? [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Mini Archi</p>
        <h1 className="font-display text-3xl">Génération de plans par IA</h1>
        <p className="text-sm text-muted-foreground mt-1">6 variantes — plans 2D structurés exportables (SVG/DXF), vue 3D générée après validation.</p>
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
              <div className="border-t border-border/30 pt-3 flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">Estimation</span>
                <span className="text-sm text-primary font-display">
                  {new Intl.NumberFormat("fr-FR").format(v.estimated_cost_eur)} €
                </span>
              </div>
              {v.plan_2d_data ? (
                <div className="space-y-2">
                  <Button size="sm" variant="outline" className="w-full border-primary/30 hover:bg-primary/10 hover:text-primary"
                    onClick={() => setOpenVariant(i)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Ouvrir le plan
                    {v.plan_2d_data.confirmed && <Check className="h-3.5 w-3.5 ml-2 text-primary" />}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!last || (plan2dMutation.isPending && pendingGen === i)}
                  onClick={() => { setPendingGen(i); plan2dMutation.mutate({ planId: last!.id, variantIndex: i }); }}
                  className="w-full border-primary/30 hover:bg-primary/10 hover:text-primary"
                >
                  {plan2dMutation.isPending && pendingGen === i ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Génération…</>
                  ) : (
                    <><Ruler className="h-3.5 w-3.5 mr-2" /> Générer plan 2D</>
                  )}
                </Button>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Lancez une génération pour voir 6 variantes architecturales.</p>
      )}

      {openVariant !== null && last && variants[openVariant]?.plan_2d_data && (
        <PlanDialog
          planId={last.id}
          variantIndex={openVariant}
          variant={variants[openVariant]}
          onClose={() => setOpenVariant(null)}
        />
      )}
    </div>
  );
}

function PlanDialog({
  planId,
  variantIndex,
  variant,
  onClose,
}: {
  planId: string;
  variantIndex: number;
  variant: PlanVariant;
  onClose: () => void;
}) {
  const initial = variant.plan_2d_data!;
  const [draft, setDraft] = useState<PlanData>(initial);
  const [tab, setTab] = useState<"2d" | "3d">(initial.confirmed ? "3d" : "2d");
  const qc = useQueryClient();
  const update = useServerFn(updatePlan2DData);
  const confirm = useServerFn(confirm2DPlan);

  const saveMut = useMutation({
    mutationFn: () => update({ data: { planId, variantIndex, planData: draft } }),
    onSuccess: () => { toast.success("Plan enregistré"); qc.invalidateQueries({ queryKey: ["plans"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmMut = useMutation({
    mutationFn: async () => {
      await update({ data: { planId, variantIndex, planData: draft } });
      return confirm({ data: { planId, variantIndex } });
    },
    onSuccess: () => {
      toast.success("Plan 2D validé — vue 3D disponible");
      qc.invalidateQueries({ queryKey: ["plans"] });
      setDraft({ ...draft, confirmed: true });
      setTab("3d");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl bg-card border-border/40">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{variant.name}</DialogTitle>
          <DialogDescription>{variant.concept}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "2d" | "3d")}>
          <TabsList>
            <TabsTrigger value="2d"><Ruler className="h-3.5 w-3.5 mr-2" /> Plan 2D{draft.confirmed && <Check className="h-3.5 w-3.5 ml-2 text-primary" />}</TabsTrigger>
            <TabsTrigger value="3d" disabled={!draft.confirmed}><Box className="h-3.5 w-3.5 mr-2" /> Vue 3D</TabsTrigger>
          </TabsList>

          <TabsContent value="2d" className="mt-4">
            <Plan2DEditor plan={draft} editable onChange={setDraft} />
            <div className="flex flex-wrap gap-2 mt-4 justify-between">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => downloadBlob(planToSvgString(draft), `${variant.name}.svg`, "image/svg+xml")}>
                  <Download className="h-3.5 w-3.5 mr-2" /> SVG
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadBlob(planToDxfString(draft), `${variant.name}.dxf`, "application/dxf")}>
                  <Download className="h-3.5 w-3.5 mr-2" /> DXF (AutoCAD/Revit)
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                  Enregistrer
                </Button>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
                  {confirmMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-2" />}
                  Valider & générer la 3D
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="3d" className="mt-4">
            {draft.confirmed ? (
              <>
                <Plan3DViewer plan={draft} />
                <p className="text-xs text-muted-foreground mt-2">Vue 3D générée à partir du plan 2D validé (murs h. 2.7m, RE2020). Clic + glisser pour orbiter.</p>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setTab("2d")}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Modifier le 2D
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Validez le plan 2D pour générer la 3D.</p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
