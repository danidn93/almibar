// src/layouts/AdminLayout.tsx
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import NewOrderListener from '@/components/NewOrderListener';
import { Button } from '@/components/ui/button';
import { Bell, Clock, LogOut } from 'lucide-react';
import adminBg from '/assets/admin-bg.png';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';


type Config = {
  id: string;
  abierto: boolean;
  nombre_local?: string | null;
  logo_url?: string | null;
};

export default function AdminLayout() {
  const { isAdmin, logout } = useAuth();

  const [now, setNow] = useState<string>(() =>
    new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  );
  const [pendingCount, setPendingCount] = useState(0);

  // Config
  const [conf, setConf] = useState<Config | null>(null);
  const [savingOpen, setSavingOpen] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente');
    if (!error) setPendingCount(count ?? 0);
  }, []);

  // Cargar config (single row)
  const fetchConfig = useCallback(async () => {
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) setConf(data as Config);
  }, []);

  
  const toggleAbierto = async (val: boolean) => {
    if (savingOpen) return;
    setSavingOpen(true);

    // optimista: refleja el cambio al vuelo
    const prev = conf;
    if (conf) setConf({ ...conf, abierto: val });

    try {
      let id = conf?.id;
      if (!id) {
        const ins = await supabase
          .from('configuracion')
          .insert([{ abierto: val }])
          .select()
          .single();

        if (ins.error) throw ins.error;
        id = ins.data.id as string;
        setConf(ins.data as any);
        toast({ title: 'Listo', description: `Local ${val ? 'abierto' : 'cerrado'}.` });
      } else {
        const { error } = await supabase
          .from('configuracion')
          .update({ abierto: val })
          .eq('id', id);

        if (error) throw error;
        toast({ title: 'Listo', description: `Local ${val ? 'abierto' : 'cerrado'}.` });
      }
    } catch (e: any) {
      console.error('[toggleAbierto]', e);
      // rollback en caso de error
      if (prev) setConf(prev);
      toast({
        title: 'No se pudo actualizar',
        description: e?.message || 'Revisa las políticas RLS de la tabla configuracion.',
        variant: 'destructive',
      });
    } finally {
      setSavingOpen(false);
    }
  };


  // Reloj
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Inicializaciones
  useEffect(() => {
    refreshPendingCount();
    fetchConfig();

    const ch1 = supabase
      .channel('badge-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, refreshPendingCount)
      .subscribe();

    const ch2 = supabase
      .channel('config-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracion' }, fetchConfig)
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [refreshPendingCount, fetchConfig]);

  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  return (
    <>
      <NewOrderListener />
      {/* Fondo */}
      <div className="fixed inset-0 -z-10">
        <div
          className="h-full w-full bg-no-repeat bg-center bg-cover bg-fixed"
          style={{ backgroundImage: `url(${adminBg})` }}
        />
      </div>

      <div className="min-h-screen">
        <header className="sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img
                src={conf?.logo_url || '/assets/logo-admin.png'}
                alt="Logo"
                className="h-12 w-12 sm:h-16 sm:w-16 rounded-sm select-none object-contain"
                draggable={false}
              />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {conf?.nombre_local || 'Panel Administrativo'}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-white/90 text-sm">Local</span>
                  <Switch checked={!!conf?.abierto} onCheckedChange={toggleAbierto} disabled={savingOpen || !conf}/>
                  <Badge variant={conf?.abierto ? 'default' : 'secondary'}>
                    {conf?.abierto ? 'Abierto' : 'Cerrado'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/admin/configuracion">
                <Button variant="outline" className="bg-white/80 backdrop-blur">Configuración</Button>
              </Link>

              <button
                type="button"
                className="relative inline-flex items-center justify-center rounded-full border bg-white/80 backdrop-blur px-3 py-2 text-sm hover:bg-white"
                title="Notificaciones"
                aria-label={`Notificaciones: ${pendingCount} pedidos pendientes`}
              >
                <Bell className="h-5 w-5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 text-white text-[10px] px-1">
                    {pendingCount}
                  </span>
                )}
              </button>

              <div className="hidden sm:flex items-center gap-2 rounded-full border bg-white/80 backdrop-blur px-3 py-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className="tabular-nums">{now}</span>
              </div>

              <Button onClick={logout} variant="outline" className="bg-white/80 backdrop-blur">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">
          <Outlet />
        </main>
      </div>
    </>
  );
}
