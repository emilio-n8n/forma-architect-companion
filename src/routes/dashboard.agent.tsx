import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, MessageSquare, RotateCcw, Download, History, Trash2, FileText, Search, Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useServerFn } from "@tanstack/react-start";
import { ensureConversation, loadMessages, saveMessage, resetConversation, generateSuggestions, listConversations, deleteConversation, searchWeb } from "@/lib/chat.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DocumentPreview } from "@/components/DocumentPreview";
import { SpreadsheetPreview } from "@/components/SpreadsheetPreview";
import { EmailPreview } from "@/components/EmailPreview";

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
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
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
    <ChatInner
      key={convId}
      convId={convId}
      initialMessages={initialMessages}
      onSave={(role, content) => saveFn({ data: { conversationId: convId, role, content } }).catch(() => {})}
      onReset={async () => {
        const { id } = await resetFn();
        // ⭐ FIX: Race Condition - Reset both state variables atomically
        // Set both to null first to force ChatInner to re-initialize
        setInitialMessages(null);
        setConvId(null);
        // Then set the new conversation
        setInitialMessages([]);
        setConvId(id);
      }}
      onSwitchConversation={switchConversation}
    />
  );
}

function markdownToWordHtml(md: string): string {
  const body = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, "</p><p>");
  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><style>
