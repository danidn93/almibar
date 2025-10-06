// src/components/MenuSection.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const foodImage = "/assets/food.jpg";
const cocktailsImage = "/assets/cocktails.jpg";
const bebidasImage = "/assets/bebidas.png";

type Item = {
  id: string;
  tipo: "producto" | "cancion";
  nombre: string;
  categoria?: string | null;
  precio?: number | null;
  disponible: boolean;
};

const fmtCOP = (n?: number | null) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

/** Imagen por categoría (clave = nombre “de exhibición”). */
const CATEGORY_IMAGES: Record<string, string> = {
  Bebidas: bebidasImage,
  Cocteles: cocktailsImage,
  Comida: foodImage,
  Gastronomía: foodImage,
};

const DEFAULT_CATEGORY_IMAGE = foodImage;

/** Descripción por categoría (opcional). */
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Bebidas: "Bebidas artesanales con ingredientes de primera calidad",
  Cocteles: "Bebidas artesanales con ingredientes de primera calidad",
  Gastronomía: "Platos que complementan perfectamente tus bebidas",
  Comida: "Platos que complementan perfectamente tus bebidas",
};

/** ---- Helpers de normalización ---- */
const stripDiacritics = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const CATEGORY_ALIASES: Record<string, string> = {
  // normalizados (sin tildes, minúsculas, trim)
  bebidas: "Bebidas",
  bebida: "Bebidas",
  cocteles: "Cocteles",
  coctel: "Cocteles",
  comida: "Comida",
  gastronomia: "Gastronomía",
  karaoke: "Karaoke",
  otros: "Otros",
};

const toDisplayCategory = (raw?: string | null) => {
  const base = (raw ?? "Otros").trim();
  if (!base) return "Otros";
  const lowered = stripDiacritics(base).toLowerCase();
  return CATEGORY_ALIASES[lowered] ?? base.charAt(0).toUpperCase() + base.slice(1);
};

const MenuSection = () => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id,tipo,nombre,categoria,precio,disponible")
        .eq("tipo", "producto")
        .eq("disponible", true)
        .order("categoria", { ascending: true })
        .order("nombre", { ascending: true });

      if (!error) setItems((data as Item[]) || []);
      else console.error("[MenuSection] fetch error:", error.message);
    })();
  }, []);

  /** Agrupa por categoría “de exhibición” (normalizada) */
  const categories = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const displayCat = toDisplayCategory(it.categoria);
      if (!map.has(displayCat)) map.set(displayCat, []);
      map.get(displayCat)!.push(it);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, prods]) => {
        const image = CATEGORY_IMAGES[title] || DEFAULT_CATEGORY_IMAGE;
        const description =
          CATEGORY_DESCRIPTIONS[title] ||
          `${prods.length} ${prods.length === 1 ? "opción disponible" : "opciones disponibles"}`;

        return { title, description, image, items: prods };
      });
  }, [items]);

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background to-secondary/50" id="menu">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Nuestra <span className="bg-gradient-primary bg-clip-text text-transparent">Experiencia</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Descubre nuestros productos premium en un ambiente único donde cada detalle está diseñado para tu placer
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {categories.map((category) => (
            <Card
              key={category.title}
              className="bg-gradient-card border-amber-500/20 shadow-elegant hover:shadow-amber transition-all duration-500 group"
            >
              {/* Cabecera con UNA imagen por categoría */}
              <div className="relative overflow-hidden rounded-t-lg">
                <img
                  src={category.image}
                  alt={category.title}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{category.title}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              </div>

              {/* Lista de productos dentro de la misma tarjeta */}
              <CardContent className="p-6">
                <div className="space-y-4">
                  {category.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start group/item">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground group-hover/item:text-primary transition-colors">
                            {item.nombre}
                          </h4>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-primary ml-4">
                        {item.precio != null ? fmtCOP(item.precio) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {categories.length === 0 && (
          <p className="text-center text-muted-foreground">Aún no hay productos disponibles.</p>
        )}
      </div>
    </section>
  );
};

export default MenuSection;
