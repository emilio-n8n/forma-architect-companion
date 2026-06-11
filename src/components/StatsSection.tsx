const STATS = [
  { num: "97 %", label: "de conformité réglementaire au premier dépôt" },
  { num: "15 000+", label: "documents d'urbanisme analysés" },
  { num: "7 200+", label: "rendus générés par nos utilisateurs" },
  { num: "3 min", label: "pour analyser un PLU complet" },
];

export function StatsSection() {
  return (
    <section className="py-32 border-t border-border/20 relative bg-gradient-to-b from-background to-[#080808]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <div key={i} className="text-left space-y-2 border-l border-primary/20 pl-6">
              <div className="font-display text-5xl md:text-7xl text-gradient-gold font-light">{stat.num}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest leading-relaxed">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
