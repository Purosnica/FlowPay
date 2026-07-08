/**
 * COMPONENTE DE HEADER CON INFORMACIÓN DE USUARIO
 * 
 * Muestra el usuario autenticado y botón de logout
 */

"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

export function HeaderAuth() {
  const { usuario, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  if (!usuario) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-sm font-medium text-dark dark:text-white">
          {usuario.nombre}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {usuario.email}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Cerrar Sesión
      </Button>
    </div>
  );
}



