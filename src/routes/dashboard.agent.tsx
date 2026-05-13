import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/dashboard/agent")({
  component: AgentPage,
});

function AgentPage() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
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
    await sendMessage({ text });
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
      <div className="px-8 py-6 border-b border-border/40">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Agent IA</p>
        <h1 className="font-display text-3xl">Conseil architecture française</h1>
        <p className="text-sm text-muted-foreground mt-1">PLU · RT/RE2020 · BBC · accessibilité PMR · DTU</p>
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
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs px-3 py-2 border border-primary/20 rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary/60 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={
              m.role === "user"
                ? "max-w-[80%] bg-primary text-primary-foreground rounded-lg px-4 py-3 text-sm"
                : "max-w-[85%] text-foreground leading-relaxed text-[15px]"
            }>
              {m.parts.map((p, i) => p.type === "text" ? <span key={i}>{p.text}</span> : null)}
            </div>
          </div>
        ))}

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
        <Button type="submit" disabled={loading || !input.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 self-end h-10 w-10 p-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
