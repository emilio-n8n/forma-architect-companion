import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import React, { useEffect, useRef, useState } from "react";
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
  Code,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  generateSuggestions,
  listConversations,
  deleteConversation,
  generateConversationTitle,
} from "@/lib/chat.functions";
import { dreamMemorySynthesis, refreshTemporalMemories, generateMemorySummary } from "@/lib/dreaming.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ToolActivity } from "./ToolActivity";
import { ReactMarkdownContent, isTruncated } from "./MarkdownContent";

export function ChatInner({
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
  onOpenContent: (content: { type: "doc" | "spreadsheet" | "email" | "code"; title: string; content: string } | null) => void;
  showPanel: boolean;
  onTogglePanel: () => void;
}) {
  const suggestFn = useServerFn(generateSuggestions);
  const listFn = useServerFn(listConversations);
  const deleteFn = useServerFn(deleteConversation);
  const dreamFn = useServerFn(dreamMemorySynthesis);
  const refreshFn = useServerFn(refreshTemporalMemories);
  const summaryFn = useServerFn(generateMemorySummary);
  const titleFn = useServerFn(generateConversationTitle);
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
      .catch((e) => { console.error("[listConversations]", e); toast.error(e instanceof Error ? e.message : "Une erreur est survenue"); })
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
        const recent = [...messages, message]
          .slice(-4)
          .map((m) => {
            const t = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
            return { role: m.role, content: t };
          })
          .filter((m) => m.content.length > 0);
        suggestFn({ data: { messages: recent } })
          .then((s) => setSuggestions(s))
          .catch((e) => { console.error("[generateSuggestions]", e); toast.error(e instanceof Error ? e.message : "Une erreur est survenue"); });
      }

      // Auto-title after first exchange
      if (messages.length === 1 && text) {
        const msgs = [...messages, message]
          .map((m) => ({
            role: m.role,
            content: m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim(),
          }))
          .filter((m) => m.content.length > 0);
        if (msgs.length >= 2) {
          titleFn({ data: { conversationId: convId, messages: msgs } }).catch((e) => { console.error("[generateConversationTitle]", e); toast.error(e instanceof Error ? e.message : "Une erreur est survenue"); });
        }
      }

      // Periodic dreaming every 5 messages with notification
      const msgCount = messages.length;
      if (msgCount > 0 && msgCount % 5 === 0) {
        dreamFn({}).then((r) => {
          if (!r) return;
          const parts: string[] = [];
          if (r.new_memories > 0) parts.push(`${r.new_memories} appris`);
          if (r.updates > 0) parts.push(`${r.updates} mis à jour`);
          if (r.deactivated > 0) parts.push(`${r.deactivated} archivés`);
          if (parts.length > 0) toast.success(`🧠 ${parts.join(", ")}`);
        }).catch((e) => { console.error("[dreamMemorySynthesis]", e); toast.error(e instanceof Error ? e.message : "Une erreur est survenue"); });
        summaryFn().catch((e) => { console.error("[generateMemorySummary]", e); toast.error(e instanceof Error ? e.message : "Une erreur est survenue"); });
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
                            await deleteFn({ data: { id: conv.id } }).catch((e) => { console.error("[deleteConversation]", e); toast.error(e instanceof Error ? e.message : "Une erreur est survenue"); });
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
            <div key={m.id} className="flex flex-col gap-3 text-sm leading-relaxed text-[#d4d4d4]">
              <ToolActivity parts={m.parts} />
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
                      await navigator.share({ text: shareText }).catch((e) => { console.error("[navigator.share]", e); toast.error(e instanceof Error ? e.message : "Une erreur est survenue"); });
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

              {idx === messages.length - 1 && status !== "streaming" && isTruncated(text) && (
                <button
                  onClick={() => {
                    const lastUser = [...messages].reverse().find((msg) => msg.role === "user");
                    if (lastUser) {
                      const txt = lastUser.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                      sendMessage({ text: txt + "\n\nContinue la réponse précédente à partir de là où tu t'es arrêté. Termine tous les blocs ouverts." });
                    }
                  }}
                  className="self-start text-xs px-3 py-1.5 border border-[#dcb383]/40 rounded-full text-[#dcb383] hover:bg-[#dcb383]/10 transition-colors flex items-center gap-1.5 mt-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Continuer la génération (bloc tronqué)
                </button>
              )}
            </div>
          );
        })}


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
                className="flex items-center gap-1.5 bg-[#2a2a2a] border border-[#3f3f3f] text-xs px-2.5 py-1 rounded-full text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
                title="Nouveau code"
                onClick={() => {
                  onOpenContent({ type: "code", title: "Nouveau code", content: JSON.stringify({ html: "<h1>Bonjour</h1>", css: "body{font-family:sans-serif;padding:2rem}", js: "console.log('ready')", title: "Nouveau code" }, null, 2) });
                }}
              >
                <Code className="w-3.5 h-3.5 text-[#dcb383]" />
                Code
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
