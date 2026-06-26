import { Loader2, Search, Brain, Bookmark } from "lucide-react";
import type { UIMessage } from "ai";

export function ToolActivity({ parts }: { parts: UIMessage["parts"] }) {
  const toolParts = parts.filter((p: any) => typeof p.type === "string" && p.type.startsWith("tool-"));
  if (toolParts.length === 0) return null;

  const meta: Record<string, { icon: typeof Search; label: (input: any, output: any) => string; color: string }> = {
    "tool-web_search": {
      icon: Search,
      label: (input, output) => {
        if (output && Array.isArray(output.results)) return `Web · "${input?.query ?? "…"}" — ${output.results.length} sources`;
        return `Recherche web · "${input?.query ?? "…"}"`;
      },
      color: "text-sky-300 border-sky-500/30 bg-sky-500/10",
    },
    "tool-search_memories": {
      icon: Brain,
      label: (input, output) => {
        if (output && Array.isArray(output.memories)) return `Mémoire · ${output.memories.length} résultat${output.memories.length !== 1 ? "s" : ""}`;
        return `Consulte la mémoire · "${input?.query ?? "…"}"`;
      },
      color: "text-violet-300 border-violet-500/30 bg-violet-500/10",
    },
    "tool-save_memory": {
      icon: Bookmark,
      label: (input, output) => {
        if (output?.saved) return `Mémorisé [${(input?.level ?? "").toUpperCase()}] : ${(input?.content ?? "").slice(0, 60)}…`;
        return `Mémorisation…`;
      },
      color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    },
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {toolParts.map((p: any, i) => {
        const m = meta[p.type];
        if (!m) return null;
        const Icon = m.icon;
        const running = p.state === "input-streaming" || p.state === "input-available";
        const label = m.label(p.input, p.output);
        return (
          <div key={i} className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border ${m.color}`}>
            {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
            <span className="truncate max-w-[320px]">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
