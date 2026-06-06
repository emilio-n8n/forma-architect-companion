import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Download,
  History,
  Plus,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Share2,
  Send,
  PanelRightOpen,
  PanelRightClose,
  PenLine,
  Search,
  Brain,
  Bookmark,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  ensureConversation,
  loadMessages,
  saveMessage,
  resetConversation,
  generateSuggestions,
  listConversations,
  deleteConversation,
} from "@/lib/chat.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DocumentEditorPanel } from "@/components/DocumentEditorPanel";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/dashboard/agent")({
  component: AgentPage,
});

function AgentPage() {
  const ensureFn = useServerFn(ensureConversation);
  const loadFn = useServerFn(loadMessages);
  const saveFn = useServerFn(saveMessage);
  const resetFn = useServerFn(resetConversation);

  const [convId, setConvId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [activeContent, setActiveContent] = useState<{ type: "doc" | "spreadsheet" | "email"; title: string; content: string } | null>(null);
  const [showPanel, setShowPanel] = useState(true);

  useEffect(() => {
    (async () => {
      const { id } = await ensureFn();
      const rows = await loadFn({ data: { conversationId: id } });
      const initial: UIMessage[] = rows.map((r) => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        parts: [{ type: "text", text: r.content }],
      }));
      setConvId(id);
      setInitialMessages(initial);
    })().catch(() => {
      setInitialMessages([]);
    });
  }, [ensureFn, loadFn]);

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
          <DocumentEditorPanel
            content={activeContent}
            onClose={() => { setActiveContent(null); setShowPanel(false); }}
          />
        </div>
      )}
    </div>
  );
}

