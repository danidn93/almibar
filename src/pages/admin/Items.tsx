// src/pages/admin/Items.tsx
import { useState, useEffect, useRef } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, ImagePlus, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Item {
  id: string;
  tipo: 'producto' | 'cancion';
  nombre: string;
  artista?: string | null;
  categoria?: string | null;
  precio?: number | null;
  disponible: boolean;
  created_at: string;
  image_url?: string | null;
  description?: string | null;
}

const AdminItems = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Crear
  const [formData, setFormData] = useState({
    tipo: 'producto' as 'producto' | 'cancion',
    nombre: '',
    artista: '',
    categoria: '',
    precio: '',
    description: '',
  });

  // Editar (solo productos)
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: '',
    categoria: '',
    precio: '',
    description: '',
  });

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('todas');

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data as Item[]) || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los items', variant: 'destructive' });
    }
  };

  /* ====================== CREAR ====================== */
  const createItem = async () => {
    if (!formData.nombre.trim()) return;

    setIsLoading(true);
    try {
      const itemData: any = {
        tipo: formData.tipo,
        nombre: formData.nombre.trim(),
        disponible: true,
      };

      if (formData.tipo === 'producto') {
        if (formData.categoria) itemData.categoria = formData.categoria.trim();
        if (formData.precio) itemData.precio = parseFloat(formData.precio);
        if (formData.description) itemData.description = formData.description.trim();
      } else {
        if (formData.artista) itemData.artista = formData.artista.trim();
        if (formData.categoria) itemData.categoria = formData.categoria.trim();
      }

      const { error } = await supabase.from('items').insert([itemData]);
      if (error) throw error;

      setFormData({ tipo: 'producto', nombre: '', artista: '', categoria: '', precio: '', description: '' });
      fetchItems();
      toast({ title: 'Item creado', description: 'El item se ha creado exitosamente' });
    } catch (error) {
      console.error('Error creating item:', error);
      toast({ title: 'Error', description: 'No se pudo crear el item', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  /* ====================== EDITAR ====================== */
  const startEdit = (item: Item) => {
    // solo productos
    if (item.tipo !== 'producto') return;
    setEditItem(item);
    setEditForm({
      nombre: item.nombre || '',
      categoria: item.categoria || '',
      precio: item.precio != null ? String(item.precio) : '',
      description: item.description || '',
    });
    setEditOpen(true);
  };

  const updateItem = async () => {
    if (!editItem) return;
    if (!editForm.nombre.trim()) {
      toast({ title: 'Nombre requerido', description: 'Ingresa un nombre válido', variant: 'destructive' });
      return;
    }

    try {
      const payload: any = {
        nombre: editForm.nombre.trim(),
        categoria: editForm.categoria.trim() || null,
        description: editForm.description.trim() || null,
      };
      if (editForm.precio !== '') payload.precio = parseFloat(editForm.precio);

      const { error } = await supabase.from('items').update(payload).eq('id', editItem.id);
      if (error) throw error;

      toast({ title: 'Producto actualizado', description: editForm.nombre });
      setEditOpen(false);
      setEditItem(null);
      await fetchItems();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  /* ====================== ESTADO / ELIMINAR ====================== */
  const toggleDisponible = async (id: string, disponible: boolean) => {
    try {
      const { error } = await supabase.from('items').update({ disponible: !disponible }).eq('id', id);
      if (error) throw error;
      fetchItems();
      toast({ title: 'Estado actualizado', description: 'El estado del item se ha actualizado' });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar el item', variant: 'destructive' });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
      fetchItems();
      toast({ title: 'Item eliminado', description: 'El item se ha eliminado exitosamente' });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el item', variant: 'destructive' });
    }
  };

  /* ====================== IMAGEN ====================== */
  const onUploadImage = async (item: Item, file: File) => {
    try {
      setUploadingId(item.id);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${item.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('productos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('productos').getPublicUrl(path);
      const publicUrl = pub?.publicUrl;

      const { error: updErr } = await supabase.from('items').update({ image_url: publicUrl }).eq('id', item.id);
      if (updErr) throw updErr;

      toast({ title: 'Imagen actualizada', description: item.nombre });
      fetchItems();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo subir la imagen', variant: 'destructive' });
    } finally {
      setUploadingId(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /* ====================== FILTROS ====================== */
  const categoriasUnicas = Array.from(
    new Set(items.filter(i => i.tipo === 'producto').map(i => i.categoria || 'Sin categoría'))
  );

  const productos = items
    .filter(i => i.tipo === 'producto')
    .filter(i => {
      const q = search.trim().toLowerCase();
      const matchSearch = q
        ? i.nombre.toLowerCase().includes(q) ||
          (i.categoria || '').toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q)
        : true;
      const matchCat = catFilter === 'todas' ? true : (i.categoria || 'Sin categoría') === catFilter;
      return matchSearch && matchCat;
    });

  const canciones = items.filter(item => item.tipo === 'cancion');

  /* ====================== RENDER ====================== */
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
            <h1 className="text-2xl font-bold text-white/90">Productos y Canciones</h1>
            <div className="ml-auto flex gap-2">
              <Input
                placeholder="Buscar por nombre, categoría o descripción…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56"
              />
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las categorías</SelectItem>
                  {categoriasUnicas.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-6">
            {/* Crear nuevo item */}
            <Card>
              <CardHeader>
                <CardTitle>Crear Nuevo Item</CardTitle>
                <CardDescription>Agrega un nuevo producto o canción al sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                  <div className="lg:col-span-1">
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value: 'producto' | 'cancion') =>
                        setFormData({ ...formData, tipo: value, artista: '', precio: '', description: '' })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="producto">Producto</SelectItem>
                        <SelectItem value="cancion">Canción</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="lg:col-span-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder={formData.tipo === 'producto' ? 'Ej: Michelada' : 'Ej: Labios Compartidos'}
                    />
                  </div>

                  {formData.tipo === 'cancion' && (
                    <div className="lg:col-span-1">
                      <Label htmlFor="artista">Artista</Label>
                      <Input
                        id="artista"
                        value={formData.artista}
                        onChange={(e) => setFormData({ ...formData, artista: e.target.value })}
                        placeholder="Ej: Maná"
                      />
                    </div>
                  )}

                  <div className="lg:col-span-1">
                    <Label htmlFor="categoria">Categoría</Label>
                    <Input
                      id="categoria"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      placeholder={formData.tipo === 'producto' ? 'Ej: Bebidas' : 'Ej: Rock en Español'}
                    />
                  </div>

                  {formData.tipo === 'producto' && (
                    <>
                      <div className="lg:col-span-1">
                        <Label htmlFor="precio">Precio</Label>
                        <Input
                          id="precio"
                          type="number"
                          step="0.01"
                          value={formData.precio}
                          onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="lg:col-span-6">
                        <Label htmlFor="description">Descripción (opcional)</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Ej: Bolón mixto con queso y chicharrón. Con salsa de queso."
                        />
                      </div>
                    </>
                  )}

                  <div className="lg:col-span-1 flex items-end">
                    <Button onClick={createItem} disabled={isLoading || !formData.nombre.trim()} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Crear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Productos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Productos <Badge variant="secondary">{productos.length}</Badge>
                </CardTitle>
                <CardDescription>Incluye imagen, descripción, edición y disponibilidad</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    const item = items.find((it) => it.id === uploadingId);
                    if (file && item) onUploadImage(item, file);
                  }}
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imagen</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productos.map((producto) => (
                      <TableRow key={producto.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {producto.image_url ? (
                              <img
                                src={producto.image_url}
                                className="h-12 w-12 object-cover rounded"
                                alt={producto.nombre}
                              />
                            ) : (
                              <div className="h-12 w-12 rounded bg-muted grid place-items-center text-xs">Sin img</div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setUploadingId(producto.id);
                                fileRef.current?.click();
                              }}
                              disabled={uploadingId === producto.id}
                            >
                              <ImagePlus className="h-4 w-4 mr-1" />
                              {uploadingId === producto.id ? 'Subiendo…' : 'Cambiar'}
                            </Button>
                          </div>
                        </TableCell>

                        <TableCell className="font-medium">{producto.nombre}</TableCell>
                        <TableCell>{producto.categoria || '-'}</TableCell>
                        <TableCell>{producto.precio != null ? `$${producto.precio}` : '-'}</TableCell>
                        <TableCell className="max-w-[360px]">
                          <span className="line-clamp-2 text-sm text-muted-foreground">
                            {producto.description || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={producto.disponible ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => toggleDisponible(producto.id, producto.disponible)}
                          >
                            {producto.disponible ? 'Disponible' : 'No disponible'}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(producto)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteItem(producto.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Canciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Canciones <Badge variant="secondary">{canciones.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Artista</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {canciones.map((cancion) => (
                      <TableRow key={cancion.id}>
                        <TableCell className="font-medium">{cancion.nombre}</TableCell>
                        <TableCell>{cancion.artista || '-'}</TableCell>
                        <TableCell>{cancion.categoria || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={cancion.disponible ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => toggleDisponible(cancion.id, cancion.disponible)}
                          >
                            {cancion.disponible ? 'Disponible' : 'No disponible'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => deleteItem(cancion.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Modal Editar Producto */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
          </DialogHeader>

          {!editItem ? (
            <div className="py-6 text-sm text-muted-foreground">Selecciona un producto para editar.</div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Nombre</Label>
                <Input
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                />
              </div>

              <div>
                <Label>Categoría</Label>
                <Input
                  value={editForm.categoria}
                  onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                />
              </div>

              <div>
                <Label>Precio</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.precio}
                  onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Descripción</Label>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Descripción visible en la vista de mesa"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={updateItem} disabled={!editItem}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
};

export default AdminItems;
