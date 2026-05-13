import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Paramètres</p>
        <h1 className="font-display text-3xl">Compte & studio</h1>
      </div>

      <Card className="p-6 bg-card border-border/40 space-y-4">
        <h2 className="font-display text-xl">Profil</h2>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label>Nom d'agence</Label>
          <Input placeholder="Atelier d'architecture" className="bg-background" />
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Enregistrer</Button>
      </Card>

      <Card className="p-6 bg-card border-border/40 space-y-4">
        <h2 className="font-display text-xl">Intégrations</h2>
        {["Google Drive", "Slack", "Notion", "GitHub"].map((s) => (
          <div key={s} className="flex items-center justify-between border-b border-border/30 pb-3 last:border-0">
            <span className="text-sm">{s}</span>
            <Switch />
          </div>
        ))}
      </Card>

      <Card className="p-6 bg-card border-border/40 space-y-4">
        <h2 className="font-display text-xl">Outils MCP</h2>
        <p className="text-sm text-muted-foreground">Configurez les serveurs MCP pour étendre l'Agent IA.</p>
        <Button variant="outline" className="border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/60">
          Ajouter un serveur MCP
        </Button>
      </Card>
    </div>
  );
}
