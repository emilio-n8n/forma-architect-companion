import { createFileRoute } from "@tanstack/react-router";
import { type UIMessage } from "ai";
import React, { useEffect, useState } from "react";
import {
  Loader2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  ensureConversation,
  loadMessages,
  saveMessage,
  resetConversation,
} from "@/lib/chat.functions";
import { dreamMemorySynthesis, refreshTemporalMemories, generateMemorySummary } from "@/lib/dreaming.functions";
import { toast } from "sonner";
const DocumentEditorPanel = React.lazy(() =>
  import("@/components/DocumentEditorPanel").then((m) => ({ default: m.DocumentEditorPanel }))
);
const CodePreview = React.lazy(() =>
  import("@/components/CodePreview").then((m) => ({ default: m.CodePreview }))
);
import { ChatInner } from "@/components/chat/ChatInner";

export const Route = createFileRoute("/dashboard/agent")({
  component: AgentPage,
});

function AgentPage() {
  const ensureFn = useServerFn(ensureConversation);
  const loadFn = useServerFn(loadMessages);
  const saveFn = useServerFn(saveMessage);
  const resetFn = useServerFn(resetConversation);
  const dreamFn = useServerFn(dreamMemorySynthesis);
  const refreshFn = useServerFn(refreshTemporalMemories);
  const summaryFn = useServerFn(generateMemorySummary);

  const [convId, setConvId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [activeContent, setActiveContent] = useState<{ type: "doc" | "spreadsheet" | "email" | "code"; title: string; content: string } | null>(null);
  const [showPanel, setShowPanel] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { id } = await ensureFn();
      if (cancelled) return;
      const rows = await loadFn({ data: { conversationId: id } });
      const initial: UIMessage[] = rows.map((r) => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        parts: [{ type: "text", text: r.content }],
      }));
      setConvId(id);
      setInitialMessages(initial);

      // Trigger dreaming at conversation start with notification
      if (rows.length < 2) {
        // New conversation — run full synthesis + temporal refresh + summary
        dreamFn({ data: { conversationId: id } }).then((r) => {
          if (!r) return;
          const parts: string[] = [];
          if (r.new_memories > 0) parts.push(`${r.new_memories} souvenirs`);
          if (r.updates > 0) parts.push(`${r.updates} mis à jour`);
          if (r.deactivated > 0) parts.push(`${r.deactivated} archivés`);
          if (parts.length > 0) setTimeout(() => toast.success(`🧠 ${parts.join(", ")}`), 2000);
        }).catch((e) => { console.error("[dream]", e); });
        refreshFn().catch((e) => { console.error("[refresh]", e); });
        summaryFn().catch((e) => { console.error("[summary]", e); });
      } else {
        // Existing conversation — just decay and refresh summary
        refreshFn().catch((e) => { console.error("[refresh]", e); });
      }
    })().catch((e) => {
      console.error("[agent-init]", e);
      if (!cancelled) setInitialMessages([]);
    });
    return () => { cancelled = true; };
  }, [ensureFn, loadFn, dreamFn, refreshFn, summaryFn]);

  if (!initialMessages || !convId) {
    return (
      <div className="h-full flex items-center justify-center text-[#a3a3a3]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const switchConversation = async (id: string) => {
    setInitialMessages(null as unknown as UIMessage[]);
    setConvId(id);
    const rows = await loadFn({ data: { conversationId: id } });
    setInitialMessages(
      rows.map((r) => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        parts: [{ type: "text", text: r.content }] as UIMessage["parts"],
      })),
    );
  };

  return (
    <div className="flex w-full gap-4 overflow-hidden" style={{ height: "calc(100dvh - 3.5rem)", padding: "1rem", backgroundColor: "#090909" }}>
      <div className={showPanel ? "w-[350px] min-w-[300px] shrink-0" : "flex-1 max-w-[760px] mx-auto"}>
        <ChatInner
          key={convId}
          convId={convId}
          initialMessages={initialMessages}
          onSave={(role, content) => saveFn({ data: { conversationId: convId, role, content } }).catch(() => {})}
          onReset={async () => {
            const { id } = await resetFn();
            setInitialMessages(null);
            setConvId(null);
            setInitialMessages([]);
            setConvId(id);
          }}
          onSwitchConversation={switchConversation}
          onOpenContent={(c) => { setActiveContent(c); if (c) setShowPanel(true); }}
          showPanel={showPanel}
          onTogglePanel={() => setShowPanel(!showPanel)}
        />
      </div>
      {showPanel && (
        <div className="flex-1 flex min-w-0">
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center text-[#a3a3a3]"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
            {activeContent?.type === "code" ? (
              <div className="flex-1 bg-[#171717] rounded-[24px] border border-[#333] flex flex-col overflow-hidden">
                <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-[#333] bg-[#171717]">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#dcb383] bg-[#dcb383]/10 px-2 py-0.5 rounded-full shrink-0">Code</span>
                    <span className="text-[#e5e5e5] font-medium truncate">{activeContent.title}</span>
                  </div>
                  <button className="hover:text-[#e5e5e5] p-1.5 rounded-lg hover:bg-[#262626] transition-colors" onClick={() => { setActiveContent(null); setShowPanel(false); }}>
                    <X className="w-4 h-4" />
                  </button>
                </header>
                <div className="flex-1 overflow-y-auto p-4">
                  <CodePreview json={activeContent.content} />
                </div>
              </div>
            ) : (
              <DocumentEditorPanel
                content={activeContent}
                onClose={() => { setActiveContent(null); setShowPanel(false); }}
              />
            )}
          </React.Suspense>
        </div>
      )}
    </div>
  );
}
