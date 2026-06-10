import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  BrainCircuit, Trash2, Loader2, Search, User, FolderKanban, Users as UsersIcon,
  RefreshCw, Eye, EyeOff, Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useServerFn } from "@tanstack/react-start";
import { listMemories, deleteMemory, deactivateMemory, reactivateMemory } from "@/lib/memory.functions";
import { getMemorySummaries } from "@/lib/dreaming.functions";
import { toast } from "sonner";
import type { Memory } from "@/lib/memory.types";
import type { MemorySummary } from "@/lib/dreaming.types";
import { MemorySummaryCategoryLabels } from "@/lib/dreaming.types";

export const Route = createFileRoute("/dashboard/memories")({
  component: MemoriesPage,
});

const LEVEL_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  project: { label: "Projet", icon: FolderKanban, color: "text-blue-500" },
  personal: { label: "Personnelle", icon: User, color: "text-green-500" },
  studio: { label: "Studio", icon: UsersIcon, color: "text-amber-500" },
};

function FreshnessBadge({ score }: { score: number }) {
  const color = score >= 0.7 ? "bg-green-500/20 text-green-400" : score >= 0.3 ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/20 text-gray-400";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${color}`}>
      {Math.round(score * 100)}%
    </span>
  );
}

function MemoriesPage() {
  const list = useServerFn(listMemories);
  const del = useServerFn(deleteMemory);
  const deactivate = useServerFn(deactivateMemory);
  const reactivate = useServerFn(reactivateMemory);
  const getSummaries = useServerFn(getMemorySummaries);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [summaries, setSummaries] = useState<MemorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(true);

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

  const loadSummaries = async () => {
    setSummaryLoading(true);
    try {
      const data = await getSummaries();
      setSummaries(data ?? []);
    } catch {
      // silent
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    load(filter === "all" ? undefined : filter);
    loadSummaries();
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

  const handleDeactivate = async (id: string) => {
    try {
      await deactivate({ data: { memoryId: id } });
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast.success("Mémoire désactivée (devient inactive)");
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
          FORMA Agent synthétise automatiquement ses souvenirs au fil de vos conversations.
          Les informations les plus fraîches et pertinentes sont utilisées pour personnaliser ses réponses.
        </p>
      </div>

      {/* Memory Summaries Section */}
      {summaries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[#e5e5e5] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#dcb383]" />
            Résumé de ce que l'agent sait
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {summaries.map((s) => (
              <Card key={s.category} className="p-3 bg-[#1a1a1a] border-[#333]">
                <p className="text-[10px] uppercase tracking-wider text-[#dcb383] font-medium mb-1">
                  {MemorySummaryCategoryLabels[s.category] ?? s.category}
                </p>
                <p className="text-xs text-[#d4d4d4] leading-relaxed">{s.summary}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] uppercase tracking-wider font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {mem.category && (
                      <span className="text-[10px] text-[#a3a3a3] italic">
                        {MemorySummaryCategoryLabels[mem.category] ?? mem.category}
                      </span>
                    )}
                    <FreshnessBadge score={mem.freshness_score} />
                    <span className="text-[10px] text-muted-foreground/50">
                      {new Date(mem.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "short",
                      })}
                      {mem.last_accessed && ` · vu ${new Date(mem.last_accessed).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
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
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => handleDeactivate(mem.id)}
                    className="text-muted-foreground/50 hover:text-yellow-400 h-7 w-7 p-0"
                    title="Désactiver (rendre inactif)">
                    <EyeOff className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(mem.id)}
                    className="text-destructive/50 hover:text-destructive h-7 w-7 p-0"
                    title="Supprimer définitivement">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
