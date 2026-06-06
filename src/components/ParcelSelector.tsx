import { useState, useCallback, useRef } from "react";
import { MapPin, Search, Loader2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MiniMap } from "@/components/MiniMap";
import { searchAddress, fetchCadastreParcel, searchCadastreByReference } from "@/lib/parcel.api";
import type { ParcelInfo } from "@/lib/mini-archi.types";

export function ParcelSelector({
  value,
  onChange,
}: {
  value: ParcelInfo | null;
  onChange: (p: ParcelInfo | null) => void;
}) {
  const [query, setQuery] = useState(value?.address ?? "");
  const [results, setResults] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [searching, setSearching] = useState(false);
  const [loadingParcel, setLoadingParcel] = useState(false);
  const [mode, setMode] = useState<"address" | "cadastre">("address");
  const [section, setSection] = useState("");
  const [numero, setNumero] = useState("");
  const [commune, setCommune] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); return; }
    setSearching(true);
    const r = await searchAddress(q);
    setResults(r);
    setSearching(false);
  }, []);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  };

  const selectAddress = async (item: { label: string; lat: number; lng: number }) => {
    setResults([]);
    setQuery(item.label);
    setLoadingParcel(true);
    const parcel = await fetchCadastreParcel(item.lat, item.lng);
    onChange({
      address: item.label,
      lat: item.lat,
      lng: item.lng,
      geojson: parcel?.geojson ?? undefined,
      surface: parcel?.surface ?? 1,
      cadastral_ref: parcel?.id ?? undefined,
    });
    setLoadingParcel(false);
  };

  const searchByCadastre = async () => {
    if (!section || !numero || !commune) return;
    setLoadingParcel(true);
    const result = await searchCadastreByReference(section, numero, commune);
    if (result) {
      setQuery(result.address);
      onChange({
        address: result.address,
        lat: 0, // will be computed from geojson
        lng: 0,
        geojson: result.geojson,
        surface: result.surface,
        cadastral_ref: result.id,
      });
    }
    setLoadingParcel(false);
  };

  const lat = value?.lat ?? 0;
  const lng = value?.lng ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => setMode("address")}
          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${mode === "address" ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"}`}
        >
          Adresse
        </button>
        <button
          onClick={() => setMode("cadastre")}
          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${mode === "cadastre" ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"}`}
        >
          Réf. cadastrale
        </button>
      </div>

      {mode === "address" ? (
        <div className="relative">
          <Label>Adresse du terrain</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Ex: 7 rue des Lilas, 69007 Lyon"
              className="pl-9 bg-background"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full border border-border/40 bg-background rounded-md shadow-lg max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => selectAddress(r)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 transition-colors flex items-center gap-2"
                >
                  <MapPin className="h-3 w-3 shrink-0 text-primary" />
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>Section</Label>
            <Input value={section} onChange={(e) => setSection(e.target.value.toUpperCase())} placeholder="AB" className="bg-background mt-1" maxLength={5} />
          </div>
          <div>
            <Label>Numéro</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="85" className="bg-background mt-1" />
          </div>
          <div>
            <Label>Code commune</Label>
            <Input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="82112" className="bg-background mt-1" />
          </div>
          <div className="col-span-3">
            <Button size="sm" variant="outline" onClick={searchByCadastre} disabled={loadingParcel || !section || !numero || !commune} className="mt-2">
              {loadingParcel ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-2" />}
              Chercher la parcelle
            </Button>
          </div>
        </div>
      )}

      {loadingParcel && (
        <div className="flex items-center justify-center h-48 rounded-lg border border-border/40 bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Récupération des données parcelle…
          </div>
        </div>
      )}

      {value && !loadingParcel && (
        <div className="space-y-3">
          <MiniMap lat={lat || 48.8566} lng={lng || 2.3522} geojson={value.geojson} surface={value.surface} />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
            {value.address}
            {value.surface > 0 && (
              <span className="text-primary font-medium">— {value.surface.toLocaleString("fr-FR")} m²</span>
            )}
          </div>

          <Button size="sm" variant="ghost" onClick={() => onChange(null)} className="text-destructive hover:text-destructive h-auto px-0">
            <X className="h-3.5 w-3.5 mr-1" /> Changer de parcelle
          </Button>
        </div>
      )}
    </div>
  );
}
