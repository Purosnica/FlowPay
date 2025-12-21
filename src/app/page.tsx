import { redirect } from "next/navigation";
import { cookies } from "next/headers";

/**
 * PÁGINA RAÍZ
 * 
 * El middleware debería redirigir antes de llegar aquí,
 * pero por seguridad verificamos y redirigimos también.
 */
export default async function HomePage() {
  // Verificar si hay token de autenticación
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  // Si no hay token, SIEMPRE redirigir a login
  if (!token || token.trim() === "") {
    redirect("/login");
  }

  // Si hay token, redirigir al dashboard principal
  redirect("/dashboard");
}

