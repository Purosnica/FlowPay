import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-[#020d1a]">
      <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <div className="text-center">
          <h2 className="mb-2 text-4xl font-bold text-dark dark:text-white">
            404
          </h2>
          <p className="mb-6 text-lg text-gray-6">
            Página no encontrada
          </p>
          <p className="mb-6 text-sm text-gray-5 dark:text-dark-6">
            La página que estás buscando no existe o ha sido movida.
          </p>
          <Link href="/">
            <Button variant="primary">Volver al inicio</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}





