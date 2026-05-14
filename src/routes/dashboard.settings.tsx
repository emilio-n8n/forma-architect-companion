import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const get = useServerFn(getProfile);
  const upd = useServerFn(updateProfile);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => get() });
  const [agency, setAgency] = useState("");

  useEffect(() => {
    if (profile.data?.agency_name) setAgency(profile.data.agency_name);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => upd({ data: { agency_name: agency } }),
    onSuccess: () => toast.success("Profil enregistré"),
    onError: (e: Error) => toast.error(e.message),
  });

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
          <Input value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="Atelier d'architecture" className="bg-background" />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90">
          {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Enregistrer
        </Button>
      </Card>

      <Card className="p-6 bg-card border-border/40 space-y-2">
        <h2 className="font-display text-xl">Plan</h2>
        <p className="text-sm text-muted-foreground">Studio FORMA · accès illimité aux outils IA.</p>
      </Card>
    </div>
  );
}
