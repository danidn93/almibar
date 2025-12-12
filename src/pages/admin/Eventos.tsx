// src/pages/admin/Eventos.tsx
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AdminEventosPanel from "@/components/admin/AdminEventosPanel";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminEventos() {
  return (
    <ProtectedRoute>
      <div className="min-h-[60vh]">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </Link>

            <h1 className="text-2xl font-bold text-white/90">
              Listado de Eventos
            </h1>
          </div>
        </header>

        {/* Contenido */}
        <main className="container mx-auto px-4 py-8">
          <AdminEventosPanel />
        </main>
      </div>
    </ProtectedRoute>
  );
}
