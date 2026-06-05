import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Check, Loader2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveOnboarding, getOnboarding } from "@/lib/onboarding.functions";
import { useServerFn } from "@tanstack/react-start";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { OnboardingData, OnboardingLevel } from "@/lib/onboarding.types";

export const Route = createFileRoute("/dashboard/onboarding")({
  component: OnboardingPage,
});

const SOFTWARE_OPTIONS = [
  "Revit", "ArchiCAD", "AutoCAD", "SketchUp", "3ds Max", "Rhino",
  "Grasshopper", "Lumion", "Twinmotion", "Allplan", "Vectorworks", "FreeCAD",
  "Civil 3D", "Navisworks", "Solibri", "DALI", "ArchiWizard", "Autre",
];

const SPECIALTIES = [
  "Résidentiel", "Commercial", "Industriel", "Rénovation", "Extension",
  "Urbain", "Paysage", "Intérieur", "Patrimoine", "Bureau d'études",
  "Promotion immobilière", "Bâtiments publics",
];

function OnboardingPage() {
  const navigate = useNavigate();
  const save = useServerFn(saveOnboarding);
  const load = useServerFn(getOnboarding);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState<"full" | "quick" | null>(null);

  const [data, setData] = useState<OnboardingData>({
    first_name: "", last_name: "", role: "", phone: "",
    agency_name: "", agency_address: "", agency_website: "",
    agency_size: "", agency_year: "",
    email_signature: "", politeness_formula: "Bien cordialement",
    comm_style: "formel", email_example: "",
    specialties: [],
    work_hours: "", preferred_days: "", response_time: "", urgency_handling: "",
    software: [], references: "", approach: "",
  });

  const [quickData, setQuickData] = useState({
    agency_name: "",
    specialty: "",
    politeness_formula: "Bien cordialement",
    comm_style: "formel" as "formel" | "direct" | "amical",
  });

  useEffect(() => {
    load().then((existing) => {
      if (existing) {
        navigate({ to: "/dashboard/agent" });
      }
    }).catch(() => {});
  }, []);

  if (!showPicker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full p-8">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full gold-gradient mb-2">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl">Bienvenue dans FORMA Studio</h1>
            <p className="text-sm text-muted-foreground">
              Pour que FORMA Agent vous connaisse vraiment comme un collègue, 
              personnalisons votre expérience. Cela peut prendre quelques minutes,
              mais ensuite l'IA sera parfaitement adaptée à votre façon de travailler.
            </p>

            <div className="grid gap-4 mt-6">
              <button
                onClick={() => setShowPicker("full")}
                className="text-left p-5 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium mb-1 group-hover:text-primary transition-colors">
                      Personnalisation complète
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      ~5 minutes. Questionnaire détaillé : informations personnelles, 
                      templates email, spécialités, habitudes, logiciels. 
                      FORMA Agent vous connaîtra comme un vrai collègue.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowPicker("quick")}
                className="text-left p-5 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium mb-1 group-hover:text-primary transition-colors">
                      Configuration rapide
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      ~1 minute. Nom de l'agence, spécialité, et style de communication.
                      Le strict nécessaire pour commencer.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const level: OnboardingLevel = showPicker;

  const quickSteps = [
    {
      title: "Votre agence",
      render: () => (
        <div className="space-y-4">
          <h2 className="font-display text-xl">Votre agence</h2>
          <p className="text-sm text-muted-foreground">Commençons par les bases.</p>
          <div>
            <Label>Nom de l'agence</Label>
            <Input value={quickData.agency_name} onChange={(e) => setQuickData({ ...quickData, agency_name: e.target.value })}
              placeholder="Ex: Atelier Dubois" className="mt-1" />
          </div>
          <div>
            <Label>Spécialité principale</Label>
            <Select value={quickData.specialty} onValueChange={(v) => setQuickData({ ...quickData, specialty: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      title: "Communication",
      render: () => (
        <div className="space-y-4">
          <h2 className="font-display text-xl">Style de communication</h2>
          <p className="text-sm text-muted-foreground">Comment FORMA Agent doit-il rédiger vos emails ?</p>
          <div>
            <Label>Formule de politesse préférée</Label>
            <Input value={quickData.politeness_formula} onChange={(e) => setQuickData({ ...quickData, politeness_formula: e.target.value })}
              placeholder="Bien cordialement" className="mt-1" />
          </div>
          <div>
            <Label>Style</Label>
            <Select value={quickData.comm_style} onValueChange={(v: "formel" | "direct" | "amical") => setQuickData({ ...quickData, comm_style: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="formel">Formel</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="amical">Amical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
  ];

  const fullSteps = [
    {
      title: "Qui êtes-vous ?",
      render: () => (
        <div className="space-y-4">
          <h2 className="font-display text-xl">Qui êtes-vous ?</h2>
          <p className="text-sm text-muted-foreground">Pour que FORMA Agent vous connaisse comme un vrai collègue.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Prénom</Label><Input value={data.first_name} onChange={(e) => setData({ ...data, first_name: e.target.value })} placeholder="Jean" className="mt-1" /></div>
            <div><Label>Nom</Label><Input value={data.last_name} onChange={(e) => setData({ ...data, last_name: e.target.value })} placeholder="Dupont" className="mt-1" /></div>
          </div>
          <div><Label>Fonction</Label><Input value={data.role} onChange={(e) => setData({ ...data, role: e.target.value })} placeholder="Architecte associé" className="mt-1" /></div>
          <div><Label>Téléphone</Label><Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="06 12 34 56 78" className="mt-1" /></div>
        </div>
      ),
    },
    {
      title: "Votre agence",
      render: () => (
        <div className="space-y-4">
          <h2 className="font-display text-xl">Votre agence</h2>
          <div><Label>Nom de l'agence</Label><Input value={data.agency_name} onChange={(e) => setData({ ...data, agency_name: e.target.value })} placeholder="Atelier Dubois" className="mt-1" /></div>
          <div><Label>Adresse</Label><Input value={data.agency_address} onChange={(e) => setData({ ...data, agency_address: e.target.value })} placeholder="7 rue des Lilas, 69007 Lyon" className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Site web</Label><Input value={data.agency_website} onChange={(e) => setData({ ...data, agency_website: e.target.value })} placeholder="https://" className="mt-1" /></div>
            <div><Label>Effectif</Label><Input value={data.agency_size} onChange={(e) => setData({ ...data, agency_size: e.target.value })} placeholder="5 personnes" className="mt-1" /></div>
          </div>
          <div><Label>Année de création</Label><Input value={data.agency_year} onChange={(e) => setData({ ...data, agency_year: e.target.value })} placeholder="2015" className="mt-1" /></div>
        </div>
      ),
    },
    {
      title: "Templates email",
      render: () => (
        <div className="space-y-4">
          <h2 className="font-display text-xl">Templates email</h2>
          <p className="text-sm text-muted-foreground">FORMA Agent peut rédiger vos emails professionnels. Donnez-lui vos habitudes.</p>
          <div><Label>Formule de politesse préférée</Label><Input value={data.politeness_formula} onChange={(e) => setData({ ...data, politeness_formula: e.target.value })} placeholder="Bien cordialement" className="mt-1" /></div>
          <div><Label>Signature email</Label><Textarea value={data.email_signature} onChange={(e) => setData({ ...data, email_signature: e.target.value })} placeholder="Jean Dupont\nArchitecte DPLG\nAtelier Dubois\nTél: 06 12 34 56 78" className="mt-1 h-24" /></div>
          <div>
            <Label>Style de communication</Label>
            <Select value={data.comm_style} onValueChange={(v: "formel" | "direct" | "amical") => setData({ ...data, comm_style: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="formel">Formel — "Nous vous prions d'agréer..."</SelectItem>
                <SelectItem value="direct">Direct — "Pour faire suite à notre échange..."</SelectItem>
                <SelectItem value="amical">Amical — "Bonjour X, comme convenu..."</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Exemple d'email type (optionnel)</Label><Textarea value={data.email_example} onChange={(e) => setData({ ...data, email_example: e.target.value })} placeholder="Collez un exemple d'email que vous envoyez typiquement..." className="mt-1 h-20" /></div>
        </div>
      ),
    },
    {
      title: "Spécialités",
      render: () => (
        <div className="space-y-4">
          <h2 className="font-display text-xl">Spécialités</h2>
          <p className="text-sm text-muted-foreground">Dans quels domaines travaillez-vous ?</p>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALTIES.map((s) => (
              <label key={s} className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/5 cursor-pointer text-sm">
                <Checkbox checked={data.specialties.includes(s)} onCheckedChange={() => {
                  setData({
                    ...data,
                    specialties: data.specialties.includes(s)
                      ? data.specialties.filter((x) => x !== s)
                      : [...data.specialties, s],
                  });
                }} />
                {s}
              </label>
            ))}
          </div>
          <div className="mt-4">
            <Label>Approche architecturale</Label>
            <Select value={data.approach} onValueChange={(v) => setData({ ...data, approach: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Décrivez votre approche..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Fonctionnelle">Fonctionnelle — la forme suit la fonction</SelectItem>
                <SelectItem value="Bioclimatique">Bioclimatique — performance environnementale</SelectItem>
                <SelectItem value="Esthétique">Esthétique — l'architecture comme art</SelectItem>
                <SelectItem value="Contextuelle">Contextuelle — intégration au site</SelectItem>
                <SelectItem value="Technique">Technique — innovation constructive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      title: "Logiciels & références",
      render: () => (
        <div className="space-y-4">
          <h2 className="font-display text-xl">Logiciels & références</h2>
          <div><Label>Logiciels maîtrisés</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {SOFTWARE_OPTIONS.map((sw) => (
                <label key={sw} className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/5 cursor-pointer text-sm">
                  <Checkbox checked={data.software.includes(sw)} onCheckedChange={() => {
                    setData({
                      ...data,
                      software: data.software.includes(sw)
                        ? data.software.filter((x) => x !== sw)
                        : [...data.software, sw],
                    });
                  }} />
                  {sw}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <Label>Références architecturales</Label>
            <Textarea value={data.references} onChange={(e) => setData({ ...data, references: e.target.value })}
              placeholder="Architectes ou projets qui vous inspirent..." className="mt-1 h-20" />
          </div>
        </div>
      ),
    },
    {
      title: "Habitudes",
      render: () => (
        <div className="space-y-4">
          <h2 className="font-display text-xl">Habitudes de travail</h2>
          <p className="text-sm text-muted-foreground">Pour que FORMA Agent s'adapte à votre rythme.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Horaires de travail</Label><Input value={data.work_hours} onChange={(e) => setData({ ...data, work_hours: e.target.value })} placeholder="9h-18h" className="mt-1" /></div>
            <div><Label>Délai de réponse souhaité</Label><Input value={data.response_time} onChange={(e) => setData({ ...data, response_time: e.target.value })} placeholder="24h" className="mt-1" /></div>
          </div>
          <div><Label>Jours préférés</Label><Input value={data.preferred_days} onChange={(e) => setData({ ...data, preferred_days: e.target.value })} placeholder="Lundi au vendredi" className="mt-1" /></div>
          <div><Label>Gestion des urgences</Label><Textarea value={data.urgency_handling} onChange={(e) => setData({ ...data, urgency_handling: e.target.value })} placeholder="Comment gérez-vous les situations urgentes ?" className="mt-1 h-20" /></div>
        </div>
      ),
    },
  ];

  const steps = level === "quick" ? quickSteps : fullSteps;
  const currentStep = steps[step];

  const canContinue = level === "quick"
    ? (step === 0 ? quickData.agency_name.length > 0 : true)
    : true;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (level === "quick") {
        await save({ data: {
          level: "quick",
          data: {
            agency_name: quickData.agency_name,
            politeness_formula: quickData.politeness_formula,
            comm_style: quickData.comm_style,
            specialties: quickData.specialty ? [quickData.specialty] : [],
            software: [],
          },
        }});
      } else {
        await save({ data: { level: "full", data } });
      }
      toast.success("Configuration terminée !");
      navigate({ to: "/dashboard/agent" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-xl w-full p-8">
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-8">
          {steps.map((s, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-border"
            }`} />
          ))}
        </div>

        {currentStep.render()}

        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border/40">
          <Button variant="ghost" size="sm" onClick={() => step === 0 ? setShowPicker(null) : setStep(step - 1)}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour
          </Button>

          {step < steps.length - 1 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canContinue}>
              Suivant <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Terminer
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
