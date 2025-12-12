import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CreditCard } from "lucide-react";

/* ============================================================
   TIPOS AJUSTADOS 100% AL ESQUEMA REAL
   ============================================================ */

interface Mesa {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
}

interface ProductoLocal {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  tipo: "producto" | "cancion";
  precio: number;
  image_url?: string | null;
}

interface PedidoItemRow {
  id: string;
  pedido_id: string;
  producto_id: string;
  cantidad: number;
  nota?: string | null;
  state: "PENDIENTE" | "PREPARANDO" | "LISTO";
  pagado: number;
  item: ProductoLocal;
}

interface PedidoRow {
  id: string;
  mesa_id: string;
  total: number;
  estado: string; // YA NO EstadoPedido para evitar TS error
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

type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

type PendingItemUI = {
  id: string;
  pedido_id: string;
  created_at: string;
  item_id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  nota?: string | null;
  isSong: boolean;
  selected: boolean;
  selectedQty: number;
  metodo: "" | MetodoPago;
};

/* ============================================================
   HELPERS
   ============================================================ */

const currency = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */

const AdminLiquidaciones = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [mesasPendientes, setMesasPendientes] = useState<MesaPendiente[]>([]);
  const [selectedMesa, setSelectedMesa] = useState<MesaPendiente | null>(null);

  const [pendingItems, setPendingItems] = useState<PendingItemUI[]>([]);

  /* ============================================================
     CARGAR MESAS PENDIENTES
     ============================================================ */

  const fetchMesasPendientes = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("pedidos")
        .select(
          `
          *,
          mesa:mesas(*),
          pedido_items(
            *,
            item:productos_local(*)
          )
        `
        )
        .eq("estado", "listo")
        .eq("liquidado", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const map = new Map<string, MesaPendiente>();

      (data ?? []).forEach((p: PedidoRow) => {
        if (!map.has(p.mesa_id)) {
          map.set(p.mesa_id, {
            mesa: p.mesa,
            total: 0,
            pedidos: []
          });
        }
        const entry = map.get(p.mesa_id)!;
        entry.total += Number(p.total);
        entry.pedidos.push(p);
      });

      setMesasPendientes(Array.from(map.values()));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMesasPendientes();

    const ch = supabase
      .channel("liquidaciones")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, fetchMesasPendientes)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  /* ============================================================
     CONSTRUIR LISTA DE ITEMS
     ============================================================ */

  useEffect(() => {
    if (!selectedMesa) return setPendingItems([]);

    const items: PendingItemUI[] = [];

    selectedMesa.pedidos.forEach((p) => {
      p.pedido_items
        .filter((x) => x.state === "PENDIENTE")
        .forEach((x) => {
          const isSong = x.item.tipo === "cancion";

          items.push({
            id: x.id,
            pedido_id: p.id,
            created_at: p.created_at,
            item_id: x.producto_id,
            nombre: x.item.nombre,
            cantidad: x.cantidad,
            precio: isSong ? 0 : Number(x.item.precio),
            nota: x.nota,
            isSong,
            selected: false,
            selectedQty: 0,
            metodo: ""
          });
        });
    });

    setPendingItems(items);
  }, [selectedMesa]);

  /* ============================================================
     TOTALES
     ============================================================ */

  const totalSeleccionado = useMemo(
    () => pendingItems.reduce((acc, i) => acc + i.selectedQty * i.precio, 0),
    [pendingItems]
  );

  const resumenPorMetodo = useMemo(() => {
    const m = new Map<string, number>();
    pendingItems
      .filter((i) => i.selectedQty > 0 && i.metodo)
      .forEach((i) => m.set(i.metodo!, (m.get(i.metodo!) ?? 0) + i.selectedQty * i.precio));
    return Array.from(m.entries());
  }, [pendingItems]);

  /* ============================================================
     SELECCIÓN
     ============================================================ */

  const toggleSelectAll = (checked: boolean) => {
    setPendingItems((prev) =>
      prev.map((i) => {
        if (i.isSong) return { ...i, selected: false, selectedQty: 0 };
        return { ...i, selected: checked, selectedQty: checked ? i.cantidad : 0 };
      })
    );
  };

