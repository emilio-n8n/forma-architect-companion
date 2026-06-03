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
  Ellipsis,
  Mic,
  PenLine,
  Share2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  ensureConversation,
  loadMessages,
  saveMessage,
  resetConversation,
  generateSuggestions,
  listConversations,
  deleteConversation,
  searchWeb,
} from "@/lib/chat.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SpreadsheetPreview } from "@/components/SpreadsheetPreview";
import { EmailPreview } from "@/components/EmailPreview";
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
  const [activeDocument, setActiveDocument] = useState<{ title: string; content: string } | null>(null);

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
        onOpenDocument={setActiveDocument}
      />
      <DocumentEditorPanel document={activeDocument} onClose={() => setActiveDocument(null)} />
    </div>
  );
}

function ChatInner({
  convId,
  initialMessages,
  onSave,
  onReset,
  onSwitchConversation,
  onOpenDocument,
}: {
  convId: string;
  initialMessages: UIMessage[];
  onSave: (role: "user" | "assistant", content: string) => void;
  onReset: () => void;
  onSwitchConversation: (id: string) => Promise<void>;
  onOpenDocument: (doc: { title: string; content: string } | null) => void;
}) {
  const suggestFn = useServerFn(generateSuggestions);
  const listFn = useServerFn(listConversations);
  const deleteFn = useServerFn(deleteConversation);
  const searchWebFn = useServerFn(searchWeb);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ title: string; url: string; text: string }> | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
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
    transport: new DefaultChatTransport({ api: "/api/chat" }),
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
          });
        suggestFn({ data: { messages: recent } })
          .then((s) => setSuggestions(s))
          .catch(() => {});
      }
    },
  });
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const loading = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input;
    setInput("");
    setSuggestions(null);

    const needsSearch = /cherche|recherche|trouve|actualité|actualités|informe-toi|informations?\s+sur|je\s*veux\s*savoir|va\s*chercher/i.test(
      text,
    );
    if (needsSearch) {
      setSearchLoading(true);
      setSearchResults(null);
      const res = await searchWebFn({ data: { query: text } }).catch(() => ({ results: [] }));
      setSearchLoading(false);
      if (res.results && res.results.length > 0) {
        const context = (res.results as Array<{ title: string; url: string; text: string }>)
          .slice(0, 5)
          .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.text.slice(0, 500)}`)
          .join("\n\n");
        const augmented = `${text}\n\nRésultats de recherche :\n${context}`;
        onSave("user", augmented);
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
      className="flex flex-col w-[350px] min-w-[300px] h-full min-h-0 overflow-hidden"
      data-purpose="chat-sidebar"
      style={{ backgroundColor: "#090909" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-2 py-3 shrink-0">
        <span className="text-xs text-[#a3a3a3] uppercase tracking-widest font-medium">FORMA</span>
        <div className="flex items-center gap-1">
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
      <div className="flex-1 overflow-y-auto px-2 flex flex-col gap-6 pt-2 pb-4 min-h-0">
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
                onOpenDocument={onOpenDocument}
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
                <button
                  className="hover:text-[#e5e5e5]"
                  title="Plus d'options"
                  onClick={() => {
                    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `FORMA-message-${new Date().toISOString().slice(0, 10)}.md`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Ellipsis className="w-4 h-4" />
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
        <div ref={endRef} />
      </div>

      {/* Search bar (expandable) */}
      {showSearch && (
        <div className="px-2 pb-2">
          <div className="flex gap-2 bg-[#1a1a1a] border border-[#333] rounded-2xl p-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && searchQuery.trim() && !searchLoading) {
                  setSearchLoading(true);
                  setSearchResults(null);
                  const res = await searchWebFn({ data: { query: searchQuery.trim() } }).catch(() => ({
                    results: [],
                  }));
                  setSearchResults((res.results ?? []) as Array<{ title: string; url: string; text: string }>);
                  setSearchLoading(false);
                }
              }}
              placeholder="Rechercher sur le web…"
              className="flex-1 bg-transparent border-none text-sm text-[#e5e5e5] placeholder-[#666] focus:outline-none p-1"
            />
            <button
              disabled={searchLoading || !searchQuery.trim()}
              onClick={async () => {
                setSearchLoading(true);
                setSearchResults(null);
                const res = await searchWebFn({ data: { query: searchQuery.trim() } }).catch(() => ({
                  results: [],
                }));
                setSearchResults((res.results ?? []) as Array<{ title: string; url: string; text: string }>);
                setSearchLoading(false);
              }}
              className="text-[#dcb383] text-xs font-medium px-2 shrink-0 disabled:opacity-40"
            >
              {searchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Chercher"}
            </button>
          </div>
        </div>
      )}

      {/* Search results overlay */}
      {searchResults !== null && !searchLoading && (
        <div className="px-2 pb-2">
          <div className="border border-[#333] rounded-2xl overflow-hidden bg-[#171717]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#333]">
              <span className="text-xs font-medium text-[#e5e5e5]">
                {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
              </span>
              <button onClick={() => setSearchResults(null)} className="text-[#a3a3a3] hover:text-[#e5e5e5] text-xs">
                Fermer
              </button>
            </div>
            <div className="max-h-[30vh] overflow-y-auto divide-y divide-[#333]">
              {searchResults.map((r, i) => (
                <div key={i} className="px-4 py-2.5 hover:bg-[#1a1a1a] transition-colors">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-[#dcb383] hover:underline flex items-center gap-1"
                  >
                    {r.title}
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                  <p className="text-[10px] text-[#a3a3a3] mt-0.5 truncate">{r.url}</p>
                  <p className="text-xs text-[#a3a3a3]/70 mt-1 line-clamp-2">{r.text}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-[#333]">
              <button
                onClick={() => {
                  const context = searchResults
                    .map((r, i) => `${i + 1}. ${r.title} (${r.url})\n   ${r.text.slice(0, 300)}`)
                    .join("\n\n");
                  setInput(
                    `Suite de la conversation avec ces résultats de recherche :\n\n${context}\n\n`,
                  );
                  setSearchResults(null);
                }}
                className="text-xs text-[#dcb383] w-full text-center hover:text-[#e8c49a]"
              >
                Utiliser ces résultats dans la conversation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-2 px-2 pb-3">
        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-3 flex flex-col gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Écrivons ou créons ensemble"
            className="bg-transparent border-none text-sm text-[#e5e5e5] placeholder-[#666] focus:outline-none w-full p-0"
          />
          <div className="flex justify-between items-center mt-1">
            <div className="flex gap-2">
              <button
                type="button"
                className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-full hover:bg-[#262626] transition-colors"
                title="Nouveau document"
                onClick={() => {
                  onOpenDocument({ title: "Nouveau document", content: "# Nouveau document\n\nÉcrivez ici…" });
                }}
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 bg-[#2a2a2a] border border-[#3f3f3f] text-xs px-2.5 py-1 rounded-full text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
                title="Canvas"
                onClick={() => {
                  onOpenDocument({ title: "Canvas", content: "# Canvas\n\nEspace de travail libre." });
                }}
              >
                <PenLine className="w-3.5 h-3.5 text-[#dcb383]" />
                Canvas
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#666]">Flash-Lite</span>
              <svg className="w-3 h-3 text-[#666]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="m19.5 8.25-7.5 7.5-7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <button
                type="button"
                className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-full hover:bg-[#262626] transition-colors ml-1"
                title="Dictée vocale"
                onClick={() => {
                  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SpeechRecognition) return;
                  const recognition = new SpeechRecognition();
                  recognition.lang = "fr-FR";
                  recognition.continuous = false;
                  recognition.interimResults = false;
                  recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
                  };
                  recognition.start();
                }}
              >
                <Mic className="w-5 h-5" />
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
  onOpenDocument,
  messageIdx,
}: {
  text: string;
  onOpenDocument: (doc: { title: string; content: string } | null) => void;
  messageIdx: number;
}) {
  const renderers = {
    strong: ({ children }: { children: React.ReactNode }) => {
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
    code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
      const isInline = !className;
      const content = String(children || "").replace(/\n$/, "");
      const lang = className?.replace(/^language-/, "") ?? "";
      if (!isInline && lang === "doc") {
        const title = content.split("\n")[0]?.replace(/^#+\s*/, "").trim();
        const key = `doc-${messageIdx}`;
        return (
          <div
            className="border border-[#333] rounded-2xl p-4 flex items-center gap-3 bg-[#171717] cursor-pointer hover:bg-[#1e1e1e] transition-colors my-3"
            onClick={() => onOpenDocument({ title: title || "Document", content })}
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
        return <SpreadsheetPreview json={content} />;
      }
      if (!isInline && lang === "email") {
        return <EmailPreview json={content} />;
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
    p: ({ children }: { children: React.ReactNode }) => {
      return <p className="text-sm leading-relaxed text-[#d4d4d4]">{children}</p>;
    },
  };

  return (
    <div className="max-w-full">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderers}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
