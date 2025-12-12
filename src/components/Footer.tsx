// src/components/Footer.tsx
import { useEffect, useState } from "react";
import { Instagram, Facebook, MapPin, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const LOCAL_ID = import.meta.env.VITE_LOCAL_ID;

type SucursalInfo = {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
};

const Footer = () => {
  const [sucursales, setSucursales] = useState<SucursalInfo[]>([]);
  const [correoLocal, setCorreoLocal] = useState<string | null>(null);
  const [hasEventos, setHasEventos] = useState(false);

  const [openTerminos, setOpenTerminos] = useState(false);
  const [openPrivacidad, setOpenPrivacidad] = useState(false);

  useEffect(() => {
    (async () => {
      // 1) Obtener TODAS las configuraciones del local
      const { data: cfg, error: cfgError } = await supabase
        .from("configuracion")
        .select(`
          sucursales (
            id,
            nombre,
            direccion,
            telefono,
            local_id
          )
        `)
        .order("updated_at", { ascending: false });

      if (!cfgError && cfg) {
        const filtradas = cfg
          .map((row: any) => row.sucursales)
          .filter((s: any) => s && s.local_id === LOCAL_ID)
          .map((s: any) => ({
            id: s.id,
            nombre: s.nombre,
            direccion: s.direccion,
            telefono: s.telefono,
          }));

        setSucursales(filtradas);
      }

      // 2) EVENTOS futuros
      const { data: evs } = await supabase
        .from("eventos")
        .select("id")
        .gte("fecha", new Date().toISOString())
        .limit(1);

      setHasEventos(!!evs && evs.length > 0);

      // 3) Si deseas correo general del local, puedes obtenerlo de aquí si lo guardas
      setCorreoLocal("reservas@almibar.mx");
    })();
  }, []);

  const nombreLocal = "ALMIBAR";

  return (
    <>
      <footer className="bg-secondary/80 backdrop-blur-sm border-t border-amber-500/20">
        <div className="container mx-auto max-w-7xl px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                {nombreLocal}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Más que un bar-restaurante, somos el lugar donde nacen las mejores historias. 
                Ven y vive una experiencia única que combina gastronomía, música y diversión.
              </p>

              {/* Social */}
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center hover:bg-primary/30 transition-colors">
                  <Instagram className="w-5 h-5 text-primary" />
                </a>
                <a href="#" className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center hover:bg-primary/30 transition-colors">
                  <Facebook className="w-5 h-5 text-primary" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Enlaces Rápidos</h4>
              <ul className="space-y-2">
                <li><a href="#menu" className="text-muted-foreground hover:text-primary transition-colors">Nuestra Carta</a></li>
                {hasEventos && (
                  <li><a href="#eventos" className="text-muted-foreground hover:text-primary transition-colors">Eventos</a></li>
                )}
                <li><a href="#reservas" className="text-muted-foreground hover:text-primary transition-colors">Reservaciones</a></li>
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Contacto</h4>

              {/* MOSTRAR TODAS LAS SUCURSALES */}
              {sucursales.length > 0 ? (
                <div className="space-y-6">
                  {sucursales.map((s) => (
                    <div key={s.id} className="space-y-2 border-b border-border/20 pb-4">
                      <p className="font-semibold text-primary">{s.nombre}</p>

                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {s.direccion || "Dirección no disponible"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {s.telefono || "Teléfono no disponible"}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* correo general del local */}
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {correoLocal}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Cargando sucursales...</p>
              )}
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-amber-500/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {nombreLocal}. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <button onClick={() => setOpenTerminos(true)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Términos y Condiciones
              </button>
              <button onClick={() => setOpenPrivacidad(true)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Política de Privacidad
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Diálogos (no tocados) */}
      <Dialog open={openTerminos} onOpenChange={setOpenTerminos}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Términos y Condiciones</DialogTitle>
            <DialogDescription>Última actualización: {new Date().toLocaleDateString()}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={openPrivacidad} onOpenChange={setOpenPrivacidad}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Política de Privacidad</DialogTitle>
            <DialogDescription>Última actualización: {new Date().toLocaleDateString()}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Footer;
