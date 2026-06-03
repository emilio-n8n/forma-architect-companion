import { useState } from "react";
import { Mail, Copy, Check, Download } from "lucide-react";

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

  let data: EmailData | null = null;
  try {
    data = JSON.parse(json) as EmailData;
  } catch {}

  if (!data || !data.body) {
    return (
      <div className="my-3 border border-[#333] rounded-2xl p-4 text-sm text-[#a3a3a3] bg-[#171717] text-center">
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
    <div className="my-3 border border-[#333] rounded-2xl overflow-hidden bg-[#171717]">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#333] bg-[#222]">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="h-4 w-4 text-[#dcb383] shrink-0" />
          <span className="text-sm font-medium text-[#e5e5e5] truncate">{data.subject}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleCopy} className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg hover:bg-[#333] transition-colors" title="Copier">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button onClick={handleDownload} className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg hover:bg-[#333] transition-colors" title="Télécharger .eml">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-[#333] bg-[#1e1e1e]">
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {data.from && (
            <>
              <span className="text-xs text-[#a3a3a3] font-medium">De</span>
              <span className="text-[#e5e5e5]">{data.from}</span>
            </>
          )}
          <span className="text-xs text-[#a3a3a3] font-medium">À</span>
          <span className="text-[#e5e5e5]">{data.to}</span>
          {data.cc && (
            <>
              <span className="text-xs text-[#a3a3a3] font-medium">Cc</span>
              <span className="text-[#e5e5e5]">{data.cc}</span>
            </>
          )}
          <span className="text-xs text-[#a3a3a3] font-medium">Sujet</span>
          <span className="text-[#dcb383] font-medium">{data.subject}</span>
          <span className="text-xs text-[#a3a3a3] font-medium">Date</span>
          <span className="text-[#a3a3a3] text-xs">{displayDate}</span>
        </div>
      </div>

      <div className="max-h-[40vh] overflow-y-auto">
        <div className="px-4 py-4 text-sm leading-relaxed whitespace-pre-wrap text-[#d4d4d4]">
          {data.body}
        </div>
      </div>
    </div>
  );
}
