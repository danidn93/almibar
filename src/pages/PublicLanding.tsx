import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import HeroSection from "@/components/HeroSection";
import MenuSection from "@/components/MenuSection";
import LocationSection from "@/components/LocationSection";
import Footer from "@/components/Footer";
import Events from "@/components/EventsSection";

const Index = () => {
  const [showEvents, setShowEvents] = useState(false);

  useEffect(() => {
    (async () => {
      // Si quieres mostrar también eventos pasados, quita el .gte('fecha', nowIso)
      const nowIso = new Date().toISOString();
      const { count, error } = await supabase
        .from("eventos")
        .select("id", { count: "exact", head: true })
        .gte("fecha", nowIso);

      if (!error) setShowEvents((count ?? 0) > 0);
      else setShowEvents(false);
    })();
  }, []);

  return (
    <div className="almibar min-h-screen">
      <HeroSection />
      {showEvents && <Events />}   {/* 👈 sólo se muestra si hay eventos */}
      <MenuSection />
      <LocationSection />
      <Footer />
    </div>
  );
};

export default Index;