function ChatInner({
  convId,
  initialMessages,
  onSave,
  onReset,
  onSwitchConversation,
  onOpenContent,
  showPanel,
  onTogglePanel,
}: {
  convId: string;
  initialMessages: UIMessage[];
  onSave: (role: "user" | "assistant", content: string) => void;
  onReset: () => void;
  onSwitchConversation: (id: string) => Promise<void>;
  onOpenContent: (content: { type: "doc" | "spreadsheet" | "email"; title: string; content: string } | null) => void;
  showPanel: boolean;
  onTogglePanel: () => void;
}) {
  const suggestFn = useServerFn(generateSuggestions);
  const listFn = useServerFn(listConversations);
  const deleteFn = useServerFn(deleteConversation);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [conversations, setConversations] = useState<
    Array<{ id: string; title: string; updated_at: string; message_count: number }>
  >([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  useEffect(() => {
    setLoadingConvs(true);
    listFn()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, [sheetOpen]);

  const { messages, sendMessage, status } = useChat({
    id: convId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    onFinish: ({ message }) => {
      const text = message.parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join("")
        .trim();
      if (text) onSave("assistant", text);

      if (text && messages.length >= 2) {
        // Save memories from this exchange
        const recent = [...messages, message]
          .slice(-2)
          .map((m) => {
            const t = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
            return { role: m.role, content: t };
          });
        const exchangeText = recent
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n\n");

        saveMemFn({ data: { content: exchangeText } }).catch(() => {});

        // Generate suggestions
        suggestFn({ data: { messages: recent.slice(-4) } })
          .then((s) => setSuggestions(s))
          .catch(() => {});
      }
    },
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const loading = status === "submitted" || status === "streaming";
  const lastMessageId = messages[messages.length - 1]?.id;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distance < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastMessageId, status]);

  useEffect(() => {
    if (status !== "streaming") return;
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const tick = () => {
      if (stickToBottomRef.current) el.scrollTop = el.scrollHeight;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input;
    setInput("");
    setSuggestions(null);
    stickToBottomRef.current = true;

    const auto = /cherche|recherche|trouve|actualité|actualités|informe-toi|informations?\s+sur|je\s*veux\s*savoir|va\s*chercher/i.test(
      text,
    );
    const needsSearch = forceWebNext || auto;
    setForceWebNext(false);

    if (needsSearch) {
      setSearchLoading(true);
      const history = messages
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim(),
        }))
        .filter((m) => m.content.length > 0);
      const res = (await searchWebFn({ data: { query: text, history } }).catch(() => ({
        results: [],
        answer: "",
      }))) as { results?: Array<{ title: string; url: string; text: string }>; answer?: string };
      setSearchLoading(false);
      const results = res.results ?? [];
      const answer = res.answer ?? "";
      if (answer || results.length > 0) {
        const sources = results
          .slice(0, 5)
          .map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.text.slice(0, 400)}`)
          .join("\n\n");
        const augmented = [
          text,
          "",
          "---",
          "Contexte web (cite les sources [1], [2], … dans ta réponse) :",
          answer ? `Réponse synthétisée Exa : ${answer}` : "",
          sources ? `Sources :\n${sources}` : "",
        ]
          .filter(Boolean)
          .join("\n");
        onSave("user", text);
        await sendMessage({ text: augmented });
        return;
      }
    }

    onSave("user", text);
    await sendMessage({ text });
  };

  const handleExport = () => {
    const date = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const lines: string[] = [`# FORMA Agent — ${date}\n`];
    for (const m of messages) {
      const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
      if (!text) continue;
      lines.push(m.role === "user" ? `**Vous :**\n${text}\n` : `**FORMA :**\n${text}\n`);
    }
    const md = lines.join("\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FORMA-Agent-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <section
      className="flex flex-col h-full min-h-0 overflow-hidden"
      data-purpose="chat-sidebar"
      style={{ backgroundColor: "#090909" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-end px-2 py-3 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePanel}
            className={`p-1.5 rounded-full hover:bg-[#1a1a1a] transition-colors ${showPanel ? "text-[#dcb383]" : "text-[#a3a3a3] hover:text-[#e5e5e5]"}`}
            title={showPanel ? "Masquer le panneau" : "Afficher le panneau"}
          >
            {showPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
          <button
            onClick={onReset}
            className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-full hover:bg-[#1a1a1a] transition-colors"
            title="Nouvelle conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-full hover:bg-[#1a1a1a] transition-colors"
                title="Historique"
              >
                <History className="w-4 h-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="px-4 py-5 border-b border-border/40">
                <SheetTitle>Conversations</SheetTitle>
              </SheetHeader>
              {loadingConvs ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 text-sm">
                  Aucune conversation
                </div>
              ) : (
                <ScrollArea className="flex-1 h-[calc(100vh-5rem)]">
                  <div className="py-2">
                    {conversations.map((conv) => (
                      <div key={conv.id} className="group relative">
                        <button
                          onClick={() => {
                            if (conv.id !== convId) {
                              setSheetOpen(false);
                              onSwitchConversation(conv.id);
                            }
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors ${
                            conv.id === convId ? "bg-primary/15" : ""
                          }`}
                        >
                          <p className="text-sm font-medium truncate pr-8">
                            {conv.title || "Nouvelle conversation"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {conv.message_count} message{conv.message_count !== 1 ? "s" : ""}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(conv.updated_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={async () => {
                            if (conv.id === convId) return;
                            await deleteFn({ data: { id: conv.id } }).catch(() => {});
                            setConversations((prev) => prev.filter((c) => c.id !== conv.id));
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          title="Supprimer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                        <Separator className="last:hidden" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </SheetContent>
          </Sheet>
          {messages.length > 0 && (
            <button
              onClick={handleExport}
              className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-full hover:bg-[#1a1a1a] transition-colors"
              title="Exporter"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto px-2 flex flex-col gap-6 pt-2 pb-4 min-h-0" style={{ overflowAnchor: "none" }}>
        {messages.length === 0 && (
          <div className="text-center text-[#a3a3a3] py-16">
            <FileText className="w-10 h-10 mx-auto opacity-30 mb-4" />
            <p className="text-sm">Posez votre question</p>
            <p className="text-xs mt-1 opacity-60">réglementaire ou technique</p>
          </div>
        )}

        {messages.map((m, idx) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          if (m.role === "user") {
            return (
              <div key={m.id} className="self-end bg-[#262626] rounded-2xl px-4 py-2.5 text-sm text-[#e5e5e5] max-w-[85%] break-words whitespace-pre-wrap">
                {text}
              </div>
            );
          }
          return (
            <div key={m.id} className="flex flex-col gap-4 text-sm leading-relaxed text-[#d4d4d4]">
              <ReactMarkdownContent
                text={text}
                onOpenContent={onOpenContent}
                messageIdx={idx}
              />
              <div className="flex gap-3 text-[#a3a3a3] mt-1">
                <button
                  className="hover:text-[#e5e5e5]"
                  title="Copier"
                  onClick={async () => {
                    await navigator.clipboard.writeText(text);
                    setCopiedMessageId(m.id);
                    setTimeout(() => setCopiedMessageId(null), 2000);
                  }}
                >
                  {copiedMessageId === m.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  className="hover:text-[#e5e5e5]"
                  title="Regénérer"
                  onClick={() => {
                    const lastUser = [...messages].reverse().find((msg) => msg.role === "user");
                    if (lastUser) {
                      const txt = lastUser.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                      sendMessage({ text: txt });
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  className="hover:text-[#e5e5e5]"
                  title="Partager"
                  onClick={async () => {
                    const shareText = `FORMA Agent\n\n${text.slice(0, 500)}…`;
                    if (navigator.share) {
                      await navigator.share({ text: shareText }).catch(() => {});
                    } else {
                      await navigator.clipboard.writeText(shareText);
                      setCopiedMessageId(m.id);
                      setTimeout(() => setCopiedMessageId(null), 2000);
                    }
                  }}
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {searchLoading && (
          <div className="flex items-center gap-2 text-[#a3a3a3] text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[#dcb383]" /> Recherche web en cours…
          </div>
        )}

        {suggestions && status !== "submitted" && status !== "streaming" && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setSuggestions(null);
                  setInput(s);
                }}
                className="text-xs px-3 py-2 border border-[#333] rounded-full hover:bg-[#1a1a1a] hover:text-[#e5e5e5] transition-colors text-[#a3a3a3]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {status === "submitted" && (
          <div className="flex items-center gap-2 text-[#a3a3a3] text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[#dcb383]" /> L'agent réfléchit…
          </div>
        )}
      </div>


      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-2 px-2 pb-3">
        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-3 flex flex-col gap-2">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const ta = e.currentTarget;
              ta.style.height = "auto";
              ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Écrivons ou créons ensemble"
            rows={1}
            className="bg-transparent border-none text-sm text-[#e5e5e5] placeholder-[#666] focus:outline-none w-full p-0 resize-none leading-relaxed max-h-60 overflow-y-auto"
          />
          <div className="flex justify-between items-center mt-1">
            <div className="flex gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 bg-[#2a2a2a] border border-[#3f3f3f] text-xs px-2.5 py-1 rounded-full text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
                title="Nouveau document"
                onClick={() => {
                  onOpenContent({ type: "doc", title: "Nouveau document", content: "# Nouveau document\n\nÉcrivez ici…" });
                }}
              >
                <PenLine className="w-3.5 h-3.5 text-[#dcb383]" />
                Canvas
              </button>
              <button
                type="button"
                onClick={() => setForceWebNext((v) => !v)}
                className={`flex items-center gap-1.5 border text-xs px-2.5 py-1 rounded-full transition-colors ${
                  forceWebNext
                    ? "bg-[#dcb383]/15 border-[#dcb383]/40 text-[#dcb383]"
                    : "bg-[#2a2a2a] border-[#3f3f3f] text-[#a3a3a3] hover:text-[#e5e5e5]"
                }`}
                title="Forcer une recherche web pour le prochain message"
              >
                <Globe className="w-3.5 h-3.5" />
                Web
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-full hover:bg-[#262626] transition-colors disabled:opacity-40"
                title="Envoyer"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}

function ReactMarkdownContent({
  text,
  onOpenContent,
  messageIdx,
}: {
  text: string;
  onOpenContent: (content: { type: "doc" | "spreadsheet" | "email"; title: string; content: string } | null) => void;
  messageIdx: number;
}) {
  const renderers: import("react-markdown").Components = {
    strong: ({ children }) => {
      const t = typeof children === "string" ? children : "";
      if (t.startsWith("[RF:")) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#dcb383]/30 bg-[#dcb383]/5 text-[#dcb383] font-mono text-[11px] leading-tight mx-0.5">
            {t}
          </span>
        );
      }
      return <strong>{children}</strong>;
    },
    code: ({ className, children, ...props }) => {
      const isInline = !className;
      const content = String(children || "").replace(/\n$/, "");
      const lang = className?.replace(/^language-/, "") ?? "";
      if (!isInline && lang === "doc") {
        const title = content.split("\n")[0]?.replace(/^#+\s*/, "").trim();
        return (
          <div
            className="border border-[#333] rounded-2xl p-4 flex items-center gap-3 bg-[#171717] cursor-pointer hover:bg-[#1e1e1e] transition-colors my-3"
            onClick={() => onOpenContent({ type: "doc", title: title || "Document", content })}
          >
            <div className="text-[#a3a3a3]">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#e5e5e5] text-sm truncate">{title || "Document"}</h4>
              <p className="text-xs text-[#a3a3a3] mt-0.5">
                {new Date().toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      }
      if (!isInline && lang === "spreadsheet") {
        let title = "Tableur";
        try {
          const parsed = JSON.parse(content);
          if (parsed.title) title = parsed.title;
        } catch {}
        return (
          <div
            className="border border-[#333] rounded-2xl p-4 flex items-center gap-3 bg-[#171717] cursor-pointer hover:bg-[#1e1e1e] transition-colors my-3"
            onClick={() => onOpenContent({ type: "spreadsheet", title, content })}
          >
            <div className="text-[#a3a3a3]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m0 0V5.625M12 18.375c0 .621-.504 1.125-1.125 1.125H4.5M12 5.625V3.375c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25M12 5.625h7.5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#e5e5e5] text-sm truncate">{title}</h4>
              <p className="text-xs text-[#a3a3a3] mt-0.5">Tableau de données · cliquer pour ouvrir</p>
            </div>
          </div>
        );
      }
      if (!isInline && lang === "email") {
        let subject = "Email";
        try {
          const parsed = JSON.parse(content);
          if (parsed.subject) subject = parsed.subject;
        } catch {}
        return (
          <div
            className="border border-[#333] rounded-2xl p-4 flex items-center gap-3 bg-[#171717] cursor-pointer hover:bg-[#1e1e1e] transition-colors my-3"
            onClick={() => onOpenContent({ type: "email", title: subject, content })}
          >
            <div className="text-[#a3a3a3]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#e5e5e5] text-sm truncate">{subject}</h4>
              <p className="text-xs text-[#a3a3a3] mt-0.5">Email · cliquer pour ouvrir</p>
            </div>
          </div>
        );
      }
      if (isInline) {
        return (
          <code className="text-[#dcb383] bg-[#222] px-1 py-0.5 rounded text-sm" {...props}>
            {children}
          </code>
        );
      }
      return (
        <pre className="bg-[#222] border border-[#333] rounded-lg p-4 overflow-x-auto text-sm text-[#e5e5e5]">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    p: ({ children }) => <p className="my-2 leading-relaxed text-[#d4d4d4]">{children}</p>,
    h1: ({ children }) => <h1 className="text-xl font-semibold text-[#f5f5f5] mt-6 mb-3 leading-tight">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-semibold text-[#f0f0f0] mt-5 mb-2 leading-tight">{children}</h2>,
    h3: ({ children }) => <h3 className="text-[15px] font-semibold text-[#e8e8e8] mt-4 mb-1.5">{children}</h3>,
    h4: ({ children }) => <h4 className="text-sm font-semibold text-[#e5e5e5] mt-3 mb-1">{children}</h4>,
    ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1 marker:text-[#dcb383]/60">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1 marker:text-[#dcb383]/60">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed text-[#d4d4d4]">{children}</li>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#dcb383] underline decoration-[#dcb383]/40 underline-offset-2 hover:decoration-[#dcb383] break-words">
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-[#dcb383]/40 pl-3 my-3 text-[#bbb] italic">{children}</blockquote>
    ),
    hr: () => <hr className="my-4 border-[#2a2a2a]" />,
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto rounded-lg border border-[#2a2a2a]">
        <table className="min-w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-[#1a1a1a] text-[#dcb383]">{children}</thead>,
    th: ({ children }) => <th className="text-left font-medium px-3 py-2 border-b border-[#2a2a2a]">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2 border-b border-[#222] text-[#d4d4d4] align-top">{children}</td>,
    tr: ({ children }) => <tr className="even:bg-[#141414]">{children}</tr>,
  };

  return (
    <div className="max-w-full text-sm text-[#d4d4d4] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderers}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
