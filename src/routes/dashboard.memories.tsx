import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BrainCircuit, Trash2, Loader2, Search, Tag, Users as UsersIcon, User, FolderKanban } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useServerFn } from "@tanstack/react-start";
import { listMemories, deleteMemory } from "@/lib/memory.functions";
import { toast } from "sonner";
import type { Memory } from "@/lib/memory.types";

export const Route = createFileRoute("/dashboard/memories")({
  component: MemoriesPage,
});

const LEVEL_CONFIG = {
  project: { label: "Projet", icon: FolderKanban, color: "text-blue-500" },
  personal: { label: "Personnelle", icon: User, color: "text-green-500" },
  studio: { label: "Studio", icon: UsersIcon, color: "text-amber-500" },
};

function MemoriesPage() {
  const list = useServerFn(listMemories);
  const del = useServerFn(deleteMemory);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async (level?: string) => {
    setLoading(true);
    try {
      const data = await list({ data: { level: level as any } });
      setMemories(data ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter === "all" ? undefined : filter);
  }, [filter]);

  const handleDelete = async (id: string) => {
    try {
      await del({ data: { memoryId: id } });
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast.success("Mémoire supprimée");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = search.trim()
    ? memories.filter((m) => m.content.toLowerCase().includes(search.toLowerCase()))
    : memories;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Mémoires</p>
        <h1 className="font-display text-3xl">Ce que l'agent a retenu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          FORMA Agent enregistre automatiquement les informations importantes au fil de vos conversations.
          Ces mémoires lui permettent de vous reconnaître et de personnaliser ses réponses.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <Tabs value={filter} onValueChange={setFilter} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="personal">Personnelles</TabsTrigger>
            <TabsTrigger value="studio">Studio</TabsTrigger>
            <TabsTrigger value="project">Projets</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..." className="pl-8 h-8 text-xs" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BrainCircuit className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">Aucune mémoire enregistrée.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Les mémoires sont créées automatiquement par FORMA Agent pendant vos conversations.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((mem) => {
            const cfg = LEVEL_CONFIG[mem.level as keyof typeof LEVEL_CONFIG] ?? LEVEL_CONFIG.personal;
            const Icon = cfg.icon;
            return (
              <Card key={mem.id} className="p-4 flex items-start gap-3 group">
                <div className={`mt-0.5 ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] uppercase tracking-wider font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">
                      {new Date(mem.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{mem.content}</p>
                  {mem.project_id && (
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      <FolderKanban className="h-3 w-3 inline mr-0.5" />
                      Lié à un projet
                    </p>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(mem.id)}
                  className="text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
