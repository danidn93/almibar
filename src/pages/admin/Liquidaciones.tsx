// src/pages/admin/Liquidaciones.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, CreditCard } from 'lucide-react';

type EstadoPedido = 'pendiente' | 'preparando' | 'listo' | 'cancelado' | 'liquidado';
type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';

interface Mesa {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
}

interface ItemRow {
  id: string;
  nombre: string;
  precio: number | null;
  artista?: string | null;
}

interface PedidoItemRow {
  id: string;
  pedido_id: string;
  item_id: string;
  cantidad: number;
  nota?: string | null;
  STATE?: string;
  state?: string;
  item: ItemRow;
}

interface PedidoRow {
  id: string;
  mesa_id: string;
  total: number;
  estado: EstadoPedido;
  liquidado: boolean;
  created_at: string;
  mesa: Mesa;
  pedido_items: PedidoItemRow[];
}

type MesaPendiente = {
  mesa: Mesa;
  total: number;
  pedidos: PedidoRow[];
};

type PendingItemUI = {
  id: string;
  pedido_id: string;
  created_at: string;
  item_id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  nota?: string | null;

  selected: boolean;
  selectedQty: number;
  metodo: '' | MetodoPago;
};

const currencyCO = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

const AdminLiquidaciones = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [mesasPendientes, setMesasPendientes] = useState<MesaPendiente[]>([]);
  const [selectedMesa, setSelectedMesa] = useState<MesaPendiente | null>(null);

  const [pendingItems, setPendingItems] = useState<PendingItemUI[]>([]);

  // Facturación
  const [requiereFactura, setRequiereFactura] = useState<boolean>(false);
  const [factNombres, setFactNombres] = useState('');
  const [factIdentificacion, setFactIdentificacion] = useState('');
  const [factCorreo, setFactCorreo] = useState('');
  const [factTelefono, setFactTelefono] = useState('');
  const [factDireccion, setFactDireccion] = useState('');

  // Lookup facturas por identificación
  const [lastLookupIdent, setLastLookupIdent] = useState<string>('');
  const [factLookupStatus, setFactLookupStatus] = useState<'idle' | 'buscando' | 'encontrado' | 'no_encontrado'>('idle');

  const limpiarFacturaForm = () => {
    setRequiereFactura(false);
    setFactNombres('');
    setFactIdentificacion('');
    setFactCorreo('');
    setFactTelefono('');
    setFactDireccion('');
    setLastLookupIdent('');
    setFactLookupStatus('idle');
  };

  const fetchMesasPendientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          mesa:mesas(*),
          pedido_items(
            *,
            item:items(*)
          )
        `)
        .eq('liquidado', false)
        .eq('estado', 'listo')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const map = new Map<string, MesaPendiente>();
      (data as PedidoRow[] | null)?.forEach((p) => {
        if (!p.mesa) return;
        if (!map.has(p.mesa_id)) {
          map.set(p.mesa_id, { mesa: p.mesa, total: 0, pedidos: [] });
        }
        const entry = map.get(p.mesa_id)!;
        entry.total += Number(p.total || 0);
        entry.pedidos.push({
          ...p,
          pedido_items: (p.pedido_items || []).map((it) => ({
            ...it,
            state: it.state ?? it.STATE,
          })),
        });
      });

      setMesasPendientes(Array.from(map.values()));
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Error',
        description: e?.message || 'No se pudieron cargar las mesas pendientes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMesasPendientes();

    const ch = supabase
      .channel('liquidaciones-mesas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, fetchMesasPendientes)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pagos' }, fetchMesasPendientes)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Construir lista plana de PENDIENTES al abrir mesa
  useEffect(() => {
    if (!selectedMesa) {
      setPendingItems([]);
      return;
    }
    const items: PendingItemUI[] = [];
    selectedMesa.pedidos.forEach((p) => {
      p.pedido_items
        ?.filter((it) => (it.state ?? it.STATE) === 'PENDIENTE')
        .forEach((it) => {
          const precio = Number(it.item?.precio ?? 0);
          const cantidad = Number(it.cantidad ?? 0);
          items.push({
            id: it.id,
            pedido_id: p.id,
            created_at: p.created_at,
            item_id: it.item_id,
            nombre: it.item?.nombre || '—',
            cantidad,
            precio,
            nota: it.nota ?? null,
            selected: false,
            selectedQty: 0,
            metodo: '',
          });
        });
    });
    setPendingItems(items);
  }, [selectedMesa]);

  const totalSeleccionado = useMemo(
    () => pendingItems.reduce((acc, i) => acc + i.selectedQty * i.precio, 0),
    [pendingItems]
  );

  const resumenPorMetodo = useMemo(() => {
    const m = new Map<string, number>();
    pendingItems
      .filter((i) => i.selectedQty > 0 && i.metodo)
      .forEach((i) => m.set(i.metodo, (m.get(i.metodo) ?? 0) + i.selectedQty * i.precio));
    return Array.from(m.entries());
  }, [pendingItems]);

  // Selección helpers
  const toggleSelectAll = (checked: boolean) => {
    setPendingItems((prev) =>
      prev.map((i) => ({
        ...i,
        selected: checked,
        selectedQty: checked ? i.cantidad : 0,
      }))
    );
  };

  const setMetodoForSelected = (metodo: MetodoPago) => {
    setPendingItems((prev) =>
      prev.map((i) => (i.selectedQty > 0 ? { ...i, metodo } : i))
    );
  };

  const changeSelectedQty = (id: string, nextQty: number) => {
    setPendingItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const clamped = Math.max(0, Math.min(i.cantidad, Math.floor(Number(nextQty) || 0)));
        return {
          ...i,
          selected: clamped > 0,
          selectedQty: clamped,
        };
      })
    );
  };

  // Lookup de datos de facturación al completar 10/13 dígitos
  useEffect(() => {
    const run = async () => {
      if (!requiereFactura) return;

      const id = factIdentificacion.trim();
      const isValidLen = /^\d{10}(\d{3})?$/.test(id);
      if (!isValidLen) {
        setFactLookupStatus(id.length > 0 ? 'idle' : 'idle');
        return;
      }
      if (id === lastLookupIdent) return;

      setLastLookupIdent(id);
      setFactLookupStatus('buscando');

      try {
        const { data, error } = await supabase
          .from('facturas')
          .select('nombres, telefono, direccion, correo, identificacion, created_at')
          .eq('identificacion', id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        const row = (data as any[])?.[0];
        if (row) {
          setFactNombres(row.nombres ?? '');
          setFactCorreo(row.correo ?? '');
          setFactTelefono(row.telefono ?? '');
          setFactDireccion(row.direccion ?? '');
          setFactLookupStatus('encontrado');
        } else {
          setFactLookupStatus('no_encontrado');
        }
      } catch (e) {
        console.error(e);
        setFactLookupStatus('idle');
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiereFactura, factIdentificacion]);

  // Procesar pagos
  const processPagosSeleccionados = async () => {
    if (!selectedMesa) {
      toast({ title: 'Falta información', description: 'Selecciona una mesa', variant: 'destructive' });
      return;
    }

    const seleccionados = pendingItems.filter((i) => i.selectedQty > 0);
    if (seleccionados.length === 0) {
      toast({ title: 'Nada seleccionado', description: 'Selecciona al menos una unidad a pagar.', variant: 'destructive' });
      return;
    }
    const sinMetodo = seleccionados.filter((i) => !i.metodo);
    if (sinMetodo.length > 0) {
      toast({
        title: 'Método faltante',
        description: 'Asigna un método de pago a todos los ítems seleccionados.',
        variant: 'destructive',
      });
      return;
    }

    if (requiereFactura) {
      if (!/^\d{10}(\d{3})?$/.test(factIdentificacion.trim())) {
        toast({
          title: 'Identificación inválida',
          description: 'Ingresa 10 (cédula) o 13 (RUC) dígitos.',
          variant: 'destructive',
        });
        return;
      }
      if (!factNombres.trim()) {
        toast({
          title: 'Datos faltantes',
          description: 'Completa los nombres/razón social para la factura.',
          variant: 'destructive',
        });
        return;
      }
    }

    setProcessingPayment(true);
    try {
      // 1) Agrupar seleccionados por método
      const grupos = new Map<MetodoPago, PendingItemUI[]>();
      seleccionados.forEach((i) => {
        const key = i.metodo as MetodoPago;
        grupos.set(key, [...(grupos.get(key) ?? []), i]);
      });

      // 2) Crear pagos por método + (si requiere) facturas por pedido dentro de cada método
      for (const [metodo, items] of grupos.entries()) {
        const totalGrupo = items.reduce((acc, i) => acc + i.selectedQty * i.precio, 0);

        // Pago por método
        const { error: pagoErr } = await supabase.from('pagos').insert({
          mesa_id: selectedMesa.mesa.id,
          metodo,
          total: totalGrupo,
        });
        if (pagoErr) throw pagoErr;

        // Facturas: una por cada pedido_id afectado en este método
        if (requiereFactura) {
          const totalesPorPedido = new Map<string, number>();
          for (const it of items) {
            const subtotal = it.selectedQty * it.precio;
            totalesPorPedido.set(it.pedido_id, (totalesPorPedido.get(it.pedido_id) ?? 0) + subtotal);
          }

          const facturasAInsertar = Array.from(totalesPorPedido.entries()).map(([pedidoId, valor]) => ({
            pedido_id: pedidoId,                    // ✅ ahora guardamos el pedido_id
            mesa_id: selectedMesa.mesa.id,
            requiere_factura: true,
            nombres: factNombres,
            identificacion: factIdentificacion.trim(),
            telefono: factTelefono || null,
            direccion: factDireccion || null,
            correo: factCorreo || null,
            valor,                                  // valor parcial correspondiente a ese pedido dentro del método
          }));

          const { error: factErr } = await supabase.from('facturas').insert(facturasAInsertar as any);
          if (factErr) throw factErr;
        }
      }

      // 3) Actualizar líneas (split o marcar pagado)
      for (const it of seleccionados) {
        if (it.selectedQty === it.cantidad) {
          const { error: updAllErr } = await supabase
            .from('pedido_items')
            .update({ state: 'PAGADO' })
            .eq('id', it.id);
          if (updAllErr) throw updAllErr;
        } else {
          const remaining = it.cantidad - it.selectedQty;

          const { error: updRemErr } = await supabase
            .from('pedido_items')
            .update({ cantidad: remaining } as any)
            .eq('id', it.id);
          if (updRemErr) throw updRemErr;

          const { error: insPaidErr } = await supabase
            .from('pedido_items')
            .insert({
              pedido_id: it.pedido_id,
              item_id: it.item_id,
              cantidad: it.selectedQty,
              nota: it.nota ?? null,
              state: 'PAGADO',
            });
          if (insPaidErr) throw insPaidErr;
        }
      }

      // 4) Marcar pedidos como liquidados si no quedan pendientes
      const pedidosAfectados = Array.from(new Set(seleccionados.map((i) => i.pedido_id)));
      for (const pedidoId of pedidosAfectados) {
        const { data: restantes, error: restErr } = await supabase
          .from('pedido_items')
          .select('id, state')
          .eq('pedido_id', pedidoId)
          .neq('state', 'PAGADO');
        if (restErr) throw restErr;

        const quedanPendientes = (restantes?.length ?? 0) > 0;
        if (!quedanPendientes) {
          const { error: updPedidoErr } = await supabase
            .from('pedidos')
            .update({ liquidado: true })
            .eq('id', pedidoId);
          if (updPedidoErr) throw updPedidoErr;
        }
      }

      toast({
        title: 'Pagos registrados',
        description: `Se procesaron ${seleccionados.reduce((a, i) => a + i.selectedQty, 0)} unidad(es) por ${currencyCO(
          totalSeleccionado
        )}.`,
      });

      setSelectedMesa(null);
      limpiarFacturaForm();
      setPendingItems([]);
      await fetchMesasPendientes();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'No se pudo procesar el pago', variant: 'destructive' });
    } finally {
      setProcessingPayment(false);
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
            <h1 className="text-2xl font-bold text-white/90">Liquidaciones</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Mesas pendientes de liquidar</CardTitle>
              <CardDescription>
                Agrupación de pedidos <Badge variant="secondary">listos</Badge> (estado <code>listo</code>) y no liquidados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Cargando...</p>
              ) : mesasPendientes.length === 0 ? (
                <p className="text-muted-foreground">No hay mesas pendientes de liquidación</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mesa</TableHead>
                        <TableHead>Pedidos</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mesasPendientes.map((mp) => (
                        <TableRow key={mp.mesa.id}>
                          <TableCell className="font-medium">{mp.mesa.nombre}</TableCell>
                          <TableCell>{mp.pedidos.length}</TableCell>
                          <TableCell className="font-semibold">{currencyCO(mp.total)}</TableCell>
                          <TableCell className="text-right">
                            <Dialog
                              onOpenChange={(open) => {
                                if (!open) {
                                  setSelectedMesa(null);
                                  limpiarFacturaForm();
                                  setPendingItems([]);
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button size="sm" onClick={() => setSelectedMesa(mp)}>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Liquidar mesa
                                </Button>
                              </DialogTrigger>

                              {/* Mantener modal centrado y con scroll interno */}
                              <DialogContent className="sm:max-w-[1000px] max-h-[90vh] p-0 overflow-hidden">
                                <div className="flex h-full max-h-[90vh] flex-col">
                                  {/* Header (no scroll) */}
                                  <DialogHeader className="px-6 pt-6">
                                    <DialogTitle>Liquidar {selectedMesa?.mesa?.nombre ?? '—'}</DialogTitle>
                                    <DialogDescription>
                                      Selecciona cuántas unidades de cada producto en{' '}
                                      <Badge variant="secondary">PENDIENTE</Badge> deseas cobrar.
                                    </DialogDescription>
                                  </DialogHeader>

                                  {/* Zona scrollable */}
                                  <div className="flex-1 overflow-y-auto px-6 pb-6">
                                    {/* Controles rápidos */}
                                    <div className="flex flex-wrap items-center gap-2 pb-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleSelectAll(true)}
                                        disabled={!pendingItems.length}
                                      >
                                        Seleccionar todo
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleSelectAll(false)}
                                        disabled={!pendingItems.length}
                                      >
                                        Limpiar selección
                                      </Button>
                                      <div className="flex items-center gap-2 ml-auto">
                                        <Label className="text-sm">Asignar método a seleccionados:</Label>
                                        <Select onValueChange={(v: MetodoPago) => setMetodoForSelected(v as MetodoPago)}>
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Elegir método" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="efectivo">Efectivo</SelectItem>
                                            <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                            <SelectItem value="transferencia">Transferencia</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    {/* Detalle de ítems pendientes (scroll propio adicional) */}
                                    <div className="rounded-md border max-h-[50vh] overflow-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="w-[44px]"></TableHead>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="text-right">Pend.</TableHead>
                                            <TableHead className="text-right">A pagar</TableHead>
                                            <TableHead className="text-right">Precio</TableHead>
                                            <TableHead className="text-right">Subtotal sel.</TableHead>
                                            <TableHead>Método</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {pendingItems.length === 0 ? (
                                            <TableRow>
                                              <TableCell colSpan={7} className="text-muted-foreground">
                                                No hay ítems pendientes en esta mesa.
                                              </TableCell>
                                            </TableRow>
                                          ) : (
                                            pendingItems.map((pi) => (
                                              <TableRow key={pi.id}>
                                                <TableCell>
                                                  <Checkbox
                                                    checked={pi.selected}
                                                    onCheckedChange={(v) => {
                                                      const checked = Boolean(v);
                                                      setPendingItems((prev) =>
                                                        prev.map((x) =>
                                                          x.id === pi.id
                                                            ? {
                                                                ...x,
                                                                selected: checked,
                                                                selectedQty: checked ? x.cantidad : 0,
                                                              }
                                                            : x
                                                        )
                                                      );
                                                    }}
                                                  />
                                                </TableCell>
                                                <TableCell>
                                                  <div className="font-medium">{pi.nombre}</div>
                                                  <div className="text-xs text-muted-foreground">
                                                    Pedido {pi.pedido_id.slice(0, 8)} • {new Date(pi.created_at).toLocaleString()}
                                                  </div>
                                                  {pi.nota ? (
                                                    <div className="text-xs text-muted-foreground mt-1">Nota: {pi.nota}</div>
                                                  ) : null}
                                                </TableCell>
                                                <TableCell className="text-right">{pi.cantidad}</TableCell>
                                                <TableCell className="text-right">
                                                  <Input
                                                    type="number"
                                                    min={0}
                                                    max={pi.cantidad}
                                                    value={pi.selectedQty}
                                                    className="w-[90px] text-right"
                                                    onChange={(e) => changeSelectedQty(pi.id, Number(e.target.value))}
                                                  />
                                                </TableCell>
                                                <TableCell className="text-right">{currencyCO(pi.precio)}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                  {currencyCO(pi.selectedQty * pi.precio)}
                                                </TableCell>
                                                <TableCell>
                                                  <Select
                                                    value={pi.metodo || undefined}
                                                    onValueChange={(v: MetodoPago) =>
                                                      setPendingItems((prev) =>
                                                        prev.map((x) => (x.id === pi.id ? { ...x, metodo: v } : x))
                                                      )
                                                    }
                                                  >
                                                    <SelectTrigger className="w-[160px]">
                                                      <SelectValue placeholder="Método" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="efectivo">Efectivo</SelectItem>
                                                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                                      <SelectItem value="transferencia">Transferencia</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </TableCell>
                                              </TableRow>
                                            ))
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>

                                    {/* Resumen selección */}
                                    <div className="pt-4 space-y-2">
                                      <div className="text-sm text-muted-foreground">
                                        Total seleccionado:{' '}
                                        <span className="font-semibold text-foreground">{currencyCO(totalSeleccionado)}</span>
                                      </div>
                                      {resumenPorMetodo.length > 0 && (
                                        <div className="text-sm">
                                          <div className="font-medium mb-1">Totales por método:</div>
                                          <div className="flex flex-wrap gap-3">
                                            {resumenPorMetodo.map(([metodo, total]) => (
                                              <Badge key={metodo} variant="secondary">
                                                {metodo}: {currencyCO(total)}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Facturación */}
                                    <div className="space-y-3 pt-4">
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id="req-fact"
                                          checked={requiereFactura}
                                          onCheckedChange={(v) => setRequiereFactura(Boolean(v))}
                                        />
                                        <Label htmlFor="req-fact">¿Requiere factura?</Label>
                                      </div>

                                      {requiereFactura && (
                                        <div className="grid gap-3 md:grid-cols-2">
                                          {/* Identificación primero (dispara lookup) */}
                                          <div className="space-y-1">
                                            <Label>Cédula o RUC *</Label>
                                            <Input
                                              value={factIdentificacion}
                                              onChange={(e) =>
                                                setFactIdentificacion(e.target.value.replace(/\D/g, ''))
                                              }
                                              placeholder="10 (cédula) o 13 (RUC) dígitos"
                                              maxLength={13}
                                            />
                                            <div className="text-xs text-muted-foreground">
                                              {factLookupStatus === 'buscando' && 'Buscando datos anteriores…'}
                                              {factLookupStatus === 'encontrado' &&
                                                'Datos precargados desde la última factura. Puedes editarlos.'}
                                              {factLookupStatus === 'no_encontrado' &&
                                                'No se encontraron facturas previas para esta identificación.'}
                                            </div>
                                          </div>

                                          <div className="space-y-1 md:col-span-2">
                                            <Label>Nombres / Razón social *</Label>
                                            <Input value={factNombres} onChange={(e) => setFactNombres(e.target.value)} />
                                          </div>
                                          <div className="space-y-1">
                                            <Label>Correo</Label>
                                            <Input type="email" value={factCorreo} onChange={(e) => setFactCorreo(e.target.value)} />
                                          </div>
                                          <div className="space-y-1">
                                            <Label>Teléfono</Label>
                                            <Input value={factTelefono} onChange={(e) => setFactTelefono(e.target.value)} />
                                          </div>
                                          <div className="space-y-1 md:col-span-2">
                                            <Label>Dirección</Label>
                                            <Input value={factDireccion} onChange={(e) => setFactDireccion(e.target.value)} />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Footer (no scroll) */}
                                  <DialogFooter className="px-6 py-4 border-t">
                                    <Button
                                      onClick={processPagosSeleccionados}
                                      disabled={
                                        processingPayment ||
                                        pendingItems.filter((i) => i.selectedQty > 0).length === 0 ||
                                        pendingItems.some((i) => i.selectedQty > 0 && !i.metodo)
                                      }
                                    >
                                      {processingPayment ? 'Procesando...' : 'Confirmar pagos'}
                                    </Button>
                                  </DialogFooter>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminLiquidaciones;
