// src/pages/admin/AdminFacturasPendientes.tsx
import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

type FacturaState = 'PENDIENTE' | 'EMITIDA';

type Factura = {
  id: string;
  requiere_factura: boolean | null;
  state: FacturaState | null;
  nombres: string | null;
  identificacion: string | null;
  telefono: string | null;
  direccion: string | null;
  correo: string | null;
  created_at: string;
  valor: number | null; // normalizado a número
  mesa: { id: string; nombre: string } | null;
};

const currencyCO = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

export default function AdminFacturasPendientes() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [facts, setFacts] = useState<Factura[]>([]);

  const fetchFacturas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select(`
          id,
          requiere_factura,
          state,
          nombres,
          identificacion,
          telefono,
          direccion,
          correo,
          created_at,
          valor,
          mesa:mesas(id,nombre)
        `)
        // Mostrar:
        // - Nuevas: state = 'PENDIENTE'
        // - Antiguas: state IS NULL y requiere_factura = true (por compatibilidad)
        .or('state.eq.PENDIENTE,and(state.is.null,requiere_factura.eq.true)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows: Factura[] = (data ?? []).map((r: any) => ({
        id: r.id,
        requiere_factura:
          typeof r.requiere_factura === 'boolean'
            ? r.requiere_factura
            : r.requiere_factura === 'true', // por si vino como texto
        state: r.state ?? null,
        nombres: r.nombres ?? null,
        identificacion: r.identificacion ?? null,
        telefono: r.telefono ?? null,
        direccion: r.direccion ?? null,
        correo: r.correo ?? null,
        created_at: r.created_at,
        valor:
          r.valor === null || r.valor === undefined || r.valor === ''
            ? null
            : typeof r.valor === 'number'
            ? r.valor
            : Number(r.valor),
        mesa: r.mesa ?? null,
      }));

      setFacts(rows);
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'No se pudieron cargar las facturas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacturas();

    const ch = supabase
      .channel('facturas-pendientes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'facturas' },
        fetchFacturas
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const marcarEmitida = async (id: string) => {
    try {
      const { error } = await supabase
        .from('facturas')
        .update({
          state: 'EMITIDA',          // ✅ nuevo estado
          requiere_factura: false,   // (opcional) mantenemos consistencia con el flag anterior
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Listo', description: 'Factura marcada como emitida' });
      fetchFacturas();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo marcar la factura', variant: 'destructive' });
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
            <h1 className="text-2xl font-bold text-white/90">Facturas por emitir</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Pendientes</CardTitle>
              <CardDescription>Solicitudes de factura en estado <Badge variant="secondary">PENDIENTE</Badge></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Identificación</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Mesa</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7}>Cargando…</TableCell></TableRow>
                    ) : facts.length === 0 ? (
                      <TableRow><TableCell colSpan={7}>Sin facturas pendientes</TableCell></TableRow>
                    ) : (
                      facts.map((f) => {
                        const valorNum = Number(f.valor ?? 0);
                        return (
                          <TableRow key={f.id}>
                            <TableCell>{new Date(f.created_at).toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="font-medium">{f.nombres || '—'}</div>
                              {f.direccion && <div className="text-xs text-muted-foreground">{f.direccion}</div>}
                            </TableCell>
                            <TableCell>{f.identificacion || '—'}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {f.correo || '—'}
                                {f.telefono && <div className="text-xs text-muted-foreground">{f.telefono}</div>}
                              </div>
                            </TableCell>
                            <TableCell>
                              {f.mesa ? (
                                <Badge variant="secondary">Mesa: {f.mesa.nombre}</Badge>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {valorNum > 0 ? currencyCO(valorNum) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" onClick={() => marcarEmitida(f.id)}>
                                <Check className="mr-2 h-4 w-4" />
                                Marcar emitida
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}
