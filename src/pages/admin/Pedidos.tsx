// src/pages/admin/Pedidos.tsx
import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle, Clock, Package, Music } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type EstadoPedido = 'pendiente' | 'preparando' | 'listo' | 'cancelado' | 'liquidado';

interface Pedido {
  id: string;
  mesa_id: string;
  tipo: 'productos' | 'canciones' | 'mixto';
  estado: EstadoPedido;
  total: number;
  created_at: string;
  mesas: { nombre: string };
  pedido_items: {
    cantidad: number;
    nota?: string | null;
    items: {
      nombre: string;
      tipo: 'producto' | 'cancion';
      precio?: number | null;
      artista?: string | null;
    };
  }[];
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const AdminPedidos = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPedidos();

    const channel = supabase
      .channel('pedidos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, fetchPedidos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, fetchPedidos)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPedidos = async () => {
    try {
      setIsLoading(true);

      // Solo mostrar pendientes y preparando (excluye listo/cancelado/liquidado)
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          mesas(nombre),
          pedido_items(
            cantidad,
            nota,
            items(nombre, tipo, precio, artista)
          )
        `)
        .in('estado', ['pendiente', 'preparando'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPedidos((data as Pedido[]) || []);
    } catch (error) {
      console.error('Error fetching pedidos:', error);
      toast({ title: "Error", description: "No se pudieron cargar los pedidos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Flujo: pendiente -> preparando -> listo
  const getNextEstado = (e: EstadoPedido): EstadoPedido | undefined => {
    switch (e) {
      case 'pendiente':   return 'preparando';
      case 'preparando':  return 'listo';
      default:            return undefined;
    }
  };

  const updateEstado = async (pedidoId: string, next?: EstadoPedido) => {
    if (!next) return;
    try {
      const { error } = await supabase.from('pedidos').update({ estado: next }).eq('id', pedidoId);
      if (error) throw error;
      await fetchPedidos();
      toast({ title: "Estado actualizado", description: `Ahora está ${next}.` });
    } catch (e: any) {
      console.error('[updateEstado] error', e);
      toast({ title: "Error", description: e?.message || "No se pudo actualizar el estado", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando pedidos...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-white">Pedidos en tiempo real</h1>
            <Badge variant="secondary">{pedidos.length} activos</Badge>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {pedidos.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Clock className="mx-auto h-12 w-12 mb-4" />
                  <p>No hay pedidos activos en este momento</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pedidos.map((pedido) => (
                <Card key={pedido.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {pedido.tipo === 'productos' ? (
                            <Package className="h-5 w-5" />
                          ) : pedido.tipo === 'canciones' ? (
                            <Music className="h-5 w-5" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <Package className="h-5 w-5" />
                              <Music className="h-5 w-5" />
                            </div>
                          )}
                          {pedido.mesas.nombre}
                        </CardTitle>
                        <CardDescription>
                          {new Date(pedido.created_at).toLocaleString()} • Total: {fmtCOP(Number(pedido.total || 0))}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            pedido.estado === 'pendiente'
                              ? 'destructive'
                              : pedido.estado === 'preparando'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {pedido.estado}
                        </Badge>

                        {(() => {
                          const next = getNextEstado(pedido.estado);
                          if (!next) return null;
                          return (
                            <Button size="sm" onClick={() => updateEstado(pedido.id, next)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {`Marcar como ${next}`}
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Precio Unit.</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead>Nota</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pedido.pedido_items.map((pi, index) => {
                          const unit = Number(pi.items.precio || 0);
                          const sub = unit * Number(pi.cantidad || 0);
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="font-medium">{pi.items.nombre}</div>
                                {pi.items.artista && (
                                  <div className="text-sm text-muted-foreground">por {pi.items.artista}</div>
                                )}
                              </TableCell>
                              <TableCell>{pi.cantidad}</TableCell>
                              <TableCell>{unit > 0 ? fmtCOP(unit) : 'Gratis'}</TableCell>
                              <TableCell>{unit > 0 ? fmtCOP(sub) : 'Gratis'}</TableCell>
                              <TableCell>
                                {pi.nota ? <Badge variant="outline" className="text-xs">{pi.nota}</Badge> : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminPedidos;