  const changeSelectedQty = (id: string, qty: number) => {
    setPendingItems((prev) =>
      prev.map((i) => {
        if (i.id !== id || i.isSong) return i;
        const q = Math.max(0, Math.min(i.cantidad, Math.floor(qty)));
        return { ...i, selected: q > 0, selectedQty: q };
      })
    );
  };

  /* ============================================================
     PROCESAR PAGO (AJUSTADO A TU ESQUEMA)
     ============================================================ */

  const processPagos = async () => {
    if (!selectedMesa) return;

    const seleccionados = pendingItems.filter((i) => i.selectedQty > 0 && !i.isSong);

    if (seleccionados.length === 0) {
      return toast({
        title: "Nada seleccionado",
        description: "Las canciones no pueden cobrarse.",
        variant: "destructive"
      });
    }

    if (seleccionados.some((i) => !i.metodo)) {
      return toast({
        title: "Falta método",
        description: "Todos los productos seleccionados deben tener un método de pago.",
        variant: "destructive"
      });
    }

    setProcessingPayment(true);

    try {
      /* === 1. Agrupar por método === */
      const grupos = new Map<MetodoPago, PendingItemUI[]>();
      seleccionados.forEach((i) => {
        const arr = grupos.get(i.metodo as MetodoPago) ?? [];
        arr.push(i);
        grupos.set(i.metodo as MetodoPago, arr);
      });

      /* === 2. Registrar pagos === */
      for (const [metodo, items] of grupos.entries()) {
        const total = items.reduce((acc, it) => acc + it.selectedQty * it.precio, 0);

        const { error: pagoErr } = await supabase.from("pagos").insert({
          sucursal_id: selectedMesa.mesa.id,
          mesa_id: selectedMesa.mesa.id,
          total,
          metodo
        });

        if (pagoErr) throw pagoErr;
      }

      /* === 3. Actualizar pedido_items === */
      for (const it of seleccionados) {
        if (it.selectedQty === it.cantidad) {
          // marcar como pagado completamente
          await supabase
            .from("pedido_items")
            .update({ state: "LISTO", pagado: it.cantidad })
            .eq("id", it.id);
        } else {
          // split
          const remaining = it.cantidad - it.selectedQty;

          // actualizar línea original
          await supabase
            .from("pedido_items")
            .update({ cantidad: remaining, pagado: 0 })
            .eq("id", it.id);

          // insertar línea pagada
          await supabase.from("pedido_items").insert({
            pedido_id: it.pedido_id,
            producto_id: it.item_id,
            cantidad: it.selectedQty,
            nota: it.nota,
            state: "LISTO",
            pagado: it.selectedQty
          });
        }
      }

      toast({
        title: "Pagos registrados",
        description: `Total cobrado: ${currency(totalSeleccionado)}`
      });

      setSelectedMesa(null);
      setPendingItems([]);
      fetchMesasPendientes();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setProcessingPayment(false);
    }
  };

  /* ============================================================
     RENDER
     ============================================================ */

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
            <h1 className="text-2xl font-bold text-white">Liquidaciones</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Mesas pendientes</CardTitle>
              <CardDescription>Pedidos listos y no liquidados.</CardDescription>
            </CardHeader>

