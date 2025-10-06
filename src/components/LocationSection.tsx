// src/components/LocationSection.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, Phone, Calendar, Navigation, Wifi, Car, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Config = {
  nombre_local?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  horario?: string | null;
  horario_arr?: string[] | null;
  maps_url?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
};

// Helpers
function telHref(raw?: string | null) {
  if (!raw) return "";
  return `tel:${String(raw).replace(/[^\d+]/g, "")}`;
}
function whatsappHref(phone?: string | null, local?: string | null) {
  if (!phone) return "https://wa.me";
  const digits = String(phone).replace(/[^\d]/g, "");
  const msg = `Hola, quiero reservar una mesa en ${local || "el local"}. ¿Tienen disponibilidad?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

// Fallbacks (los de tu captura)
const DEFAULT_LAT = -2.13526;
const DEFAULT_LNG = -79.58688;
// Usa la key del .env si existe; si no, la que nos pasaste
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || "8qwoRiiyVIeRlhhuGQJu";

const LocationSection = () => {
  const [conf, setConf] = useState<Config | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("configuracion")
        .select("nombre_local,direccion,telefono,horario,horario_arr,maps_url,lat,lng")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!alive) return;
      if (!error) setConf((data as any) || null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const nombre = conf?.nombre_local || "ALMIBAR";
  const direccion = conf?.direccion ?? "";
  const telefono = conf?.telefono ?? "";
  const horario = conf?.horario ?? "";
  const hor_arr = conf?.horario_arr;

  const lines: string[] =
  (conf?.horario_arr && conf.horario_arr.length > 0)
    ? conf.horario_arr
    : (conf?.horario
        ? conf.horario.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
        : []);


  // Enlace “Cómo llegar”: usa maps_url de la tabla si existe; si no, genera con la dirección
  const mapsHref =
    conf?.maps_url ||
    (direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}` : "https://maps.google.com");

  // Coords para centrar el mapa
  const lat = typeof conf?.lat === "string" ? parseFloat(conf!.lat as string) : (conf?.lat as number | undefined);
  const lng = typeof conf?.lng === "string" ? parseFloat(conf!.lng as string) : (conf?.lng as number | undefined);
  const mapLat = Number.isFinite(lat) ? (lat as number) : DEFAULT_LAT;
  const mapLng = Number.isFinite(lng) ? (lng as number) : DEFAULT_LNG;

  // Iframe de MapTiler (zoom 18)
  const mapSrc = `https://api.maptiler.com/maps/streets-v2/?key=${MAPTILER_KEY}#18/${mapLat}/${mapLng}`;
  
  return (
    <section className="py-20 px-4 bg-background" id="ubicacion">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Ubicación & <span className="bg-gradient-primary bg-clip-text text-transparent">Horarios</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Nos encontramos en el corazón de la ciudad, fácil acceso y el ambiente perfecto para tu velada
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Mapa + acciones */}
          <div className="relative">
            <div className="bg-gradient-card rounded-2xl p-8 shadow-elegant border border-amber-500/20">
              <div className="relative rounded-xl overflow-hidden border border-amber-500/10">
                <iframe
                  src={mapSrc}
                  title="Ubicación (mapa fijo)"
                  className="w-full aspect-video pointer-events-none select-none"
                  loading="lazy"
                  tabIndex={-1}
                />
                {/* Marcador visual centrado */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="h-4 w-4 rounded-full bg-primary shadow-[0_0_0_6px_hsla(43,96%,56%,0.35)]" />
                </div>
              </div>

              <div className="px-4 pt-5 pb-2 text-center">
                <h3 className="text-xl font-semibold text-foreground">{nombre}</h3>
                <p className="text-sm text-muted-foreground">{direccion}</p>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                  <Button variant="hero" className="w-full">
                    <Navigation className="w-4 h-4" />
                    Cómo llegar
                  </Button>
                </a>
                <a href={telHref(telefono)}>
                  <Button variant="glow" className="w-full">
                    <Phone className="w-4 h-4" />
                    Llamar
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            {/* Horarios */}
            <Card className="bg-gradient-card border-amber-500/20 shadow-elegant">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Horarios de Atención</h3>
                </div>

                {/* 👇 Render de múltiples líneas */}
                <div className="py-2 border-b border-border/50 text-foreground">
                  {(conf?.horario_arr && conf.horario_arr.length > 0
                    ? conf.horario_arr
                    : (conf?.horario
                        ? conf.horario.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
                        : [])
                  ).map((line, i) => (
                    <p key={i} className="text-sm">
                      {line}
                    </p>
                  ))}

                  {/* Si no hay nada, muestra guion */}
                  {(!conf?.horario_arr || conf.horario_arr.length === 0) &&
                  (!conf?.horario || conf.horario.trim() === "") && (
                    <p className="text-sm">—</p>
                  )}
                </div>
              </CardContent>
            </Card>


            {/* Contacto / Reservas */}
            <Card className="bg-gradient-card border-amber-500/20 shadow-elegant">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Reservas & Contacto</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-foreground font-medium">+{telefono || "—"}</p>
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-foreground font-medium">{direccion || "—"}</p>
                      <p className="text-sm text-muted-foreground">Dirección</p>
                    </div>
                  </div>

                  <a
                    href={whatsappHref(conf?.telefono, conf?.nombre_local)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="hero" className="w-full mt-2">
                      Hacer Reservación
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Comodidades */}
            <Card className="bg-gradient-card border-amber-500/20 shadow-elegant">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">Comodidades</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Wifi className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">WiFi Gratis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">Valet Parking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Music className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">Sistema Audio Pro</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">Eventos Privados</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocationSection;
