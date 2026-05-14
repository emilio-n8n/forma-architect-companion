import { createFileRoute } from "@tanstack/react-router";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listProjects, createProject, updateProjectStatus, deleteProject } from "@/lib/projects.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/projets")({
  component: ProjetsPage,
});

const COLUMNS: { key: "todo" | "in_progress" | "review" | "done"; label: string }[] = [
  { key: "todo", label: "À faire" },
  { key: "in_progress", label: "En cours" },
  { key: "review", label: "Revue" },
  { key: "done", label: "Terminé" },
];

const TAG_COLORS: Record<string, string> = {
  Résidentiel: "bg-amber-500/20 text-amber-300",
  Tertiaire: "bg-emerald-500/20 text-emerald-300",
  Rénovation: "bg-rose-500/20 text-rose-300",
  Public: "bg-sky-500/20 text-sky-300",
};

function ProjetsPage() {
  const list = useServerFn(listProjects);
  const create = useServerFn(createProject);
  const updStatus = useServerFn(updateProjectStatus);
  const del = useServerFn(deleteProject);
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("Résidentiel");

  const projects = useQuery({ queryKey: ["projects"], queryFn: () => list() });

  const createM = useMutation({
    mutationFn: () => create({ data: { title, tag } }),
    onSuccess: () => { toast.success("Projet créé"); setOpen(false); setTitle(""); qc.invalidateQueries({ queryKey: ["projects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateM = useMutation({
    mutationFn: (v: { id: string; status: typeof COLUMNS[number]["key"] }) => updStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Projets</p>
          <h1 className="font-display text-3xl">Studio collaboratif</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Nouveau projet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau projet</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Titre</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maison Sablonsière" /></div>
              <div className="space-y-2"><Label>Catégorie</Label>
                <select value={tag} onChange={(e) => setTag(e.target.value)}
                  className="w-full h-9 rounded-md bg-background border border-input px-3 text-sm">
                  {Object.keys(TAG_COLORS).map((t) => <option key={t}>{t}</option>)}
                </select></div>
              <Button onClick={() => createM.mutate()} disabled={!title || createM.isPending}
                className="w-full bg-primary text-primary-foreground">
                {createM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {projects.isLoading ? (
        <div className="text-muted-foreground text-sm">Chargement…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const items = (projects.data ?? []).filter((p) => p.status === col.key);
            return (
              <div key={col.key}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">{col.label}</span>
                  <span className="text-xs text-primary">{items.length}</span>
                </div>
                <div className="space-y-3 min-h-[200px] bg-card/50 rounded-lg p-3 border border-border/30">
                  {items.map((p) => (
                    <Card key={p.id} className="p-4 bg-card border-border/40 hover:border-primary/60 transition-colors group">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${TAG_COLORS[p.tag ?? ""] ?? "bg-muted"}`}>{p.tag}</span>
                        <button onClick={() => delM.mutate(p.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      <p className="font-display text-base mt-2 mb-3">{p.title}</p>
                      <select
                        value={p.status}
                        onChange={(e) => updateM.mutate({ id: p.id, status: e.target.value as typeof COLUMNS[number]["key"] })}
                        className="w-full h-7 text-xs rounded bg-background border border-input px-2"
                      >
                        {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </Card>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Vide</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
