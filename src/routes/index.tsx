import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Layers, MessageSquare, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FORMA — Studio IA pour architectes" },
      { name: "description", content: "Render AI, Agent IA spécialisé architecture française, génération de plans et collaboration projet. La plateforme des architectes." },
      { property: "og:title", content: "FORMA — Studio IA pour architectes" },
      { property: "og:description", content: "Render AI, Agent IA et génération de plans pour architectes." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl tracking-wide text-primary">FORMA</Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Fonctionnalités</a>
            <a href="#manifesto" className="hover:text-primary transition-colors">Manifeste</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="hover:bg-primary/15 hover:text-primary">Se connecter</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Commencer
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pt-24 pb-32">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-6">Studio IA · Architecture</p>
          <h1 className="font-display text-6xl md:text-7xl leading-[1.05] mb-8">
            La forme suit <br />
            <span className="text-gradient-gold">l'intelligence.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
            FORMA réunit Render AI photoréaliste, Agent IA spécialisé en architecture française
            et génération de plans dans un seul studio pensé pour la pratique.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-7">
                Ouvrir le studio <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline"
                className="h-12 px-7 border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/60">
                Découvrir
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-border/40">
        <div className="mx-auto max-w-7xl px-6 py-24 grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border/30">
          {[
            { icon: Sparkles, title: "Render AI", desc: "Photoréalisme depuis vos modèles 3D, jour/nuit, météo, styles." },
            { icon: MessageSquare, title: "Agent IA", desc: "PLU, RT/RE2020, BBC, accessibilité — un expert de la réglementation." },
            { icon: Layers, title: "Mini Archi", desc: "Génération de 6 variantes de plans, estimation budget, vue 3D, export STL." },
            { icon: FolderKanban, title: "Projets", desc: "Kanban, calendrier, versions, partage, présentation plein écran." },
          ].map((f) => (
            <div key={f.title} className="bg-background p-10 group hover:bg-card transition-colors">
              <f.icon className="h-6 w-6 text-primary mb-6" />
              <h3 className="font-display text-2xl mb-3 group-hover:text-primary transition-colors">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="manifesto" className="border-t border-border/40">
        <div className="mx-auto max-w-4xl px-6 py-32 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-6">Manifeste</p>
          <p className="font-display text-3xl md:text-4xl leading-snug">
            « L'architecture est l'art savant, correct et magnifique des volumes assemblés sous la lumière. »
          </p>
          <p className="text-sm text-muted-foreground mt-6">— Le Corbusier</p>
          <div className="mt-12">
            <Link to="/auth">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8">
                Rejoindre FORMA
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-10">
        <div className="mx-auto max-w-7xl px-6 flex justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} FORMA</span>
          <span>Studio IA pour architectes</span>
        </div>
      </footer>
    </div>
  );
}
