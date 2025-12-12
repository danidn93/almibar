// src/components/MenuSection.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const foodImage = "/assets/food.jpg";
const cocktailsImage = "/assets/cocktails.jpg";
const bebidasImage = "/assets/bebidas.png";

type ProductoLocal = {
  id: string;
  local_id: string;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  tipo: "producto" | "cancion";
  precio?: number | null;
  image_url?: string | null;
};

const LOCAL_ID = import.meta.env.VITE_LOCAL_ID;

const fmtCOP = (n?: number | null) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

/* Imágenes por categoría */
const CATEGORY_IMAGES: Record<string, string> = {
  Bebidas: bebidasImage,
  Cocteles: cocktailsImage,
  Comida: foodImage,
  Gastronomía: foodImage,
};

const DEFAULT_CATEGORY_IMAGE = foodImage;

/* Descripciones */
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Bebidas: "Bebidas artesanales con ingredientes frescos",
  Cocteles: "Cocteles premium preparados por bartenders expertos",
  Gastronomía: "Platos diseñados para elevar la experiencia",
  Comida: "Sabores únicos de nuestra cocina",
};

/* Normalización */
const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const CATEGORY_ALIASES: Record<string, string> = {
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
  const [items, setItems] = useState<ProductoLocal[]>([]);

  useEffect(() => {
    if (!LOCAL_ID) return;

    (async () => {
      const { data, error } = await supabase
        .from("productos_local")
        .select("id,local_id,nombre,categoria,tipo,precio,image_url")
        .eq("local_id", LOCAL_ID)
        .eq("tipo", "producto")
        .order("categoria", { ascending: true })
        .order("nombre", { ascending: true });

      if (!error) setItems((data as ProductoLocal[]) || []);
      else console.error("[MenuSection] fetch error:", error.message);
    })();
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, ProductoLocal[]>();

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
            Descubre nuestra carta premium diseñada para elevar tu experiencia.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {categories.map((category) => (
            <Card
              key={category.title}
              className="bg-gradient-card border-amber-500/20 shadow-elegant hover:shadow-amber transition-all duration-500 group"
            >
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

              <CardContent className="p-6">
                <div className="space-y-4">
                  {category.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <h4 className="font-semibold text-foreground">{item.nombre}</h4>
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
          <p className="text-center text-muted-foreground">Aún no hay productos registrados para este local.</p>
        )}
      </div>
    </section>
  );
};

export default MenuSection;
