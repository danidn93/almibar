import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type PagoRow = { total: number; metodo: string | null; created_at: string };

interface PedidoItem {
  id: string;
  cantidad: number;
  nota?: string | null;
  productos_local: {
    id: string;
    nombre: string;
    tipo: "producto" | "cancion";
    precio: number;
    descripcion?: string | null;
  };
}

interface Pedido {
  id: string;
  mesa_id: string;
  created_at: string;
  total: number;
  mesas: { nombre: string };
  pedido_items: PedidoItem[];
}

const fmtUSD = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

export default function AdminIngresosHoy() {
  const [loading, setLoading] = useState(true);
  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [songsAgg, setSongsAgg] = useState<
    { key: string; nombre: string; cantidad: number }[]
  >([]);

  const { startISO, endISO } = useMemo(() => {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // PAGOS DEL DÍA
        const pagosQ = supabase
          .from("pagos")
          .select("total, metodo, created_at")
          .gte("created_at", startISO)
          .lt("created_at", endISO);

        // PEDIDOS DEL DÍA
        const pedidosQ = supabase
          .from("pedidos")
          .select(
            `
            *,
            mesas(nombre),
            pedido_items(
              id,
              cantidad,
              nota,
              productos_local(
                id,
                nombre,
                tipo,
                precio,
                descripcion
              )
            )
          `
          )
          .gte("created_at", startISO)
          .lt("created_at", endISO)
          .order("created_at", { ascending: false });

        const [pagosRes, pedidosRes] = await Promise.all([pagosQ, pedidosQ]);

        setPagos((pagosRes.data as PagoRow[]) || []);
        const peds = (pedidosRes.data as Pedido[]) || [];
        setPedidos(peds);

        // AGRUPACIÓN DE CANCIONES
        const agg = new Map<string, { key: string; nombre: string; cantidad: number }>();

        peds.forEach((p) => {
          p.pedido_items.forEach((pi) => {
            const item = pi.productos_local;
            if (item.tipo === "cancion") {
              if (!agg.has(item.nombre)) {
                agg.set(item.nombre, {
                  key: item.nombre,
                  nombre: item.nombre,
                  cantidad: 0,
                });
              }
              agg.get(item.nombre)!.cantidad += pi.cantidad;
            }
          });
        });

        setSongsAgg(
          Array.from(agg.values()).sort((a, b) => b.cantidad - a.cantidad)
        );
      } catch (e) {
        console.error("Error cargando ingresos:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    // REALTIME
    const ch = supabase
      .channel("ingresos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pagos" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedido_items" }, fetchAll)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [startISO, endISO]);

  // TOTALES
  const totalHoy = pagos.reduce((a, p) => a + Number(p.total || 0), 0);
  const byMetodo = pagos.reduce<Record<string, number>>((acc, p) => {
    const m = p.metodo || "sin_método";
    acc[m] = (acc[m] ?? 0) + Number(p.total || 0);
    return acc;
  }, {});
  const totalCanciones = songsAgg.reduce((acc, s) => acc + s.cantidad, 0);

  return (
    <ProtectedRoute>
      <div className="min-h-[60vh]">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white/90">Ingresos del día</h1>
          </div>
        </header>

        {/* PAGOS */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Pagos del día</CardTitle>
            <CardDescription>Totales y por método</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold mb-4">Total: {fmtUSD(totalHoy)}</div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byMetodo).map(([met, val]) => (
                  <TableRow key={met}>
                    <TableCell>{met}</TableCell>
                    <TableCell className="text-right">{fmtUSD(val)}</TableCell>
                  </TableRow>
                ))}
                {Object.keys(byMetodo).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2}>Sin pagos hoy</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* CANCIONES SOLICITADAS */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Canciones solicitadas</CardTitle>
            <CardDescription>Total hoy: {totalCanciones}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canción</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {songsAgg.map((s) => (
                  <TableRow key={s.key}>
                    <TableCell>{s.nombre}</TableCell>
                    <TableCell className="text-right">{s.cantidad}</TableCell>
                  </TableRow>
                ))}
                {songsAgg.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2}>Sin canciones hoy</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* PEDIDOS DETALLADOS */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pedidos del día</CardTitle>
            <CardDescription>Incluye productos y canciones</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Cargando...</p>
            ) : pedidos.length === 0 ? (
              <p>No hay pedidos registrados hoy</p>
            ) : (
              <div className="space-y-4">
                {pedidos.map((p) => (
                  <div key={p.id} className="border rounded-md">
                    <div className="px-4 py-2 flex justify-between">
                      <strong>{p.mesas?.nombre ?? "—"}</strong>
                      <span>{fmtUSD(Number(p.total || 0))}</span>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead className="text-right">Precio</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {p.pedido_items.map((pi) => (
                          <TableRow key={pi.id}>
                            <TableCell>{pi.productos_local.nombre}</TableCell>
                            <TableCell className="text-right">{pi.cantidad}</TableCell>
                            <TableCell className="text-right">
                              {fmtUSD(pi.productos_local.precio)}
                            </TableCell>
                            <TableCell className="text-right">
                              {fmtUSD(pi.productos_local.precio * pi.cantidad)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