            <CardContent>
              {loading ? (
                <p>Cargando…</p>
              ) : mesasPendientes.length === 0 ? (
                <p>No hay mesas pendientes.</p>
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
                          <TableCell>{mp.mesa.nombre}</TableCell>
                          <TableCell>{mp.pedidos.length}</TableCell>
                          <TableCell className="font-bold">{currency(mp.total)}</TableCell>

                          <TableCell className="text-right">
                            <Dialog
                              onOpenChange={(o) => {
                                if (!o) {
                                  setSelectedMesa(null);
                                  setPendingItems([]);
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button size="sm" onClick={() => setSelectedMesa(mp)}>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Liquidar
                                </Button>
                              </DialogTrigger>

                              <DialogContent className="sm:max-w-[1100px] max-h-[90vh] p-0 overflow-hidden">
                                <div className="flex flex-col h-full">
                                  <DialogHeader className="px-6 pt-6">
                                    <DialogTitle>Liquidar mesa {selectedMesa?.mesa.nombre}</DialogTitle>
                                    <DialogDescription>
                                      Las canciones no se cobran. Solo productos.
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="flex-1 overflow-y-auto px-6 pb-6">
                                    <div className="flex items-center gap-2 pb-3">
                                      <Button variant="outline" size="sm" onClick={() => toggleSelectAll(true)}>
                                        Seleccionar todo
                                      </Button>

                                      <Button variant="outline" size="sm" onClick={() => toggleSelectAll(false)}>
                                        Limpiar
                                      </Button>

                                      <div className="ml-auto">
                                        <Label className="mr-2">Método:</Label>
                                        <Select
                                          onValueChange={(v) =>
                                            setPendingItems((prev) =>
                                              prev.map((x) =>
                                                x.selectedQty > 0 && !x.isSong ? { ...x, metodo: v as MetodoPago } : x
                                              )
                                            )
                                          }
                                        >
                                          <SelectTrigger className="w-[160px]">
                                            <SelectValue placeholder="Asignar método" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="efectivo">Efectivo</SelectItem>
                                            <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                            <SelectItem value="transferencia">Transferencia</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div className="rounded-md border max-h-[55vh] overflow-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead></TableHead>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="text-right">Pend.</TableHead>
                                            <TableHead className="text-right">Pagar</TableHead>
                                            <TableHead className="text-right">Precio</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                            <TableHead>Método</TableHead>
                                          </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                          {pendingItems.length === 0 ? (
                                            <TableRow>
                                              <TableCell colSpan={7}>No hay ítems pendientes.</TableCell>
                                            </TableRow>
                                          ) : (
                                            pendingItems.map((i) => (
                                              <TableRow key={i.id}>
                                                <TableCell>
                                                  <Checkbox
                                                    disabled={i.isSong}
                                                    checked={i.selected}
                                                    onCheckedChange={(v) =>
                                                      changeSelectedQty(i.id, v ? i.cantidad : 0)
                                                    }
                                                  />
                                                </TableCell>

                                                <TableCell>
                                                  <div className="font-medium">
                                                    {i.nombre}
                                                    {i.isSong && (
                                                      <Badge variant="outline" className="ml-2">
                                                        Canción
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </TableCell>

                                                <TableCell className="text-right">{i.cantidad}</TableCell>

                                                <TableCell className="text-right">
                                                  {i.isSong ? (
                                                    "—"
                                                  ) : (
                                                    <Input
                                                      type="number"
                                                      value={i.selectedQty}
                                                      min={0}
                                                      max={i.cantidad}
                                                      className="w-[80px]"
                                                      onChange={(e) => changeSelectedQty(i.id, Number(e.target.value))}
                                                    />
                                                  )}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                  {i.isSong ? "—" : currency(i.precio)}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                  {i.isSong ? "—" : currency(i.selectedQty * i.precio)}
                                                </TableCell>

                                                <TableCell>
                                                  {i.isSong ? (
                                                    "N/A"
                                                  ) : (
                                                    <Select
                                                      value={i.metodo || undefined}
                                                      onValueChange={(v) =>
                                                        setPendingItems((prev) =>
                                                          prev.map((x) =>
                                                            x.id === i.id ? { ...x, metodo: v as MetodoPago } : x
                                                          )
                                                        )
                                                      }
                                                    >
                                                      <SelectTrigger className="w-[140px]">
                                                        <SelectValue placeholder="Método" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        <SelectItem value="efectivo">Efectivo</SelectItem>
                                                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                                        <SelectItem value="transferencia">Transferencia</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            ))
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>

                                    <div className="pt-4 space-y-2">
                                      <div className="text-sm">
                                        Total seleccionado:{" "}
                                        <strong>{currency(totalSeleccionado)}</strong>
                                      </div>

                                      {resumenPorMetodo.length > 0 && (
                                        <div className="text-sm">
                                          <div className="font-semibold">Totales por método:</div>
                                          <div className="flex gap-2 flex-wrap">
                                            {resumenPorMetodo.map(([m, v]) => (
                                              <Badge key={m} variant="secondary">
                                                {m}: {currency(v)}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <DialogFooter className="px-6 py-4 border-t">
                                    <Button
                                      disabled={
                                        processingPayment ||
                                        pendingItems.filter((i) => i.selectedQty > 0 && !i.isSong).length === 0
                                      }
                                      onClick={processPagos}
                                    >
                                      {processingPayment ? "Procesando..." : "Confirmar pago"}
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