body{font-family:'Calibri',sans-serif;font-size:11pt;line-height:1.5;color:#1a1a1a;margin:2.5cm auto;max-width:800px;padding:0 20px}
h1{font-size:18pt;color:#1a3a5c;border-bottom:2px solid #1a3a5c;padding-bottom:6pt}
h2{font-size:14pt;color:#2a5a8c;margin-top:18pt}
h3{font-size:12pt;color:#3a7abc;margin-top:14pt}
strong{color:#1a3a5c}
code{background:#f0f0f0;padding:1pt 4pt;border-radius:2pt;font-size:10pt;font-family:'Consolas',monospace}
pre{background:#f5f5f5;padding:10pt;border-left:3pt solid #1a3a5c;margin:8pt 0}
li{margin-left:18pt;margin-bottom:4pt}
p{margin:4pt 0}
a{color:#2a5a8c}
</style></head><body>${body}</body></html>`;
}

function downloadDocx(html: string, filename: string) {
  const blob = new Blob(["\ufeff" + html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ChatInner({
  convId,
  initialMessages,
  onSave,
  onReset,
  onSwitchConversation,
}: {
  convId: string;
  initialMessages: UIMessage[];
  onSave: (role: "user" | "assistant", content: string) => void;
  onReset: () => void;
  onSwitchConversation: (id: string) => Promise<void>;
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
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; updated_at: string; message_count: number }>>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

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

    const needsSearch = /cherche|recherche|trouve|actualité|actualités|informe-toi|informations?\s+sur|je\s*veux\s*savoir|va\s*chercher/i.test(text);
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
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
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

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
      <div className="px-8 py-6 border-b border-border/40 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Agent IA</p>
          <h1 className="font-display text-3xl">Conseil architecture française</h1>
          <p className="text-sm text-muted-foreground mt-1">PLU · RT/RE2020 · BBC · accessibilité PMR · DTU</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="border-primary/30">
                <History className="h-3.5 w-3.5 mr-2" /> Historique
              </Button>
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
                                day: "numeric", month: "short",
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
                          <Trash2 className="h-3.5 w-3.5" />
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
            <Button variant="outline" size="sm" onClick={handleExport} className="border-primary/30">
              <Download className="h-3.5 w-3.5 mr-2" /> Exporter
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onReset} className="border-primary/30">
            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Nouvelle conversation
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <MessageSquare className="h-10 w-10 mx-auto text-primary/40 mb-4" />
            <p>Posez votre question réglementaire ou technique.</p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                "Quelles obligations RE2020 pour une maison de 120m² ?",
                "Différence entre PLU et PLUi ?",
                "Normes accessibilité ERP catégorie 5",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-2 border border-primary/20 rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary/60 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] bg-primary text-primary-foreground rounded-lg px-4 py-3 text-sm whitespace-pre-wrap">
                  {text}
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className="max-w-[85%] group relative">
              <div className="prose prose-invert prose-sm max-w-none prose-headings:font-display prose-headings:text-foreground prose-strong:text-primary prose-a:text-primary prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border/40 prose-li:my-0.5 leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    strong: ({ children }) => {
                      const t = typeof children === "string" ? children : "";
                      if (t.startsWith("[RF:")) {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary font-mono text-[11px] leading-tight mx-0.5">
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
                        return <DocumentPreview title={title} content={content} />;
                      }
                      if (!isInline && lang === "spreadsheet") {
                        return <SpreadsheetPreview json={content} />;
                      }
                      if (!isInline && lang === "email") {
                        return <EmailPreview json={content} />;
                      }
                      if (isInline) {
                        return <code className="text-primary bg-muted px-1 py-0.5 rounded text-sm" {...props}>{children}</code>;
                      }
                      return (
                        <pre className="bg-muted border border-border/40 rounded-lg p-4 overflow-x-auto text-sm text-foreground">
                          <code className={className} {...props}>{children}</code>
                        </pre>
                      );
                    },
                  }}
                >{text}</ReactMarkdown>
              </div>
              <button
                onClick={() => {
                  const title = text.slice(0, 80).replace(/[^a-zA-Z0-9\u00C0-\u024F -]/g, "").trim() || "document";
                  downloadDocx(markdownToWordHtml(text), `${title}.docx`);
                }}
                className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                title="Télécharger en .docx"
              >
                <FileText className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        {searchLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Recherche web en cours…
          </div>
        )}

        {searchResults !== null && !searchLoading && (
          <div className="border border-primary/20 rounded-lg overflow-hidden bg-card">
            <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-b border-primary/20">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Résultats web</span>
                <span className="text-xs text-muted-foreground">({searchResults.length} résultat{searchResults.length > 1 ? "s" : ""})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSearchResults(null)}
              >
                Fermer
              </Button>
            </div>
            {searchResults.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                Aucun résultat trouvé
              </div>
            ) : (
              <div className="max-h-[40vh] overflow-y-auto divide-y divide-border/20">
                {searchResults.map((r, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {r.title}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.url}</p>
                    <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{r.text}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-2 border-t border-primary/20 bg-primary/5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs w-full"
                onClick={() => {
                  const context = searchResults
                    .map((r, i) => `${i + 1}. ${r.title} (${r.url})\n   ${r.text.slice(0, 300)}`)
                    .join("\n\n");
                  setInput(`Suite de la conversation avec ces résultats de recherche :\n\n${context}\n\n`);
                  setSearchResults(null);
                }}
              >
                Utiliser ces résultats dans la conversation
              </Button>
            </div>
          </div>
        )}

        {suggestions && status !== "submitted" && status !== "streaming" && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { setSuggestions(null); setInput(s); }}
                className="text-xs px-3 py-2 border border-primary/20 rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary/60 transition-colors bg-card"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {status === "submitted" && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> L'agent réfléchit…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border/40 bg-card">
        {showSearch && (
          <div className="flex gap-2 px-4 pt-3">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && searchQuery.trim() && !searchLoading) {
                  setSearchLoading(true);
                  setSearchResults(null);
                  const res = await searchWebFn({ data: { query: searchQuery.trim() } }).catch(() => ({ results: [] }));
                  setSearchResults((res.results ?? []) as Array<{ title: string; url: string; text: string }>);
                  setSearchLoading(false);
                }
              }}
              placeholder="Rechercher sur le web…"
              className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9"
              disabled={searchLoading || !searchQuery.trim()}
              onClick={async () => {
                setSearchLoading(true);
                setSearchResults(null);
                const res = await searchWebFn({ data: { query: searchQuery.trim() } }).catch(() => ({ results: [] }));
                setSearchResults((res.results ?? []) as Array<{ title: string; url: string; text: string }>);
                setSearchLoading(false);
              }}
            >
              {searchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Chercher
            </Button>
          </div>
        )}
        <div className="flex gap-2 p-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 self-end text-muted-foreground hover:text-primary"
            onClick={() => setShowSearch(!showSearch)}
            title="Recherche web"
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Posez votre question d'architecture…"
            rows={2}
            className="flex-1 resize-none bg-background border-border focus-visible:ring-primary"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 self-end h-10 w-10 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
