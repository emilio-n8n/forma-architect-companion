import { createFileRoute } from "@tanstack/react-router";
import { Upload, Sun, Moon, Wand2, Loader2, ImageIcon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { generateRender, listRenders, editRender } from "@/lib/render.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/render")({
  component: RenderPage,
});

const WEATHERS = ["Ensoleillé", "Nuageux", "Pluie", "Brume"] as const;
const STYLES = ["Contemporain", "Haussmannien", "Minimaliste", "Industriel"] as const;

function RenderPage() {
  const [mode, setMode] = useState<"jour" | "nuit">("jour");
  const [weather, setWeather] = useState<string>("Ensoleillé");
  const [style, setStyle] = useState<string>("Contemporain");
  const [prompt, setPrompt] = useState("");
  const [refUrl, setRefUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const generate = useServerFn(generateRender);
  const list = useServerFn(listRenders);
  const editFn = useServerFn(editRender);
  const qc = useQueryClient();

  const [editing, setEditing] = useState<{ id: string; image: string } | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  const renders = useQuery({ queryKey: ["renders"], queryFn: () => list() });
  const mutation = useMutation({
    mutationFn: () =>
      generate({
        data: { prompt: prompt || "Bâtiment architectural", ambiance: mode, weather, style, referenceUrl: refUrl },
      }),
    onSuccess: () => {
      toast.success("Rendu généré");
      qc.invalidateQueries({ queryKey: ["renders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: (vars: { renderId: string; instruction: string }) =>
      editFn({ data: vars }),
    onSuccess: () => {
      toast.success("Rendu édité");
      setEditing(null);
      setEditPrompt("");
      qc.invalidateQueries({ queryKey: ["renders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const path = `${user.id}/ref-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file);
      if (error) throw error;
      const { data } = await supabase.storage.from("uploads").createSignedUrl(path, 3600);
      setRefUrl(data?.signedUrl ?? null);
      toast.success("Référence importée");
    } catch (e) {
      toast.error("Échec import: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Render AI</p>
        <h1 className="font-display text-3xl">Photoréalisme architectural</h1>
        <p className="text-sm text-muted-foreground mt-1">Décrivez votre projet, ajoutez une référence visuelle, recevez un rendu.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <Card
            onClick={() => fileRef.current?.click()}
            className="bg-card border-border/40 p-8 flex flex-col items-center justify-center min-h-[280px] border-dashed hover:border-primary/60 transition-colors cursor-pointer"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : refUrl ? (
              <img src={refUrl} alt="ref" className="max-h-64 rounded" />
            ) : (
              <>
                <Upload className="h-10 w-10 text-primary/60 mb-4" />
                <p className="font-display text-xl mb-2">Importer une référence (optionnel)</p>
                <p className="text-sm text-muted-foreground">Image, plan, croquis</p>
              </>
            )}
          </Card>

          <Card className="p-5 bg-card border-border/40">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Description du projet</p>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Maison contemporaine en bois et verre, baies vitrées plein sud, toiture plate végétalisée…"
              className="bg-background"
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 bg-card border-border/40">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Ambiance</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={mode === "jour" ? "default" : "outline"} onClick={() => setMode("jour")}
                className={mode === "jour" ? "bg-primary text-primary-foreground" : "border-primary/30"}>
                <Sun className="h-4 w-4 mr-2" /> Jour
              </Button>
              <Button variant={mode === "nuit" ? "default" : "outline"} onClick={() => setMode("nuit")}
                className={mode === "nuit" ? "bg-primary text-primary-foreground" : "border-primary/30"}>
                <Moon className="h-4 w-4 mr-2" /> Nuit
              </Button>
            </div>
          </Card>

          <Card className="p-5 bg-card border-border/40">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Météo</p>
            <div className="flex flex-wrap gap-2">
              {WEATHERS.map((w) => (
                <button key={w} onClick={() => setWeather(w)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${weather === w ? "bg-primary text-primary-foreground border-primary" : "border-primary/20 hover:bg-primary/10 hover:text-primary"}`}>
                  {w}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5 bg-card border-border/40">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Style</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button key={s} onClick={() => setStyle(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${style === s ? "bg-primary text-primary-foreground border-primary" : "border-primary/20 hover:bg-primary/10 hover:text-primary"}`}>
                  {s}
                </button>
              ))}
            </div>
          </Card>

          <Button size="lg" onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            {mutation.isPending ? "Génération…" : "Générer le rendu"}
          </Button>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-xl mb-4">Galerie</h2>
        {renders.isLoading ? (
          <div className="text-muted-foreground text-sm">Chargement…</div>
        ) : renders.data && renders.data.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {renders.data.map((r) => (
              <a key={r.id} href={r.image_url ?? "#"} target="_blank" rel="noreferrer"
                className="aspect-square bg-muted border border-border/40 hover:border-primary/60 transition-colors rounded overflow-hidden block">
                {r.image_url ? (
                  <img src={r.image_url} alt={r.prompt ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full"><ImageIcon className="text-primary/30" /></div>
                )}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun rendu pour l'instant.</p>
        )}
      </div>
    </div>
  );
}
