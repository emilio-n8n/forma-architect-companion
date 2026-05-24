import { createFileRoute } from "@tanstack/react-router";
import { Wand2, Loader2, Zap, Home, Ruler, Check, Box, Download, Pencil, ShieldCheck, Sparkles, Armchair, Palette, TreePine, MapPin, Building2 } from "lucide-react";
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
  enhancePlanWithAI,
  editPlanWithAI,
  generateFurniture,
  generateRoof,
  generateLandscaping,
  suggestColorPalette,
  type PlanVariant,
  type PlanData,
} from "@/lib/plans.functions";
import { planToSvgString, planToDxfString, downloadBlob } from "@/lib/plan-export";
import { planToObjString, downloadObj } from "@/lib/plan-export-3d";
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
  const enhance = useServerFn(enhancePlanWithAI);
  const editAi = useServerFn(editPlanWithAI);
  const furnGen = useServerFn(generateFurniture);
  const roofGen = useServerFn(generateRoof);
  const treeGen = useServerFn(generateLandscaping);
  const colorGen = useServerFn(suggestColorPalette);

  const [editInstruction, setEditInstruction] = useState("");
  const [parcelQuery, setParcelQuery] = useState("");
  const [parcelResults, setParcelResults] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [parcelSearching, setParcelSearching] = useState(false);

  const saveMut = useMutation({
    mutationFn: () => update({ data: { planId, variantIndex, planData: draft } }),
    onSuccess: () => { toast.success("Plan enregistré"); qc.invalidateQueries({ queryKey: ["plans"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const enhanceMut = useMutation({
    mutationFn: async () => {
      await update({ data: { planId, variantIndex, planData: draft } });
      return enhance({ data: { planId, variantIndex } });
    },
    onSuccess: (result) => {
      toast.success("Plan enrichi — normes RE2020/PMR appliquées");
      setDraft({ ...result.planData });
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMut = useMutation({
    mutationFn: async () => {
      await update({ data: { planId, variantIndex, planData: draft } });
      return editAi({ data: { planId, variantIndex, instruction: editInstruction } });
    },
    onSuccess: (result) => {
      toast.success("Modification appliquée");
      setDraft({ ...result.planData });
      setEditInstruction("");
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const furnitureMut = useMutation({
    mutationFn: () => furnGen({ data: { planId, variantIndex } }),
    onSuccess: (result) => {
      toast.success("Agencement généré");
      setDraft({ ...result.planData });
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roofMut = useMutation({
    mutationFn: () => roofGen({ data: { planId, variantIndex } }),
    onSuccess: (result) => {
      toast.success("Toit généré");
      setDraft({ ...result.planData });
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const treeMut = useMutation({
    mutationFn: () => treeGen({ data: { planId, variantIndex } }),
    onSuccess: (result) => {
      toast.success("Végétation générée");
      setDraft({ ...result.planData });
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const colorMut = useMutation({
    mutationFn: () => colorGen({ data: { planId, variantIndex } }),
    onSuccess: (result) => {
      toast.success("Palette de couleurs suggérée");
      setDraft({ ...result.planData });
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportFloors = (format: "svg" | "dxf") => {
    const floors = [...new Set(draft.rooms.map((r) => r.floor ?? 1))].sort((a, b) => a - b);
    for (const floor of floors) {
      const label = floor === 1 ? "RDC" : `Niveau-${floor}`;
      if (format === "svg") {
        downloadBlob(planToSvgString(draft, 50, floor), `${variant.name}_${label}.svg`, "image/svg+xml");
      } else {
        downloadBlob(planToDxfString(draft, floor), `${variant.name}_${label}.dxf`, "application/dxf");
      }
    }
  };

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

  const searchParcel = async (q: string) => {
    if (q.length < 3) return;
    setParcelSearching(true);
    try {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setParcelResults((data.features ?? []).map((f: { properties: { label: string }; geometry: { coordinates: [number, number] } }) => ({
        label: f.properties.label,
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      })));
    } catch { setParcelResults([]); }
    setParcelSearching(false);
  };

  const selectParcel = (item: { label: string; lat: number; lng: number }) => {
    const margin = 5;
    const hw = draft.total_w / 2;
    const hd = draft.total_h / 2;
    const contour = [
      { x: -hw - margin, z: -hd - margin },
      { x: draft.total_w + hw + margin, z: -hd - margin },
      { x: draft.total_w + hw + margin, z: draft.total_h + hd + margin },
      { x: -hw - margin, z: draft.total_h + hd + margin },
    ];
    setDraft({
      ...draft,
      parcel: {
        lat: item.lat,
        lng: item.lng,
        adresse: item.label,
        contour,
        surface_parcelle: Math.round((draft.total_w + margin * 2) * (draft.total_h + margin * 2)),
      },
    });
    setParcelQuery(item.label);
    setParcelResults([]);
    toast.success("Parcelle positionnée");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl bg-card border-border/40">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{variant.name}</DialogTitle>
          <DialogDescription>{variant.concept}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "2d" | "3d")}>
          <TabsList>
            <TabsTrigger value="2d">
              <Ruler className="h-3.5 w-3.5 mr-2" /> Plan 2D
              {draft.confirmed && <Check className="h-3.5 w-3.5 ml-2 text-primary" />}
            </TabsTrigger>
            <TabsTrigger value="3d" disabled={!draft.confirmed}>
              <Box className="h-3.5 w-3.5 mr-2" /> Vue 3D enrichie
            </TabsTrigger>
          </TabsList>

          <TabsContent value="2d" className="mt-4">
            {draft.enhanced && (
              <div className="mb-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Plan conforme RE2020 &bull; Accessibilité PMR &bull; Optimisé
              </div>
            )}
            <Plan2DEditor plan={draft} editable onChange={setDraft} />

            {!draft.confirmed && (
              <div className="mt-4 flex items-center gap-2">
                <input
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  placeholder="Retouche rapide IA ex: agrandir le séjour de 2m vers l'est"
                  className="flex-1 h-9 rounded-md bg-background border border-input px-3 text-sm placeholder:text-muted-foreground/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editInstruction.trim() && !editMut.isPending) {
                      editMut.mutate();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => editMut.mutate()}
                  disabled={!editInstruction.trim() || editMut.isPending}
                  className="shrink-0"
                >
                  {editMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  Appliquer
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4 justify-between">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportFloors("svg")}>
                  <Download className="h-3.5 w-3.5 mr-2" /> SVG
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportFloors("dxf")}>
                  <Download className="h-3.5 w-3.5 mr-2" /> DXF (AutoCAD/Revit)
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                  Enregistrer
                </Button>
                {!draft.confirmed && (
                  <>
                    <Button
                      size="sm"
                      variant={draft.enhanced ? "outline" : "default"}
                      className={!draft.enhanced ? "bg-amber-600 text-white hover:bg-amber-500" : "border-amber-600/40 text-amber-400"}
                      onClick={() => enhanceMut.mutate()}
                      disabled={enhanceMut.isPending}
                    >
                      {enhanceMut.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      ) : draft.enhanced ? (
                        <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-2" />
                      )}
                      {enhanceMut.isPending
                        ? "Enrichissement…"
                        : draft.enhanced
                          ? "Ré-appliquer normes"
                          : "Appliquer normes RE2020/PMR"}
                    </Button>
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
                      {confirmMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-2" />}
                      Valider & générer la 3D
                    </Button>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="3d" className="mt-4">
            {draft.confirmed ? (
              <>
                {draft.enhanced && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    Plan conforme RE2020 &bull; Accessibilité PMR &bull; Optimisé
                  </div>
                )}

                {/* 3D Toolbar */}
                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-border/20">
                  <Button size="sm" variant="outline" onClick={() => furnitureMut.mutate()} disabled={furnitureMut.isPending}>
                    {furnitureMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Armchair className="h-3.5 w-3.5 mr-1" />}
                    Meubles
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => roofMut.mutate()} disabled={roofMut.isPending}>
                    {roofMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Building2 className="h-3.5 w-3.5 mr-1" />}
                    Toit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => colorMut.mutate()} disabled={colorMut.isPending}>
                    {colorMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Palette className="h-3.5 w-3.5 mr-1" />}
                    Couleurs
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => treeMut.mutate()} disabled={treeMut.isPending}>
                    {treeMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <TreePine className="h-3.5 w-3.5 mr-1" />}
                    Végétation
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadObj(planToObjString(draft), `${variant.name}_3D.obj`)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Export 3D (OBJ)
                  </Button>

                  {/* Parcel search */}
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <input
                        value={parcelQuery}
                        onChange={(e) => {
                          setParcelQuery(e.target.value);
                          if (e.target.value.length >= 3) {
                            setTimeout(() => searchParcel(e.target.value), 300);
                          }
                        }}
                        placeholder="Adresse de la parcelle…"
                        className="w-full h-8 rounded-md bg-background border border-input px-2 text-xs placeholder:text-muted-foreground/50"
                      />
                    </div>
                    {parcelResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 border border-border/40 bg-background rounded-md shadow-lg max-h-32 overflow-y-auto">
                        {parcelResults.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => selectParcel(r)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-primary/10 transition-colors"
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Plan3DViewer
                  plan={draft}
                  wallColors={draft.wallColors}
                  showFurniture={!!draft.furniture}
                  showRoof={!!draft.roof}
                  showTrees={!!draft.landscaping}
                  showParcel={!!draft.parcel}
                />

                {/* Roof & color controls panel */}
                {(draft.roof || draft.wallColors) && (
                  <div className="mt-3 p-3 border border-border/20 rounded-lg bg-background/50">
                    <div className="flex flex-wrap gap-4">
                      {draft.roof && (
                        <div className="flex items-center gap-2 text-xs">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          <span>Toit : <strong>{roofLabels[draft.roof.type]}</strong></span>
                          <span className="text-muted-foreground">pente {draft.roof.pente ?? 30}°</span>
                          <input
                            type="color"
                            value={draft.roof.couleur}
                            onChange={(e) => setDraft({ ...draft, roof: { ...draft.roof!, couleur: e.target.value } })}
                            className="w-6 h-6 rounded cursor-pointer border-0"
                          />
                        </div>
                      )}
                      {draft.wallColors && Object.entries(draft.wallColors).map(([name, color]) => (
                        name !== "exterieur" && (
                          <div key={name} className="flex items-center gap-1.5 text-xs">
                            <span className="capitalize">{name}</span>
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => setDraft({
                                ...draft,
                                wallColors: { ...draft.wallColors!, [name]: e.target.value },
                              })}
                              className="w-5 h-5 rounded cursor-pointer border-0"
                            />
                          </div>
                        )
                      ))}
                      {draft.wallColors?.exterieur && (
                        <div className="flex items-center gap-1.5 text-xs ml-auto">
                          <span>Extérieur</span>
                          <input
                            type="color"
                            value={draft.wallColors.exterieur}
                            onChange={(e) => setDraft({
                              ...draft,
                              wallColors: { ...draft.wallColors, exterieur: e.target.value },
                            })}
                            className="w-5 h-5 rounded cursor-pointer border-0"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-2">Clic + glisser pour orbiter. Molette pour zoomer.</p>
                <div className="mt-3 flex justify-between">
                  <Button size="sm" variant="outline" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                    Enregistrer les modifications 3D
                  </Button>
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

const roofLabels: Record<string, string> = {
  plat: "Plat",
  pentu: "Pentu (2 pans)",
  croupe: "Croupe (4 pans)",
  appentis: "Appentis (1 pan)",
  papillon: "Papillon",
};
