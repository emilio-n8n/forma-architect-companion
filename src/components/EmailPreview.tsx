import { useState } from "react";
import { Mail, Copy, Check, Download, ChevronDown, ChevronUp, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmailData {
  to: string;
  subject: string;
  body: string;
  from?: string;
  cc?: string;
  date?: string;
}

export function EmailPreview({ json }: { json: string }) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  let data: EmailData | null = null;
  try {
    data = JSON.parse(json) as EmailData;
  } catch {
    // not JSON — treat the whole block as email body
  }

  if (!data || !data.body) {
    return (
      <div className="my-4 border border-border/40 rounded-lg p-4 text-sm text-muted-foreground bg-card text-center">
        Données email invalides
      </div>
    );
  }

  const displayDate = data.date || new Date().toLocaleDateString("fr-FR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const handleCopy = async () => {
    const text = [
      `De: ${data.from || "FORMA Agent"}`,
      `À: ${data.to}`,
      data.cc ? `Cc: ${data.cc}` : "",
      `Sujet: ${data.subject}`,
      `Date: ${displayDate}`,
      "",
      data.body,
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const eml = [
      `From: ${data.from || "FORMA Agent"}`,
      `To: ${data.to}`,
      data.cc ? `Cc: ${data.cc}` : "",
      `Subject: ${data.subject}`,
      `Date: ${new Date().toUTCString()}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      data.body,
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([eml], { type: "message/rfc822;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.subject.replace(/[^a-zA-Z0-9\u00C0-\u024F -]/g, "").trim() || "email"}.eml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-4 border border-border/40 rounded-lg overflow-hidden bg-card max-w-2xl">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">{data.subject}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="Copier">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="Télécharger .eml">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-border/20 bg-muted/10">
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {data.from && (
            <>
              <span className="text-xs text-muted-foreground font-medium">De</span>
              <span className="text-foreground">{data.from}</span>
            </>
          )}
          <span className="text-xs text-muted-foreground font-medium">À</span>
          <span className="text-foreground">{data.to}</span>
          {data.cc && (
            <>
              <span className="text-xs text-muted-foreground font-medium">Cc</span>
              <span className="text-foreground">{data.cc}</span>
            </>
          )}
          <span className="text-xs text-muted-foreground font-medium">Sujet</span>
          <span className="text-foreground font-medium">{data.subject}</span>
          <span className="text-xs text-muted-foreground font-medium">Date</span>
          <span className="text-muted-foreground text-xs">{displayDate}</span>
        </div>
      </div>

      <div className="max-h-[40vh] overflow-y-auto">
        <div className="px-4 py-4 text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {data.body}
        </div>
      </div>
    </div>
  );
}
