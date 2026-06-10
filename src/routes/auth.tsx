import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Connexion — FORMA" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard/agent" });
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/dashboard/agent" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard/agent` },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Vérifiez votre email pour confirmer votre compte.");
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard/agent",
    });
    if (result.error) toast.error("Connexion Google impossible");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-card border-r border-border/40">
        <Link to="/"><Logo size={24} className="text-primary" /></Link>
        <div>
          <p className="font-display text-4xl leading-tight max-w-md">
            « <span className="text-gradient-gold">L'espace est le souffle de l'art.</span> »
          </p>
          <p className="text-sm text-muted-foreground mt-4">— Frank Lloyd Wright</p>
        </div>
        <p className="text-xs text-muted-foreground">Studio IA pour architectes</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl mb-2">Bienvenue</h1>
          <p className="text-sm text-muted-foreground mb-8">Accédez à votre studio FORMA.</p>

          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full bg-muted">
              <TabsTrigger value="signin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Connexion</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe</Label>
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Se connecter
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe</Label>
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Créer un compte
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" onClick={handleGoogle}
            className="w-full border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/60">
            Continuer avec Google
          </Button>
        </div>
      </div>
    </div>
  );
}
