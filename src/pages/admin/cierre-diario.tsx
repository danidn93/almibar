// src/pages/admin/AdminCierreDiario.tsx

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useOutletContext } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

// ============================================================================
//  Tipos de la RPC cierre_diario
// ============================================================================
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
    tipo: "productos" | "canciones" | "mixto";
    estado: "pendiente" | "preparando" | "entregado" | "cancelado";
    total: number;
    created_at: string;
    items: {
      item_id: string;
      nombre: string;
      tipo: "producto" | "cancion";
      cantidad: number;
      precio: number | null;
      subtotal: number;
    }[];
  }[];
};

// Contexto que provee el layout
type LayoutCtx = { sucursalId: string };

// Formato COP
const currencyCO = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(n);

// ============================================================================
// COMPONENTE
// ============================================================================
export default function AdminCierreDiario() {
  const { toast } = useToast();
  const { sucursalId } = useOutletContext<LayoutCtx>(); // ← AHORA SÍ EXISTE

  const [dateStr, setDateStr] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [tz, setTz] = useState("America/Guayaquil");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CierreResponse | null>(null);

  // ==========================================================================
  // PETICIÓN A LA RPC
  // ==========================================================================
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("cierre_diario", {
        p_fecha: dateStr,
        p_tz: tz,
        p_sucursal: sucursalId, // ← CORRECTO
      });

      if (error) throw error;
      setData(data as CierreResponse);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message ?? "No se pudo cargar el cierre diario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar una vez al montar
  useEffect(() => {
    fetchData();
  }, []);

  // ==========================================================================
  // Badge por estado del pedido
  // ==========================================================================
  const estadoBadge = (
    estado: CierreResponse["pedidos"][number]["estado"]
  ) => {
    const label = estado === "entregado" ? "listo" : estado;

    const variant =
      estado === "entregado"
        ? "default"
        : estado === "preparando"
        ? "secondary"
        : estado === "pendiente"
        ? "destructive"
        : "outline";

    return <Badge variant={variant}>{label}</Badge>;
  };

  // ========================================================================
  // RENDER
  // ========================================================================
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
            <h1 className="text-2xl font-bold text-white/90">
              Cierre Diario
            </h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-6">
          {/* PARÁMETROS */}
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle>Parámetros</CardTitle>
              <CardDescription>
                Consulta el cierre según la fecha local seleccionada.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>

              <div>
                <Label>Zona horaria</Label>
                <Input value={tz} onChange={(e) => setTz(e.target.value)} />
              </div>

              <div className="flex items-end">
                <Button onClick={fetchData} disabled={loading}>
                  {loading ? "Cargando…" : "Consultar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* RESULTADOS */}
          {data && (
            <>
              {/* RESUMEN */}
              <Card className="bg-white shadow-md">
                <CardHeader>
                  <CardTitle>Resumen del día</CardTitle>
                  <CardDescription>
                    Fecha:{" "}
                    <Badge variant="secondary">{data.fecha}</Badge> • TZ:{" "}
                    {data.timezone}
                  </CardDescription>
                </CardHeader>

                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 rounded-lg border bg-white">
                    <div className="text-sm text-muted-foreground">
                      Canciones pedidas
                    </div>
                    <div className="text-2xl font-bold">
                      {data.canciones.total}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-white">
                    <div className="text-sm text-muted-foreground">
                      Ingresos del día
                    </div>
                    <div className="text-2xl font-bold">
                      {currencyCO(Number(data.ingresos.total || 0))}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-white">
                    <div className="text-sm text-muted-foreground">
                      Métodos de pago
                    </div>
                    <div className="space-y-1">
                      {data.ingresos.por_metodo.length === 0 ? (
                        <div className="text-muted-foreground">—</div>
                      ) : (
                        data.ingresos.por_metodo.map((m, i) => (
                          <div
                            key={i}
                            className="flex justify-between text-sm"
                          >
                            <span>{m.metodo}</span>
                            <span className="font-medium">
                              {currencyCO(Number(m.total || 0))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CANCIONES */}
              <Card className="bg-white shadow-md">
                <CardHeader>
                  <CardTitle>Canciones pedidas</CardTitle>
                  <CardDescription>
                    Cantidad total por canción
                  </CardDescription>
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
                          <TableCell
                            colSpan={2}
                            className="text-muted-foreground"
                          >
                            No hay canciones registradas.
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.canciones.listado.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.nombre}</TableCell>
                            <TableCell className="text-right">
                              {c.cantidad}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* PEDIDOS */}
              <Card className="bg-white shadow-md">
                <CardHeader>
                  <CardTitle>Pedidos del día</CardTitle>
                  <CardDescription>
                    Incluye todos los ítems cobrados
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {data.pedidos.length === 0 ? (
                      <div className="text-muted-foreground">
                        No hay pedidos registrados
                      </div>
                    ) : (
                      data.pedidos.map((p) => (
                        <div
                          key={p.id}
                          className="border rounded-lg bg-white shadow-sm"
                        >
                          {/* HEADER DEL PEDIDO */}
                          <div className="p-3 flex items-center justify-between border-b bg-gray-50 rounded-t-lg">
                            <div className="space-x-2">
                              <Badge>{p.mesa}</Badge>
                              <Badge variant="secondary">{p.tipo}</Badge>
                              {estadoBadge(p.estado)}
                            </div>

                            <div className="text-sm">
                              {new Date(p.created_at).toLocaleString()} •{" "}
                              <span className="font-semibold">
                                {currencyCO(Number(p.total || 0))}
                              </span>
                            </div>
                          </div>

                          {/* ITEMS */}
                          <div className="p-3">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Ítem</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead className="text-right">
                                    Cant.
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Precio
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Subtotal
                                  </TableHead>
                                </TableRow>
                              </TableHeader>

                              <TableBody>
                                {p.items.map((it, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>{it.nombre}</TableCell>
                                    <TableCell>{it.tipo}</TableCell>
                                    <TableCell className="text-right">
                                      {it.cantidad}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {it.precio != null
                                        ? currencyCO(Number(it.precio))
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {currencyCO(
                                        Number(it.subtotal || 0)
                                      )}
                                    </TableCell>
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
