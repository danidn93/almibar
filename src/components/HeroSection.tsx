// src/components/HeroSection.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LOCAL_ID = import.meta.env.VITE_LOCAL_ID;

interface HorarioObj {
  day: string;
  open: string | null;
  close: string | null;
}

interface Slide {
  id: string;
  nombre_local: string;
  direccion: string;
  telefono: string;
  hero_bg_url: string;
  logo_url: string | null;
  horario_arr: HorarioObj[];
}

const dayOrder: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  domingo: 7,
};

const HeroSection = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);

  // --------------------------------------------------------------------
  // Fetch de TODAS las configuraciones del local + sucursales
  // --------------------------------------------------------------------
  useEffect(() => {
    if (!LOCAL_ID) return;

    (async () => {
      const { data, error } = await supabase
        .from("configuracion")
        .select(`
          id,
          hero_bg_url,
          logo_url,
          horario_arr,
          sucursales (
            direccion,
            telefono,
            local_id,
            locales ( nombre )
          )
        `)
        .eq("sucursales.local_id", LOCAL_ID);

      if (error) {
        console.error("Error consultando configuración:", error);
        return;
      }

      const processed: Slide[] = (data || []).map((c: any) => {
        const suc = c.sucursales;
        const localName = suc?.locales?.nombre || "ALMIBAR";

        const direccion = suc?.direccion || "Dirección no disponible";
        const telefono = suc?.telefono || "";

        const horarioArr = Array.isArray(c.horario_arr)
          ? c.horario_arr
              .map((h: any) => {
                if (!h || typeof h !== "object") return null;
                if (!("day" in h)) return null;
                return {
                  day: h.day,
                  open: h.open || null,
                  close: h.close || null,
                };
              })
              .filter(Boolean)
              .sort((a: any, b: any) => {
                const da = dayOrder[a.day.toLowerCase()] ?? 99;
                const db = dayOrder[b.day.toLowerCase()] ?? 99;
                return da - db;
              })
          : [];

        return {
          id: c.id,
          nombre_local: localName,
          direccion,
          telefono,
          hero_bg_url: c.hero_bg_url || "/assets/hero-bar.jpg",
          logo_url: c.logo_url || null,
          horario_arr: horarioArr,
        };
      });

      setSlides(processed);
    })();
  }, []);

  // --------------------------------------------------------------------
  // Carrusel automático cada 5 segundos si hay más de una sucursal
  // --------------------------------------------------------------------
  useEffect(() => {
    if (slides.length <= 1) return;
    const i = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(i);
  }, [slides]);

  if (!slides.length) return null;

  const current = slides[index];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={current.hero_bg_url}
          className="w-full h-full object-cover"
          alt="Fondo hero"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">

        {/* LOGO SUPERIOR */}
        {current.logo_url && (
          <img
            src={current.logo_url}
            className="h-28 mx-auto mb-6 drop-shadow-lg"
            alt="Logo del local"
          />
        )}

        <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
          {current.nombre_local.toUpperCase()}
        </h1>

        <p className="text-xl md:text-2xl text-white/90 mb-8">
          Bar • Karaoke
        </p>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <a href="#menu">
            <Button variant="hero" size="xl">
              Ver Carta
            </Button>
          </a>

          <a
            href={`https://wa.me/${String(current.telefono || "")
              .replace(/[^\d]/g, "")}?text=${encodeURIComponent(
              `Hola, quiero reservar una mesa en su establecimiento. ¿Tienen disponibilidad?`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="glow" size="xl">
              Reservar Mesa
            </Button>
          </a>
        </div>

        {/* INFO CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-white">

          {/* Dirección */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <MapPin className="w-6 h-6 text-primary mx-auto mb-3" />
            <p className="text-sm font-semibold">Ubicación</p>
            <p className="text-xs opacity-80">{current.direccion}</p>
          </div>

          {/* Horarios */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <Clock className="w-6 h-6 text-primary mx-auto mb-3" />
            <p className="text-sm font-semibold">Horarios</p>

            <div className="text-xs mt-2 space-y-1 opacity-80">
              {current.horario_arr.length ? (
                current.horario_arr.map((h, i) => (
                  <p key={i}>
                    {h.day}:{" "}
                    {h.open && h.close ? `${h.open} - ${h.close}` : "Cerrado"}
                  </p>
                ))
              ) : (
                <p>Cerrado</p>
              )}
            </div>
          </div>

          {/* Teléfono */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <Phone className="w-6 h-6 text-primary mx-auto mb-3" />
            <p className="text-sm font-semibold">Reservas</p>
            <p className="text-xs opacity-80">{current.telefono || "No disponible"}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
