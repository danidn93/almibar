// src/pages/admin/Mesas.tsx
import { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, QrCode, Trash2, Copy, Pencil, Check, X, RefreshCw, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import type { TablesUpdate } from "@/integrations/supabase/types";

interface Mesa {
  id: string;
  sucursal_id: string;
  nombre: string;
  slug: string;
  token: string;
  activa: boolean;
  created_at: string;
  pin_hash?: string | null;
}

type MesaUpdate = TablesUpdate<"mesas">;

export default function AdminMesas() {
  const { sucursalId } = useOutletContext<{ sucursalId: string }>();
  const { toast } = useToast();

  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [newMesaName, setNewMesaName] = useState("");
  const [newMesaPin, setNewMesaPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPin, setEditingPin] = useState("");

  useEffect(() => {
    if (!sucursalId) return;
    fetchMesas();
  }, [sucursalId]);

  const fetchMesas = async () => {
    const { data, error } = await supabase
      .from("mesas")
      .select("*")
      .eq("sucursal_id", sucursalId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast({ title: "Error al cargar mesas", variant: "destructive" });
      return;
    }

    setMesas(data as Mesa[]);
  };

  const randomPin = () => String(Math.floor(1000 + Math.random() * 9000));

  const createMesa = async () => {
    if (!newMesaName.trim()) {
      toast({ title: "Nombre requerido", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const slug = `mesa-${Date.now()}`;
    const token = Math.random().toString(36).substring(2, 15);
    const pin_hash = newMesaPin.trim()
      ? newMesaPin.replace(/\D/g, "").slice(0, 6)
      : randomPin();

    const { error } = await supabase.from("mesas").insert([
      {
        sucursal_id: sucursalId,
        nombre: newMesaName.trim(),
        slug,
        token,
        pin_hash,
        activa: true
      }
    ]);

    if (error) {
      console.error(error);
      toast({ title: "No se pudo crear mesa", variant: "destructive" });
    } else {
      toast({ title: "Mesa creada", description: newMesaName });
      setNewMesaName("");
      setNewMesaPin("");
      fetchMesas();
    }

    setIsLoading(false);
  };

  const toggleActiva = async (mesa: Mesa, nuevaActiva: boolean) => {
    setMesas((prev) =>
      prev.map((m) => (m.id === mesa.id ? { ...m, activa: nuevaActiva } : m))
    );

    const payload: MesaUpdate = { activa: nuevaActiva };

    const { error } = await supabase.from("mesas").update(payload).eq("id", mesa.id);

    if (error) {
      toast({ title: "Error actualizando", variant: "destructive" });
      fetchMesas();
    }
  };

  const startEditPin = (mesa: Mesa) => {
    setEditingId(mesa.id);
    setEditingPin((mesa.pin_hash || "").slice(0, 6));
  };

  const cancelEditPin = () => {
    setEditingId(null);
    setEditingPin("");
  };

  const saveEditPin = async (mesaId: string) => {
    const sanitized = editingPin.replace(/\D/g, "").slice(0, 6);

    const payload: MesaUpdate = { pin_hash: sanitized || null };

    const { error } = await supabase.from("mesas").update(payload).eq("id", mesaId);

    if (error) {
      toast({ title: "Error al actualizar PIN", variant: "destructive" });
    } else {
      toast({ title: sanitized ? "PIN actualizado" : "PIN eliminado" });
      fetchMesas();
    }

    setEditingId(null);
    setEditingPin("");
  };

  const deleteMesa = async (id: string) => {
    const { error } = await supabase.from("mesas").delete().eq("id", id);
    if (error) {
      toast({ title: "No se pudo eliminar", variant: "destructive" });
    } else {
      toast({ title: "Mesa eliminada" });
      fetchMesas();
    }
  };

  const copyMesaURL = (mesa: Mesa) => {
    const url = `${window.location.origin}/m/${mesa.slug}?t=${mesa.token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "URL copiada", description: url });
  };

  const generateQRCode = async (mesa: Mesa) => {
    const QRCode = await import("qrcode");
    const url = `${window.location.origin}/m/${mesa.slug}?t=${mesa.token}`;
    const dataUrl = await QRCode.toDataURL(url);

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-${mesa.nombre}.png`;
    link.click();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-[60vh]">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white/90">Mesas de la sucursal</h1>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Crear nueva mesa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <Input value={newMesaName} onChange={(e) => setNewMesaName(e.target.value)} />
                </div>
                <div>
                  <Label>PIN (opcional)</Label>
                  <Input
                    value={newMesaPin}
                    onChange={(e) =>
                      setNewMesaPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={createMesa} disabled={!newMesaName.trim() || isLoading}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Mesas existentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>PIN</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mesas.map((mesa) => {
                    const isEditing = editingId === mesa.id;
                    return (
                      <TableRow key={mesa.id}>
                        <TableCell>{mesa.nombre}</TableCell>
                        <TableCell>{mesa.slug}</TableCell>

                        {/* PIN */}
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <Input
                                className="h-8 w-20"
                                value={editingPin}
                                onChange={(e) =>
                                  setEditingPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                                }
                              />
                              <Button size="sm" onClick={() => saveEditPin(mesa.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditPin}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : mesa.pin_hash ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{mesa.pin_hash}</span>
                              <Button size="sm" variant="outline" onClick={() => copyMesaURL(mesa)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => startEditPin(mesa)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => startEditPin(mesa)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>

                        {/* Activa */}
                        <TableCell>
                          <Switch
                            checked={mesa.activa}
                            onCheckedChange={(v) => toggleActiva(mesa, Boolean(v))}
                          />
                        </TableCell>

                        {/* Acciones */}
                        <TableCell>
                          <div className="flex gap-2">
                            {/* Copiar URL */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyMesaURL(mesa)}
                              title="Copiar enlace"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>

                            {/* Descargar QR */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateQRCode(mesa)}
                              title="Descargar QR"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>

                            {/* Eliminar mesa */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteMesa(mesa.id)}
                              title="Eliminar mesa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
