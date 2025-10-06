// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';

import { AuthProvider } from '@/contexts/AuthContext';

// Público
import AdminLogin from '@/pages/admin/Login';
import PublicLanding from '@/pages/PublicLanding';
import Terminos from "@/pages/Terminos";
import Privacidad from "@/pages/Privacidad";

// Admin pages
import AdminLayout from '@/layouts/AdminLayout';
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminPedidos from '@/pages/admin/Pedidos';
import AdminLiquidaciones from '@/pages/admin/Liquidaciones';
import AdminFacturasPendientes from '@/pages/admin/facturas';
import AdminIngresosHoy from '@/pages/admin/ingresos';
import AdminCierreDiario from '@/pages/admin/cierre-diario';
import AdminMesas from './pages/admin/Mesas';
import ClientMesa from './pages/client/Mesa';
import AdminUsuarios from '@/pages/admin/Usuarios';
import AdminItems from '@/pages/admin/Items';
import AdminConfiguracion from '@/pages/admin/Configuracion';
import AdminEventos from "@/pages/admin/Eventos"; // 👈 asegúrate de importar

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: 24 }}>Cargando…</div>}>
          <Routes>
            {/* Público */}
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/m/:slug" element={<ClientMesa />} />
            <Route path="/landing" element={<PublicLanding />} />
            {/* ⛔️ Quita la ruta pública de eventos 
                <Route path="eventos" element={<AdminEventos />} /> */}
            <Route path="/terminos" element={<Terminos />} />
            <Route path="/privacidad" element={<Privacidad />} />

            {/* Admin con layout protegido */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="pedidos" element={<AdminPedidos />} />
              <Route path="liquidaciones" element={<AdminLiquidaciones />} />
              <Route path="facturas" element={<AdminFacturasPendientes />} />
              <Route path="ingresos" element={<AdminIngresosHoy />} />
              <Route path="cierre-diario" element={<AdminCierreDiario />} />
              <Route path="items" element={<AdminItems />} />
              <Route path="mesas" element={<AdminMesas />} />
              <Route path="usuarios" element={<AdminUsuarios />} />
              <Route path="configuracion" element={<AdminConfiguracion />} />

              {/* ✅ Añade aquí la ruta /admin/eventos */}
              <Route path="eventos" element={<AdminEventos />} />
            </Route>

            {/* 404 → login */}
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
