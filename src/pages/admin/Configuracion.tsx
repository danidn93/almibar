import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

const diasSemana = [
  "Lunes", "Martes", "Miércoles", "Jueves",
  "Viernes", "Sábado", "Domingo",
];

interface HorarioDia {
  day: string;
  open: string;
  close: string;
}

interface Config {
  id: string;
  sucursal_id: string;
  abierto: boolean;
  horario_arr: HorarioDia[];
  logo_url: string | null;
  hero_bg_url: string | null;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
}

type OutletCtx = { sucursalId: string };

export default function Configuracion() {
  const { sucursalId } = useOutletContext<OutletCtx>();

  const [conf, setConf] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ============================================================
     OBTENER CONFIGURACIÓN
  ============================================================ */
  const fetchConfig = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("configuracion")
      .select("*")
      .eq("sucursal_id", sucursalId)
      .maybeSingle();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!data) {
      // Crear un modelo vacío si no existe
      const horarios: HorarioDia[] = diasSemana.map((d) => ({
        day: d,
        open: "",
        close: "",
      }));

      setConf({
        id: "",
        sucursal_id: sucursalId,
        abierto: true,
        horario_arr: horarios,
        logo_url: null,
        hero_bg_url: null,
        maps_url: null,
        lat: null,
        lng: null,
      });

      setLoading(false);
      return;
    }

    let horarios: HorarioDia[] = [];

    if (Array.isArray(data.horario_arr)) {
      horarios = (data.horario_arr as Json[]).map((h: any) => ({
        day: h.day ?? "",
        open: h.open ?? "",
        close: h.close ?? "",
      }));
    } else {
      horarios = diasSemana.map((d) => ({ day: d, open: "", close: "" }));
    }

    setConf({
      id: data.id,
      sucursal_id: data.sucursal_id,
      abierto: data.abierto,
      horario_arr: horarios,
      logo_url: data.logo_url,
      hero_bg_url: data.hero_bg_url,
      maps_url: data.maps_url,
      lat: data.lat,
      lng: data.lng,
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, [sucursalId]);

  /* ============================================================
     CREAR CONFIG SI NO EXISTE
  ============================================================ */
  const ensureConfig = async () => {
    if (conf && conf.id) return conf.id;

    const horarios = diasSemana.map((d) => ({
      day: d,
      open: "",
      close: "",
    }));

    const payload = {
      sucursal_id: sucursalId,
      abierto: true,
      horario_arr: horarios as unknown as Json[],
      logo_url: null,
      hero_bg_url: null,
      maps_url: null,
      lat: null,
      lng: null,
    };

    const { data, error } = await supabase
      .from("configuracion")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    setConf({
      id: data.id,
      sucursal_id: data.sucursal_id,
      abierto: data.abierto,
      horario_arr: horarios,
      logo_url: null,
      hero_bg_url: null,
      maps_url: null,
      lat: null,
      lng: null,
    });

    return data.id;
  };

  /* ============================================================
     GUARDAR CONFIGURACIÓN
  ============================================================ */

  const save = async () => {
    if (!conf) return;

    setSaving(true);
    try {
      const id = await ensureConfig();

      const { error } = await supabase
        .from("configuracion")
        .update({
          abierto: conf.abierto,
          horario_arr: conf.horario_arr as unknown as Json[],
          logo_url: conf.logo_url,
          hero_bg_url: conf.hero_bg_url,
          maps_url: conf.maps_url,
          lat: conf.lat,
          lng: conf.lng,
        })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Guardado exitoso" });
      fetchConfig();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ============================================================
     MANEJAR SUBIDA DE IMÁGENES (BASE64)
  ============================================================ */
  const uploadImg = (file: File, field: "logo_url" | "hero_bg_url") => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      setConf((c) =>
        c ? { ...c, [field]: ev.target?.result as string } : c
      );
    };
    reader.readAsDataURL(file);
  };

  /* ============================================================
     RENDER
  ============================================================ */

  if (!conf || loading) {
    return (
      <ProtectedRoute>
        <div className="text-center text-white py-10">Cargando configuración...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-[60vh]">
        <header className="border-b bg-black/40 backdrop-blur">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </Link>

            <h1 className="text-2xl font-bold text-white">Configuración de la Sucursal</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card className="g-white/90 text-black shadow-xl rounded-xl">
            <CardHeader>
              <CardTitle>Administrador de Configuración</CardTitle>
              <CardDescription>Gestiona toda la información visible para esta sucursal.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">

              {/* ESTADO */}
              <div className="flex items-center gap-3">
                <Label className="text-black">Estado</Label>
                <Switch
                  checked={conf.abierto}
                  onCheckedChange={(v) => setConf({ ...conf, abierto: v })}
                />
                <span>{conf.abierto ? "Abierto" : "Cerrado"}</span>
              </div>

              {/* HORARIO */}
              <div className="space-y-3">
                <Label className="font-medium text-black">Horario por día</Label>

                {conf.horario_arr.map((h, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4 items-center">
                    <span className="font-medium">{h.day}</span>

                    <Input
                      className="text-black"
                      placeholder="Apertura"
                      value={h.open}
                      onChange={(e) => {
                        const arr = [...conf.horario_arr];
                        arr[idx].open = e.target.value;
                        setConf({ ...conf, horario_arr: arr });
                      }}
                    />

                    <Input
                      className="text-black"
                      placeholder="Cierre"
                      value={h.close}
                      onChange={(e) => {
                        const arr = [...conf.horario_arr];
                        arr[idx].close = e.target.value;
                        setConf({ ...conf, horario_arr: arr });
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* LOGO */}
              <div className="space-y-2">
                <Label>Logo del local</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) uploadImg(e.target.files[0], "logo_url");
                  }}
                />
                {conf.logo_url && (
                  <img src={conf.logo_url} className="h-20 mt-2 rounded border" />
                )}
              </div>

              {/* HERO */}
              <div className="space-y-2">
                <Label>Imagen Hero</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) uploadImg(e.target.files[0], "hero_bg_url");
                  }}
                />
                {conf.hero_bg_url && (
                  <img src={conf.hero_bg_url} className="h-20 mt-2 rounded border" />
                )}
              </div>

              {/* MAPS */}
              <div className="space-y-2">
                <Label>Google Maps URL</Label>
                <Input
                  className="text-black"
                  value={conf.maps_url ?? ""}
                  onChange={(e) =>
                    setConf({ ...conf, maps_url: e.target.value })
                  }
                />
              </div>

              {/* LAT / LNG */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Latitud</Label>
                  <Input
                    className="text-black"
                    value={conf.lat ?? ""}
                    onChange={(e) =>
                      setConf({ ...conf, lat: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Longitud</Label>
                  <Input
                    className="text-black"
                    value={conf.lng ?? ""}
                    onChange={(e) =>
                      setConf({ ...conf, lng: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              {/* GUARDAR */}
              <Button onClick={save} disabled={saving}>
                {saving ? "Guardando..." : "Guardar configuración"}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}
