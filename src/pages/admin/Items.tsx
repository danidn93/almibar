import { useState, useEffect, useRef } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, ImagePlus, Pencil } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIAS = [
  "Bebidas",
  "Cocteles",
  "Pikeos",
  "Merengue",
  "Salsa",
  "Cumbia",
  "Urbano",
  "Electrónica",
];

type AdminContext = {
  sucursalId: string;
};

interface Item {
  id: string;
  tipo: "producto" | "cancion";
  nombre: string;
  categoria?: string | null;
  precio?: number | null;
  created_at: string;
  image_url?: string | null;
  descripcion?: string | null;
  productos_sucursal?: {
    id: string;
    disponible: boolean;
  }[];
}

export default function AdminItems() {
  const { user } = useAuth();
  const { sucursalId } = useOutletContext<AdminContext>();
  const localId = user?.local_id;

  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    tipo: "producto" as "producto" | "cancion",
    nombre: "",
    artista: "",
    categoria: "",
    precio: "",
    description: "",
    image_base64: "",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: "",
    categoria: "",
    precio: "",
    description: "",
    image_base64: "",
  });

  const fileRef = useRef<HTMLInputElement | null>(null);

  /* ================= CARGAR ITEMS PARA LA SUCURSAL ================= */
  useEffect(() => {
    if (localId && sucursalId) fetchItems();
  }, [localId, sucursalId]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("productos_local")
      .select(
        `
        *,
        productos_sucursal!inner (
          id,
          disponible
        )
      `
      )
      .eq("local_id", localId)
      .eq("productos_sucursal.sucursal_id", sucursalId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
      return;
    }

    setItems(data as any);
  };

  /* ====================== BASE64 ====================== */
  const toBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  /* ====================== CREAR ITEM ====================== */
  const createItem = async () => {
    if (!formData.nombre.trim()) return;

    setIsLoading(true);

    try {
      const payload: any = {
        local_id: localId,
        tipo: formData.tipo,
        nombre: formData.nombre.trim(),
        categoria: formData.categoria || null,
        descripcion:
          formData.tipo === "producto"
            ? formData.description.trim()
            : formData.artista.trim(),
        precio:
          formData.tipo === "producto"
            ? parseFloat(formData.precio || "0")
            : 0,
        image_url:
          formData.tipo === "producto" ? formData.image_base64 : null,
      };

      // Insertar producto
      const { data: inserted, error } = await supabase
        .from("productos_local")
        .insert(payload)
        .select("id, local_id")
        .single();

      if (error) throw error;

      // Insertar disponibilidad en TODAS las sucursales del local
      const { data: sucursales, error: errSuc } = await supabase
        .from("sucursales")
        .select("id")
        .eq("local_id", inserted.local_id);

      if (errSuc) throw errSuc;

      const disponibilidad =
        sucursales?.map((s) => ({
          sucursal_id: s.id,
          producto_id: inserted.id,
          disponible: true,
        })) ?? [];

      // Verificar que no existan duplicados
      const { data: existentes, error: errExist } = await supabase
        .from("productos_sucursal")
        .select("sucursal_id")
        .eq("producto_id", inserted.id);

      if (errExist) throw errExist;

      const existentesSet = new Set(
        (existentes ?? []).map((e) => e.sucursal_id)
      );

      const faltantes = disponibilidad.filter(
        (d) => !existentesSet.has(d.sucursal_id)
      );

      if (faltantes.length > 0) {
        const { error: errDisp } = await supabase
          .from("productos_sucursal")
          .insert(faltantes);
        if (errDisp) throw errDisp;
      }

      toast({ title: "Item creado correctamente." });
      setFormData({
        tipo: "producto",
        nombre: "",
        artista: "",
        categoria: "",
        precio: "",
        description: "",
        image_base64: "",
      });

      fetchItems();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo crear el item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ====================== EDITAR ITEM ====================== */
  const startEdit = (item: Item) => {
    setEditItem(item);
    setEditForm({
      nombre: item.nombre,
      categoria: item.categoria || "",
      precio: item.precio != null ? String(item.precio) : "",
      description: item.descripcion || "",
      image_base64: item.image_url || "",
    });
    setEditOpen(true);
  };

  const updateItem = async () => {
    if (!editItem) return;

    const payload: any = {
      nombre: editForm.nombre.trim(),
      categoria: editForm.categoria || null,
      descripcion: editForm.description.trim(),
      precio: editForm.precio ? parseFloat(editForm.precio) : 0,
      image_url: editForm.image_base64 || null,
    };

    const { error } = await supabase
      .from("productos_local")
      .update(payload)
      .eq("id", editItem.id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Producto actualizado" });
    setEditOpen(false);
    fetchItems();
  };

  /* ====== CAMBIAR DISPONIBILIDAD EN LA SUCURSAL SELECCIONADA ====== */
  const toggleDisponible = async (psId: string, current: boolean) => {
    const { error } = await supabase
      .from("productos_sucursal")
      .update({ disponible: !current })
      .eq("id", psId)
      .eq("sucursal_id", sucursalId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar disponibilidad",
      });
      return;
    }

    fetchItems();
  };

  const productos = items.filter((i) => i.tipo === "producto");
  const canciones = items.filter((i) => i.tipo === "cancion");

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
            <h1 className="text-2xl font-bold text-white">
              Productos y Canciones
            </h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* ============== FORMULARIO CREACIÓN ============== */}
          <Card>
            <CardHeader>
              <CardTitle>Crear nuevo item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-6">
                {/* TIPO */}
                <div className="lg:col-span-1">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v: "producto" | "cancion") =>
                      setFormData({
                        ...formData,
                        tipo: v,
                        artista: "",
                        precio: "",
                        description: "",
                        image_base64: "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producto">Producto</SelectItem>
                      <SelectItem value="cancion">Canción</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* NOMBRE */}
                <div className="lg:col-span-2">
                  <Label>Nombre</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                  />
                </div>

                {/* ARTISTA (solo canción) */}
                {formData.tipo === "cancion" && (
                  <div className="lg:col-span-1">
                    <Label>Artista</Label>
                    <Input
                      value={formData.artista}
                      onChange={(e) =>
                        setFormData({ ...formData, artista: e.target.value })
                      }
                    />
                  </div>
                )}

                {/* CATEGORÍA */}
                <div className="lg:col-span-1">
                  <Label>Categoría</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(categoria) =>
                      setFormData({ ...formData, categoria })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* PRECIO (solo producto) */}
                {formData.tipo === "producto" && (
                  <div className="lg:col-span-1">
                    <Label>Precio</Label>
                    <Input
                      type="number"
                      value={formData.precio}
                      onChange={(e) =>
                        setFormData({ ...formData, precio: e.target.value })
                      }
                    />
                  </div>
                )}

                {/* DESCRIPCIÓN (solo producto) */}
                {formData.tipo === "producto" && (
                  <div className="lg:col-span-6">
                    <Label>Descripción</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {/* IMAGEN (solo producto) */}
                {formData.tipo === "producto" && (
                  <div className="lg:col-span-2 flex items-end gap-4">
                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const b64 = await toBase64(file);
                          setFormData({ ...formData, image_base64: b64 });
                        }
                      }}
                    />

                    <Button
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Subir imagen
                    </Button>

                    {formData.image_base64 && (
                      <img
                        src={formData.image_base64}
                        className="h-12 rounded shadow"
                      />
                    )}
                  </div>
                )}

                {/* CREAR */}
                <div className="lg:col-span-1 flex items-end">
                  <Button
                    onClick={createItem}
                    disabled={!formData.nombre.trim() || isLoading}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Crear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ============== LISTA DE PRODUCTOS ============== */}
          {productos.length > 0 && (
            <Card className="mt-10">
              <CardHeader>
                <CardTitle>Productos ({productos.length})</CardTitle>
                <CardDescription>
                  Disponibilidad mostrada para la sucursal seleccionada.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imagen</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Disponibilidad</TableHead>
                      <TableHead>Editar</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {productos.map((item) => {
                      const ps = item.productos_sucursal?.[0];

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                className="h-12 w-12 object-cover rounded"
                              />
                            ) : (
                              <div className="h-12 w-12 bg-muted grid place-items-center rounded">
                                Sin img
                              </div>
                            )}
                          </TableCell>

                          <TableCell>{item.nombre}</TableCell>
                          <TableCell>{item.categoria || "-"}</TableCell>
                          <TableCell>${item.precio ?? 0}</TableCell>
                          <TableCell>{item.descripcion || "-"}</TableCell>

                          <TableCell>
                            {ps ? (
                              <Button
                                size="sm"
                                variant={ps.disponible ? "default" : "outline"}
                                onClick={() =>
                                  toggleDisponible(ps.id, ps.disponible)
                                }
                              >
                                {ps.disponible ? "Disponible" : "No disponible"}
                              </Button>
                            ) : (
                              <span className="text-xs text-red-500">
                                No registrado
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ============== LISTA DE CANCIONES ============== */}
          {canciones.length > 0 && (
            <Card className="mt-10">
              <CardHeader>
                <CardTitle>Canciones ({canciones.length})</CardTitle>
              </CardHeader>

              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Artista</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Disponibilidad</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {canciones.map((c) => {
                      const ps = c.productos_sucursal?.[0];

                      return (
                        <TableRow key={c.id}>
                          <TableCell>{c.nombre}</TableCell>
                          <TableCell>{c.descripcion || "-"}</TableCell>
                          <TableCell>{c.categoria || "-"}</TableCell>

                          <TableCell>
                            {ps ? (
                              <Button
                                size="sm"
                                variant={ps.disponible ? "default" : "outline"}
                                onClick={() =>
                                  toggleDisponible(ps.id, ps.disponible)
                                }
                              >
                                {ps.disponible ? "Disponible" : "No disponible"}
                              </Button>
                            ) : (
                              <span className="text-xs text-red-500">
                                No registrado
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </main>

        {/* ============== MODAL EDITAR ============== */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar producto</DialogTitle>
            </DialogHeader>

            {editItem && (
              <div className="grid gap-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={editForm.nombre}
                    onChange={(e) =>
                      setEditForm({ ...editForm, nombre: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Categoría</Label>
                  <Select
                    value={editForm.categoria}
                    onValueChange={(categoria) =>
                      setEditForm({ ...editForm, categoria })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Precio</Label>
                  <Input
                    type="number"
                    value={editForm.precio}
                    onChange={(e) =>
                      setEditForm({ ...editForm, precio: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Descripción</Label>
                  <Input
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Imagen</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await toBase64(file);
                        setEditForm({ ...editForm, image_base64: b64 });
                      }
                    }}
                  />

                  {editForm.image_base64 && (
                    <img
                      src={editForm.image_base64}
                      className="h-16 mt-2 rounded shadow"
                    />
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={updateItem}>Guardar cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
