import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function ManifestoSection() {
  return (
    <section id="manifesto" className="py-28 border-t border-border/20 relative bg-[#060606] flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-4xl px-6 text-center space-y-8">
        <div className="h-px w-16 bg-primary/30 mx-auto" />

        <blockquote className="font-display text-3xl md:text-5xl lg:text-6xl leading-snug tracking-wide italic font-light max-w-3xl mx-auto">
          « L'architecture est l'art savant, correct et magnifique des volumes assemblés sous la lumière. »
        </blockquote>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-primary">Le Corbusier</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Vers une architecture, 1923</p>
        </div>

        <div className="max-w-xl mx-auto text-sm text-muted-foreground leading-relaxed">
          <p>
            Nous croyons que la technologie doit servir cette recherche de justesse — sans remplacer le regard de l'architecte, sans dicter ses choix. Nos outils accélèrent les tâches répétitives et clarifient les contraintes réglementaires, pour laisser plus de temps à ce qui compte : concevoir.
          </p>
        </div>

        <div className="h-px w-16 bg-primary/30 mx-auto" />

        <div className="pt-4">
          <Link to="/auth">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/95 rounded-none h-14 px-12 text-xs uppercase tracking-widest shadow-gold transition-all duration-300">
              Créer un compte
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
