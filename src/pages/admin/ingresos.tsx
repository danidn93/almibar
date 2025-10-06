// src/pages/admin/ingresos.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ArrowLeft, CheckCircle, Clock, Package, Music } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

type Metodo = string;

type PagoRow = { total: number; metodo: Metodo | null; created_at: string };
type Mesa = { id: string; nombre: string };
type Item = { id: string; nombre: string; artista?: string | null; tipo: 'producto'|'cancion'; precio: number|null };
type PedidoItem = { id: string; cantidad: number; item: Item };
type Pedido = {
  id: string;
  mesa_id: string;
  created_at: string;
  total: number;
  mesa: Mesa;
  pedido_items: PedidoItem[];
};

const currencyCO = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

export default function AdminIngresosHoy() {
  const [loading, setLoading] = useState(true);
  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [songsAgg, setSongsAgg] = useState<{ key: string; nombre: string; artista: string; cantidad: number }[]>([]);

  const { startISO, endISO } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const pagosQ = supabase
          .from('pagos')
          .select('total, metodo, created_at')
          .gte('created_at', startISO)
          .lt('created_at', endISO);

        const pedidosQ = supabase
          .from('pedidos')
          .select(`
            *,
            mesa:mesas(*),
            pedido_items(
              *,
              item:items(*)
            )
          `)
          .gte('created_at', startISO)
          .lt('created_at', endISO)
          .order('created_at', { ascending: false });

        const [pagosRes, pedidosRes] = await Promise.all([pagosQ, pedidosQ]);

        setPagos((pagosRes.data as PagoRow[]) || []);
        const peds = (pedidosRes.data as Pedido[]) || [];
        setPedidos(peds);

        // Agregado de canciones
        const songMap = new Map<string, { key: string; nombre: string; artista: string; cantidad: number }>();
        peds.forEach((p) => {
          p.pedido_items.forEach((pi) => {
            if (pi.item?.tipo === 'cancion') {
              const key = `${pi.item.nombre}|||${pi.item.artista ?? ''}`;
              if (!songMap.has(key)) {
                songMap.set(key, { key, nombre: pi.item.nombre, artista: pi.item.artista ?? '', cantidad: 0 });
              }
              songMap.get(key)!.cantidad += Number(pi.cantidad || 0);
            }
          });
        });
        const arr = Array.from(songMap.values()).sort((a, b) => b.cantidad - a.cantidad);
        setSongsAgg(arr);
      } catch (e) {
        console.error('Error cargando ingresos:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    const ch = supabase
      .channel('ingresos-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, () => { fetchAll(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => { fetchAll(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, () => { fetchAll(); })
    .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [startISO, endISO]);

  // Totales
  const totalHoy = pagos.reduce((acc, p) => acc + Number(p.total || 0), 0);
  const byMetodo = pagos.reduce<Record<string, number>>((acc, p) => {
    const m = p.metodo || 'sin_método';
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
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white/90">Ingresos</h1>
          </div>
        </header>
        {/* Resumen de pagos */}
        <Card>
          <CardHeader>
            <CardTitle>Pagos del día</CardTitle>
            <CardDescription>Totales y desglose por método</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold mb-4">Total: {currencyCO(totalHoy)}</div>
            <div className="rounded-md border overflow-hidden">
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
                      <TableCell className="capitalize">{met.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right">{currencyCO(val)}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(byMetodo).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2}>Sin pagos registrados hoy</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Canciones solicitadas */}
        <Card>
          <CardHeader>
            <CardTitle>Canciones solicitadas</CardTitle>
            <CardDescription>Hoy se solicitaron {totalCanciones} canciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canción</TableHead>
                    <TableHead>Artista</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {songsAgg.map((s) => (
                    <TableRow key={s.key}>
                      <TableCell>{s.nombre}</TableCell>
                      <TableCell>{s.artista}</TableCell>
                      <TableCell className="text-right">{s.cantidad}</TableCell>
                    </TableRow>
                  ))}
                  {songsAgg.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>Sin canciones hoy</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pedidos del día con items */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos del día</CardTitle>
            <CardDescription>Listado con detalle de items</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground">Cargando…</div>
            ) : pedidos.length === 0 ? (
              <div className="text-muted-foreground">No hay pedidos registrados hoy</div>
            ) : (
              <div className="space-y-4">
                {pedidos.map((p) => (
                  <div key={p.id} className="rounded-md border">
                    <div className="px-4 py-2 flex items-center justify-between">
                      <div className="font-semibold">
                        {p.mesa?.nombre ?? '—'} • {new Date(p.created_at).toLocaleString()}
                      </div>
                      <div className="font-semibold">{currencyCO(Number(p.total || 0))}</div>
                    </div>
                    <div className="border-t">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Cant.</TableHead>
                            <TableHead className="text-right">Precio</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {p.pedido_items.map((pi) => (
                            <TableRow key={pi.id}>
                              <TableCell>
                                <div className="font-medium">{pi.item?.nombre}</div>
                                {pi.item?.artista && (
                                  <div className="text-xs text-muted-foreground">por {pi.item.artista}</div>
                                )}
                              </TableCell>
                              <TableCell className="capitalize">{pi.item?.tipo}</TableCell>
                              <TableCell className="text-right">{pi.cantidad}</TableCell>
                              <TableCell className="text-right">
                                {pi.item?.precio ? currencyCO(Number(pi.item.precio)) : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                {pi.item?.precio ? currencyCO(Number(pi.item.precio) * pi.cantidad) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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
