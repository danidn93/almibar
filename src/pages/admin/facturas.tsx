import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
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
import { ArrowLeft, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type Factura = {
  id: string;
  cliente_nombre: string | null;
  cliente_identificacion: string | null;
  cliente_email: string | null;
  direccion: string | null;
  subtotal: number;
  impuestos: number;
  total: number;
  metodo_pago: string | null;
  estado: "emitida" | "anulada" | "borrador";
  created_at: string;
  mesa?: { id: string; nombre: string } | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(n);

export default function AdminFacturasPendientes() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [facts, setFacts] = useState<Factura[]>([]);

  const fetchFacturas = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("facturas")
        .select(
          `
            *,
            pedido:pedidos(
              mesa:mesas(id, nombre)
            )
          `
        )
        .eq("estado", "borrador") // ❗ solo pendientes (borrador)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows: Factura[] =
        (data ?? []).map((f: any) => ({
          id: f.id,
          cliente_nombre: f.cliente_nombre,
          cliente_identificacion: f.cliente_identificacion,
          cliente_email: f.cliente_email,
          direccion: f.direccion,
          subtotal: Number(f.subtotal || 0),
          impuestos: Number(f.impuestos || 0),
          total: Number(f.total || 0),
          metodo_pago: f.metodo_pago,
          estado: f.estado,
          created_at: f.created_at,
          mesa: f.pedido?.mesa ?? null,
        })) || [];

      setFacts(rows);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudieron cargar las facturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacturas();

    const ch = supabase
      .channel("facturas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facturas" },
        () => fetchFacturas()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const marcarEmitida = async (id: string) => {
    try {
      const { error } = await supabase
        .from("facturas")
        .update({ estado: "emitida" })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Factura emitida", description: "Actualizada correctamente" });
      fetchFacturas();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo actualizar la factura",
        variant: "destructive",
      });
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-[60vh]">
        {/* HEADER */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white/90">
              Facturas por emitir
            </h1>
          </div>
        </header>

        {/* CONTENT */}
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Pendientes</CardTitle>
              <CardDescription>
                Facturas en estado{" "}
                <Badge variant="secondary">BORRADOR</Badge>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Identificación</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Mesa</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7}>Cargando…</TableCell>
                      </TableRow>
                    ) : facts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>Sin facturas pendientes</TableCell>
                      </TableRow>
                    ) : (
                      facts.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            {new Date(f.created_at).toLocaleString()}
                          </TableCell>

                          <TableCell>
                            <div className="font-medium">
                              {f.cliente_nombre || "—"}
                            </div>
                            {f.direccion && (
                              <div className="text-xs text-muted-foreground">
                                {f.direccion}
                              </div>
                            )}
                          </TableCell>

                          <TableCell>
                            {f.cliente_identificacion || "—"}
                          </TableCell>

                          <TableCell>{f.cliente_email || "—"}</TableCell>

                          <TableCell>
                            {f.mesa ? (
                              <Badge variant="secondary">
                                {f.mesa.nombre}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          <TableCell className="text-right font-semibold">
                            {fmt(f.total)}
                          </TableCell>

                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => marcarEmitida(f.id)}>
                              <Check className="mr-2 h-4 w-4" />
                              Emitir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
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
