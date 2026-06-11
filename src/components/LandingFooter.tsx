import { Link } from "@tanstack/react-router";
import { Compass, Lock } from "lucide-react";
import { Logo } from "@/components/Logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/20 py-20 bg-background relative">
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-left mb-16">
        <div className="space-y-4">
          <Logo size={22} className="text-primary" />
          <p className="text-[11px] text-muted-foreground leading-relaxed font-light">
            La plateforme tout-en-un pour les agences d'architecture. Rendu, réglementation et gestion de projets.
          </p>
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-[0.20em] text-primary mb-4">Produits</h4>
          <ul className="space-y-2 text-[11px] text-muted-foreground">
            <li><Link to="/auth" className="hover:text-primary transition-colors">Render AI</Link></li>
            <li><Link to="/auth" className="hover:text-primary transition-colors">Agent IA</Link></li>
            <li><Link to="/auth" className="hover:text-primary transition-colors">Mini Archi</Link></li>
            <li><Link to="/auth" className="hover:text-primary transition-colors">Projets</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-[0.20em] text-primary mb-4">Technologie</h4>
          <ul className="space-y-2 text-[11px] text-muted-foreground">
            <li className="flex items-center gap-1.5">Données chiffrées <Lock className="h-2.5 w-2.5 text-primary/60" /></li>
            <li>Analyse réglementaire par IA</li>
            <li>Rendu 3D temps réel</li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-[0.20em] text-primary mb-4">Contact</h4>
          <p className="text-[11px] text-muted-foreground font-mono">
            bonjour@forma.archi <br />
            Paris, France
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-8 border-t border-border/10 flex flex-col sm:flex-row justify-between items-center text-[10px] text-muted-foreground tracking-wider uppercase">
        <span>© {new Date().getFullYear()} FORMA. Tous droits réservés.</span>
        <span className="flex items-center gap-1.5 mt-4 sm:mt-0">
          Conçu pour les architectes <Compass className="h-3 w-3 text-primary" />
        </span>
      </div>
    </footer>
  );
}
