// src/pages/admin/Sucursales.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Pencil, Check, X, Plus, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Link } from "react-router-dom";
import { TablesUpdate } from "@/integrations/supabase/types";

interface Sucursal {
  id: string;
  local_id: string;
  nombre: string;
  slug: string | null;
  direccion: string | null;
  telefono: string | null;
  created_at: string;
}

type SucursalUpdate = TablesUpdate<"sucursales">;

export default function AdminSucursales() {
  const { toast } = useToast();

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const LOCAL_ID = import.meta.env.VITE_LOCAL_ID;

  useEffect(() => {
    fetchSucursales();
  }, []);

  const fetchSucursales = async () => {
    const { data, error } = await supabase
      .from("sucursales")
      .select("*")
      .eq("local_id", LOCAL_ID)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }
    setSucursales(data as Sucursal[]);
  };

  const createSucursal = async () => {
    if (!newName.trim()) {
      toast({ title: "Nombre requerido", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const slug = newName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();

    const { error } = await supabase.from("sucursales").insert([
      {
        local_id: LOCAL_ID,
        nombre: newName.trim(),
        slug
      }
    ]);

    if (error) {
      console.error(error);
      toast({ title: "Error al crear sucursal", variant: "destructive" });
    } else {
      toast({ title: "Sucursal creada", description: newName });
      setNewName("");
      fetchSucursales();
    }

    setIsLoading(false);
  };

  const startEdit = (s: Sucursal) => {
    setEditingId(s.id);
    setEditingName(s.nombre);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async (id: string) => {
    const payload: SucursalUpdate = {
      nombre: editingName.trim()
    };

    const { error } = await supabase.from("sucursales").update(payload).eq("id", id);

    if (error) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    } else {
      toast({ title: "Sucursal actualizada" });
      fetchSucursales();
    }

    setEditingId(null);
    setEditingName("");
  };

  const deleteSucursal = async (id: string) => {
    const { error } = await supabase.from("sucursales").delete().eq("id", id);
    if (error) {
      toast({ title: "No se pudo eliminar", variant: "destructive" });
      return;
    }
    toast({ title: "Sucursal eliminada" });
    fetchSucursales();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-[60vh]">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white/90">Sucursales del Local</h1>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6">

            <Card>
              <CardHeader>
                <CardTitle>Crear Sucursal</CardTitle>
                <CardDescription>Agregar una nueva sucursal al local</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>Nombre</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Sucursal Centro, Sucursal Norte..."
                    />
                  </div>
                  <Button onClick={createSucursal} disabled={isLoading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Listado de Sucursales</CardTitle>
                <CardDescription>Administrar sucursales del local actual</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sucursales.map((s) => {
                      const editing = editingId === s.id;
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            {editing ? (
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-8"
                              />
                            ) : (
                              s.nombre
                            )}
                          </TableCell>

                          <TableCell>{s.slug}</TableCell>

                          <TableCell>
                            {new Date(s.created_at).toLocaleDateString()}
                          </TableCell>

                          <TableCell>
                            <div className="flex gap-2">
                              {editing ? (
                                <>
                                  <Button size="sm" onClick={() => saveEdit(s.id)}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => startEdit(s)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteSucursal(s.id)}
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
      </div>
    </ProtectedRoute>
  );
}
