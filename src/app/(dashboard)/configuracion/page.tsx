import { ConfiguracionForm } from "@/components/configuracion/configuracion-form";

export default function ConfiguracionPage() {
  // TODO: Obtener idusuario del contexto de autenticación
  const idusuario = 1; // Temporal

  return (
    <div className="p-4 md:p-6">
      <ConfiguracionForm idusuario={idusuario} />
    </div>
  );
}

