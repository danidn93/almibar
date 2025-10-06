// src/pages/admin/AdminMesas.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, QrCode, Trash2, Copy, Pencil, Check, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Mesa {
  id: string;
  nombre: string;
  slug: string;
  token: string;
  activa: boolean;
  created_at: string;
  pin_hash?: string | null;
}

type MesaUpdate = TablesUpdate<'mesas'>;

const AdminMesas = () => {
  const { toast } = useToast();

  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [newMesaName, setNewMesaName] = useState('');
  const [newMesaPin, setNewMesaPin] = useState(''); // opcional: definir manual
  const [isLoading, setIsLoading] = useState(false);

  // edición inline de PIN por mesa
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPin, setEditingPin] = useState<string>('');

  useEffect(() => {
    fetchMesas();
  }, []);

  const fetchMesas = async () => {
    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMesas((data as Mesa[]) || []);
    } catch (error) {
      console.error('Error fetching mesas:', error);
      toast({
        title: 'Error al cargar',
        description: 'No se pudieron cargar las mesas',
        variant: 'destructive',
      });
    }
  };

  const randomPin = () => String(Math.floor(1000 + Math.random() * 9000)); // 4 dígitos

  const createMesa = async () => {
    if (!newMesaName.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'Ingresa un nombre para la mesa.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      const slug = `mesa-${Date.now()}`;
      const token = Math.random().toString(36).substring(2, 15);
      const pin_hash = newMesaPin.trim()
        ? newMesaPin.replace(/\D/g, '').slice(0, 6)
        : randomPin();

      const { error } = await supabase
        .from('mesas')
        .insert([{ nombre: newMesaName.trim(), slug, token, pin_hash, activa: true }]); // por defecto activa

      if (error) throw error;

      setNewMesaName('');
      setNewMesaPin('');
      await fetchMesas();
      toast({
        title: 'Mesa creada',
        description: `“${pin_hash ? `${newMesaName.trim()} (PIN: ${pin_hash})` : newMesaName.trim()}”`,
      });
    } catch (error) {
      console.error('Error creando mesa:', error);
      toast({
        title: 'No se pudo crear',
        description: 'Ocurrió un problema creando la mesa.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async (mesa: Mesa) => {
    try {
      const QRCode = await import('qrcode');
      const url = `${window.location.origin}/m/${mesa.slug}?t=${mesa.token}`;
      const qrCodeDataURL = await QRCode.toDataURL(url, { width: 300, margin: 2 });

      const link = document.createElement('a');
      link.download = `qr-${mesa.nombre}.png`;
      link.href = qrCodeDataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'QR generado',
        description: `Se descargó el QR de “${mesa.nombre}”.`,
      });
    } catch (error) {
      console.error('Error generating QR:', error);
      toast({
        title: 'No se pudo generar el QR',
        description: 'Intenta nuevamente.',
        variant: 'destructive',
      });
    }
  };

  const copyMesaURL = (mesa: Mesa) => {
    const url = `${window.location.origin}/m/${mesa.slug}?t=${mesa.token}`;
    navigator.clipboard
      .writeText(url)
      .then(() =>
        toast({
          title: 'URL copiada',
          description: 'El enlace de la mesa se copió al portapapeles.',
        })
      )
      .catch(() =>
        toast({
          title: 'No se pudo copiar',
          description: 'Intenta nuevamente.',
          variant: 'destructive',
        })
      );
  };

  const copyPin = (mesa: Mesa) => {
    if (!mesa.pin_hash) return;
    navigator.clipboard
      .writeText(mesa.pin_hash)
      .then(() =>
        toast({
          title: 'PIN copiado',
          description: `PIN: ${mesa.pin_hash}`,
        })
      )
      .catch(() =>
        toast({
          title: 'No se pudo copiar el PIN',
          description: 'Intenta nuevamente.',
          variant: 'destructive',
        })
      );
  };

  const deleteMesa = async (id: string) => {
    try {
      const { error } = await supabase.from('mesas').delete().eq('id', id);
      if (error) throw error;
      await fetchMesas();
      toast({
        title: 'Mesa eliminada',
        description: 'La mesa se eliminó exitosamente.',
      });
    } catch (error) {
      console.error('Error deleting mesa:', error);
      toast({
        title: 'No se pudo eliminar',
        description: 'Ocurrió un problema eliminando la mesa.',
        variant: 'destructive',
      });
    }
  };

  // Activar / Desactivar mesa (toggle)
  const toggleActiva = async (mesa: Mesa, nuevaActiva: boolean) => {
    // Optimistic UI
    setMesas((prev) => prev.map((m) => (m.id === mesa.id ? { ...m, activa: nuevaActiva } : m)));
    try {
      const payload: MesaUpdate = { activa: nuevaActiva };
      const { error } = await supabase.from('mesas').update(payload).eq('id', mesa.id);
      if (error) throw error;

      toast({
        title: nuevaActiva ? 'Mesa activada' : 'Mesa desactivada',
        description: mesa.nombre,
      });
    } catch (error) {
      // revertir si falla
      setMesas((prev) => prev.map((m) => (m.id === mesa.id ? { ...m, activa: !nuevaActiva } : m)));
      console.error('Error toggling activa:', error);
      toast({
        title: 'No se pudo actualizar',
        description: 'No se actualizó el estado de la mesa.',
        variant: 'destructive',
      });
    }
  };

  // === Edición de PIN ===
  const startEditPin = (mesa: Mesa) => {
    setEditingId(mesa.id);
    setEditingPin((mesa.pin_hash || '').slice(0, 6));
  };

  const cancelEditPin = () => {
    setEditingId(null);
    setEditingPin('');
  };

  const saveEditPin = async (mesaId: string) => {
    const sanitized = editingPin.replace(/\D/g, '').slice(0, 6);
    try {
      const payload: MesaUpdate = { pin_hash: sanitized || null };
      const { error } = await supabase.from('mesas').update(payload).eq('id', mesaId);

      if (error) throw error;

      toast({
        title: 'PIN actualizado',
        description: sanitized ? `Nuevo PIN: ${sanitized}` : 'Se eliminó el PIN.',
      });
      setEditingId(null);
      setEditingPin('');
      await fetchMesas();
    } catch (error) {
      console.error('Error updating PIN:', error);
      toast({
        title: 'No se pudo actualizar el PIN',
        description: 'Intenta nuevamente.',
        variant: 'destructive',
      });
    }
  };

  const regeneratePin = () => {
    setEditingPin(randomPin());
    toast({
      title: 'PIN generado',
      description: `Nuevo PIN sugerido: ${editingPin}`,
    });
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
            <h1 className="text-2xl font-bold text-white/90">Listado de Mesas</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Crear Nueva Mesa</CardTitle>
                <CardDescription>Agrega una nueva mesa al sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex-1">
                    <Label htmlFor="mesa-name">Nombre de la Mesa</Label>
                    <Input
                      id="mesa-name"
                      value={newMesaName}
                      onChange={(e) => setNewMesaName(e.target.value)}
                      placeholder="Ej: Mesa 1, VIP 1, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="mesa-pin">PIN (opcional)</Label>
                    <Input
                      id="mesa-pin"
                      value={newMesaPin}
                      onChange={(e) => setNewMesaPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="4-6 dígitos"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={createMesa} disabled={isLoading || !newMesaName.trim()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Mesa
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mesas Existentes</CardTitle>
                <CardDescription>Lista de todas las mesas en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>PIN</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creación</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mesas.map((mesa) => {
                      const isEditing = editingId === mesa.id;
                      return (
                        <TableRow key={mesa.id}>
                          <TableCell className="font-medium">{mesa.nombre}</TableCell>
                          <TableCell>{mesa.slug}</TableCell>

                          {/* Columna PIN con edición inline */}
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingPin}
                                  onChange={(e) =>
                                    setEditingPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                                  }
                                  className="h-8 w-28 font-mono"
                                  placeholder="PIN"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={regeneratePin}
                                  title="Generar PIN aleatorio"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button size="sm" onClick={() => saveEditPin(mesa.id)} title="Guardar">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditPin}
                                  title="Cancelar"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : mesa.pin_hash ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{mesa.pin_hash}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyPin(mesa)}
                                  title="Copiar PIN"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditPin(mesa)}
                                  title="Editar PIN"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">—</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditPin(mesa)}
                                  title="Asignar PIN"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>

                          {/* Columna Estado con Switch */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={mesa.activa}
                                onCheckedChange={(val) => toggleActiva(mesa, Boolean(val))}
                                aria-label={`Cambiar estado de ${mesa.nombre}`}
                              />
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  mesa.activa
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {mesa.activa ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>{new Date(mesa.created_at).toLocaleDateString()}</TableCell>

                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateQRCode(mesa)}
                                title="Generar Código QR"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyMesaURL(mesa)}
                                title="Copiar enlace de la mesa"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
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
      </div>
    </ProtectedRoute>
  );
};

export default AdminMesas;
