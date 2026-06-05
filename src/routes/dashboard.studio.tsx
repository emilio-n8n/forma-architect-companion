import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Users, Mail, UserPlus, Trash2, Shield, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { ensureStudio, getStudioMembers, inviteToStudio, removeMember, updateStudioName } from "@/lib/studio.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/studio")({
  component: StudioPage,
});

function StudioPage() {
  const ensure = useServerFn(ensureStudio);
  const getMembers = useServerFn(getStudioMembers);
  const invite = useServerFn(inviteToStudio);
  const remove = useServerFn(removeMember);
  const rename = useServerFn(updateStudioName);

  const [studioId, setStudioId] = useState<string | null>(null);
  const [studioName, setStudioName] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [userId, setUserId] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { studioId: sid, name } = await ensure();
      setStudioId(sid);
      setStudioName(name);

      const m = await getMembers({ data: { studioId: sid } });
      setMembers(m as any[]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!studioId || !inviteEmail) return;
    setInviting(true);
    try {
      await invite({ data: { studioId, email: inviteEmail } });
      toast.success("Invitation envoyée !");
      setInviteEmail("");
      setShowInvite(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!studioId) return;
    try {
      await remove({ data: { studioId, memberId } });
      toast.success("Membre retiré");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRename = async () => {
    if (!studioId || !studioName.trim()) return;
    setRenaming(true);
    try {
      await rename({ data: { studioId, name: studioName } });
      toast.success("Nom modifié");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRenaming(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto flex items-center justify-center min-h-48">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-1">Studio</p>
        <h1 className="font-display text-3xl">Mon agence</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez votre équipe et les membres du studio.</p>
      </div>

      {/* Studio name */}
      <Card className="p-6 mb-6">
        <Label>Nom du studio</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input value={studioName} onChange={(e) => setStudioName(e.target.value)} className="flex-1" />
          <Button size="sm" variant="outline" onClick={handleRename} disabled={renaming}>
            {renaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </Card>

      {/* Members */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium">Membres ({members.length})</h2>
          </div>
          <Dialog open={showInvite} onOpenChange={setShowInvite}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Inviter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un membre</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Email du collaborateur</Label>
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="collaborateur@exemple.com" className="mt-1" />
                </div>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="w-full">
                  {inviting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Mail className="h-3.5 w-3.5 mr-1" />}
                  Envoyer l'invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {members.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {(m.profiles as any)?.agency_name?.[0] ?? (m.profiles as any)?.email?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-medium">{(m.profiles as any)?.agency_name ?? (m.profiles as any)?.email ?? "Inconnu"}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.role === "admin" ? "Admin" : "Membre"} · {new Date(m.joined_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.role === "admin" && <Shield className="h-3.5 w-3.5 text-primary" />}
                {m.role !== "admin" && m.user_id !== userId && (
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(m.id)} className="text-destructive hover:text-destructive h-8 w-8 p-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
