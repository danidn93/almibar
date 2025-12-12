// src/layouts/AdminLayout.tsx
import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bell, Clock, LogOut, User, Settings } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

type Config = {
  id: string;
  abierto: boolean;
  logo_url?: string | null;
  hero_bg_url?: string | null;
};

export default function AdminLayout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [now, setNow] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  const [sucursales, setSucursales] = useState<any[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<string | null>(null);

  const [conf, setConf] = useState<Config | null>(null);

  // Perfil
  const [openProfile, setOpenProfile] = useState(false);
  const [openPass, setOpenPass] = useState(false);

  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileUsername, setProfileUsername] = useState(user?.username ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPass, setNewPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  // ================================
  //  CLOCK
  // ================================
  useEffect(() => {
    setNow(new Date().toLocaleString());
    const id = setInterval(() => {
      setNow(new Date().toLocaleString());
    }, 1000);

    return () => clearInterval(id);
  }, []);

  // ================================
  //  LOAD SUCURSALES
  // ================================
  useEffect(() => {
    if (!user?.local_id) return;

    const load = async () => {
      const { data } = await supabase
        .from("sucursales")
        .select("id,nombre")
        .eq("local_id", user.local_id);

      if (data) {
        setSucursales(data);
        if (data.length === 1) setSelectedSucursal(data[0].id);
      }
    };

    load();
  }, [user?.local_id]);

  // ================================
  //  LOAD CONFIGURACIÓN
  // ================================
  useEffect(() => {
    if (!selectedSucursal) return;

    const loadConf = () => {
      supabase
        .from("configuracion")
        .select("*")
        .eq("sucursal_id", selectedSucursal)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setConf(data);
        });
    };

    loadConf();

    const channel = supabase
      .channel(`config-${selectedSucursal}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "configuracion" },
        loadConf
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSucursal]);

  // ================================
  //  PENDING COUNT
  // ================================
  const refreshPendingCount = useCallback(() => {
    if (!selectedSucursal) return;

    supabase
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("sucursal_id", selectedSucursal)
      .eq("estado", "pendiente")
      .then(({ count }) => {
        setPendingCount(count ?? 0);
      });
  }, [selectedSucursal]);

  useEffect(() => {
    if (!selectedSucursal) return;

    refreshPendingCount();

    const channel = supabase
      .channel(`pending-${selectedSucursal}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        refreshPendingCount
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [selectedSucursal, refreshPendingCount]);

  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  // ================================
  //  GUARDAR PERFIL
  // ================================
  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("app_users")
        .update({
          username: profileUsername.trim(),
          name: profileName.trim()
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({ title: "Perfil actualizado correctamente." });
      setOpenProfile(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  // ================================
  //  CAMBIAR CONTRASEÑA
  // ================================
  const savePassword = async () => {
    if (newPass.length < 4) {
      toast({ title: "Contraseña inválida", description: "Debe tener al menos 4 caracteres." });
      return;
    }

    setSavingPass(true);
    try {
      const { error } = await supabase.rpc("admin_update_user_password", {
        p_id: user?.id,
        p_password: newPass
      });

      if (error) throw error;

      toast({ title: "Contraseña actualizada correctamente." });
      setOpenPass(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <>
      {/* Fondo */}
      <div className="fixed inset-0 -z-10">
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${conf?.hero_bg_url || "/assets/admin-bg.png"})` }}
        />
      </div>

      <div className="min-h-screen">
        <header className="sticky top-0 bg-black/40 backdrop-blur-lg">
          <div className="max-w-6xl mx-auto py-3 px-4 flex justify-between items-center">

            {/* Logo + sucursal */}
            <div className="flex items-center gap-3">
              <img
                src={conf?.logo_url || "/assets/logo-admin.png"}
                className="h-14 w-14 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">Panel Administrativo</h1>

                {sucursales.length > 1 ? (
                  <select
                    className="mt-1 px-2 py-1 text-black rounded"
                    value={selectedSucursal ?? ""}
                    onChange={(e) => setSelectedSucursal(e.target.value)}
                  >
                    <option value="" disabled>Seleccione sucursal</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                ) : sucursales.length === 1 ? (
                  <span className="text-white/80 text-sm">{sucursales[0].nombre}</span>
                ) : null}
              </div>
            </div>

            {/* Controles */}
            <div className="flex items-center gap-4">

              {/* Configuración */}
              <Button
                variant="outline"
                className="bg-white/20 text-white"
                onClick={() => navigate("/admin/configuracion")}
              >
                <Settings className="h-5 w-5" />
              </Button>

              {/* Notificaciones */}
              <div className="relative">
                <Bell className="h-6 w-6 text-white" />
                {pendingCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white px-2 rounded-full text-xs">
                    {pendingCount}
                  </span>
                )}
              </div>

              {/* Reloj */}
              <div className="hidden sm:flex items-center text-white gap-2">
                <Clock className="h-4 w-4" />
                {now}
              </div>

              {/* Usuario */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-white">
                    <User className="h-5 w-5" />
                    <span>{user?.name ?? user?.username}</span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => setOpenProfile(true)}>
                    Editar perfil
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setOpenPass(true)}>
                    Cambiar contraseña
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Salir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Contenido */}
        {selectedSucursal ? (
          <main className="max-w-6xl mx-auto py-6 px-4">
            <Outlet context={{ sucursalId: selectedSucursal, conf }} />
          </main>
        ) : (
          <div className="text-center text-white py-10">
            Seleccione una sucursal para continuar
          </div>
        )}
      </div>

      {/* MODAL EDITAR PERFIL */}
      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 mt-4">
            <div>
              <label>Nombre</label>
              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            </div>

            <div>
              <label>Usuario</label>
              <Input
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value.replace(/\s/g, ""))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CAMBIAR CONTRASEÑA */}
      <Dialog open={openPass} onOpenChange={setOpenPass}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <label>Nueva contraseña</label>
            <Input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              onClick={savePassword}
              disabled={savingPass || newPass.length < 4}
            >
              {savingPass ? "Guardando…" : "Actualizar contraseña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
