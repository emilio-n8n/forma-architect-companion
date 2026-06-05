import { createFileRoute } from "@tanstack/react-router";
import { Wand2, Loader2, Zap, Home, Ruler, Check, Box, Download, Pencil, ShieldCheck, Sparkles, Armchair, Palette, TreePine, MapPin, Building2, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
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
import { planToGltfBlob } from "@/lib/plan-export-gltf";
import { Plan2DEditor } from "@/components/Plan2DEditor";
import { Plan3DViewer } from "@/components/Plan3DViewer";
import { CesiumViewer } from "@/components/CesiumViewer";
import { ParcelSelector } from "@/components/ParcelSelector";
import { PLUForm } from "@/components/PLUForm";
import { ProgramEditor } from "@/components/ProgramEditor";
import { ConstraintsForm } from "@/components/ConstraintsForm";
import { toast } from "sonner";
import {
  type MiniArchiInput,
  type ParcelInfo,
  type PLUConstraints,
  type RoomDef,
  type StylePrefs,
  DEFAULT_PLU,
  defaultProgram,
} from "@/lib/mini-archi.types";

export const Route = createFileRoute("/dashboard/mini-archi")({
  component: MiniArchiPage,
});

const STEPS = ["Parcelle", "PLU", "Programme", "Style"] as const;

function MiniArchiPage() {
  const [step, setStep] = useState(0);
  const [generated, setGenerated] = useState(false);

  // Questionnaire state
  const [parcel, setParcel] = useState<ParcelInfo | null>(null);
  const [plu, setPlu] = useState<PLUConstraints>(DEFAULT_PLU);
  const [rooms, setRooms] = useState<RoomDef[]>([]);
  const [style, setStyle] = useState<StylePrefs>({
    style: "Contemporain",
    budget: "Moyen de gamme",
    preferred_orientation: "S",
    free_notes: "",
  });

  // Generation state
  const [openVariant, setOpenVariant] = useState<number | null>(null);
  const [pendingGen, setPendingGen] = useState<number | null>(null);

  const gen = useServerFn(generatePlans);
  const list = useServerFn(listPlans);
  const gen2d = useServerFn(generate2DPlanData);
  const qc = useQueryClient();

  const plans = useQuery({ queryKey: ["plans"], queryFn: () => list() });
  const mutation = useMutation({
    mutationFn: () => {
      const input: MiniArchiInput = {
        parcel: parcel!,
        plu,
        program: { rooms },
        style,
      };
      return gen({ data: input as unknown as Record<string, unknown> });
    },
    onSuccess: () => {
      toast.success("Plans générés");
      setGenerated(true);
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
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

  const canGenerate = parcel !== null && rooms.length > 0;
  const canNext = () => {
    if (step === 0) return parcel !== null;
    if (step === 1) return true;
    if (step === 2) return rooms.length > 0;
    return true;
  };

  const handleQuickFill = (bedrooms: number, levels: number) => {
    const surf = parcel?.surface ? Math.min(parcel.surface * 0.35, 180) : 120;
    setRooms(defaultProgram(surf, bedrooms, levels));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Mini Archi</p>
        <h1 className="font-display text-3xl">Génération de plans par IA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {generated
            ? "6 variantes — plans 2D structurés exportables (SVG/DXF), vue 3D générée après validation."
            : "Remplissez le questionnaire pour générer des variantes adaptées à votre parcelle et vos contraintes."}
        </p>
      </div>

      {!generated ? (
        <Card className="p-6 md:p-8 bg-card border-border/40 mb-8">
          {/* Steps indicator */}
          <div className="flex items-center gap-1 mb-8">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => { if (i <= step) setStep(i); }}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-colors ${
                    i === step
                      ? "bg-primary/20 text-primary"
                      : i < step
                        ? "text-muted-foreground/60"
                        : "text-muted-foreground/30 cursor-default"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                        ? "bg-primary/30 text-primary"
                        : "bg-muted/40 text-muted-foreground/40"
                  }`}>
                    {i < step ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s}</span>
                </button>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border/40" />}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="min-h-[300px]">
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-lg mb-1">Parcelle</h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Recherchez le terrain par adresse ou référence cadastrale. La surface et le contour seront récupérés automatiquement.
                  </p>
                </div>
                <ParcelSelector value={parcel} onChange={setParcel} />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-lg mb-1">Contraintes PLU & Urbaines</h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Renseignez les règles d'urbanisme applicables à cette parcelle. Les variantes générées les respecteront.
                  </p>
                </div>
                <PLUForm value={plu} onChange={setPlu} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-lg mb-1">Programme</h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Définissez les pièces nécessaires. Utilisez un préréglage pour partir d'une base standard.
                  </p>
                </div>

                {rooms.length === 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs text-muted-foreground self-center mr-2">Préréglages :</span>
                    <Button size="sm" variant="outline" onClick={() => handleQuickFill(3, 1)}>
                      3 ch. · plain-pied
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleQuickFill(3, 2)}>
                      3 ch. · RDC+étage
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleQuickFill(4, 2)}>
                      4 ch. · RDC+étage
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleQuickFill(5, 2)}>
                      5 ch. · RDC+étage
                    </Button>
                  </div>
                )}

                <ProgramEditor rooms={rooms} onChange={setRooms} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-lg mb-1">Style & Contraintes libres</h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Style architectural, budget, et tout ce que l'IA doit savoir pour concevoir les variantes.
                  </p>
                </div>
                <ConstraintsForm value={style} onChange={setStyle} />
              </div>
            )}
          </div>

          {/* Navigation + Generate */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Retour
            </Button>

            <div className="flex items-center gap-2">
              {step < STEPS.length - 1 ? (
                <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canNext()}>
                  Suivant <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={() => mutation.mutate()}
                  disabled={!canGenerate || mutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {mutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Génération…</>
                  ) : (
                    <><Wand2 className="h-4 w-4 mr-2" /> Générer 6 variantes</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        /* Variant cards — same as before */
        <>
          {variants.length > 0 && (
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
          )}

          {/* New generation button */}
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => { setGenerated(false); }}>
              Retour au questionnaire
            </Button>
          </div>
        </>
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
  const [tab, setTab] = useState<"2d" | "3d" | "site_reel">(initial.confirmed ? "3d" : "2d");
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
  const [modelBlob, setModelBlob] = useState<Blob | null>(null);
  const [exportingModel, setExportingModel] = useState(false);

  useEffect(() => {
    if (tab !== "site_reel" || !draft.parcel || exportingModel) return;
    setExportingModel(true);
    planToGltfBlob(draft)
      .then((blob) => setModelBlob(blob))
      .catch(() => toast.error("Erreur d'export du modèle 3D"))
      .finally(() => setExportingModel(false));
  }, [tab]);

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

        <Tabs value={tab} onValueChange={(v) => setTab(v as "2d" | "3d" | "site_reel")}>
          <TabsList>
            <TabsTrigger value="2d">
              <Ruler className="h-3.5 w-3.5 mr-2" /> Plan 2D
              {draft.confirmed && <Check className="h-3.5 w-3.5 ml-2 text-primary" />}
            </TabsTrigger>
            <TabsTrigger value="3d" disabled={!draft.confirmed}>
              <Box className="h-3.5 w-3.5 mr-2" /> Vue 3D enrichie
            </TabsTrigger>
            <TabsTrigger value="site_reel" disabled={!draft.parcel}>
              <Globe className="h-3.5 w-3.5 mr-2" /> Site réel
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

          <TabsContent value="site_reel" className="mt-4">
            {draft.parcel ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {draft.parcel.adresse}
                  <span className="text-muted-foreground/50">
                    ({draft.parcel.lat.toFixed(5)}, {draft.parcel.lng.toFixed(5)})
                  </span>
                </div>
                {exportingModel && (
                  <div className="flex items-center justify-center h-[500px] rounded-lg border border-border/40 bg-card">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Export du modèle 3D…
                    </div>
                  </div>
                )}
                {!exportingModel && modelBlob && (
                  <CesiumViewer plan={draft} modelBlob={modelBlob} />
                )}
                {!exportingModel && !modelBlob && (
                  <div className="flex items-center justify-center h-[500px] rounded-lg border border-border/40 bg-card">
                    <p className="text-sm text-muted-foreground">Cliquez sur l'onglet pour charger le globe.</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sélectionnez une adresse de parcelle dans l'onglet 3D pour voir la maison dans son environnement réel.
              </p>
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
