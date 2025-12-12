// src/components/LocationSection.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Clock,
  Phone,
  Calendar,
  Navigation,
  Wifi,
  Car,
  Music
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LOCAL_ID = import.meta.env.VITE_LOCAL_ID;

// ---- Tipos ----
type HorarioObj = {
  day: string;
  open: string;
  close: string;
};

type SucursalConfig = {
  sucursal_id: string;
  horario_arr: HorarioObj[] | null;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  sucursales: {
    nombre: string;
    direccion: string | null;
    telefono: string | null;
  };
};

// ---- Constantes ----
const DEFAULT_LAT = -2.13526;
const DEFAULT_LNG = -79.58688;
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || "8qwoRiiyVIeRlhhuGQJu";

const dayOrder = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Sabado",
  "Domingo"
];

function sortHorarios(arr: HorarioObj[]) {
  return [...arr].sort(
    (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
  );
}

const telHref = (raw?: string | null) =>
  raw ? `tel:${String(raw).replace(/[^\d+]/g, "")}` : "";

const whatsappHref = (phone?: string | null, local?: string | null) => {
  if (!phone) return "https://wa.me";
  const digits = String(phone).replace(/[^\d]/g, "");
  const msg = `Hola, quiero reservar una mesa en su establecimiento. ¿Tienen disponibilidad?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
};

// ======================================================
//              COMPONENTE PRINCIPAL
// ======================================================
const LocationSection = () => {
  const [rows, setRows] = useState<SucursalConfig[]>([]);
  const [slide, setSlide] = useState(0);

  // ---------------------------------------------
  // Cargar TODAS las configuraciones del LOCAL
  // ---------------------------------------------
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("configuracion")
        .select(`
          sucursal_id,
          horario_arr,
          maps_url,
          lat,
          lng,
          sucursales (
            nombre,
            direccion,
            telefono,
            locales ( id )
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("LocationSection error:", error.message);
        return;
      }

      // Filtrar solo sucursales del LOCAL
      const filtrado = (data as any[])
        .filter((r) => r.sucursales?.locales?.id === LOCAL_ID)
        .map((r) => ({
          sucursal_id: r.sucursal_id,
          horario_arr: r.horario_arr,
          maps_url: r.maps_url,
          lat: r.lat,
          lng: r.lng,
          sucursales: {
            nombre: r.sucursales.nombre,
            direccion: r.sucursales.direccion,
            telefono: r.sucursales.telefono
          }
        }));

      setRows(filtrado);
    })();
  }, []);

  // ---------------------------------------------
  // Carrusel automático cada 5s si hay múltiples
  // ---------------------------------------------
  useEffect(() => {
    if (rows.length <= 1) return;

    const interval = setInterval(() => {
      setSlide((s) => (s + 1) % rows.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [rows.length]);

  if (rows.length === 0) return null;

  const suc = rows[slide];
  const nombre = suc.sucursales.nombre;
  const direccion = suc.sucursales.direccion || "—";
  const telefono = suc.sucursales.telefono || "—";

  const horarios = Array.isArray(suc.horario_arr)
    ? sortHorarios(suc.horario_arr)
    : [];

  const lat = Number(suc.lat ?? DEFAULT_LAT);
  const lng = Number(suc.lng ?? DEFAULT_LNG);

  const mapSrc = `https://api.maptiler.com/maps/streets-v2/?key=${MAPTILER_KEY}#18/${lat}/${lng}`;

  const mapsHref =
    suc.maps_url ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      direccion
    )}`;

  return (
    <section className="py-20 px-4 bg-background" id="ubicacion">
      <div className="container mx-auto max-w-7xl">

        {/* Título */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Nuestras{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Ubicaciones
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Encuentra cualquiera de nuestras sucursales y disfruta la experiencia.
          </p>
        </div>

        {/* Contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* MAPA */}
          <div className="relative">
            <div className="bg-gradient-card rounded-2xl p-8 shadow-elegant border border-amber-500/20">

              <div className="relative rounded-xl overflow-hidden border border-amber-500/10">
                <iframe
                  src={mapSrc}
                  title="Sucursal"
                  className="w-full aspect-video pointer-events-none select-none"
                />
                {/* Marcador */}
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

          {/* INFO */}
          <div className="space-y-6">

            {/* Horarios */}
            <Card className="bg-gradient-card border-amber-500/20 shadow-elegant">
              <CardContent className="p-6">

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    Horarios de Atención
                  </h3>
                </div>

                <div className="py-2 border-b border-border/50 text-foreground">
                  {horarios.length > 0 ? (
                    horarios.map((h, i) => (
                      <p key={i} className="text-sm">
                        {h.day}: {h.open && h.close ? `${h.open} - ${h.close}` : "Cerrado"}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm">—</p>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* Contacto */}
            <Card className="bg-gradient-card border-amber-500/20 shadow-elegant">
              <CardContent className="p-6">

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    Reservas & Contacto
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-foreground font-medium">+{telefono}</p>
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-foreground font-medium">{direccion}</p>
                      <p className="text-sm text-muted-foreground">Dirección</p>
                    </div>
                  </div>

                  <a
                    href={whatsappHref(telefono, nombre)}
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
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Comodidades
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Wifi className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">WiFi Gratis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">Parqueadero</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Music className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">Audio Premium</span>
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
