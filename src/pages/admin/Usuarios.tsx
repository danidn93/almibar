import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { ArrowLeft, Plus, Pencil, Trash2, KeyRound, RefreshCw } from 'lucide-react';

type Role = 'admin' | 'empleado' | 'staff';

type AppUser = {
  id: string;
  username: string | null;
  name: string | null;
  role: Role;
  email: string | null;
  created_at: string;
  updated_at: string;
  local_id: string | null;
};

const ROLES: Role[] = ['admin', 'empleado', 'staff'];

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

export default function AdminUsuarios() {
  const { toast } = useToast();
  const { user } = useAuth(); // NECESARIO PARA FILTRAR POR LOCAL

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppUser[]>([]);

  // Crear
  const [openCreate, setOpenCreate] = useState(false);
  const [cUsername, setCUsername] = useState('');
  const [cDisplayName, setCDisplayName] = useState('');
  const [cRole, setCRole] = useState<Role | ''>('');
  const [cPassword, setCPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Editar
  const [openEdit, setOpenEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [eUsername, setEUsername] = useState('');
  const [eDisplayName, setEDisplayName] = useState('');
  const [eRole, setERole] = useState<Role | ''>('');
  const [eEmail, setEEmail] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Reset pass
  const [openPass, setOpenPass] = useState(false);
  const [passTarget, setPassTarget] = useState<AppUser | null>(null);
  const [newPass, setNewPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  // Eliminar
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ============================================================
  // FETCH USERS: SOLO USUARIOS DEL MISMO LOCAL
  // ============================================================
  const fetchUsers = async () => {
    if (!user?.local_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("local_id", user.local_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRows((data ?? []) as AppUser[]);
    } catch (e: any) {
      console.error('[fetchUsers]', e);
      toast({
        title: 'Error',
        description: e?.message ?? 'No se pudo cargar el listado',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const ch = supabase
      .channel('app-users-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, () => fetchUsers())
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);


  // ============================================================
  // CREAR USUARIO
  // ============================================================
  const validCreate = useMemo(() =>
    cUsername.trim().length >= 3 &&
    cDisplayName.trim().length >= 1 &&
    cRole &&
    cPassword.length >= 4,
    [cUsername, cDisplayName, cRole, cPassword]
  );

  const handleCreate = async () => {
    if (!validCreate) return;
    setCreating(true);

    try {
      const payload = {
        p_username: cUsername.trim(),
        p_display_name: cDisplayName.trim(),
        p_role: cRole as Role,
        p_password: cPassword,
        p_local_id: user.local_id // ← ASIGNACIÓN AUTOMÁTICA
      };

      const { error } = await supabase.rpc('admin_create_user', payload as any);
      if (error) throw error;

      toast({ title: 'Usuario creado', description: payload.p_username });

      setOpenCreate(false);
      setCUsername('');
      setCDisplayName('');
      setCRole('');
      setCPassword('');
      fetchUsers();
    } catch (e: any) {
      console.error('[admin_create_user]', e);
      toast({
        title: 'Error',
        description: e?.message ?? 'No se pudo crear el usuario',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };


  // ============================================================
  // EDITAR USUARIO
  // ============================================================
  const openEditFor = (u: AppUser) => {
    setEditTarget(u);
    setEUsername(u.username ?? '');
    setEDisplayName(u.name ?? '');
    setERole(u.role);
    setEEmail(u.email ?? '');
    setOpenEdit(true);
  };

  const validEdit = useMemo(
    () =>
      !!editTarget &&
      eUsername.trim().length >= 3 &&
      eDisplayName.trim().length >= 1 &&
      !!eRole,
    [editTarget, eUsername, eDisplayName, eRole]
  );

  const handleSaveEdit = async () => {
    if (!validEdit || !editTarget) return;

    setSavingEdit(true);
    try {
      const { error } = await supabase.rpc('admin_update_user', {
        p_id: editTarget.id,
        p_username: eUsername.trim(),
        p_display_name: eDisplayName.trim(),
        p_role: eRole as Role,
        p_email: eEmail.trim() || null
      } as any);
      if (error) throw error;

      toast({ title: 'Usuario actualizado', description: eUsername });
      setOpenEdit(false);
      setEditTarget(null);
      fetchUsers();
    } catch (e: any) {
      console.error('[admin_update_user]', e);
      toast({
        title: 'Error',
        description: e?.message ?? 'No se pudo actualizar',
        variant: 'destructive'
      });
    } finally {
      setSavingEdit(false);
    }
  };


  // ============================================================
  // RESET PASSWORD
  // ============================================================
  const openPassFor = (u: AppUser) => {
    setPassTarget(u);
    setNewPass('');
    setOpenPass(true);
  };

  const handleSavePass = async () => {
    if (!passTarget || newPass.length < 4) {
      toast({
        title: 'Contraseña inválida',
        description: 'Debe contener al menos 4 caracteres',
        variant: 'destructive'
      });
      return;
    }

    setSavingPass(true);

    try {
      const { error } = await supabase.rpc('admin_update_user_password', {
        p_id: passTarget.id,
        p_password: newPass
      } as any);
      if (error) throw error;

      toast({ title: 'Contraseña actualizada', description: passTarget.username ?? '' });

      setOpenPass(false);
      setPassTarget(null);
    } catch (e: any) {
      console.error('[admin_update_user_password]', e);
      toast({
        title: 'Error',
        description: e?.message ?? 'No se pudo actualizar la contraseña',
        variant: 'destructive'
      });
    } finally {
      setSavingPass(false);
    }
  };


  // ============================================================
  // ELIMINAR
  // ============================================================
  const openDeleteFor = (u: AppUser) => {
    setDeleteTarget(u);
    setOpenDelete(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { error } = await supabase.rpc('admin_delete_user', {
        p_id: deleteTarget.id
      } as any);
      if (error) throw error;

      toast({ title: 'Usuario eliminado', description: deleteTarget.username ?? '' });

      setOpenDelete(false);
      setDeleteTarget(null);
      fetchUsers();
    } catch (e: any) {
      console.error('[admin_delete_user]', e);
      toast({
        title: 'Error',
        description: e?.message ?? 'No se pudo eliminar',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };


  // ============================================================
  // RENDER
  // ============================================================
  return (
    <ProtectedRoute>
      <div className="min-h-[60vh]">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-white/90">Usuarios</h1>
            </div>

            {/* Crear */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo usuario
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear usuario</DialogTitle>
                  <DialogDescription>Complete los campos obligatorios.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Usuario *</Label>
                    <Input
                      value={cUsername}
                      onChange={(e) => setCUsername(e.target.value.replace(/\s/g, ''))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={cDisplayName}
                      onChange={(e) => setCDisplayName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rol *</Label>
                    <Select value={cRole} onValueChange={(v) => setCRole(v as Role)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Contraseña *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={cPassword}
                        onChange={(e) => setCPassword(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        onClick={() => setCPassword(Math.random().toString(36).slice(2, 10))}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={handleCreate} disabled={!validCreate || creating}>
                    {creating ? 'Creando…' : 'Crear'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </header>

        {/* Tabla */}
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Listado</CardTitle>
              <CardDescription>Usuarios del sistema</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6}>Cargando…</TableCell>
                      </TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>Sin usuarios</TableCell>
                      </TableRow>
                    ) : (
                      rows.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.username ?? '—'}
                          </TableCell>
                          <TableCell>{u.name ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{u.email ?? '—'}</TableCell>
                          <TableCell>{fmtDate(u.created_at)}</TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">

                              {/* Editar */}
                              <Dialog
                                open={openEdit && editTarget?.id === u.id}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setOpenEdit(false);
                                    setEditTarget(null);
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" onClick={() => openEditFor(u)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>

                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Editar usuario</DialogTitle>
                                  </DialogHeader>

                                  <div className="grid gap-4">
                                    <div className="space-y-2">
                                      <Label>Usuario</Label>
                                      <Input
                                        value={eUsername}
                                        onChange={(e) =>
                                          setEUsername(e.target.value.replace(/\s/g, ''))
                                        }
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Nombre</Label>
                                      <Input
                                        value={eDisplayName}
                                        onChange={(e) => setEDisplayName(e.target.value)}
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Rol</Label>
                                      <Select
                                        value={eRole}
                                        onValueChange={(v) => setERole(v as Role)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Rol" />
                                        </SelectTrigger>

                                        <SelectContent>
                                          {ROLES.map((r) => (
                                            <SelectItem key={r} value={r}>
                                              {r}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Email</Label>
                                      <Input
                                        value={eEmail}
                                        onChange={(e) => setEEmail(e.target.value)}
                                        type="email"
                                      />
                                    </div>
                                  </div>

                                  <DialogFooter>
                                    <Button onClick={handleSaveEdit} disabled={!validEdit || savingEdit}>
                                      {savingEdit ? 'Guardando…' : 'Guardar'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              {/* Reset pass */}
                              <Dialog
                                open={openPass && passTarget?.id === u.id}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setOpenPass(false);
                                    setPassTarget(null);
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openPassFor(u)}
                                  >
                                    <KeyRound className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>

                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Actualizar contraseña</DialogTitle>
                                    <DialogDescription>Usuario: {u.username}</DialogDescription>
                                  </DialogHeader>

                                  <div className="space-y-2">
                                    <Label>Nueva contraseña</Label>

                                    <div className="flex gap-2">
                                      <Input
                                        type="password"
                                        value={newPass}
                                        onChange={(e) => setNewPass(e.target.value)}
                                      />
                                      <Button
                                        variant="outline"
                                        onClick={() => setNewPass(Math.random().toString(36).slice(2, 10))}
                                      >
                                        <RefreshCw className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <DialogFooter>
                                    <Button onClick={handleSavePass} disabled={savingPass || newPass.length < 4}>
                                      {savingPass ? 'Guardando…' : 'Guardar'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              {/* Eliminar */}
                              <Dialog
                                open={openDelete && deleteTarget?.id === u.id}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setOpenDelete(false);
                                    setDeleteTarget(null);
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDeleteFor(u)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>

                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Eliminar usuario</DialogTitle>
                                    <DialogDescription>
                                      ¿Seguro que deseas eliminar{' '}
                                      <strong>{u.username}</strong>?
                                    </DialogDescription>
                                  </DialogHeader>

                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setOpenDelete(false);
                                        setDeleteTarget(null);
                                      }}
                                    >
                                      Cancelar
                                    </Button>

                                    <Button
                                      variant="destructive"
                                      onClick={handleDelete}
                                      disabled={deleting}
                                    >
                                      {deleting ? 'Eliminando…' : 'Eliminar'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                            </div>
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
