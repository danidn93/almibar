import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

type CierreResponse = {
  fecha: string;
  timezone: string;
  canciones: {
    total: number;
    listado: { id: string; nombre: string; cantidad: number }[];
  };
  ingresos: {
    por_metodo: { metodo: string; total: number }[];
    total: number;
  };
  pedidos: {
    id: string;
    mesa_id: string;
    mesa: string;
    tipo: 'productos' | 'canciones' | 'mixto';
    estado: 'pendiente' | 'preparando' | 'entregado' | 'cancelado';
    total: number;
    created_at: string;
    items: {
      item_id: string;
      nombre: string;
      tipo: 'producto' | 'cancion';
      cantidad: number;
      precio: number | null;
      subtotal: number;
    }[];
  }[];
};

const currencyCO = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

export default function AdminCierreDiario() {
  const { toast } = useToast();

  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [tz, setTz] = useState('America/Guayaquil');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CierreResponse | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('cierre_diario', {
        p_fecha: dateStr,
        p_tz: tz,
      });
      if (error) throw error;
      setData(data as CierreResponse);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'No se pudo cargar el cierre', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estadoBadge = (estado: CierreResponse['pedidos'][number]['estado']) => {
    const label = estado === 'entregado' ? 'listo' : estado;
    const variant =
      estado === 'entregado' ? 'default' :
      estado === 'preparando' ? 'secondary' :
      estado === 'pendiente' ? 'destructive' : 'outline';
    return <Badge variant={variant}>{label}</Badge>;
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
            <h1 className="text-2xl font-bold">Cierre Diario</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros</CardTitle>
              <CardDescription>El cierre usa la fecha local y convierte a UTC para filtrar.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Fecha (local)</Label>
                <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
              </div>
              <div>
                <Label>Zona horaria</Label>
                <Input value={tz} onChange={(e) => setTz(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={fetchData} disabled={loading}>
                  {loading ? 'Cargando…' : 'Consultar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {data && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Resumen</CardTitle>
                  <CardDescription>
                    Fecha: <Badge variant="secondary">{data.fecha}</Badge> • TZ: {data.timezone}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Canciones pedidas</div>
                    <div className="text-2xl font-bold">{data.canciones.total}</div>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Ingresos del día</div>
                    <div className="text-2xl font-bold">{currencyCO(Number(data.ingresos.total || 0))}</div>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Métodos de pago</div>
                    <div className="space-y-1">
                      {data.ingresos.por_metodo.length === 0 ? (
                        <div className="text-muted-foreground">—</div>
                      ) : (
                        data.ingresos.por_metodo.map((m, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{m.metodo}</span>
                            <span className="font-medium">{currencyCO(Number(m.total || 0))}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Canciones del día</CardTitle>
                  <CardDescription>Listado con cantidades (según pedidos del día)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.canciones.listado.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-muted-foreground">
                            No hay canciones registradas en el día
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.canciones.listado.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.nombre}</TableCell>
                            <TableCell className="text-right">{c.cantidad}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pedidos del día</CardTitle>
                  <CardDescription>Con sus ítems detallados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.pedidos.length === 0 ? (
                      <div className="text-muted-foreground">No hay pedidos en el día</div>
                    ) : (
                      data.pedidos.map((p) => (
                        <div key={p.id} className="border rounded-lg">
                          <div className="p-3 flex items-center justify-between border-b">
                            <div className="space-x-2">
                              <Badge>{p.mesa}</Badge>
                              <Badge variant="secondary">{p.tipo}</Badge>
                              {estadoBadge(p.estado)}
                            </div>
                            <div className="text-sm">
                              {new Date(p.created_at).toLocaleString()} • <span className="font-semibold">{currencyCO(Number(p.total || 0))}</span>
                            </div>
                          </div>
                          <div className="p-3">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Ítem</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead className="text-right">Cant.</TableHead>
                                  <TableHead className="text-right">Precio</TableHead>
                                  <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {p.items.map((it, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>{it.nombre}</TableCell>
                                    <TableCell>{it.tipo}</TableCell>
                                    <TableCell className="text-right">{it.cantidad}</TableCell>
                                    <TableCell className="text-right">{it.precio != null ? currencyCO(Number(it.precio)) : '—'}</TableCell>
                                    <TableCell className="text-right">{currencyCO(Number(it.subtotal || 0))}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
