import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminEventos from "@/pages/admin/Eventos";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, LogOut, Table as TableIcon, Music, ShoppingCart, DollarSign, FileText, CreditCard, Calendar } from 'lucide-react';

const currencyCO = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

export default function AdminDashboard() {
  const { logout } = useAuth();

  // estados
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // KPIs
  const [mesasActivas, setMesasActivas] = useState(0);
  const [productosCount, setProductosCount] = useState(0);
  const [cancionesCount, setCancionesCount] = useState(0);
  const [pedidosActivos, setPedidosActivos] = useState(0);
  const [ingresosHoy, setIngresosHoy] = useState(0);
  const [facturasPendientes, setFacturasPendientes] = useState(0);
  const [mesasParaLiquidar, setMesasParaLiquidar] = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [eventosCount, setEventosCount] = useState(0);
  
  // Ventana del día (local)
  const { startISO, endISO } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        const mesasQ = supabase.from('mesas').select('id', { count: 'exact', head: true }).eq('activa', true);
        const productosQ = supabase.from('items').select('id', { count: 'exact', head: true }).eq('tipo', 'producto').eq('disponible', true);
        const cancionesQ = supabase.from('items').select('id', { count: 'exact', head: true }).eq('tipo', 'cancion').eq('disponible', true);
        const pedidosQ = supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('liquidado', false);
        const pagosQ = supabase.from('pagos').select('total, created_at').gte('created_at', startISO).lt('created_at', endISO);
        const facturasQ = supabase.from('facturas').select('id', { count: 'exact', head: true }).eq('requiere_factura', true);
        const mesasPendQ = supabase.from('pedidos').select('mesa_id').eq('estado', 'entregado').eq('liquidado', false);
        const usersQ = supabase.from('app_users').select('id', { count: 'exact', head: true });
        const eventosQ = supabase.from('eventos').select('id', { count: 'exact', head: true }).gte('fecha', new Date().toISOString());
        const [mesasRes, prodRes, cancRes, pedRes, pagosRes, factRes, mesasPendRes, usersRes, eventosRes] = await Promise.all([
          mesasQ, productosQ, cancionesQ, pedidosQ, pagosQ, facturasQ, mesasPendQ, usersQ, eventosQ
        ]);

if (eventosRes.error) console.error('[dashboard] eventos error:', eventosRes.error.message);
setEventosCount(eventosRes.error ? 0 : (eventosRes.count ?? 0));

        if (mesasRes.error) console.error('[dashboard] mesas error:', mesasRes.error.message);
        if (prodRes.error) console.error('[dashboard] productos error:', prodRes.error.message);
        if (cancRes.error) console.error('[dashboard] canciones error:', cancRes.error.message);
        if (pedRes.error) console.error('[dashboard] pedidos error:', pedRes.error.message);
        if (pagosRes.error) console.error('[dashboard] pagos error:', pagosRes.error.message);
        if (factRes.error) console.error('[dashboard] facturas error:', factRes.error.message);
        if (mesasPendRes.error) console.error('[dashboard] mesasPend error:', mesasPendRes.error.message);
        if (usersRes.error)   console.error('[dashboard] users error:', usersRes.error.message);
        if (eventosRes.error) console.error('[dashboard] eventos error:', eventosRes.error.message);

        setMesasActivas(mesasRes.error ? 0 : (mesasRes.count ?? 0));
        setProductosCount(prodRes.error ? 0 : (prodRes.count ?? 0));
        setCancionesCount(cancRes.error ? 0 : (cancRes.count ?? 0));
        setPedidosActivos(pedRes.error ? 0 : (pedRes.count ?? 0));
        setFacturasPendientes(factRes.error ? 0 : (factRes.count ?? 0));

        const pagos = pagosRes.error ? [] : ((pagosRes.data as { total: number }[] | null) ?? []);
        setIngresosHoy(pagos.reduce((acc, r) => acc + Number(r.total || 0), 0));

        const filas = mesasPendRes.error ? [] : ((mesasPendRes.data as { mesa_id: string }[] | null) ?? []);
        setMesasParaLiquidar(new Set(filas.map((r) => r.mesa_id)).size);
        setUsersCount(usersRes.error ? 0 : (usersRes.count ?? 0));
        setEventosCount(eventosRes.error ? 0 : (eventosRes.count ?? 0));
      } catch (e: any) {
        console.error('[dashboard] fetchAll fatal:', e);
        setErrMsg(e?.message || 'No se pudo cargar el dashboard');
        setMesasActivas(0);
        setProductosCount(0);
        setCancionesCount(0);
        setPedidosActivos(0);
        setIngresosHoy(0);
        setFacturasPendientes(0);
        setMesasParaLiquidar(0);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    const ch = supabase
    .channel('dashboard-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pedidos' },
      fetchAll
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pagos' },
      fetchAll
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'facturas' },
      fetchAll
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'items' },
      fetchAll
    )
    .on(
      'postgres_changes', 
      { event: '*', schema: 'public', table: 'app_users' }, 
      fetchAll)
    .on(
      'postgres_changes', 
      { event: '*', schema: 'public', table: 'eventos' }, 
      fetchAll)
    .subscribe();

  return () => {
    supabase.removeChannel(ch);
  };
}, [startISO, endISO]);

  return (
    <ProtectedRoute>
      <div className="min-h-[60vh]">
        <main className="container mx-auto px-4 py-8">
          {errMsg && (
            <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm">
              {errMsg}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {/* 1) Mesas */}
            <Link to="/admin/mesas">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mesas</CardTitle>
                  <TableIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '—' : mesasActivas}</div>
                  <CardDescription>Gestionar mesas y generar códigos QR</CardDescription>
                </CardContent>
              </Card>
            </Link>

            {/* 2) Productos y canciones */}
            <Link to="/admin/items">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Productos y canciones</CardTitle>
                  <Music className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {loading ? '—' : `${productosCount} productos • ${cancionesCount} canciones`}
                  </div>
                  <CardDescription>Administrar catálogo disponible</CardDescription>
                </CardContent>
              </Card>
            </Link>

            {/* 3) Pedidos activos */}
            <Link to="/admin/pedidos">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pedidos activos</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '—' : pedidosActivos}</div>
                  <CardDescription>Ver y gestionar pedidos en tiempo real</CardDescription>
                </CardContent>
              </Card>
            </Link>

            {/* 4) Ingresos de hoy */}
            <Link to="/admin/ingresos">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos de hoy</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '—' : currencyCO(ingresosHoy)}</div>
                  <CardDescription>Ver desglose de pagos, canciones y pedidos</CardDescription>
                </CardContent>
              </Card>
            </Link>

            {/* 5) Facturas por emitir */}
            <Link to="/admin/facturas">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Facturas por emitir</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '—' : facturasPendientes}</div>
                  <CardDescription>Listado de facturas pendientes</CardDescription>
                </CardContent>
              </Card>
            </Link>

            {/* 6) Liquidar mesas */}
            <Link to="/admin/liquidaciones">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Liquidar mesas</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '—' : mesasParaLiquidar}</div>
                  <CardDescription>Mesas con pedidos listos por cobrar</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link to="/admin/usuarios">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '—' : usersCount}</div>
                  <CardDescription>Alta/baja, roles y contraseñas</CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/eventos">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Eventos</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '—' : eventosCount}</div>
                  <CardDescription>Crear y administrar eventos</CardDescription>
                </CardContent>
              </Card>
            </Link>

          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
