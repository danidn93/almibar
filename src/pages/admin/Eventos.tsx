// src/pages/admin/Eventos.tsx
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AdminEventosPanel from "@/components/admin/AdminEventosPanel"; // 👈 ruta correcta
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Clock, Package, Music } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminEventos() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white/90">Listado de Eventos</h1>
          </div>
        <AdminEventosPanel />
      </div>
    </ProtectedRoute>
  );
}
