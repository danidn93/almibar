// src/pages/admin/Configuracion.tsx
import { useEffect, useRef, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { Link } from 'react-router-dom';

type Config = {
  id: string;
  abierto: boolean;
  nombre_local?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  horario?: string | null;          // texto con saltos de línea
  horario_arr?: string[] | null;    // NUEVO: text[]
  logo_url?: string | null;
  hero_bg_url?: string | null;
  maps_url?: string | null;
  lat?: number | null;
  lng?: number | null;
};

const EMPTY_CONF: Config = {
  id: '',
  abierto: true,
  nombre_local: '',
  direccion: '',
  telefono: '',
  correo: '',
  horario: '',
  horario_arr: [],
  logo_url: null,
  hero_bg_url: null,
  maps_url: '',
  lat: null,
  lng: null,
};

export default function AdminConfiguracion() {
  const [conf, setConf] = useState<Config>(EMPTY_CONF);
  const [horarioText, setHorarioText] = useState<string>(''); // textarea controlado
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fileLogo = useRef<HTMLInputElement | null>(null);
  const fileHero = useRef<HTMLInputElement | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('id,abierto,nombre_local,direccion,telefono,correo,horario,horario_arr,logo_url,hero_bg_url,maps_url,lat,lng')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const horarioArr: string[] =
          (data.horario_arr as string[] | null) ??
          (typeof data.horario === 'string'
            ? data.horario.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
            : []);

        setConf({
          id: data.id,
          abierto: !!data.abierto,
          nombre_local: data.nombre_local ?? '',
          direccion: data.direccion ?? '',
          telefono: data.telefono ?? '',
          correo: data.correo ?? '',
          horario: data.horario ?? horarioArr.join('\n'),
          horario_arr: horarioArr,
          logo_url: data.logo_url ?? null,
          hero_bg_url: data.hero_bg_url ?? null,
          maps_url: data.maps_url ?? '',
          lat: data.lat ?? null,
          lng: data.lng ?? null,
        });
        setHorarioText(horarioArr.join('\n'));
      } else {
        setConf(EMPTY_CONF);
        setHorarioText('');
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo cargar la configuración', variant: 'destructive' });
      setConf(EMPTY_CONF);
      setHorarioText('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Crea la fila si no existe y devuelve el id
  const ensureRow = async () => {
    // construye horario_arr a partir del textarea actual
    const arr = horarioText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (conf.id) return conf.id;

    const insertPayload = {
      abierto: conf.abierto,
      nombre_local: conf.nombre_local || null,
      direccion: conf.direccion || null,
      telefono: conf.telefono || null,
      correo: conf.correo || null,
      horario: arr.join('\n') || null, // espejo en texto
      horario_arr: arr.length ? arr : null,
      logo_url: conf.logo_url || null,
      hero_bg_url: conf.hero_bg_url || null,
      maps_url: conf.maps_url || null,
      lat: conf.lat ?? null,
      lng: conf.lng ?? null,
    };
    const { data, error } = await supabase
      .from('configuracion')
      .insert([insertPayload])
      .select()
      .single();
    if (error) throw error;
    setConf((c) => ({ ...c, id: data.id }));
    return data.id as string;
  };

  const save = async () => {
    // Validación simple del URL de Maps (opcional)
    if (conf.maps_url && !/^https?:\/\/(maps\.app\.goo\.gl|www\.google\.[^/]+\/maps)/i.test(conf.maps_url)) {
      toast({
        title: 'URL de Maps no válida',
        description: 'Pega un enlace de Google Maps (maps.app.goo.gl o google.com/maps).',
        variant: 'destructive',
      });
      return;
    }

    // Normaliza el teléfono (opcional)
    const phoneClean = (conf.telefono || '').replace(/[^\d+]/g, '');

    // Construye el array de horarios desde el textarea
    const arr = horarioText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    setSaving(true);
    try {
      if (!conf.id) {
        await ensureRow();
        toast({ title: 'Guardado', description: 'Configuración creada' });
      } else {
        const { error } = await supabase
          .from('configuracion')
          .update({
            abierto: conf.abierto,
            nombre_local: conf.nombre_local || null,
            direccion: conf.direccion || null,
            telefono: phoneClean || null,
            correo: conf.correo || null,
            // guarda ambos: texto y array
            horario: arr.join('\n') || null,
            horario_arr: arr.length ? arr : null,
            logo_url: conf.logo_url || null,
            hero_bg_url: conf.hero_bg_url || null,
            maps_url: conf.maps_url || null,
            lat: conf.lat ?? null,
            lng: conf.lng ?? null,
          })
          .eq('id', conf.id);
        if (error) throw error;

        setConf(c => ({ ...c, horario: arr.join('\n'), horario_arr: arr }));
        toast({ title: 'Guardado', description: 'Configuración actualizada' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const upFile = async (file: File, kind: 'logo' | 'hero') => {
    try {
      const id = await ensureRow();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${id}/${kind}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('branding').upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('branding').getPublicUrl(path);
      const publicUrl = pub?.publicUrl;

      const patch = kind === 'logo' ? { logo_url: publicUrl } : { hero_bg_url: publicUrl };
      const { error: updErr } = await supabase.from('configuracion').update(patch).eq('id', id);
      if (updErr) throw updErr;

      setConf((c) => ({ ...c, ...(patch as any) }));
      toast({ title: 'Imagen actualizada' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Subida fallida', variant: 'destructive' });
    } finally {
      if (fileLogo.current) fileLogo.current.value = '';
      if (fileHero.current) fileHero.current.value = '';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-[60vh]">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white">Configuración del Local</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Datos del local</CardTitle>
              <CardDescription>Control de apertura y datos de contacto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <p className="text-muted-foreground">Cargando…</p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Label>Estado</Label>
                    <Switch
                      checked={!!conf.abierto}
                      onCheckedChange={(v) => setConf((c) => ({ ...c, abierto: v }))}
                    />
                    <span className="text-sm">{conf.abierto ? 'Abierto' : 'Cerrado'}</span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Nombre del local</Label>
                      <Input
                        value={conf.nombre_local || ''}
                        onChange={(e) => setConf((c) => ({ ...c, nombre_local: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Correo</Label>
                      <Input
                        value={conf.correo || ''}
                        onChange={(e) => setConf((c) => ({ ...c, correo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <Input
                        value={conf.telefono || ''}
                        onChange={(e) => setConf((c) => ({ ...c, telefono: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Dirección</Label>
                      <Input
                        value={conf.direccion || ''}
                        onChange={(e) => setConf((c) => ({ ...c, direccion: e.target.value }))}
                      />
                    </div>

                    {/* Horario (textarea para líneas -> horario_arr) */}
                    <div className="md:col-span-2">
                      <Label>Horario de atención (una línea por día)</Label>
                      <textarea
                        className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                        rows={5}
                        placeholder={`Ej:\nMartes - Jueves 18:00 - 01:00\nViernes - Sábado 18:00 - 02:00\nDomingo 18:00 - 00:00`}
                        value={horarioText}
                        onChange={(e) => setHorarioText(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Cada línea se guardará en <code>horario_arr</code> y todo el bloque en <code>horario</code>.
                      </p>
                    </div>

                    {/* Google Maps */}
                    <div className="md:col-span-2">
                      <Label>Google Maps URL</Label>
                      <Input
                        placeholder="https://maps.app.goo.gl/..."
                        value={conf.maps_url || ''}
                        onChange={(e) => setConf((c) => ({ ...c, maps_url: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Pega el enlace de Google Maps. Se usará en el botón “Cómo llegar”.
                      </p>
                    </div>

                    {/* Coordenadas (opcionales) */}
                    <div>
                      <Label>Latitud (opcional)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={conf.lat ?? ''}
                        onChange={(e) =>
                          setConf((c) => ({ ...c, lat: e.target.value === '' ? null : Number(e.target.value) }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Longitud (opcional)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={conf.lng ?? ''}
                        onChange={(e) =>
                          setConf((c) => ({ ...c, lng: e.target.value === '' ? null : Number(e.target.value) }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Logo</Label>
                      <div className="flex items-center gap-3">
                        {conf.logo_url && (
                          <img src={conf.logo_url} className="h-14 w-14 rounded object-contain bg-white" />
                        )}
                        <input
                          ref={fileLogo}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) upFile(f, 'logo');
                          }}
                        />
                        <Button variant="outline" onClick={() => fileLogo.current?.click()}>
                          <ImagePlus className="h-4 w-4 mr-2" /> Subir logo
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Fondo</Label>
                      <div className="flex items-center gap-3">
                        {conf.hero_bg_url && (
                          <img src={conf.hero_bg_url} className="h-14 w-24 rounded object-cover" />
                        )}
                        <input
                          ref={fileHero}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) upFile(f, 'hero');
                          }}
                        />
                        <Button variant="outline" onClick={() => fileHero.current?.click()}>
                          <ImagePlus className="h-4 w-4 mr-2" /> Subir fondo
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button onClick={save} disabled={saving}>
                      {saving ? 'Guardando…' : (conf.id ? 'Guardar cambios' : 'Crear configuración')}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}
