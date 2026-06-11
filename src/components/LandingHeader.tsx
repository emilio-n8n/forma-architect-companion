import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b border-border/20 bg-background/70 transition-all duration-300">
      <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <Logo variant="full" size={28} className="text-primary transition-transform duration-500 group-hover:scale-105" />
        </Link>

        <nav className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors relative py-1 group">
            Fonctionnalités
            <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
          </a>
          <a href="#studio" className="hover:text-primary transition-colors relative py-1 group">
            Studio
            <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
          </a>
          <a href="#manifesto" className="hover:text-primary transition-colors relative py-1 group">
            Notre vision
            <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/auth">
            <Button variant="ghost" className="text-xs uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all duration-300">
              Connexion
            </Button>
          </Link>
          <Link to="/auth">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none border border-primary/20 text-xs uppercase tracking-widest px-6 h-11 shadow-gold">
              S'inscrire
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
