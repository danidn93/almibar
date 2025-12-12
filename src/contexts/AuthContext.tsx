import React, { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import bcrypt from "bcryptjs";
import { supabase } from "@/integrations/supabase/client";

type SessionUser = {
  id: string;
  username: string;
  name: string | null;
  role: "admin" | "empleado" | "staff";
  local_id: string;
};

interface AuthContextType {
  isAdmin: boolean;
  user: SessionUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);

  const LOCAL_ID = import.meta.env.VITE_LOCAL_ID;

  useEffect(() => {
    const raw = Cookies.get("admin_session");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        Cookies.remove("admin_session");
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("admin_login", {
      p_username: username,
      p_local_id: LOCAL_ID
    });

    if (error || !data || data.length === 0) {
      console.warn("admin_login failed:", error);
      return false;
    }

    const row = data[0];

    // Comparar contraseña con bcrypt
    const ok = bcrypt.compareSync(password, row.password_hash);
    if (!ok) return false;

    const sessionUser: SessionUser = {
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      local_id: row.local_id
    };

    Cookies.set("admin_session", JSON.stringify(sessionUser), { expires: 7 });
    setUser(sessionUser);

    return true;
  };

  const logout = () => {
    Cookies.remove("admin_session");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAdmin: !!user && user.role === "admin",
        user,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
