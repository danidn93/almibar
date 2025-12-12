// src/pages/admin/Dashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import {
  Shield, Table as TableIcon, Music, ShoppingCart, DollarSign,
  FileText, CreditCard, Calendar
} from 'lucide-react';

type LayoutCtx = { sucursalId: string };

const currencyCO = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);

export default function AdminDashboard() {
  const { user } = useAuth();
  const { logout } = useAuth();
  const { sucursalId } = useOutletContext<LayoutCtx>();

  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [mesasActivas, setMesasActivas] = useState(0);
  const [productosCount, setProductosCount] = useState(0);
  const [cancionesCount, setCancionesCount] = useState(0);
  const [pedidosActivos, setPedidosActivos] = useState(0);
  const [ingresosHoy, setIngresosHoy] = useState(0);
  const [facturasPendientes, setFacturasPendientes] = useState(0);
  const [mesasParaLiquidar, setMesasParaLiquidar] = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [eventosCount, setEventosCount] = useState(0);
  const [sucursalCount, setSucursalCount] = useState(0);

  const { startISO, endISO } = useMemo(() => {
    const now = new Date();
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startISO: s.toISOString(), endISO: e.toISOString() };
  }, []);

  // ============================================================
  // MAIN FETCH
  // ============================================================

  const fetchAll = async () => {
    if (!sucursalId) return;

    setLoading(true);
    setErrMsg(null);

    try {
      const mesasQ = supabase
        .from("mesas")
        .select("id", { count: "exact", head: true })
        .eq("activa", true)
        .eq("sucursal_id", sucursalId);

      const productosQ = supabase
        .from("productos_sucursal")
        .select("id, disponible, producto:productos_local(tipo)", { count: "exact" })
        .eq("sucursal_id", sucursalId);

      const pedidosQ = supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("sucursal_id", sucursalId)
        .eq("liquidado", false);

      const pagosQ = supabase
        .from("pagos")
        .select("total, created_at")
        .eq("sucursal_id", sucursalId)
        .gte("created_at", startISO)
        .lt("created_at", endISO);

      const facturasQ = supabase
        .from("facturas")
        .select("id", { count: "exact", head: true });

      const mesasPendQ = supabase
        .from("pedidos")
        .select("mesa_id")
        .eq("estado", "entregado")
        .eq("sucursal_id", sucursalId)
        .eq("liquidado", false);

      const eventosQ = supabase
        .from("eventos")
        .select("id", { count: "exact", head: true })
        .eq("sucursal_id", sucursalId)
        .gte("fecha", new Date().toISOString());

      const sucursalesQ = supabase
        .from("sucursales")
        .select("id", { count: "exact", head: true })
        .eq("local_id", user.local_id);

      const [
        mesasRes,
        productosRes,
        pedidosRes,
        pagosRes,
        facturasRes,
        mesasPendRes,
        eventosRes,
        sucursalesRes
      ] = await Promise.all([
        mesasQ,
        productosQ,
        pedidosQ,
        pagosQ,
        facturasQ,
        mesasPendQ,
        eventosQ,
        sucursalesQ
      ]);

      setSucursalCount(sucursalesRes.count ?? 0);


      setMesasActivas(mesasRes.count ?? 0);

      let prod = 0;
      let songs = 0;
      productosRes.data?.forEach((p: any) => {
        if (p.producto.tipo === "producto") prod++;
        if (p.producto.tipo === "cancion") songs++;
      });

      setProductosCount(prod);
      setCancionesCount(songs);

      setPedidosActivos(pedidosRes.count ?? 0);

      const pagos = pagosRes.data ?? [];
      setIngresosHoy(pagos.reduce((acc, r) => acc + Number(r.total || 0), 0));

      setFacturasPendientes(facturasRes.count ?? 0);

      const filas = mesasPendRes.data ?? [];
      setMesasParaLiquidar(new Set(filas.map(r => r.mesa_id)).size);

      setEventosCount(eventosRes.count ?? 0);

    } catch (err: any) {
      console.error("[dashboard] error:", err);
      setErrMsg(err.message || "Error cargando información");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // REALTIME
  // ============================================================

  useEffect(() => {
    if (!sucursalId) return;

    fetchAll();

    const ch = supabase
      .channel(`dashboard-${sucursalId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "pagos" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "facturas" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "productos_sucursal" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, fetchAll)
      .subscribe();

    return () => {
      supabase.removeChannel(ch).catch(() => {});
    };
  }, [sucursalId, startISO, endISO]);

  // ============================================================

  return (
    <ProtectedRoute>
      <div className="min-h-[60vh]">
        <main className="container mx-auto px-4 py-8">
          {errMsg && (
            <div className="mb-6 rounded-md border border-red-400 bg-red-100 px-4 py-3 text-sm text-red-700">
              {errMsg}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Link to="/admin/sucursales">
              <Card className="cursor-pointer hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Sucursales</CardTitle>
                  <TableIcon className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {loading ? "—" : sucursalCount}
                  </div>                  
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/mesas">
              <Card className="cursor-pointer hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Mesas</CardTitle>
                  <TableIcon className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? "—" : mesasActivas}</div>
                  
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/items">
              <Card className="cursor-pointer hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Productos y canciones</CardTitle>
                  <Music className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {loading ? "—" : `${productosCount} productos • ${cancionesCount} canciones`}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/pedidos">
              <Card className="cursor-pointer hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Pedidos activos</CardTitle>
                  <ShoppingCart className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? "—" : pedidosActivos}</div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/ingresos">
              <Card className="cursor-pointer hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Ingresos de hoy</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "—" : currencyCO(ingresosHoy)}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/facturas">
              <Card className="cursor-pointer hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Facturas</CardTitle>
                  <FileText className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "—" : facturasPendientes}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/liquidaciones">
              <Card className="cursor-pointer hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Mesas por liquidar</CardTitle>
                  <CreditCard className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "—" : mesasParaLiquidar}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/cierre-diario">
              <Card className="cursor-pointer hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Cierre Diario</CardTitle>
                  <Calendar className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    Ver reporte
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/usuarios">
              <Card className="cursor-pointer hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
                  <Shield className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "—" : usersCount}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/eventos">
              <Card className="cursor-pointer hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Eventos</CardTitle>
                  <Calendar className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "—" : eventosCount}
                  </div>
                </CardContent>
              </Card>
            </Link>

          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
