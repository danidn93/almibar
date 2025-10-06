// src/pages/admin/Login.tsx
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// importa el mismo fondo que usas en el layout
import adminBg from '/assets/admin-bg.png';

const AdminLogin = () => {
  const { isAdmin, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        toast({
          title: 'Inicio de sesión exitoso',
          description: 'Bienvenido al panel de administración',
        });
      } else {
        toast({
          title: 'Error de autenticación',
          description: 'Usuario o contraseña incorrectos',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ha ocurrido un error inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Fondo con la imagen */}
      <div className="fixed inset-0 -z-10">
        <div
          className="h-full w-full bg-no-repeat bg-center bg-cover"
          style={{ backgroundImage: `url(${adminBg})` }}
        />
        {/* velo suave (ajusta la opacidad si quieres más/menos contraste) */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Contenido */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/85 backdrop-blur-md shadow-xl">
          <CardHeader className="text-center space-y-3">
            {/* LOGO */}
            <img
              src="/assets/logo-admin.png"
              alt="Logo"
              className="mx-auto h-16 w-16 sm:h-20 sm:w-20 object-contain rounded"
              draggable={false}
            />
            <CardTitle className="text-2xl font-bold">Panel Administrativo</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="admin"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <motion.div
                      animate={{ scale: showPassword ? 1.1 : 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </motion.div>
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
