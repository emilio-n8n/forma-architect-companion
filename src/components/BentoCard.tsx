import { type ReactNode } from "react";

interface BentoCardProps {
  icon: ReactNode;
  label: string;
  title: string;
  description: string;
  children: ReactNode;
  colSpan?: boolean;
}

export function BentoCard({ icon, label, title, description, children, colSpan }: BentoCardProps) {
  return (
    <div className={`${colSpan ? "lg:col-span-2" : ""} border border-border/30 bg-card/30 p-8 flex flex-col justify-between group hover:border-primary/40 transition-colors duration-500 relative overflow-hidden`}>
      <div className={`absolute ${colSpan ? "top-0 right-0 w-[300px] h-[300px]" : "bottom-0 right-0 w-[200px] h-[200px]"} bg-primary/2 rounded-full blur-[80px] pointer-events-none`} />
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-primary">{label}</span>
        </div>
        <h3 className={`font-display mb-3 ${colSpan ? "text-3xl md:text-4xl" : "text-3xl"}`}>{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-md mb-8">{description}</p>
      </div>
      {children}
    </div>
  );
}
