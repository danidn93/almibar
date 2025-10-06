// src/components/HeroSection.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Config = {
  nombre_local?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  horario?: string | null;
  hero_bg_url?: string | null;
  horario_arr?: string[] | null;
};

// Link de WhatsApp con mensaje
function whatsappHref(phone?: string | null, local?: string | null) {
  if (!phone) return "https://wa.me";
  const digits = String(phone).replace(/[^\d]/g, ""); // deja solo números
  const msg = `Hola, quiero reservar una mesa en ${local || "el local"}. ¿Tienen disponibilidad?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}
function numeroformat(phone?: string | null){
    if (!phone) return 
}

const HeroSection = () => {
  const [conf, setConf] = useState<Config | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("configuracion")
        .select("nombre_local,direccion,telefono,horario,horario_arr,hero_bg_url")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setConf((data as any) || null);
    })();
  }, []);

  const nombre = (conf?.nombre_local || "ALMIBAR").toUpperCase();
  const dir = conf?.direccion || "Av. Principal 123, Centro Histórico";
  const tel = conf?.telefono || "+1 (555) 123-4567";
  const hor = conf?.horario || "Mar-Dom 6:00 PM - 2:00 AM";
  const bg = conf?.hero_bg_url || "/assets/hero-bar.jpg";
  const hor_arr = conf?.horario_arr;

  const lines: string[] =
  (conf?.horario_arr && conf.horario_arr.length > 0)
    ? conf.horario_arr
    : (conf?.horario
        ? conf.horario.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
        : []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 vignette hero-gold-tint">
        <img
          src={bg}
          alt={`Interior moderno de ${nombre} con iluminación ámbar`}
          className="w-full h-full object-cover md:object-[65%_50%] lg:object-[70%_50%]"
        />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 hero-gold-tint" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent animate-pulse">
          {nombre}
        </h1>
        <p className="text-xl md:text-2xl text-foreground/90 mb-8 max-w-2xl mx-auto">
          Bar • Restaurante • Karaoke
        </p>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          Vive la experiencia perfecta donde la gastronomía se encuentra con el entretenimiento en un ambiente sofisticado y acogedor
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a href="#menu">
            <Button variant="hero" size="xl">Ver Carta</Button>
          </a>
          <a href={whatsappHref(conf?.telefono, conf?.nombre_local)} target="_blank" rel="noopener noreferrer">
            <Button variant="glow" size="xl">Reservar Mesa</Button>
          </a>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">
          <div className="bg-card/20 backdrop-blur-md rounded-lg p-6 border border-amber-500/20">
            <MapPin className="w-6 h-6 text-primary mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">Ubicación</p>
            <p className="text-xs text-muted-foreground">{dir}</p>
          </div>
          
          <div className="bg-card/20 backdrop-blur-md rounded-lg p-6 border border-amber-500/20">
            <Clock className="w-6 h-6 text-primary mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground text-center">Horarios</p>

            <div className="mt-2 space-y-1">
              {lines.length > 0 ? (
                lines.map((l, i) => (
                  <p key={i} className="text-xs text-muted-foreground text-center">
                    {l}
                  </p>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center">—</p>
              )}
            </div>
          </div>

          <div className="bg-card/20 backdrop-blur-md rounded-lg p-6 border border-amber-500/20">
            <Phone className="w-6 h-6 text-primary mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">Reservas</p>
            <p className="text-xs text-muted-foreground">+{tel}</p>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex justify-center">
          <div className="w-1 h-3 bg-primary rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
