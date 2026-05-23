import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, MessageSquare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useServerFn } from "@tanstack/react-start";
import { ensureConversation, loadMessages, saveMessage, resetConversation } from "@/lib/chat.functions";

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

  return (
    <ChatInner
      key={convId}
      convId={convId}
      initialMessages={initialMessages}
      onSave={(role, content) => saveFn({ data: { conversationId: convId, role, content } }).catch(() => {})}
      onReset={async () => {
        const { id } = await resetFn();
        setInitialMessages([]);
        setConvId(id);
      }}
    />
  );
}

function ChatInner({
  convId,
  initialMessages,
  onSave,
  onReset,
}: {
  convId: string;
  initialMessages: UIMessage[];
  onSave: (role: "user" | "assistant", content: string) => void;
  onReset: () => void;
}) {
  const { messages, sendMessage, status } = useChat({
    api: "/api/chat",
    id: convId,
    messages: initialMessages,
    onFinish: ({ message }) => {
      const text = message.parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join("")
        .trim();
      if (text) onSave("assistant", text);
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
    onSave("user", text);
    await sendMessage({ text });
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
      <div className="px-8 py-6 border-b border-border/40 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Agent IA</p>
          <h1 className="font-display text-3xl">Conseil architecture française</h1>
          <p className="text-sm text-muted-foreground mt-1">PLU · RT/RE2020 · BBC · accessibilité PMR · DTU</p>
        </div>
        <Button variant="outline" size="sm" onClick={onReset} className="border-primary/30 shrink-0">
          <RotateCcw className="h-3.5 w-3.5 mr-2" /> Nouvelle conversation
        </Button>
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
            <div key={m.id} className="max-w-[85%]">
              <div className="prose prose-invert prose-sm max-w-none prose-headings:font-display prose-headings:text-foreground prose-strong:text-primary prose-a:text-primary prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border/40 prose-li:my-0.5 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              </div>
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> L'agent réfléchit…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border/40 p-4 flex gap-2 bg-card">
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
      </form>
    </div>
  );
}
