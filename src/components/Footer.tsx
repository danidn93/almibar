// src/components/Footer.tsx
import { useEffect, useState } from "react";
import { Instagram, Facebook, MapPin, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Config = {
  nombre_local?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
};

const Footer = () => {
  const [conf, setConf] = useState<Config | null>(null);
  const [hasEventos, setHasEventos] = useState(false);

  // Modales
  const [openTerminos, setOpenTerminos] = useState(false);
  const [openPrivacidad, setOpenPrivacidad] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: cfg }, { data: evs }] = await Promise.all([
        supabase.from("configuracion").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("eventos").select("id").gte("fecha", new Date().toISOString()).limit(1),
      ]);
      setConf((cfg as any) || null);
      setHasEventos(!!evs && evs.length > 0);
    })();
  }, []);

  const nombre = conf?.nombre_local || "ALMIBAR";

  return (
    <>
      <footer className="bg-secondary/80 backdrop-blur-sm border-t border-amber-500/20">
        <div className="container mx-auto max-w-7xl px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                {nombre}
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
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{conf?.direccion || "Av. Principal 123, Centro Histórico"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{conf?.telefono || "+52 (55) 1234-5678"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{conf?.correo || "reservas@almibar.mx"}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom */}
          <div className="border-t border-amber-500/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {nombre}. Todos los derechos reservados.
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

      {/* Modal: Términos */}
      <Dialog open={openTerminos} onOpenChange={setOpenTerminos}>
      {/* Añade 'max-h-[80vh] overflow-y-auto' para controlar la altura y el scroll */}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Términos y Condiciones</DialogTitle>
          <DialogDescription>Última actualización: {new Date().toLocaleDateString()}</DialogDescription>
        </DialogHeader>
        {/* Aquí el contenido de tus términos y condiciones */}
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              **Última actualización:** [FECHA ACTUAL]
              <br />
              <br />
              ### 1. Aceptación de los Términos
              <br />
              Bienvenido a [NOMBRE_LOCAL]. Al acceder y utilizar nuestro sitio web, aplicaciones, y servicios ("Servicios"), usted acepta y se compromete a cumplir estos Términos y Condiciones. Si no está de acuerdo, le rogamos que no utilice nuestros Servicios.
              <br />
              <br />
              ### 2. Uso del Sitio y Servicios
              <br />
              * **Acceso:** Nuestro sitio web está destinado a personas mayores de edad. Si usted es menor, debe utilizar nuestros servicios bajo la supervisión de un adulto.
              * **Contenido:** Todo el contenido del sitio (texto, imágenes, videos) es propiedad de [NOMBRE_LOCAL] o de sus respectivos dueños. No se permite el uso o la reproducción sin nuestro consentimiento expreso.
              * **Reservaciones:** Las reservaciones están sujetas a la disponibilidad y a las políticas específicas de [NOMBRE_LOCAL], que pueden incluir requisitos de consumo mínimo o límites de tiempo.
              <br />
              <br />
              ### 3. Responsabilidad del Usuario
              <br />
              Usted se compromete a no utilizar el sitio de manera ilegal, ni para fines maliciosos o que puedan dañar, inhabilitar o sobrecargar el sitio o a terceros. El uso de nuestros Servicios es bajo su propio riesgo.
              <br />
              <br />
              ### 4. Limitación de Responsabilidad
              <br />
              [NOMBRE_LOCAL] no se hace responsable por daños directos, indirectos, incidentales o consecuenciales derivados del uso o la imposibilidad de usar nuestros Servicios. Esto incluye, pero no se limita a, errores, omisiones, interrupciones o cualquier tipo de falla en el sitio web.
              <br />
              <br />
              ### 5. Propiedad Intelectual
              <br />
              Las marcas, logotipos y nombres de servicio de [NOMBRE_LOCAL] son propiedad de [NOMBRE_LOCAL]. No se permite su uso sin una autorización previa por escrito.
              <br />
              <br />
              ### 6. Modificaciones a los Términos
              <br />
              Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios entrarán en vigor tan pronto como se publiquen en el sitio. Se recomienda revisar esta página periódicamente para estar al tanto de las actualizaciones.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Privacidad */}
      <Dialog open={openPrivacidad} onOpenChange={setOpenPrivacidad}>
        {/* Añade 'max-h-[80vh] overflow-y-auto' para controlar la altura y el scroll */}
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Política de Privacidad</DialogTitle>
            <DialogDescription>Última actualización: {new Date().toLocaleDateString()}</DialogDescription>
          </DialogHeader>
          {/* Aquí el contenido de tu política de privacidad */}
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              **Última actualización:** [FECHA ACTUAL]
              <br />
              <br />
              ### 1. Información que Recopilamos
              <br />
              [NOMBRE_LOCAL] se compromete a proteger su privacidad. Recopilamos la siguiente información cuando interactúa con nuestros Servicios:
              <br />
              * **Información de contacto:** Nombre, dirección de correo electrónico, y número de teléfono que usted nos proporciona al hacer una reserva o suscribirse a nuestro boletín.
              * **Datos de uso:** Información técnica sobre cómo utiliza nuestro sitio web, como su dirección IP, tipo de navegador, sistema operativo y las páginas que visita. Estos datos son anónimos y se utilizan para mejorar la experiencia del usuario.
              <br />
              <br />
              ### 2. Cómo Usamos la Información
              <br />
              Utilizamos la información recopilada para:
              <br />
              * Gestionar y confirmar sus reservaciones.
              * Mejorar la funcionalidad y el contenido de nuestro sitio web.
              * Comunicarnos con usted sobre promociones, eventos o cambios en nuestros servicios, si ha dado su consentimiento.
              * Cumplir con nuestras obligaciones legales y proteger nuestros derechos.
              <br />
              <br />
              ### 3. Compartir Información con Terceros
              <br />
              No vendemos, alquilamos ni compartimos su información personal con terceros, salvo en los siguientes casos:
              <br />
              * **Proveedores de servicios:** Podemos compartir información con socios que nos ayudan a operar el sitio web (por ejemplo, servicios de hosting). Estos socios están obligados a mantener la confidencialidad de su información.
              * **Requerimientos legales:** Si la ley lo exige, o en respuesta a una orden judicial o de una autoridad gubernamental.
              <br />
              <br />
              ### 4. Seguridad de los Datos
              <br />
              Implementamos medidas de seguridad administrativas, técnicas y físicas para proteger su información personal contra el acceso no autorizado, la pérdida o la alteración. Sin embargo, ninguna transmisión por internet es 100% segura, por lo que no podemos garantizar una seguridad absoluta.
              <br />
              <br />
              ### 5. Sus Derechos
              <br />
              Usted tiene derecho a:
              <br />
              * **Acceder** a la información que tenemos sobre usted.
              * **Rectificar** cualquier dato inexacto.
              * **Solicitar la eliminación** de su información.
              * **Revocar su consentimiento** para el procesamiento de sus datos en cualquier momento.
              <br />
              Para ejercer estos derechos, por favor, contáctenos a través de [CORREO_DE_CONTACTO].
              <br />
              <br />
              ### 6. Contacto
              <br />
              Si tiene preguntas sobre esta política, por favor, contáctenos a través de [CORREO_DE_CONTACTO].
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Footer;